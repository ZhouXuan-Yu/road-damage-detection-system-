"""
语义搜索服务
提供基于关键词和实体类型的知识图谱语义搜索
"""

import re
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge_graph import GraphEntity, GraphRelation
from app.services.kg_seed_data import ENTITY_TYPES


async def semantic_search(
    db: AsyncSession,
    query: str,
    top_k: int = 5,
    entity_type: Optional[str] = None,
) -> list[dict]:
    """
    语义搜索实体

    使用关键词匹配 + 字段权重评分：
    - 名称完全匹配: 100分
    - 名称包含: 80分
    - 代码匹配: 90分
    - 描述包含: 50分
    - 属性值包含: 40分
    """
    query_lower = query.lower()

    q = select(GraphEntity)
    if entity_type:
        q = q.where(GraphEntity.entity_type == entity_type)

    result = await db.execute(q)
    entities = result.scalars().all()

    scored = []
    for entity in entities:
        score = 0.0
        matched_fields = []

        # 名称完全匹配
        if entity.name.lower() == query_lower:
            score += 100
            matched_fields.append("name_exact")

        # 名称包含关键词
        if query_lower in entity.name.lower():
            score += 80
            matched_fields.append("name_contains")

        # 代码匹配
        if entity.code and query_lower in entity.code.lower():
            score += 90
            matched_fields.append("code")

        # 病害分类代码匹配（如D00, D10等）
        code_match = re.search(r'D\d+[A-Z]?', query, re.IGNORECASE)
        if code_match and entity.code and code_match.group().upper() == entity.code.upper():
            score += 95
            matched_fields.append("disease_code")

        # 描述匹配
        if entity.description and query_lower in entity.description.lower():
            score += 50
            matched_fields.append("description")

        # 属性匹配
        if entity.properties:
            props_str = str(entity.properties).lower()
            if query_lower in props_str:
                score += 40
                matched_fields.append("properties")

        # 同义词/语义扩展匹配
        query_keywords = query_lower.split()
        type_synonyms = {
            "裂缝": ["裂缝", "裂纹", "开裂", "裂隙"],
            "车辙": ["车辙", "推移", "凹陷"],
            "坑洞": ["坑洞", "坑槽", "破损", "凹陷"],
            "翻浆": ["翻浆", "唧浆", "泥浆"],
            "龟裂": ["龟裂", "网裂", "网状裂缝"],
            "井盖": ["井盖", "检查井", "窨井"],
            "沥青": ["沥青", "AC", "SMA", "OGFC"],
            "维修": ["维修", "养护", "修补", "修复", "处理"],
            "标准": ["标准", "规范", "规程", "JTG"],
            "基层": ["基层", "底基层", "级配碎石", "水泥稳定"],
        }

        for base_word, synonyms in type_synonyms.items():
            if base_word in query_lower:
                for syn in synonyms:
                    if syn in entity.name.lower() or (entity.description and syn in entity.description.lower()):
                        score += 30
                        matched_fields.append(f"semantic:{base_word}")
                        break

        # 实体类型优先级
        type_priority = {
            "Disease": 1.2,
            "Cause": 1.1,
            "Repair": 1.1,
            "Material": 1.0,
            "Standard": 1.0,
            "Component": 1.0,
            "Risk": 1.0,
            "Region": 1.0,
            "Obstacle": 1.0,
        }
        score *= type_priority.get(entity.entity_type, 1.0)

        if score > 0:
            scored.append({
                "id": entity.id,
                "name": entity.name,
                "entity_type": entity.entity_type,
                "code": entity.code,
                "description": entity.description,
                "severity_level": entity.severity_level,
                "cost_range": entity.cost_range,
                "priority": entity.priority,
                "score": round(score, 2),
                "matched_fields": matched_fields,
            })

    # 排序并返回top_k
    scored.sort(key=lambda x: -x["score"])
    return scored[:top_k]


