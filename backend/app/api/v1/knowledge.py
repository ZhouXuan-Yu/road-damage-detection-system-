from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, engine
from app.core.database import Base
from app.models.knowledge import DiseaseKnowledge
from app.schemas.knowledge import (
    DiseaseKnowledgeCreate,
    DiseaseKnowledgeUpdate,
    DiseaseKnowledgeResponse,
    DiseaseKnowledgeListResponse,
    GraphResponse,
    GraphNode,
    GraphLink,
    DiseaseDetailResponse,
)

router = APIRouter(prefix="/kg", tags=["Knowledge Graph"])

# 节点颜色映射
NODE_COLORS = {
    "Disease": "#3b82f6",   # 蓝色
    "Obstacle": "#f59e0b",  # 橙色
    "Repair": "#10b981",    # 绿色
    "Cause": "#8b5cf6",     # 紫色
}


# 预定义初始数据
DEFAULT_KNOWLEDGE = [
    {
        "code": "D00",
        "name": "纵向裂缝",
        "type": "Disease",
        "description": "沿行车方向延伸的裂缝，通常宽度较小，是路面结构层在车辆荷载和温度应力共同作用下产生的早期病害。",
        "causes": [
            {"name": "路面老化", "description": "沥青材料随使用时间老化，粘结力下降"},
            {"name": "温度应力", "description": "温度变化引起的收缩应力导致开裂"},
            {"name": "超载交通", "description": "重载车辆反复作用导致结构疲劳"},
        ],
        "severity_low": "裂缝宽度 < 3mm，裂缝贯通性差，路面整体状况良好",
        "severity_medium": "裂缝宽度 3-10mm，部分贯通，可能伴有轻微剥落",
        "severity_high": "裂缝宽度 > 10mm，贯通性好，伴有严重剥落和沉降",
        "repair_methods": [
            {"method": "表面封层", "description": "使用雾封层或碎石封层", "cost": "20-50 元/m", "time": "1-2 天"},
            {"method": "填封处理", "description": "开槽后灌注密封胶或沥青", "cost": "50-150 元/m", "time": "2-3 天"},
            {"method": "铣刨重铺", "description": "铣刨上面层后重新摊铺", "cost": "150-300 元/m", "time": "3-5 天"},
        ],
        "related_codes": ["D01", "D20"],
        "cost_range": "20-300 元/m",
        "priority": 3,
    },
    {
        "code": "D01",
        "name": "纵向裂缝(变种)",
        "type": "Disease",
        "description": "纵向裂缝的变种形态，可能表现为边缘裂缝或施工缝裂缝。",
        "causes": [
            {"name": "路基不均匀沉降", "description": "路基压实度不足导致差异沉降"},
            {"name": "施工接缝处理不当", "description": "纵向接缝处粘结不良"},
        ],
        "severity_low": "裂缝宽度 < 2mm，局部出现",
        "severity_medium": "裂缝宽度 2-5mm，有发展趋势",
        "severity_high": "裂缝宽度 > 5mm，伴有错台现象",
        "repair_methods": [
            {"method": "灌缝处理", "description": "直接灌注密封材料", "cost": "30-60 元/m", "time": "1 天"},
            {"method": "注浆加固", "description": "路基注浆处理后填缝", "cost": "200-400 元/m", "time": "5-7 天"},
        ],
        "related_codes": ["D00", "D20"],
        "cost_range": "30-400 元/m",
        "priority": 2,
    },
    {
        "code": "D10",
        "name": "横向裂缝",
        "type": "Disease",
        "description": "垂直于行车方向的裂缝，通常与温度应力引起的路面收缩有关。",
        "causes": [
            {"name": "温度应力", "description": "温度变化引起的收缩应力"},
            {"name": "反射裂缝", "description": "基层裂缝反射到面层"},
            {"name": "半刚性基层温缩", "description": "半刚性基层温度收缩导致"},
        ],
        "severity_low": "裂缝宽度 < 3mm，间距 > 10m",
        "severity_medium": "裂缝宽度 3-8mm，间距 5-10m",
        "severity_high": "裂缝宽度 > 8mm，间距 < 5m，伴有唧浆",
        "repair_methods": [
            {"method": "灌缝处理", "description": "开槽后灌注密封胶", "cost": "40-80 元/m", "time": "1-2 天"},
            {"method": "贴缝带处理", "description": "直接粘贴防裂贴", "cost": "30-60 元/m", "time": "0.5 天"},
            {"method": "铣刨重铺", "description": "严重路段铣刨重铺", "cost": "150-350 元/m", "time": "3-5 天"},
        ],
        "related_codes": ["D11", "D20"],
        "cost_range": "30-350 元/m",
        "priority": 3,
    },
    {
        "code": "D11",
        "name": "横向裂缝(变种)",
        "type": "Disease",
        "description": "横向裂缝的变种形态，包括不规则横向裂缝和支缝。",
        "causes": [
            {"name": "基层强度不足", "description": "基层承载力不足导致开裂"},
            {"name": "排水不畅", "description": "水分侵蚀基层导致损坏"},
        ],
        "severity_low": "裂缝宽度 < 2mm，局部出现",
        "severity_medium": "裂缝宽度 2-6mm，伴有轻微唧浆",
        "severity_high": "裂缝宽度 > 6mm，伴有严重唧浆和沉陷",
        "repair_methods": [
            {"method": "填缝处理", "description": "清理后填封裂缝", "cost": "20-40 元/m", "time": "0.5 天"},
            {"method": "基层处理+重铺", "description": "处理基层后重铺面层", "cost": "300-500 元/m", "time": "5-7 天"},
        ],
        "related_codes": ["D10", "D40"],
        "cost_range": "20-500 元/m",
        "priority": 2,
    },
    {
        "code": "D20",
        "name": "龟裂/网裂",
        "type": "Disease",
        "description": "相互交错的裂缝形成的网状结构，是路面强度严重不足的表现。",
        "causes": [
            {"name": "荷载疲劳", "description": "长期车辆荷载作用导致疲劳破坏"},
            {"name": "基层软弱", "description": "基层材料强度不足或含水量过高"},
            {"name": "沥青老化", "description": "沥青性能老化，脆性增加"},
        ],
        "severity_low": "裂缝宽度 < 2mm，面积 < 10%",
        "severity_medium": "裂缝宽度 2-5mm，面积 10-30%",
        "severity_high": "裂缝宽度 > 5mm，面积 > 30%，伴有沉陷",
        "repair_methods": [
            {"method": "铣刨重铺", "description": "铣刨后重新摊铺沥青面层", "cost": "200-400 元/m", "time": "3-5 天"},
            {"method": "就地冷再生", "description": "对旧路面进行冷再生处理", "cost": "150-250 元/m", "time": "4-6 天"},
            {"method": "全面翻修", "description": "挖除旧路面结构后重新修建", "cost": "500-800 元/m", "time": "10-15 天"},
        ],
        "related_codes": ["D00", "D10", "D40"],
        "cost_range": "150-800 元/m",
        "priority": 4,
    },
    {
        "code": "D40",
        "name": "坑洞/块裂",
        "type": "Disease",
        "description": "路面局部破损形成的坑洞或块状破损，影响行车安全和舒适性。",
        "causes": [
            {"name": "水损害", "description": "水分渗入导致沥青剥落和基层软化"},
            {"name": "荷载作用", "description": "车辆荷载加速破损发展"},
            {"name": "施工缺陷", "description": "施工质量不良导致早期破损"},
        ],
        "severity_low": "坑洞直径 < 5cm，深度 < 2cm",
        "severity_medium": "坑洞直径 5-15cm，深度 2-5cm",
        "severity_high": "坑洞直径 > 15cm，深度 > 5cm，影响行车安全",
        "repair_methods": [
            {"method": "冷补料修补", "description": "使用冷补沥青混合料填补", "cost": "100-200 元/m", "time": "0.5 天"},
            {"method": "热补修补", "description": "切除破损后热拌沥青混凝土填补", "cost": "200-400 元/m", "time": "1-2 天"},
            {"method": "结构修补", "description": "处理基层后重铺各结构层", "cost": "400-600 元/m", "time": "5-7 天"},
        ],
        "related_codes": ["D20", "D43", "D44"],
        "cost_range": "100-600 元/m",
        "priority": 5,
    },
    {
        "code": "D43",
        "name": "井盖沉降",
        "type": "Disease",
        "description": "检查井周围路面沉降或破损，导致路面不平整。",
        "causes": [
            {"name": "压实不足", "description": "井周回填土压实度不足导致沉降"},
            {"name": "井体变形", "description": "检查井结构变形导致与路面高差"},
            {"name": "交通荷载", "description": "车辆荷载加速沉降发展"},
        ],
        "severity_low": "沉降量 < 5mm，高差不明显",
        "severity_medium": "沉降量 5-15mm，轻微跳车感",
        "severity_high": "沉降量 > 15mm，明显跳车感，影响行车安全",
        "repair_methods": [
            {"method": "注浆加固", "description": "注入水泥浆加固基础", "cost": "300-500 元/处", "time": "1-2 天"},
            {"method": "调整高程", "description": "调整井盖高程后重铺面层", "cost": "500-1000 元/处", "time": "2-3 天"},
            {"method": "重新砌筑", "description": "拆除重建检查井及路面", "cost": "2000-5000 元/处", "time": "5-7 天"},
        ],
        "related_codes": ["D40"],
        "cost_range": "300-5000 元/处",
        "priority": 3,
    },
    {
        "code": "D44",
        "name": "车辙",
        "type": "Disease",
        "description": "沿轮迹带形成的纵向凹陷，影响路面平整度和行车安全。",
        "causes": [
            {"name": "重载交通", "description": "车辆反复碾压导致塑性变形"},
            {"name": "高温软化", "description": "高温下沥青混合料软化易产生车辙"},
            {"name": "基层强度不足", "description": "基层承载力不足导致永久变形"},
        ],
        "severity_low": "车辙深度 < 10mm",
        "severity_medium": "车辙深度 10-25mm，有明显积水",
        "severity_high": "车辙深度 > 25mm，严重影响行车安全",
        "repair_methods": [
            {"method": "微表处", "description": "采用微表处或薄层罩面", "cost": "40-80 元/m", "time": "1 天"},
            {"method": "铣刨重铺", "description": "铣刨车辙层后重铺", "cost": "150-250 元/m", "time": "2-3 天"},
            {"method": "就地热再生", "description": "加热路面后翻松重铺", "cost": "200-350 元/m", "time": "3-4 天"},
        ],
        "related_codes": ["D40", "D20"],
        "cost_range": "40-350 元/m",
        "priority": 4,
    },
    {
        "code": "D50",
        "name": "障碍物",
        "type": "Obstacle",
        "description": "路面上的障碍物，如砖石、杂物、堆积物等，影响行车安全。",
        "causes": [
            {"name": "人为因素", "description": "杂物或障碍物遗留在路面"},
            {"name": "遗撒物", "description": "车辆遗撒的建筑材料或货物"},
        ],
        "severity_low": "小型障碍物，可轻易移除",
        "severity_medium": "中型障碍物，需要工具清理",
        "severity_high": "大型障碍物或危险物品，需专业处理",
        "repair_methods": [
            {"method": "清理恢复", "description": "移除障碍物并恢复路面清洁", "cost": "50-200 元/处", "time": "0.5 天"},
        ],
        "related_codes": [],
        "cost_range": "50-200 元/处",
        "priority": 5,
    },
]


