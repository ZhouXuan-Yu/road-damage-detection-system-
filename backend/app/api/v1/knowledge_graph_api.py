"""
知识图谱 API 路由
提供多层级知识图谱的完整API，支持实体管理、关系管理、图谱构建、语义搜索、文档上传
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.knowledge_graph import GraphEntity, GraphRelation, KnowledgeDocument
from app.schemas.knowledge_graph import (
    GraphEntityCreate, GraphEntityUpdate, GraphEntityResponse,
    GraphRelationCreate, GraphRelationResponse,
    GraphResponse, GraphNodeResponse, GraphLinkResponse,
    EntityDetailResponse,
    KnowledgeDocumentCreate, KnowledgeDocumentResponse, KnowledgeDocumentListResponse,
    SemanticSearchRequest,
)
from app.services import knowledge_graph_service as kg_service
from app.services import semantic_search as search_service
from app.services.kg_seed_data import ENTITY_TYPES, RELATION_TYPES

router = APIRouter(prefix="/kg2", tags=["Knowledge Graph v2"])


# =====================================================================
# 初始化
# =====================================================================

@router.post("/init")
async def init_graph(db: AsyncSession = Depends(get_db)):
    """初始化图谱种子数据"""
    result = await kg_service.init_graph_data(db)
    return result


# =====================================================================
# 实体管理
# =====================================================================

@router.get("/entities", response_model=dict)
async def list_entities(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    entity_type: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """获取实体列表"""
    entities, total = await kg_service.list_entities(db, entity_type, search, page, limit)
    return {
        "items": [e.to_dict() for e in entities],
        "total": total,
        "page": page,
        "limit": limit,
        "entity_types": list(ENTITY_TYPES.keys()),
    }


@router.post("/entities", response_model=GraphEntityResponse)
async def create_entity(
    request: GraphEntityCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建实体"""
    entity = await kg_service.create_entity(db, request)
    return GraphEntityResponse(
        id=entity.id,
        name=entity.name,
        entity_type=entity.entity_type,
        code=entity.code,
        description=entity.description,
        properties=entity.properties,
        severity_level=entity.severity_level,
        priority=entity.priority,
        cost_range=entity.cost_range,
        source_document=entity.source_document,
        confidence=entity.confidence,
        created_at=entity.created_at.isoformat() if entity.created_at else None,
        updated_at=entity.updated_at.isoformat() if entity.updated_at else None,
    )