async def search_related_entities(
    db: AsyncSession,
    entity_id: int,
    depth: int = 1,
    max_results: int = 20,
) -> list[dict]:
    """
    搜索与指定实体相关的所有实体（多跳）
    """
    from sqlalchemy.orm import selectinload

    # 获取所有关系
    rel_result = await db.execute(
        select(GraphRelation).options(
            selectinload(GraphRelation.source),
            selectinload(GraphRelation.target)
        )
    )
    all_relations = rel_result.scalars().all()

    # BFS搜索
    connected = {entity_id}
    queue = [entity_id]
    results = []

    for _ in range(depth):
        next_queue = []
        for current_id in queue:
            for rel in all_relations:
                neighbor_id = None
                if rel.source_id == current_id and rel.target_id not in connected:
                    neighbor_id = rel.target_id
                elif rel.target_id == current_id and rel.source_id not in connected:
                    neighbor_id = rel.source_id

                if neighbor_id:
                    connected.add(neighbor_id)
                    next_queue.append(neighbor_id)
                    results.append({
                        "entity_id": neighbor_id,
                        "via_relation": rel.relation_type,
                        "depth": _ + 1,
                    })

        queue = next_queue
        if not queue:
            break

    # 获取实体详情
    if not results:
        return []

    entity_ids = [r["entity_id"] for r in results[:max_results]]
    entity_result = await db.execute(
        select(GraphEntity).where(GraphEntity.id.in_(entity_ids))
    )
    entity_map = {e.id: e for e in entity_result.scalars().all()}

    enriched = []
    for r in results[:max_results]:
        entity = entity_map.get(r["entity_id"])
        if entity:
            enriched.append({
                "id": entity.id,
                "name": entity.name,
                "entity_type": entity.entity_type,
                "code": entity.code,
                "description": entity.description,
                "via_relation": r["via_relation"],
                "depth": r["depth"],
                "priority": entity.priority,
            })

    return enriched


async def get_graph_statistics(db: AsyncSession) -> dict:
    """获取图谱统计信息"""
    # 实体统计
    total_result = await db.execute(select(func.count(GraphEntity.id)))
    total_entities = total_result.scalar() or 0

    # 关系统计
    rel_result = await db.execute(select(func.count(GraphRelation.id)))
    total_relations = rel_result.scalar() or 0

    # 按类型统计
    type_result = await db.execute(
        select(GraphEntity.entity_type, func.count(GraphEntity.id))
        .group_by(GraphEntity.entity_type)
    )
    type_distribution = {row[0]: row[1] for row in type_result.all()}

    # 按关系类型统计
    rel_type_result = await db.execute(
        select(GraphRelation.relation_type, func.count(GraphRelation.id))
        .group_by(GraphRelation.relation_type)
    )
    rel_type_distribution = {row[0]: row[1] for row in rel_type_result.all()}

    # 最常见的关联实体
    from sqlalchemy import text
    popular_result = await db.execute(
        text("""
            SELECT e.name, e.entity_type, COUNT(r.id) as rel_count
            FROM graph_entities e
            LEFT JOIN graph_relations r ON e.id = r.source_id OR e.id = r.target_id
            GROUP BY e.id
            ORDER BY rel_count DESC
            LIMIT 10
        """)
    )
    popular_entities = [
        {"name": row[0], "type": row[1], "relations": row[2]}
        for row in popular_result.all()
    ]

    return {
        "total_entities": total_entities,
        "total_relations": total_relations,
        "type_distribution": type_distribution,
        "relation_type_distribution": rel_type_distribution,
        "popular_entities": popular_entities,
        "entity_types": list(ENTITY_TYPES.keys()),
        "relation_types": [
            "CAUSED_BY", "LEADS_TO", "TREATED_BY", "USES_MATERIAL",
            "APPLIES_STANDARD", "AFFECTS_COMPONENT", "RELATED_TO",
            "OCCURS_IN", "CO_OCCURS", "CLASSIFIED_BY",
        ],
    }
