from fastapi import APIRouter, Query, Path, HTTPException
from typing import List, Optional, Dict, Any
from services.social_media_service import social_media_service
from models.social_media_schemas import PaginatedSocialMediaPosts, SocialMediaPost, SocialMediaStats

router = APIRouter()


@router.get("/", response_model=PaginatedSocialMediaPosts)
async def read_posts(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    platform: Optional[str] = Query(None, description="Filter by platform (facebook or x)"),
    author: Optional[str] = Query(None, description="Filter by author name"),
    date_from: Optional[str] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search in post content"),
):
    """
    Get all social media posts with pagination and filtering.

    - **page**: Page number (starting from 1)
    - **per_page**: Number of items per page (max 100)
    - **platform**: Filter by platform ('facebook' or 'x')
    - **author**: Filter by author name
    - **date_from**: Filter by start date (format: YYYY-MM-DD)
    - **date_to**: Filter by end date (format: YYYY-MM-DD)
    - **search**: Search in post content
    """
    return await social_media_service.get_posts(
        page=page, per_page=per_page, platform=platform, author=author, date_from=date_from, date_to=date_to, search=search
    )


@router.get("/stats", response_model=SocialMediaStats)
async def get_stats():
    """
    Get analytics overview for social media posts.

    Returns statistics including:
    - Total post counts
    - Platform-specific post counts
    - Unique author count
    - Engagement metrics by platform
    - Top authors with their post counts
    - Post counts by date and platform
    """
    return await social_media_service.get_stats()


@router.get("/top", response_model=List[Dict[str, Any]])
async def get_top_posts(
    limit: int = Query(20, ge=1, le=100, description="Number of posts to return"),
    platform: Optional[str] = Query(None, description="Filter by platform (facebook or x)"),
):
    """
    Get top posts by engagement.

    - **limit**: Maximum number of posts to return (max 100)
    - **platform**: Filter by platform ('facebook' or 'x')
    """
    return await social_media_service.get_top_posts(limit=limit, platform=platform)


@router.get("/recent", response_model=List[Dict[str, Any]])
async def get_recent_posts(
    limit: int = Query(20, ge=1, le=100, description="Number of posts to return"),
    platform: Optional[str] = Query(None, description="Filter by platform (facebook or x)"),
    search: Optional[str] = Query(None, description="Search in post content"),
):
    """
    Get most recent posts.

    - **limit**: Maximum number of posts to return (max 100)
    - **platform**: Filter by platform ('facebook' or 'x')
    - **search**: Search in post content
    """
    return await social_media_service.get_recent_posts(limit=limit, platform=platform, search=search)


@router.get("/{post_id}", response_model=SocialMediaPost)
async def read_post(
    post_id: int = Path(..., description="ID of the post to retrieve"),
):
    """
    Get a specific social media post by ID.

    - **post_id**: ID of the post to retrieve
    """
    return await social_media_service.get_post(post_id=post_id)


@router.get("/platforms/list", response_model=List[str])
async def get_platforms():
    """
    Get list of available platforms in the database.
    """
    return await social_media_service.get_platforms()


@router.get("/authors/list", response_model=List[Dict[str, Any]])
async def get_authors(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of authors to return"),
    search: Optional[str] = Query(None, description="Filter authors by name"),
):
    """
    Get list of authors with post counts.

    - **limit**: Maximum number of authors to return (max 1000)
    - **search**: Filter authors by name
    """
    return await social_media_service.get_authors(limit=limit, search=search)


@router.post("/import")
async def import_post(post_data: Dict[str, Any]):
    """
    Import a post from the crawler system.

    This endpoint is primarily for internal use by the social media crawler.
    It expects a JSON object containing the post data to be imported.

    Returns:
    - "inserted" if a new post was created
    - "updated" if an existing post was updated
    """
    result = await social_media_service.import_post(post_data)
    return {"status": "success", "operation": result}