@router.get("/entities/{entity_id}", response_model=dict)
async def get_entity(
    entity_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取实体详情"""
    detail = await kg_service.get_entity_detail(db, entity_id)
    if not detail:
        raise HTTPException(404, "实体不存在")
    return detail


@router.put("/entities/{entity_id}", response_model=GraphEntityResponse)
async def update_entity(
    entity_id: int,
    request: GraphEntityUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新实体"""
    entity = await kg_service.update_entity(db, entity_id, request)
    if not entity:
        raise HTTPException(404, "实体不存在")
    return GraphEntityResponse(
        id=entity.id,
        name=entity.name,
        entity_type=entity.entity_type,
        code=entity.code,
        description=entity.description,
        properties=entity.properties,
        severity_level=entity.severity_level,
        priority=entity.priority,
        cost_range=entity.cost_range,
        source_document=entity.source_document,
        confidence=entity.confidence,
        created_at=entity.created_at.isoformat() if entity.created_at else None,
        updated_at=entity.updated_at.isoformat() if entity.updated_at else None,
    )


@router.delete("/entities/{entity_id}")
async def delete_entity(
    entity_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除实体"""
    success = await kg_service.delete_entity(db, entity_id)
    if not success:
        raise HTTPException(404, "实体不存在")
    return {"message": "删除成功"}


# =====================================================================
# 关系管理
# =====================================================================

@router.post("/relations", response_model=dict)
async def create_relation(
    request: GraphRelationCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建关系"""
    relation = await kg_service.create_relation(db, request)
    if not relation:
        raise HTTPException(400, "源实体或目标实体不存在")
    return {
        "id": relation.id,
        "source_id": relation.source_id,
        "target_id": relation.target_id,
        "source_name": request.source_name,
        "target_name": request.target_name,
        "relation_type": relation.relation_type,
        "weight": relation.weight,
        "message": "关系创建成功",
    }


@router.delete("/relations/{relation_id}")
async def delete_relation(
    relation_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除关系"""
    success = await kg_service.delete_relation(db, relation_id)
    if not success:
        raise HTTPException(404, "关系不存在")
    return {"message": "删除成功"}


# =====================================================================
# 图谱
# =====================================================================

@router.get("/graph", response_model=GraphResponse)
async def get_graph(
    center: Optional[str] = Query(default=None, description="中心节点名称或ID"),
    depth: int = Query(default=2, ge=1, le=5, description="展开深度"),
    entity_type: Optional[str] = Query(default=None, description="只显示指定类型"),
    db: AsyncSession = Depends(get_db),
):
    """获取知识图谱数据"""
    result = await kg_service.build_graph(db, center, depth, entity_type)

    nodes = [GraphNodeResponse(**n) for n in result["nodes"]]
    links = [GraphLinkResponse(**l) for l in result["links"]]

    return GraphResponse(
        nodes=nodes,
        links=links,
        categories=result["categories"],
        stats=result.get("stats"),
    )


@router.get("/entity/{entity_id}/graph", response_model=GraphResponse)
async def get_entity_subgraph(
    entity_id: int,
    depth: int = Query(default=1, ge=1, le=3),
    db: AsyncSession = Depends(get_db),
):
    """获取以指定实体为中心的子图"""
    entity = await kg_service.get_entity_by_id(db, entity_id)
    if not entity:
        raise HTTPException(404, "实体不存在")

    result = await kg_service.build_graph(db, str(entity.name), depth)

    nodes = [GraphNodeResponse(**n) for n in result["nodes"]]
    links = [GraphLinkResponse(**l) for l in result["links"]]

    return GraphResponse(
        nodes=nodes,
        links=links,
        categories=result["categories"],
        stats=result.get("stats"),
    )


# =====================================================================
# 语义搜索
# =====================================================================

@router.post("/search")
async def semantic_search_endpoint(
    request: SemanticSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """语义搜索实体"""
    results = await search_service.semantic_search(
        db, request.query, request.top_k, request.entity_type
    )
    return {"query": request.query, "results": results}


@router.get("/entity/{entity_id}/related")
async def get_related_entities(
    entity_id: int,
    depth: int = Query(default=1, ge=1, le=3),
    db: AsyncSession = Depends(get_db),
):
    """获取实体的关联实体"""
    related = await search_service.search_related_entities(db, entity_id, depth)
    return {"entity_id": entity_id, "depth": depth, "related": related}


# =====================================================================
# 统计
# =====================================================================

@router.get("/statistics")
async def get_statistics(db: AsyncSession = Depends(get_db)):
    """获取图谱统计信息"""
    stats = await search_service.get_graph_statistics(db)
    return stats


@router.get("/types")
async def get_types():
    """获取所有实体类型和关系类型"""
    return {
        "entity_types": [
            {
                "type": t,
                "label": {
                    "Disease": "病害",
                    "Cause": "成因",
                    "Repair": "维修方法",
                    "Material": "材料",
                    "Standard": "技术标准",
                    "Component": "道路构件",
                    "Risk": "风险等级",
                    "Region": "区域/路段",
                    "Obstacle": "障碍物",
                }.get(t, t),
                "color": ENTITY_TYPES[t],
            }
            for t in ENTITY_TYPES
        ],
        "relation_types": [
            {
                "type": k,
                "label": v["label"],
                "color": v["color"],
            }
            for k, v in RELATION_TYPES.items()
        ],
    }


# =====================================================================
# 文档上传与实体抽取
# =====================================================================

@router.post("/documents/upload", response_model=dict)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Query(default=""),
    category: str = Query(default="general"),
    db: AsyncSession = Depends(get_db),
):
    """上传知识文档并后台抽取实体关系"""
    from pathlib import Path
    import os

    # 保存文件
    upload_dir = Path("C:/Users/ZhouXuan/Desktop/Xu/BiShe/Project/backend/uploads/kg_documents")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    content = ""

    if file.filename.endswith((".txt", ".md", ".html")):
        content = (await file.read()).decode("utf-8", errors="ignore")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
    else:
        with open(file_path, "wb") as f:
            f.write(await file.read())

    doc_title = title or file.filename

    # 创建文档记录
    doc = await kg_service.create_document(db, {
        "title": doc_title,
        "content": content[:5000] if content else None,
        "file_path": str(file_path),
        "file_type": file.filename.split(".")[-1],
        "category": category,
        "status": "processing",
    })

    # 后台抽取
    async def process_document():
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            result = await kg_service.extract_entities_from_text(
                session, content or "", doc_title
            )
            # 更新文档状态
            doc_result = await kg_service.get_document_by_id(session, doc.id)
            if doc_result:
                doc_result.status = "completed"
                doc_result.entity_count = result.get("total_entities", 0)
                doc_result.relation_count = result.get("total_relations", 0)
                await session.commit()

    background_tasks.add_task(process_document)

    return {
        "id": doc.id,
        "title": doc.title,
        "status": "processing",
        "message": "文档已上传，正在后台抽取实体和关系...",
    }


@router.post("/documents/text")
async def add_document_from_text(
    title: str,
    content: str,
    category: str = "general",
    extract: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """从文本添加文档并可选抽取实体关系"""
    doc = await kg_service.create_document(db, {
        "title": title,
        "content": content[:5000],
        "file_type": "text",
        "category": category,
        "status": "pending" if not extract else "processing",
    })

    if extract:
        result = await kg_service.extract_entities_from_text(db, content, title)
        return {
            "document_id": doc.id,
            "title": doc.title,
            **result,
        }

    return {
        "document_id": doc.id,
        "title": doc.title,
        "status": "created",
        "message": "文档已创建，可手动触发实体抽取",
    }


@router.get("/documents", response_model=KnowledgeDocumentListResponse)
async def list_documents(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """获取文档列表"""
    docs, total = await kg_service.list_documents(db, category, search, page, limit)
    return KnowledgeDocumentListResponse(
        items=[
            KnowledgeDocumentResponse(
                id=d.id,
                title=d.title,
                content=d.content[:500] if d.content else None,
                file_path=d.file_path,
                file_type=d.file_type,
                source_url=d.source_url,
                category=d.category,
                tags=d.tags,
                status=d.status,
                entity_count=d.entity_count,
                relation_count=d.relation_count,
                created_at=d.created_at.isoformat() if d.created_at else None,
            )
            for d in docs
        ],
        total=total,
    )


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除文档"""
    success = await kg_service.delete_document(db, doc_id)
    if not success:
        raise HTTPException(404, "文档不存在")
    return {"message": "删除成功"}


@router.post("/documents/{doc_id}/extract")
async def re_extract_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
):
    """重新抽取文档中的实体关系"""
    doc = await kg_service.get_document_by_id(db, doc_id)
    if not doc:
        raise HTTPException(404, "文档不存在")

    result = await kg_service.extract_entities_from_text(db, doc.content or "", doc.title)
    return {
        "document_id": doc_id,
        **result,
    }
