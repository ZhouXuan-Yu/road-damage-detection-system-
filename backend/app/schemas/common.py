from typing import Generic, TypeVar, Optional

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: Optional["PaginationMeta"] = None
    items: list[T] = []


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
