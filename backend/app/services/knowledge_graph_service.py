"""
知识图谱核心服务
提供实体管理、关系管理、图谱构建、LLM实体抽取、语义搜索等功能
"""

import json
from typing import Optional
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.knowledge_graph import GraphEntity, GraphRelation, KnowledgeDocument
from app.schemas.knowledge_graph import (
    GraphEntityCreate, GraphEntityUpdate, GraphRelationCreate,
    SemanticSearchRequest,
)
from app.services.kg_seed_data import (
    get_all_entities, RELATIONS, ENTITY_TYPES, RELATION_TYPES,
    DISEASE_ENTITIES, CAUSE_ENTITIES, REPAIR_ENTITIES,
    MATERIAL_ENTITIES, STANDARD_ENTITIES, COMPONENT_ENTITIES,
    RISK_ENTITIES, REGION_ENTITIES,
)


# =====================================================================
# 实体管理
# =====================================================================

async def create_entity(db: AsyncSession, data: GraphEntityCreate) -> GraphEntity:
    """创建实体"""
    entity = GraphEntity(**data.model_dump())
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return entity


async def update_entity(db: AsyncSession, entity_id: int, data: GraphEntityUpdate) -> Optional[GraphEntity]:
    """更新实体"""
    result = await db.execute(select(GraphEntity).where(GraphEntity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entity, key, value)

    await db.commit()
    await db.refresh(entity)
    return entity


async def delete_entity(db: AsyncSession, entity_id: int) -> bool:
    """删除实体，同时删除相关关系"""
    result = await db.execute(select(GraphEntity).where(GraphEntity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        return False

    # 删除相关关系
    await db.execute(
        delete(GraphRelation).where(
            (GraphRelation.source_id == entity_id) | (GraphRelation.target_id == entity_id)
        )
    )
    await db.delete(entity)
    await db.commit()
    return True


async def get_entity_by_id(db: AsyncSession, entity_id: int) -> Optional[GraphEntity]:
    """根据ID获取实体"""
    result = await db.execute(select(GraphEntity).where(GraphEntity.id == entity_id))
    return result.scalar_one_or_none()


async def get_entity_by_name(db: AsyncSession, name: str) -> Optional[GraphEntity]:
    """根据名称获取实体"""
    result = await db.execute(
        select(GraphEntity).where(GraphEntity.name == name)
    )
    return result.scalar_one_or_none()


async def list_entities(
    db: AsyncSession,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[GraphEntity], int]:
    """分页查询实体"""
    query = select(GraphEntity)
    count_query = select(func.count(GraphEntity.id))

    if entity_type:
        query = query.where(GraphEntity.entity_type == entity_type)
        count_query = count_query.where(GraphEntity.entity_type == entity_type)

    if search:
        search_filter = GraphEntity.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    query = query.order_by(GraphEntity.entity_type, GraphEntity.priority.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    entities = result.scalars().all()

    return list(entities), total


# =====================================================================
# 关系管理
# =====================================================================

async def create_relation(db: AsyncSession, data: GraphRelationCreate) -> Optional[GraphRelation]:
    """创建关系，自动处理实体名称到ID的映射"""
    source = await get_entity_by_name(db, data.source_name)
    target = await get_entity_by_name(db, data.target_name)

    if not source or not target:
        return None

    relation = GraphRelation(
        source_id=source.id,
        target_id=target.id,
        relation_type=data.relation_type,
        properties=data.properties,
        weight=data.weight,
        source_document=data.source_document,
        confidence=data.confidence,
    )
    db.add(relation)
    await db.commit()
    await db.refresh(relation)
    return relation


async def delete_relation(db: AsyncSession, relation_id: int) -> bool:
    """删除关系"""
    result = await db.execute(select(GraphRelation).where(GraphRelation.id == relation_id))
    relation = result.scalar_one_or_none()
    if not relation:
        return False
    await db.delete(relation)
    await db.commit()
    return True


async def get_entity_relations(db: AsyncSession, entity_id: int) -> tuple[list, list]:
    """获取实体的所有关系（入边和出边）"""
    result = await db.execute(
        select(GraphRelation)
        .options(selectinload(GraphRelation.source), selectinload(GraphRelation.target))
        .where((GraphRelation.source_id == entity_id) | (GraphRelation.target_id == entity_id))
    )
    relations = result.scalars().all()

    outgoing = []
    incoming = []
    for r in relations:
        if r.source_id == entity_id:
            outgoing.append(r)
        else:
            incoming.append(r)

    return outgoing, incoming


# =====================================================================
# 图谱构建
# =====================================================================

def get_node_size(entity_type: str, priority: int = 3) -> int:
    """根据实体类型和优先级计算节点大小"""
    base_size = {
        "Disease": 45,
        "Cause": 30,
        "Repair": 30,
        "Material": 25,
        "Standard": 20,
        "Component": 25,
        "Risk": 20,
        "Region": 25,
        "Obstacle": 25,
    }
    base = base_size.get(entity_type, 25)
    return base + (priority - 3) * 5


async def build_graph(
    db: AsyncSession,
    center_node: Optional[str] = None,
    depth: int = 1,
    entity_type: Optional[str] = None,
) -> dict:
    """构建图谱数据"""
    query = select(GraphEntity)
    if entity_type:
        query = query.where(GraphEntity.entity_type == entity_type)

    result = await db.execute(query)
    entities = result.scalars().all()

    if not entities:
        return {"nodes": [], "links": [], "categories": [], "stats": {}}

    # 获取所有关系
    rel_result = await db.execute(
        select(GraphRelation).options(
            selectinload(GraphRelation.source),
            selectinload(GraphRelation.target)
        )
    )
    all_relations = rel_result.scalars().all()

    entity_map = {e.id: e for e in entities}

    # 如果指定了中心节点，只显示相关子图
    if center_node:
        center_entity = next((e for e in entities if e.name == center_node or str(e.id) == center_node), None)
        if center_entity:
            # 收集N跳内的所有实体ID
            connected_ids = {center_entity.id}
            current_ids = {center_entity.id}
            for _ in range(depth):
                next_ids = set()
                for rel in all_relations:
                    if rel.source_id in current_ids:
                        next_ids.add(rel.target_id)
                    if rel.target_id in current_ids:
                        next_ids.add(rel.source_id)
                connected_ids.update(next_ids)
                current_ids = next_ids

            # 只保留相关实体
            entities = [e for e in entities if e.id in connected_ids]
            entity_map = {e.id: e for e in entities}

    # 构建节点
    nodes = []
    for e in entities:
        color = ENTITY_TYPES.get(e.entity_type, "#6b7280")
        node = {
            "id": e.id,
            "name": e.name,
            "entity_type": e.entity_type,
            "code": e.code,
            "description": e.description,
            "properties": e.properties or {},
            "severity_level": e.severity_level,
            "priority": e.priority,
            "cost_range": e.cost_range,
            "symbolSize": get_node_size(e.entity_type, e.priority),
            "color": color,
            "value": e.priority,
        }
        nodes.append(node)

    # 构建边
    links = []
    relation_type_set = set()
    for rel in all_relations:
        if rel.source_id not in entity_map or rel.target_id not in entity_map:
            continue

        rel_info = RELATION_TYPES.get(rel.relation_type, {})
        relation_type_set.add(rel.relation_type)

        link = {
            "source": rel.source_id,
            "target": rel.target_id,
            "source_name": rel.source.name,
            "target_name": rel.target.name,
            "relation_type": rel.relation_type,
            "weight": rel.weight,
            "properties": rel.properties or {},
            "lineStyle": {
                "color": rel_info.get("color", "#94a3b8"),
                "width": rel.weight * rel_info.get("width", 1.5),
                "type": "solid",
            },
        }
        links.append(link)

    # 构建类别
    used_types = set(e.entity_type for e in entities)
    categories = [
        {
            "name": t,
            "label": {"show": True, "fontSize": 11},
            "itemStyle": {"color": ENTITY_TYPES.get(t, "#6b7280")},
        }
        for t in used_types
    ]

    # 统计信息
    type_counts = {}
    for e in entities:
        type_counts[e.entity_type] = type_counts.get(e.entity_type, 0) + 1

    stats = {
        "total_entities": len(entities),
        "total_relations": len(links),
        "type_distribution": type_counts,
        "relation_types": list(relation_type_set),
    }

    return {
        "nodes": nodes,
        "links": links,
        "categories": categories,
        "stats": stats,
    }


# =====================================================================
# 实体详情（含关联关系）
# =====================================================================

async def get_entity_detail(db: AsyncSession, entity_id: int) -> Optional[dict]:
    """获取实体详情及其关联的所有关系"""
    entity = await get_entity_by_id(db, entity_id)
    if not entity:
        return None

    outgoing, incoming = await get_entity_relations(db, entity_id)

    def serialize_relation(r: GraphRelation, is_outgoing: bool):
        return {
            "id": r.id,
            "source_id": r.source_id,
            "target_id": r.target_id,
            "source_name": r.source.name if is_outgoing else r.target.name,
            "target_name": r.target.name if is_outgoing else r.source.name,
            "relation_type": r.relation_type,
            "relation_label": RELATION_TYPES.get(r.relation_type, {}).get("label", r.relation_type),
            "weight": r.weight,
            "properties": r.properties or {},
            "direction": "outgoing" if is_outgoing else "incoming",
        }

    return {
        "id": entity.id,
        "name": entity.name,
        "entity_type": entity.entity_type,
        "code": entity.code,
        "description": entity.description,
        "properties": entity.properties or {},
        "severity_level": entity.severity_level,
        "priority": entity.priority,
        "cost_range": entity.cost_range,
        "source_document": entity.source_document,
        "confidence": entity.confidence,
        "incoming_relations": [serialize_relation(r, False) for r in incoming],
        "outgoing_relations": [serialize_relation(r, True) for r in outgoing],
        "related_entities": [
            {"id": r.target.id, "name": r.target.name, "type": r.target.entity_type}
            for r in outgoing
        ] + [
            {"id": r.source.id, "name": r.source.name, "type": r.source.entity_type}
            for r in incoming
        ],
    }


# =====================================================================
# 初始化种子数据
# =====================================================================

async def init_graph_data(db: AsyncSession) -> dict:
    """初始化图谱种子数据"""
    result = await db.execute(select(func.count(GraphEntity.id)))
    count = result.scalar() or 0

    if count > 0:
        return {"message": f"图谱已有 {count} 个实体，跳过初始化", "entities": count}

    # 批量插入所有实体
    all_entity_data = get_all_entities()
    name_to_id = {}

    for ent_data in all_entity_data:
        entity = GraphEntity(
            name=ent_data["name"],
            entity_type=ent_data["entity_type"],
            code=ent_data.get("code"),
            description=ent_data.get("description"),
            properties=ent_data.get("properties"),
            severity_level=ent_data.get("severity_level"),
            priority=ent_data.get("priority", 3),
            cost_range=ent_data.get("cost_range"),
            source_document="系统预置",
            confidence=1.0,
        )
        db.add(entity)
        name_to_id[ent_data["name"]] = None

    await db.flush()

    # 重新查询获取ID
    for ent_data in all_entity_data:
        result = await db.execute(
            select(GraphEntity).where(GraphEntity.name == ent_data["name"])
        )
        entity = result.scalar_one()
        name_to_id[ent_data["name"]] = entity.id

    # 批量插入所有关系
    relation_count = 0
    for rel_data in RELATIONS:
        source_id = name_to_id.get(rel_data["source"])
        target_id = name_to_id.get(rel_data["target"])

        if source_id and target_id:
            # 避免重复关系
            dup_check = await db.execute(
                select(GraphRelation).where(
                    (GraphRelation.source_id == source_id) &
                    (GraphRelation.target_id == target_id) &
                    (GraphRelation.relation_type == rel_data["relation"])
                )
            )
            if dup_check.scalar_one_or_none() is None:
                relation = GraphRelation(
                    source_id=source_id,
                    target_id=target_id,
                    relation_type=rel_data["relation"],
                    weight=rel_data.get("weight", 1.0),
                    source_document="系统预置",
                    confidence=1.0,
                )
                db.add(relation)
                relation_count += 1

    await db.commit()

    return {
        "message": "图谱数据初始化完成",
        "entities": len(all_entity_data),
        "relations": relation_count,
    }


# =====================================================================
# LLM 实体关系抽取
# =====================================================================

async def extract_entities_from_text(
    db: AsyncSession,
    text: str,
    document_title: str,
) -> dict:
    """使用LLM从文本中抽取实体和关系"""
    from app.services.llm_service import call_llm

    prompt = f"""你是一个道路病害领域的知识图谱构建专家。请从以下文本中抽取实体和关系。

要求：
1. 实体类型包括：Disease（病害）、Cause（成因）、Repair（维修方法）、Material（材料）、Standard（标准）、Component（构件）、Risk（风险等级）、Region（区域）
2. 关系类型包括：CAUSED_BY（由...引起）、LEADS_TO（会导致）、TREATED_BY（由...维修）、USES_MATERIAL（使用材料）、AFFECTS_COMPONENT（影响构件）、RELATED_TO（相关）、OCCURS_IN（发生于）、CO_OCCURS（伴随发生）
3. 每条关系需要指明：source（源实体名）、target（目标实体名）、relation_type（关系类型）
4. 实体和关系都需要给出置信度（0-1）

文本内容：
{text[:3000]}

请以JSON格式返回，格式如下：
{{
  "entities": [
    {{"name": "实体名称", "entity_type": "类型", "description": "描述", "properties": {{}}, "confidence": 0.9}}
  ],
  "relations": [
    {{"source": "源实体", "target": "目标实体", "relation_type": "关系类型", "weight": 0.9}}
  ]
}}
"""

    try:
        response = await call_llm(prompt, system="你是一个专业的道路工程知识图谱构建助手，请严格按照JSON格式输出，不要包含任何其他文字。")
        content = response.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        result = json.loads(content)

        entities = result.get("entities", [])
        relations = result.get("relations", [])

        # 保存到数据库
        saved_entities = []
        name_to_id = {}

        for ent in entities:
            existing = await get_entity_by_name(db, ent["name"])
            if existing:
                entity_id = existing.id
            else:
                entity = GraphEntity(
                    name=ent["name"],
                    entity_type=ent.get("entity_type", "Disease"),
                    description=ent.get("description"),
                    properties=ent.get("properties", {}),
                    source_document=document_title,
                    confidence=ent.get("confidence", 0.8),
                    priority=3,
                )
                db.add(entity)
                await db.flush()
                entity_id = entity.id

            name_to_id[ent["name"]] = entity_id
            saved_entities.append({"name": ent["name"], "id": entity_id})

        # 保存关系
        saved_relations = 0
        for rel in relations:
            source_id = name_to_id.get(rel["source"])
            target_id = name_to_id.get(rel["target"])
            if source_id and target_id:
                dup_check = await db.execute(
                    select(GraphRelation).where(
                        (GraphRelation.source_id == source_id) &
                        (GraphRelation.target_id == target_id) &
                        (GraphRelation.relation_type == rel["relation_type"])
                    )
                )
                if dup_check.scalar_one_or_none() is None:
                    relation = GraphRelation(
                        source_id=source_id,
                        target_id=target_id,
                        relation_type=rel["relation_type"],
                        weight=rel.get("weight", 0.8),
                        source_document=document_title,
                        confidence=rel.get("confidence", 0.8),
                    )
                    db.add(relation)
                    saved_relations += 1

        await db.commit()
        return {
            "entities": saved_entities,
            "relations": saved_relations,
            "total_entities": len(saved_entities),
            "total_relations": saved_relations,
        }

    except Exception as e:
        await db.rollback()
        return {"error": str(e), "entities": [], "relations": 0}


# =====================================================================
# 文档管理
# =====================================================================

async def create_document(db: AsyncSession, data: dict) -> KnowledgeDocument:
    """创建知识文档"""
    doc = KnowledgeDocument(**data)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def list_documents(
    db: AsyncSession,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[KnowledgeDocument], int]:
    """分页查询文档"""
    query = select(KnowledgeDocument)
    count_query = select(func.count(KnowledgeDocument.id))

    if category:
        query = query.where(KnowledgeDocument.category == category)
        count_query = count_query.where(KnowledgeDocument.category == category)

    if search:
        search_filter = KnowledgeDocument.title.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    query = query.order_by(KnowledgeDocument.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    docs = result.scalars().all()

    return list(docs), total


async def get_document_by_id(db: AsyncSession, doc_id: int) -> Optional[KnowledgeDocument]:
    """根据ID获取文档"""
    result = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))
    return result.scalar_one_or_none()


async def delete_document(db: AsyncSession, doc_id: int) -> bool:
    """删除文档"""
    result = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        return False
    await db.delete(doc)
    await db.commit()
    return True
