import sqlite3
import json

def create_connection(db_file="x_posts.db"):
    """Create a database connection to the SQLite database"""
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    return conn

def setup_database(conn):
    """Create the necessary tables if they don't exist"""
    create_posts_table = '''
    CREATE TABLE IF NOT EXISTS posts (
        post_id TEXT PRIMARY KEY,
        platform TEXT,
        user_display_name TEXT,
        user_handle TEXT,
        user_profile_pic_url TEXT,
        post_timestamp TEXT,
        post_display_time TEXT,
        post_url TEXT,
        post_text TEXT,
        post_mentions TEXT,
        engagement_reply_count INTEGER,
        engagement_retweet_count INTEGER,
        engagement_like_count INTEGER,
        engagement_bookmark_count INTEGER,
        engagement_view_count INTEGER,
        media TEXT,  -- Stored as JSON
        media_count INTEGER,
        is_ad BOOLEAN,
        sentiment TEXT,
        categories TEXT,
        tags TEXT,
        analysis_reasoning TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    '''
    
    conn.execute(create_posts_table)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_user_handle ON posts(user_handle)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_post_timestamp ON posts(post_timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_sentiment ON posts(sentiment)")
    conn.commit()

def parse_engagement_count(count_str):
    """Parse engagement count strings to integers (e.g., '1.2K' -> 1200)"""
    if not count_str:
        return 0
    
    count_str = str(count_str).strip()
    if not count_str:
        return 0
    
    # Handle K, M, B suffixes
    multiplier = 1
    if 'K' in count_str:
        multiplier = 1000
        count_str = count_str.replace('K', '')
    elif 'M' in count_str:
        multiplier = 1000000
        count_str = count_str.replace('M', '')
    elif 'B' in count_str:
        multiplier = 1000000000
        count_str = count_str.replace('B', '')
    
    try:
        return int(float(count_str) * multiplier)
    except (ValueError, TypeError):
        return 0

def process_post_data(post_data):
    """Process post data to prepare for database storage"""
    # Copy the data to avoid modifying the original
    data = post_data.copy()
    
    # Parse engagement metrics
    metrics = [
        'engagement_reply_count',
        'engagement_retweet_count', 
        'engagement_like_count',
        'engagement_bookmark_count', 
        'engagement_view_count'
    ]
    
    for metric in metrics:
        if metric in data:
            data[metric] = parse_engagement_count(data[metric])
    
    # Convert media array to JSON string if it exists
    if 'media' in data and isinstance(data['media'], list):
        data['media'] = json.dumps(data['media'])
    
    # Handle categories and tags if they exist (from sentiment analysis)
    if 'categories' in data and isinstance(data['categories'], list):
        data['categories'] = json.dumps(data['categories'])
    
    if 'tags' in data and isinstance(data['tags'], list):
        data['tags'] = json.dumps(data['tags'])
        
    # Ensure boolean for is_ad
    if 'is_ad' in data:
        data['is_ad'] = 1 if data['is_ad'] else 0
        
    return data

def get_post(conn, post_id):
    """Get a post from the database by post_id"""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM posts WHERE post_id = ?", (post_id,))
    return cursor.fetchone()

def insert_post(conn, post_data):
    """Insert a new post into the database"""
    data = process_post_data(post_data)
    
    columns = ', '.join(data.keys())
    placeholders = ', '.join(['?'] * len(data))
    values = list(data.values())
    
    sql = f"INSERT INTO posts ({columns}) VALUES ({placeholders})"
    conn.execute(sql, values)
    conn.commit()

def check_and_store_post(conn, post_data):
    """
    Check if post exists, update metrics if changed, or insert as new.
    Returns True if post needs sentiment analysis, False otherwise.
    """
    post_id = post_data.get('post_id')
    if not post_id:
        return False
        
    # Skip advertisements entirely
    if post_data.get('is_ad', False):
        return False
        
    # Process post data
    data = process_post_data(post_data)
        
    # For non-ads, check if post exists
    existing_post = get_post(conn, post_id)
    if not existing_post:
        # New post, needs sentiment analysis if it has text
        needs_analysis = bool(data.get('post_text'))
        insert_post(conn, data)
        return needs_analysis
    else:
        # Update metrics if changed
        update_changed_metrics(conn, existing_post, data)
        # Already analyzed or no text, no need for re-analysis
        return False

def update_changed_metrics(conn, existing_post, new_data):
    """Update only the metrics that have changed"""
    metrics = [
        'engagement_reply_count',
        'engagement_retweet_count', 
        'engagement_like_count',
        'engagement_bookmark_count', 
        'engagement_view_count'
    ]
    
    changes = {}
    for metric in metrics:
        if metric in new_data and metric in existing_post:
            if new_data[metric] != existing_post[metric]:
                changes[metric] = new_data[metric]
    
    if changes:
        set_clauses = [f"{metric} = ?" for metric in changes]
        set_sql = ', '.join(set_clauses)
        set_sql += ", updated_at = CURRENT_TIMESTAMP"
        
        sql = f"UPDATE posts SET {set_sql} WHERE post_id = ?"
        params = list(changes.values()) + [existing_post['post_id']]
        
        conn.execute(sql, params)
        conn.commit()

def update_posts_with_analysis(conn, post_ids, analysis_results):
    """Batch update posts with sentiment analysis results"""
    if not analysis_results:
        return
        
    # Create mapping from post_id to analysis results
    analysis_by_id = {}
    for analysis in analysis_results:
        post_id = analysis.get('post_id')
        if post_id:
            analysis_by_id[post_id] = analysis
    
    # Update each post that has analysis results
    for post_id in post_ids:
        if post_id in analysis_by_id:
            analysis = analysis_by_id[post_id]
            
            # Convert lists to JSON strings
            categories = json.dumps(analysis.get('categories', []))
            tags = json.dumps(analysis.get('tags', []))
            
            conn.execute(
                """UPDATE posts SET 
                   sentiment = ?, 
                   categories = ?, 
                   tags = ?, 
                   analysis_reasoning = ?,
                   updated_at = CURRENT_TIMESTAMP 
                   WHERE post_id = ?""",
                (analysis.get('sentiment'), categories, tags, 
                 analysis.get('reasoning'), post_id)
            )
    
    conn.commit()