@router.post("/init", include_in_schema=False)
async def init_knowledge_data(db: AsyncSession = Depends(get_db)):
    """初始化知识库数据（仅用于首次部署）"""
    # 检查是否已有数据
    result = await db.execute(select(func.count(DiseaseKnowledge.id)))
    count = result.scalar() or 0

    if count > 0:
        return {"message": f"知识库已有 {count} 条数据，跳过初始化"}

    # 插入初始数据
    for item in DEFAULT_KNOWLEDGE:
        knowledge = DiseaseKnowledge(**item)
        db.add(knowledge)

    await db.commit()
    return {"message": f"成功初始化 {len(DEFAULT_KNOWLEDGE)} 条知识数据"}


@router.get("/knowledge", response_model=DiseaseKnowledgeListResponse)
async def list_knowledge(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """获取知识库列表"""
    count_query = select(func.count(DiseaseKnowledge.id))
    if search:
        count_query = count_query.where(
            or_(
                DiseaseKnowledge.code.ilike(f"%{search}%"),
                DiseaseKnowledge.name.ilike(f"%{search}%"),
            )
        )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    query = (
        select(DiseaseKnowledge)
        .order_by(DiseaseKnowledge.priority.desc(), DiseaseKnowledge.code)
        .offset(offset)
        .limit(limit)
    )
    if search:
        query = query.where(
            or_(
                DiseaseKnowledge.code.ilike(f"%{search}%"),
                DiseaseKnowledge.name.ilike(f"%{search}%"),
            )
        )

    result = await db.execute(query)
    items = result.scalars().all()

    return DiseaseKnowledgeListResponse(
        items=[
            DiseaseKnowledgeResponse(
                id=item.id,
                code=item.code,
                name=item.name,
                type=item.type,
                description=item.description,
                causes=item.causes,
                severity_low=item.severity_low,
                severity_medium=item.severity_medium,
                severity_high=item.severity_high,
                repair_methods=item.repair_methods,
                related_codes=item.related_codes,
                image_urls=item.image_urls,
                cost_range=item.cost_range,
                priority=item.priority,
                created_at=item.created_at.isoformat() if item.created_at else "",
                updated_at=item.updated_at.isoformat() if item.updated_at else "",
            )
            for item in items
        ],
        total=total,
    )


@router.post("/knowledge", response_model=DiseaseKnowledgeResponse)
async def create_knowledge(
    request: DiseaseKnowledgeCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建新的病害知识"""
    # 检查是否已存在
    result = await db.execute(
        select(DiseaseKnowledge).where(DiseaseKnowledge.code == request.code)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"病害编码 {request.code} 已存在")

    knowledge = DiseaseKnowledge(**request.model_dump())
    db.add(knowledge)
    await db.commit()
    await db.refresh(knowledge)

    return DiseaseKnowledgeResponse(
        id=knowledge.id,
        code=knowledge.code,
        name=knowledge.name,
        type=knowledge.type,
        description=knowledge.description,
        causes=knowledge.causes,
        severity_low=knowledge.severity_low,
        severity_medium=knowledge.severity_medium,
        severity_high=knowledge.severity_high,
        repair_methods=knowledge.repair_methods,
        related_codes=knowledge.related_codes,
        image_urls=knowledge.image_urls,
        cost_range=knowledge.cost_range,
        priority=knowledge.priority,
        created_at=knowledge.created_at.isoformat() if knowledge.created_at else "",
        updated_at=knowledge.updated_at.isoformat() if knowledge.updated_at else "",
    )


@router.get("/knowledge/{code}", response_model=DiseaseKnowledgeResponse)
async def get_knowledge(code: str, db: AsyncSession = Depends(get_db)):
    """获取单个病害知识详情"""
    result = await db.execute(
        select(DiseaseKnowledge).where(DiseaseKnowledge.code == code)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, f"未找到病害编码 {code}")

    return DiseaseKnowledgeResponse(
        id=item.id,
        code=item.code,
        name=item.name,
        type=item.type,
        description=item.description,
        causes=item.causes,
        severity_low=item.severity_low,
        severity_medium=item.severity_medium,
        severity_high=item.severity_high,
        repair_methods=item.repair_methods,
        related_codes=item.related_codes,
        image_urls=item.image_urls,
        cost_range=item.cost_range,
        priority=item.priority,
        created_at=item.created_at.isoformat() if item.created_at else "",
        updated_at=item.updated_at.isoformat() if item.updated_at else "",
    )


@router.put("/knowledge/{code}", response_model=DiseaseKnowledgeResponse)
async def update_knowledge(
    code: str,
    request: DiseaseKnowledgeUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新病害知识"""
    result = await db.execute(
        select(DiseaseKnowledge).where(DiseaseKnowledge.code == code)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, f"未找到病害编码 {code}")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.commit()
    await db.refresh(item)

    return DiseaseKnowledgeResponse(
        id=item.id,
        code=item.code,
        name=item.name,
        type=item.type,
        description=item.description,
        causes=item.causes,
        severity_low=item.severity_low,
        severity_medium=item.severity_medium,
        severity_high=item.severity_high,
        repair_methods=item.repair_methods,
        related_codes=item.related_codes,
        image_urls=item.image_urls,
        cost_range=item.cost_range,
        priority=item.priority,
        created_at=item.created_at.isoformat() if item.created_at else "",
        updated_at=item.updated_at.isoformat() if item.updated_at else "",
    )


@router.delete("/knowledge/{code}")
async def delete_knowledge(code: str, db: AsyncSession = Depends(get_db)):
    """删除病害知识"""
    result = await db.execute(
        select(DiseaseKnowledge).where(DiseaseKnowledge.code == code)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, f"未找到病害编码 {code}")

    await db.delete(item)
    await db.commit()
    return {"message": f"成功删除病害 {code}"}


# ========== 图谱 API（从数据库获取） ==========

@router.get("/graph", response_model=GraphResponse)
async def get_graph(db: AsyncSession = Depends(get_db)):
    """获取知识图谱数据"""
    # 先检查数据库是否有数据
    result = await db.execute(select(DiseaseKnowledge))
    items = result.scalars().all()

    if not items:
        # 如果数据库为空，使用预定义数据
        items_data = DEFAULT_KNOWLEDGE
    else:
        items_data = [
            {
                "code": item.code,
                "name": item.name,
                "type": item.type,
                "description": item.description,
                "related_codes": item.related_codes or [],
            }
            for item in items
        ]

    # 构建节点
    nodes = []
    links = []
    for item in items_data:
        nodes.append(
            GraphNode(
                id=item["code"],
                name=item["name"],
                type=item["type"],
                description=item.get("description"),
                color=NODE_COLORS.get(item["type"], "#6b7280"),
            )
        )

        # 构建关系
        for related_code in item.get("related_codes", []):
            if related_code and related_code != item["code"]:
                # 检查目标节点是否存在
                target_exists = any(n["code"] == related_code for n in items_data)
                if target_exists:
                    links.append(
                        GraphLink(
                            source=item["code"],
                            target=related_code,
                            type="RELATED_TO",
                        )
                    )

    return GraphResponse(nodes=nodes, links=links)


@router.get("/disease/{disease_id}", response_model=DiseaseDetailResponse)
async def get_disease_detail(disease_id: str, db: AsyncSession = Depends(get_db)):
    """获取病害详情"""
    result = await db.execute(
        select(DiseaseKnowledge).where(DiseaseKnowledge.code == disease_id)
    )
    item = result.scalar_one_or_none()

    if item:
        return DiseaseDetailResponse(
            id=item.code,
            name=item.name,
            type=item.type,
            description=item.description,
            causes=item.causes or [],
            severity_low=item.severity_low,
            severity_medium=item.severity_medium,
            severity_high=item.severity_high,
            repair_methods=item.repair_methods or [],
            related_codes=item.related_codes or [],
            affected_components=[],
        )

    # 如果数据库没有，查找预定义数据
    for item in DEFAULT_KNOWLEDGE:
        if item["code"] == disease_id:
            return DiseaseDetailResponse(
                id=item["code"],
                name=item["name"],
                type=item["type"],
                description=item.get("description"),
                causes=item.get("causes", []),
                severity_low=item.get("severity_low"),
                severity_medium=item.get("severity_medium"),
                severity_high=item.get("severity_high"),
                repair_methods=item.get("repair_methods", []),
                related_codes=item.get("related_codes", []),
                affected_components=[],
            )

    raise HTTPException(404, f"未找到病害 {disease_id}")
