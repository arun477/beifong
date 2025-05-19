from typing import List, Optional, Dict, Any, Union
from fastapi import HTTPException
import json
import datetime
from services.db_service import social_media_db
from models.social_media_schemas import PaginatedSocialMediaPosts, SocialMediaPost, SocialMediaStats


class SocialMediaService:
    """Service for managing social media posts operations."""

    async def get_posts(
        self,
        page: int = 1,
        per_page: int = 10,
        platform: Optional[str] = None,
        author: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        search: Optional[str] = None,
    ) -> PaginatedSocialMediaPosts:
        """
        Get social media posts with pagination and filtering.
        
        Args:
            page: Page number (starting from 1)
            per_page: Number of items per page
            platform: Filter by platform ('facebook' or 'x')
            author: Filter by author name
            date_from: Filter by start date (YYYY-MM-DD)
            date_to: Filter by end date (YYYY-MM-DD)
            search: Search in post content
            
        Returns:
            Paginated social media posts with metadata
        """
        try:
            offset = (page - 1) * per_page
            query_parts = [
                "SELECT * FROM posts",
                "WHERE 1=1",
            ]
            query_params = []
            
            if platform:
                query_parts.append("AND platform = ?")
                query_params.append(platform)
                
            if author:
                query_parts.append("AND author_name LIKE ?")
                query_params.append(f"%{author}%")
                
            if date_from:
                query_parts.append("AND datetime(post_datetime) >= datetime(?)")
                query_params.append(date_from)
                
            if date_to:
                query_parts.append("AND datetime(post_datetime) <= datetime(?)")
                query_params.append(date_to)
                
            if search:
                query_parts.append("AND message LIKE ?")
                query_params.append(f"%{search}%")
                
            # Get total count for pagination
            count_query = " ".join(query_parts).replace("SELECT *", "SELECT COUNT(*)")
            total_result = await social_media_db.execute_query(
                count_query, tuple(query_params), fetch=True, fetch_one=True
            )
            total_count = total_result.get("COUNT(*)", 0) if total_result else 0
            
            # Add ordering and pagination
            query_parts.append("ORDER BY datetime(post_datetime) DESC")
            query_parts.append("LIMIT ? OFFSET ?")
            query_params.extend([per_page, offset])
            
            posts_query = " ".join(query_parts)
            posts = await social_media_db.execute_query(
                posts_query, tuple(query_params), fetch=True
            )
            
            # Process posts (convert booleans, parse JSON)
            processed_posts = []
            for post in posts:
                processed_post = dict(post)
                processed_post["author_is_verified"] = bool(processed_post.get("author_is_verified", 0))
                processed_post["has_image"] = bool(processed_post.get("has_image", 0))
                if processed_post.get("extra_data"):
                    try:
                        processed_post["extra_data"] = json.loads(processed_post["extra_data"])
                    except json.JSONDecodeError:
                        processed_post["extra_data"] = {}
                processed_posts.append(processed_post)
                
            # Calculate pagination info
            total_pages = (total_count + per_page - 1) // per_page if total_count > 0 else 0
            has_next = page < total_pages
            has_prev = page > 1
            
            return PaginatedSocialMediaPosts(
                items=processed_posts,
                total=total_count,
                page=page,
                per_page=per_page,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev,
            )
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching social media posts: {str(e)}")

    async def get_post(self, post_id: int) -> SocialMediaPost:
        """
        Get a specific social media post by ID.
        
        Args:
            post_id: ID of the post to retrieve
            
        Returns:
            The requested social media post
            
        Raises:
            HTTPException: If post not found or error occurs
        """
        try:
            query = "SELECT * FROM posts WHERE id = ?"
            post = await social_media_db.execute_query(query, (post_id,), fetch=True, fetch_one=True)
            
            if not post:
                raise HTTPException(status_code=404, detail="Social media post not found")
            
            # Process the post
            processed_post = dict(post)
            processed_post["author_is_verified"] = bool(processed_post.get("author_is_verified", 0))
            processed_post["has_image"] = bool(processed_post.get("has_image", 0))
            
            if processed_post.get("extra_data"):
                try:
                    processed_post["extra_data"] = json.loads(processed_post["extra_data"])
                except json.JSONDecodeError:
                    processed_post["extra_data"] = {}
            
            return SocialMediaPost(**processed_post)
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching social media post: {str(e)}")

    async def get_stats(self) -> SocialMediaStats:
        """
        Get analytics overview for social media posts.
        
        Returns:
            Statistics about social media posts including counts, engagement metrics,
            top authors, and posts by date
        """
        try:
            # Get total posts
            total_posts_query = "SELECT COUNT(*) as count FROM posts"
            total_posts_result = await social_media_db.execute_query(total_posts_query, fetch=True, fetch_one=True)
            total_posts = total_posts_result.get("count", 0) if total_posts_result else 0
            
            # Get platform-specific counts
            platform_counts_query = """
            SELECT platform, COUNT(*) as count 
            FROM posts 
            GROUP BY platform
            """
            platform_counts = await social_media_db.execute_query(platform_counts_query, fetch=True)
            
            # Create a dictionary for easy lookup
            platform_count_dict = {item.get("platform", ""): item.get("count", 0) for item in platform_counts}
            facebook_posts = platform_count_dict.get("facebook", 0)
            x_posts = platform_count_dict.get("x", 0)
            
            # Get unique authors
            unique_authors_query = "SELECT COUNT(DISTINCT author_name) as count FROM posts"
            unique_authors_result = await social_media_db.execute_query(unique_authors_query, fetch=True, fetch_one=True)
            unique_authors = unique_authors_result.get("count", 0) if unique_authors_result else 0
            
            # Get engagement by platform
            engagement_query = """
            SELECT platform, 
                   SUM(comments_count) as comments_count,
                   SUM(reactions_count) as reactions_count,
                   SUM(shares_count) as shares_count,
                   SUM(reposts_count) as reposts_count,
                   SUM(likes_count) as likes_count,
                   SUM(views_count) as views_count,
                   SUM(bookmarks_count) as bookmarks_count,
                   SUM(comments_count + reactions_count + shares_count + 
                       reposts_count + likes_count + bookmarks_count) as total_engagement
            FROM posts
            GROUP BY platform
            """
            engagement_data = await social_media_db.execute_query(engagement_query, fetch=True)
            
            # Get top authors
            top_authors_query = """
            SELECT author_name, COUNT(*) as post_count,
                   SUM(comments_count + reactions_count + shares_count + 
                       reposts_count + likes_count + bookmarks_count) as total_engagement
            FROM posts
            WHERE author_name IS NOT NULL AND author_name != ''
            GROUP BY author_name
            ORDER BY post_count DESC
            LIMIT 10
            """
            top_authors = await social_media_db.execute_query(top_authors_query, fetch=True)
            
            # Get posts by date
            posts_by_date_query = """
            SELECT 
                SUBSTR(COALESCE(post_datetime, first_seen_timestamp), 1, 10) as date,
                platform,
                COUNT(*) as post_count
            FROM posts
            WHERE SUBSTR(COALESCE(post_datetime, first_seen_timestamp), 1, 10) != ''
            GROUP BY date, platform
            ORDER BY date
            """
            posts_by_date = await social_media_db.execute_query(posts_by_date_query, fetch=True)
            
            return SocialMediaStats(
                total_posts=total_posts,
                facebook_posts=facebook_posts,
                x_posts=x_posts,
                unique_authors=unique_authors,
                engagement=engagement_data,
                top_authors=top_authors,
                posts_by_date=posts_by_date
            )
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching social media stats: {str(e)}")

    async def get_top_posts(self, limit: int = 20, platform: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get top posts by engagement.
        
        Args:
            limit: Maximum number of posts to return
            platform: Filter by platform ('facebook' or 'x')
            
        Returns:
            List of posts sorted by engagement
        """
        try:
            query_parts = [
                """
                SELECT *,
                      (comments_count + reactions_count + shares_count + 
                       reposts_count + likes_count + bookmarks_count) as total_engagement
                FROM posts
                """
            ]
            query_params = []
            
            if platform:
                query_parts.append("WHERE platform = ?")
                query_params.append(platform)
                
            query_parts.append("ORDER BY total_engagement DESC")
            query_parts.append("LIMIT ?")
            query_params.append(limit)
            
            query = " ".join(query_parts)
            posts = await social_media_db.execute_query(query, tuple(query_params), fetch=True)
            
            # Process posts
            processed_posts = []
            for post in posts:
                processed_post = dict(post)
                processed_post["author_is_verified"] = bool(processed_post.get("author_is_verified", 0))
                processed_post["has_image"] = bool(processed_post.get("has_image", 0))
                
                if processed_post.get("extra_data"):
                    try:
                        processed_post["extra_data"] = json.loads(processed_post["extra_data"])
                    except json.JSONDecodeError:
                        processed_post["extra_data"] = {}
                        
                processed_posts.append(processed_post)
                
            return processed_posts
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching top social media posts: {str(e)}")

    async def get_recent_posts(
        self, limit: int = 20, platform: Optional[str] = None, search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get most recent posts.
        
        Args:
            limit: Maximum number of posts to return
            platform: Filter by platform ('facebook' or 'x')
            search: Search in post content
            
        Returns:
            List of most recent posts
        """
        try:
            query_parts = ["SELECT * FROM posts"]
            query_params = []
            conditions = []
            
            if platform:
                conditions.append("platform = ?")
                query_params.append(platform)
            
            if search:
                conditions.append("message LIKE ?")
                query_params.append(f"%{search}%")
            
            if conditions:
                query_parts.append("WHERE " + " AND ".join(conditions))
                
            query_parts.append("ORDER BY last_updated_timestamp DESC")
            query_parts.append("LIMIT ?")
            query_params.append(limit)
            
            query = " ".join(query_parts)
            posts = await social_media_db.execute_query(query, tuple(query_params), fetch=True)
            
            # Process posts
            processed_posts = []
            for post in posts:
                processed_post = dict(post)
                processed_post["author_is_verified"] = bool(processed_post.get("author_is_verified", 0))
                processed_post["has_image"] = bool(processed_post.get("has_image", 0))
                
                if processed_post.get("extra_data"):
                    try:
                        processed_post["extra_data"] = json.loads(processed_post["extra_data"])
                    except json.JSONDecodeError:
                        processed_post["extra_data"] = {}
                        
                # Normalize numeric fields to integers
                numeric_fields = ["comments_count", "reactions_count", "shares_count", 
                                  "reposts_count", "likes_count", "views_count", "bookmarks_count"]
                for field in numeric_fields:
                    if field in processed_post:
                        try:
                            processed_post[field] = int(processed_post[field]) if processed_post[field] else 0
                        except:
                            processed_post[field] = 0
                            
                processed_posts.append(processed_post)
                
            return processed_posts
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching recent social media posts: {str(e)}")

    async def import_post(self, post_data: Dict[str, Any]) -> Union[str, None]:
        """
        Import a post from the crawler system.
        
        Args:
            post_data: Post data from the crawler
            
        Returns:
            Status of the operation ("inserted" or "updated") or None on error
        """
        try:
            # Check if post already exists
            query = "SELECT id FROM posts WHERE post_id = ?"
            existing_post = await social_media_db.execute_query(
                query, (post_data.get("post_id"),), fetch=True, fetch_one=True
            )
            
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            if existing_post:
                # Update existing post
                update_fields = [
                    "comments_count = ?",
                    "reactions_count = ?",
                    "shares_count = ?",
                    "reposts_count = ?",
                    "likes_count = ?",
                    "views_count = ?",
                    "bookmarks_count = ?",
                    "last_updated_timestamp = ?"
                ]
                
                update_values = [
                    post_data.get("comments_count", 0),
                    post_data.get("reactions_count", 0),
                    post_data.get("shares_count", 0),
                    post_data.get("reposts_count", 0),
                    post_data.get("likes_count", 0),
                    post_data.get("views_count", 0),
                    post_data.get("bookmarks_count", 0),
                    current_time
                ]
                
                update_query = f"UPDATE posts SET {', '.join(update_fields)} WHERE post_id = ?"
                update_values.append(post_data.get("post_id"))
                
                await social_media_db.execute_query(update_query, tuple(update_values))
                return "updated"
            else:
                # Insert new post
                # Extract standard fields
                standard_fields = {
                    "post_id", "platform", "message", "author_name", "author_handle", 
                    "author_is_verified", "post_url", "post_date", "post_datetime",
                    "comments_count", "reactions_count", "shares_count", "reposts_count", 
                    "likes_count", "views_count", "bookmarks_count", "has_image", 
                    "image_url", "first_seen_timestamp", "last_updated_timestamp"
                }
                
                # Prepare extra data as JSON
                extra_data = {
                    k: v for k, v in post_data.items() 
                    if k not in standard_fields and not k.startswith("_")
                }
                
                # Prepare insert data
                insert_data = {
                    "post_id": post_data.get("post_id", ""),
                    "platform": post_data.get("platform", "unknown"),
                    "message": post_data.get("message", ""),
                    "author_name": post_data.get("author_name", post_data.get("user_name", "")),
                    "author_handle": post_data.get("author_handle", post_data.get("user_handle", "")),
                    "author_is_verified": 1 if post_data.get("author_is_verified", False) else 0,
                    "post_url": post_data.get("post_url", ""),
                    "post_date": post_data.get("post_date", ""),
                    "post_datetime": post_data.get("post_datetime", ""),
                    "comments_count": post_data.get("comments_count", post_data.get("replies_count", 0)),
                    "reactions_count": post_data.get("reactions_count", 0),
                    "shares_count": post_data.get("shares_count", 0),
                    "reposts_count": post_data.get("reposts_count", 0),
                    "likes_count": post_data.get("likes_count", 0),
                    "views_count": post_data.get("views_count", 0),
                    "bookmarks_count": post_data.get("bookmarks_count", 0),
                    "has_image": 1 if post_data.get("has_image", False) else 0,
                    "image_url": post_data.get("image_url", ""),
                    "first_seen_timestamp": current_time,
                    "last_updated_timestamp": current_time,
                    "extra_data": json.dumps(extra_data) if extra_data else None,
                }
                
                # Create query
                columns = ", ".join(insert_data.keys())
                placeholders = ", ".join(["?" for _ in insert_data])
                query = f"INSERT INTO posts ({columns}) VALUES ({placeholders})"
                
                await social_media_db.execute_query(query, tuple(insert_data.values()))
                return "inserted"
                
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error importing social media post: {str(e)}")

    async def get_platforms(self) -> List[str]:
        """
        Get list of available platforms.
        
        Returns:
            List of platform names
        """
        try:
            query = "SELECT DISTINCT platform FROM posts ORDER BY platform"
            platforms = await social_media_db.execute_query(query, fetch=True)
            return [platform.get("platform", "") for platform in platforms if platform.get("platform")]
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching platforms: {str(e)}")

    async def get_authors(self, limit: int = 100, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get list of authors with post counts.
        
        Args:
            limit: Maximum number of authors to return
            search: Filter authors by name
            
        Returns:
            List of authors with their post counts
        """
        try:
            query_parts = [
                """
                SELECT author_name, COUNT(*) as post_count 
                FROM posts 
                WHERE author_name IS NOT NULL AND author_name != ''
                """
            ]
            query_params = []
            
            if search:
                query_parts.append("AND author_name LIKE ?")
                query_params.append(f"%{search}%")
                
            query_parts.append("GROUP BY author_name")
            query_parts.append("ORDER BY post_count DESC")
            query_parts.append("LIMIT ?")
            query_params.append(limit)
            
            query = " ".join(query_parts)
            authors = await social_media_db.execute_query(query, tuple(query_params), fetch=True)
            return authors
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching authors: {str(e)}")


social_media_service = SocialMediaService()