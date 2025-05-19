from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SocialMediaPost(BaseModel):
    """Schema for a social media post"""
    id: int
    post_id: str
    platform: str
    message: Optional[str] = None
    author_name: Optional[str] = None
    author_handle: Optional[str] = None
    author_is_verified: bool = False
    post_url: Optional[str] = None
    post_date: Optional[str] = None
    post_datetime: Optional[str] = None
    comments_count: int = 0
    reactions_count: int = 0
    shares_count: int = 0
    reposts_count: int = 0
    likes_count: int = 0
    views_count: int = 0
    bookmarks_count: int = 0
    has_image: bool = False
    image_url: Optional[str] = None
    first_seen_timestamp: Optional[str] = None
    last_updated_timestamp: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    
   
class PaginatedSocialMediaPosts(BaseModel):
    """Schema for paginated social media posts"""
    items: List[Dict[str, Any]]
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool


class SocialMediaStats(BaseModel):
    """Schema for social media statistics"""
    total_posts: int
    facebook_posts: int
    x_posts: int
    unique_authors: int
    engagement: List[Dict[str, Any]]
    top_authors: List[Dict[str, Any]]
    posts_by_date: List[Dict[str, Any]]


class PlatformStat(BaseModel):
    """Schema for platform-specific statistics"""
    platform: str
    comments_count: int = 0
    reactions_count: int = 0
    shares_count: int = 0
    reposts_count: int = 0
    likes_count: int = 0
    views_count: int = 0
    bookmarks_count: int = 0
    total_engagement: int = 0


class AuthorStat(BaseModel):
    """Schema for author statistics"""
    author_name: str
    post_count: int
    total_engagement: int = 0


class DateStat(BaseModel):
    """Schema for date-based statistics"""
    date: str
    platform: str
    post_count: int