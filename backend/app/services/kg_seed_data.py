"""
知识图谱种子数据
覆盖道路病害领域的多种实体类型和关系
"""

# =====================================================================
# 实体定义
# =====================================================================

ENTITY_TYPES = {
    "Disease": "#3b82f6",    # 蓝色 - 病害
    "Cause": "#ef4444",       # 红色 - 成因
    "Repair": "#10b981",      # 绿色 - 维修方法
    "Material": "#f59e0b",    # 橙色 - 材料
    "Standard": "#8b5cf6",    # 紫色 - 技术标准
    "Component": "#06b6d4",    # 青色 - 道路构件
    "Risk": "#ec4899",        # 粉色 - 风险等级
    "Region": "#84cc16",      # 亮绿 - 区域/路段
    "Obstacle": "#f97316",    # 深橙 - 障碍物
}

RELATION_TYPES = {
    "CAUSED_BY": {"label": "由...引起", "color": "#ef4444", "width": 2},
    "LEADS_TO": {"label": "会导致", "color": "#f97316", "width": 2},
    "TREATED_BY": {"label": "由...维修", "color": "#10b981", "width": 2},
    "USES_MATERIAL": {"label": "使用材料", "color": "#f59e0b", "width": 1.5},
    "APPLIES_STANDARD": {"label": "依据标准", "color": "#8b5cf6", "width": 1.5},
    "AFFECTS_COMPONENT": {"label": "影响构件", "color": "#06b6d4", "width": 1.5},
    "RELATED_TO": {"label": "相关", "color": "#94a3b8", "width": 1},
    "OCCURS_IN": {"label": "发生于", "color": "#84cc16", "width": 1.5},
    "CO_OCCURS": {"label": "伴随发生", "color": "#ec4899", "width": 1.5},
    "CLASSIFIED_BY": {"label": "按...分类", "color": "#64748b", "width": 1},
    "MEETS_STANDARD": {"label": "符合标准", "color": "#22c55e", "width": 1},
}

# =====================================================================
# 病害实体 (Disease)
# =====================================================================
DISEASE_ENTITIES = [
    {
        "name": "纵向裂缝", "code": "D00", "entity_type": "Disease",
        "description": "沿行车方向延伸的裂缝，宽度通常在1-10mm之间，是路面结构在车辆荷载和温度应力共同作用下的早期病害。纵向裂缝会加速路面的水损害和结构破坏。",
        "severity_level": "medium", "priority": 3, "cost_range": "20-300 元/m",
        "properties": {"width_range": "1-10mm", "depth_range": "20-50mm", "spacing": "连续或断续", "pattern": "平行于行车方向"}
    },
    {
        "name": "纵向裂缝(边缘型)", "code": "D01", "entity_type": "Disease",
        "description": "沿路面边缘或施工接缝处出现的纵向裂缝，通常与路基压实度不足或施工质量有关。",
        "severity_level": "medium", "priority": 2, "cost_range": "30-400 元/m",
        "properties": {"location": "路面边缘或接缝", "common_cause": "路基不均匀沉降"}
    },
    {
        "name": "横向裂缝", "code": "D10", "entity_type": "Disease",
        "description": "垂直于行车方向的裂缝，主要由温度应力或基层反射裂缝引起，是半刚性基层沥青路面最常见的病害之一。",
        "severity_level": "medium", "priority": 3, "cost_range": "30-350 元/m",
        "properties": {"width_range": "1-8mm", "spacing_range": "5-15m", "orientation": "垂直于行车方向", "pattern": "等间距或随机"}
    },
    {
        "name": "横向裂缝(不规则型)", "code": "D11", "entity_type": "Disease",
        "description": "横向裂缝的变种形态，包括不规则横向裂缝和伴有支缝的裂缝，通常与基层强度不足或排水问题相关。",
        "severity_level": "high", "priority": 2, "cost_range": "20-500 元/m",
        "properties": {"pattern": "不规则或带支缝", "associated_issue": "唧浆、沉陷"}
    },
    {
        "name": "龟裂/网裂", "code": "D20", "entity_type": "Disease",
        "description": "相互交错的裂缝形成的网状结构，裂缝宽度通常2-10mm，是路面强度严重不足的表现，表明路面结构已经发生整体性破坏。",
        "severity_level": "high", "priority": 4, "cost_range": "150-800 元/m",
        "properties": {"width_range": "2-10mm", "area_ratio": "5-50%", "pattern": "网状交错", "structural_impact": "严重"}
    },
    {
        "name": "坑洞", "code": "D40A", "entity_type": "Disease",
        "description": "路面局部破损形成的坑洞，直径从5cm到30cm以上不等，是水损害和荷载共同作用的结果。坑洞会严重影响行车安全和舒适性。",
        "severity_level": "high", "priority": 5, "cost_range": "100-600 元/m",
        "properties": {"diameter_range": "5-30cm+", "depth_range": "2-10cm", "progression": "快速发展", "safety_impact": "严重"}
    },
    {
        "name": "块裂", "code": "D40B", "entity_type": "Disease",
        "description": "路面呈块状破损，块体尺寸通常在30-100cm之间，是路面结构整体性破坏的表现。",
        "severity_level": "high", "priority": 4, "cost_range": "200-600 元/m",
        "properties": {"block_size": "30-100cm", "pattern": "矩形或多边形块体"}
    },
    {
        "name": "井盖沉降", "code": "D43", "entity_type": "Disease",
        "description": "检查井周围路面与井盖之间出现高差（沉降量5-50mm），导致路面不平整，产生跳车感，影响行车舒适性和安全性。",
        "severity_level": "medium", "priority": 3, "cost_range": "300-5000 元/处",
        "properties": {"settlement_range": "5-50mm", "location": "检查井周围", "impact": "跳车感、噪音"}
    },
    {
        "name": "车辙", "code": "D44", "entity_type": "Disease",
        "description": "沿轮迹带形成的纵向凹陷，深度通常在5-30mm，严重时可达50mm以上，主要由沥青混合料塑性变形和基层永久变形引起。",
        "severity_level": "medium", "priority": 4, "cost_range": "40-350 元/m",
        "properties": {"depth_range": "5-50mm", "location": "轮迹带", "width": "30-80cm/条", "water_accumulation": "易积水"}
    },
    {
        "name": "拥包", "code": "D45", "entity_type": "Disease",
        "description": "路面局部隆起形成包状变形，通常由于沥青混合料高温稳定性不足或基层波浪变形引起。",
        "severity_level": "medium", "priority": 3, "cost_range": "80-300 元/m",
        "properties": {"height_range": "5-30mm", "wavelength": "0.5-3m", "cause": "高温软化或基层波浪"}
    },
    {
        "name": "波浪/搓板", "code": "D46", "entity_type": "Disease",
        "description": "路面呈现周期性起伏的波状变形，类似搓衣板状，严重影响行车舒适性和安全性。",
        "severity_level": "high", "priority": 3, "cost_range": "150-400 元/m",
        "properties": {"wavelength": "0.3-2m", "amplitude": "5-50mm", "pattern": "周期性起伏"}
    },
    {
        "name": "沉陷", "code": "D47", "entity_type": "Disease",
        "description": "路面局部下沉形成的凹陷，通常与路基压实不足、地下空洞或管道渗漏有关。",
        "severity_level": "high", "priority": 4, "cost_range": "300-800 元/m",
        "properties": {"depth_range": "10-100mm", "area_range": "0.5-10m", "cause": "路基软弱或地下问题"}
    },
    {
        "name": "翻浆", "code": "D48", "entity_type": "Disease",
        "description": "路面在春季出现泥浆从裂缝中唧出的现象，是路面结构内部含水量过高的表现，严重影响路面强度和行车安全。",
        "severity_level": "critical", "priority": 5, "cost_range": "400-1000 元/m",
        "properties": {"season": "春季解冻期", "indicator": "泥浆唧出", "structural_impact": "结构严重弱化"}
    },
    {
        "name": "剥落", "code": "D49", "entity_type": "Disease",
        "description": "沥青路面表面集料颗粒脱落，露出下层路面，形成粗糙松散的表面。",
        "severity_level": "low", "priority": 2, "cost_range": "30-100 元/m",
        "properties": {"depth": "表面层", "pattern": "集料颗粒脱落", "progression": "缓慢"}
    },
    {
        "name": "磨光", "code": "D50A", "entity_type": "Disease",
        "description": "路面表面集料被车辆磨光，摩擦系数降低，影响行车安全，尤其是在雨天。",
        "severity_level": "medium", "priority": 2, "cost_range": "50-150 元/m",
        "properties": {"friction_loss": "20-40%", "wet_skid_resistance": "显著降低", "location": "轮迹带"}
    },
    {
        "name": "裂缝修补失效", "code": "D51", "entity_type": "Disease",
        "description": "之前修补的裂缝重新开裂或修补材料与原路面脱离，表明修补方案不适当或路面状况持续恶化。",
        "severity_level": "medium", "priority": 3, "cost_range": "50-200 元/m",
        "properties": {"location": "原修补处", "pattern": "修补材料剥离或重新开裂", "common_cause": "材料选择不当或施工质量问题"}
    },
    {
        "name": "障碍物", "code": "D60", "entity_type": "Obstacle",
        "description": "路面上存在的各种障碍物，包括砖石、杂物、堆积物、建筑材料等，影响行车安全。",
        "severity_level": "medium", "priority": 5, "cost_range": "50-200 元/处",
        "properties": {"type": "杂物、砖石、堆积物等", "removal_difficulty": "差异较大", "safety_impact": "直接"}
    },
]

# =====================================================================
# 成因实体 (Cause)
# =====================================================================
CAUSE_ENTITIES = [
    {
        "name": "温度应力疲劳", "entity_type": "Cause",
        "description": "由于季节性或昼夜温度变化引起的周期性收缩和膨胀应力，导致路面材料产生疲劳开裂。",
        "properties": {"temperature_range": "-20°C ~ 60°C", "cycle_frequency": "昼夜循环+季节循环", "main_affected": "裂缝类病害"}
    },
    {
        "name": "车辆荷载疲劳", "entity_type": "Cause",
        "description": "车辆反复荷载作用下，路面结构层产生累积损伤，导致强度降低和开裂。",
        "properties": {"critical_factors": ["轴载重量", "交通量", "荷载频率"], "main_affected": ["龟裂", "车辙", "疲劳裂缝"]}
    },
    {
        "name": "水损害", "entity_type": "Cause",
        "description": "水分渗入路面结构内部，导致沥青粘结力下降、基层软化，是路面破坏的最主要诱因之一。",
        "properties": {"mechanism": "沥青剥落+基层软化", "water_source": "降雨、积水、毛细水", "main_affected": ["坑洞", "龟裂", "翻浆"]}
    },
    {
        "name": "沥青老化", "entity_type": "Cause",
        "description": "沥青材料随时间发生氧化、硬化和脆化，粘结力和韧性显著下降，导致开裂。",
        "properties": {"aging_rate": "3-5%/年", "service_life": "8-15年", "symptoms": ["硬化", "脆化", "开裂"]}
    },
    {
        "name": "路基压实不足", "entity_type": "Cause",
        "description": "路基施工时压实度达不到设计要求，导致后期产生不均匀沉降，引起路面裂缝和沉陷。",
        "properties": {"required_compaction": "≥93%", "common_locations": ["桥头", "管道上方", "新旧路结合部"]}
    },
    {
        "name": "半刚性基层温缩", "entity_type": "Cause",
        "description": "半刚性基层材料在温度变化时产生收缩裂缝，反射到沥青面层形成横向裂缝。",
        "properties": {"temperature_sensitivity": "高", "crack_spacing": "5-15m", "reflection_mechanism": "裂缝向上扩展"}
    },
    {
        "name": "基层强度不足", "entity_type": "Cause",
        "description": "基层材料承载力不足，无法承受设计的车辆荷载，导致路面结构整体性破坏。",
        "properties": {"cbr_requirement": "≥80%", "common_causes": ["材料不良", "含水量过高", "施工质量差"]}
    },
    {
        "name": "排水系统失效", "entity_type": "Cause",
        "description": "路面排水设施（边沟、排水管、透水层等）堵塞或损坏，导致路面积水和结构内部积水。",
        "properties": {"consequence": "路面积水+结构内部积水", "main_affected": ["水损害", "翻浆", "唧浆"]}
    },
    {
        "name": "重载交通", "entity_type": "Cause",
        "description": "超过设计标准的重型车辆（超载货车、集装箱车等）反复作用，加速路面结构破坏。",
        "properties": {"overload_rate": "30-200%", "damage_multiplier": "指数增长", "main_affected": ["车辙", "疲劳裂缝", "拥包"]}
    },
    {
        "name": "施工质量缺陷", "entity_type": "Cause",
        "description": "路面施工过程中的各种质量问题，如碾压不足、接缝处理不当、材料离析等。",
        "properties": {"common_types": ["离析", "碾压不足", "接缝不良", "层间污染"], "time_to_appear": "1-5年"}
    },
    {
        "name": "地下水位过高", "entity_type": "Cause",
        "description": "地下水位接近或高于路基顶面，毛细水上升导致路基含水量过高，强度降低。",
        "properties": {"critical_depth": "<1.5m", "effects": ["路基软化", "冻融破坏", "翻浆"]}
    },
    {
        "name": "冻融循环", "entity_type": "Cause",
        "description": "在寒冷地区，路面结构内部的水分反复冻融，导致体积膨胀收缩，加速路面破坏。",
        "properties": {"temperature_range": "-10°C ~ 5°C", "freeze_thaw_cycles": "50-100次/年", "main_affected": ["裂缝", "剥落", "松散"]}
    },
]

# =====================================================================
# 维修方法实体 (Repair)
# =====================================================================
REPAIR_ENTITIES = [
    {
        "name": "裂缝填封", "entity_type": "Repair",
        "description": "对裂缝进行清理和密封处理，防止水分渗入。适用于宽度小于10mm的裂缝。",
        "severity_level": "low", "priority": 2, "cost_range": "20-80 元/m",
        "properties": {"suitable_width": "<10mm", "materials": ["密封胶", "沥青", "冷补料"], "preparation": "开槽+清理+干燥"}
    },
    {
        "name": "雾封层", "entity_type": "Repair",
        "description": "在路面表面喷洒稀释沥青乳液，形成薄层防水膜，延缓路面老化。适用于轻微裂缝和老化路面。",
        "severity_level": "low", "priority": 1, "cost_range": "8-20 元/m",
        "properties": {"film_thickness": "0.5-1mm", "lifespan": "1-2年", "effect": "防水+延缓老化"}
    },
    {
        "name": "碎石封层", "entity_type": "Repair",
        "description": "在路面喷洒沥青后撒布碎石，形成磨耗层，提高路面抗滑和防水性能。",
        "severity_level": "low", "priority": 1, "cost_range": "15-40 元/m",
        "properties": {"thickness": "5-15mm", "lifespan": "2-3年", "advantages": ["防水", "抗滑", "快速"]}
    },
    {
        "name": "微表处", "entity_type": "Repair",
        "description": "使用改性乳化沥青、集料和添加剂组成的混合料进行薄层摊铺，快速恢复路面性能。",
        "severity_level": "medium", "priority": 2, "cost_range": "30-60 元/m",
        "properties": {"thickness": "8-15mm", "lifespan": "3-5年", "advantages": ["快速", "防水", "抗滑"]}
    },
    {
        "name": "铣刨重铺", "entity_type": "Repair",
        "description": "铣刨掉损坏的路面层后，重新摊铺新的沥青混合料，是最常用的中修方案。",
        "severity_level": "medium", "priority": 3, "cost_range": "120-350 元/m",
        "properties": {"milling_depth": "30-100mm", "pavement_types": ["上面层", "中面层"], "lifespan": "5-8年"}
    },
    {
        "name": "就地热再生", "entity_type": "Repair",
        "description": "加热路面后翻松，添加再生剂和新料，就地拌和摊铺，实现旧料再利用。",
        "severity_level": "medium", "priority": 2, "cost_range": "150-300 元/m",
        "properties": {"recycling_depth": "25-50mm", "recycling_rate": "80-100%", "environmental": "节能减碳"}
    },
    {
        "name": "就地冷再生", "entity_type": "Repair",
        "description": "将旧路面材料与水泥、乳化沥青等结合，就地拌和形成新的基层材料。",
        "severity_level": "high", "priority": 3, "cost_range": "100-200 元/m",
        "properties": {"recycling_depth": "100-300mm", "binder": ["水泥", "乳化沥青", "泡沫沥青"], "structural_layer": "基层"}
    },
    {
        "name": "注浆加固", "entity_type": "Repair",
        "description": "通过注浆管向路基或基层注入水泥浆或化学浆液，加固软弱地基，填充空洞。",
        "severity_level": "high", "priority": 4, "cost_range": "200-600 元/m",
        "properties": {"grout_types": ["水泥浆", "水泥-水玻璃", "聚氨酯"], "pressure": "0.5-2MPa", "applies_to": ["路基", "基层", "桥头"]}
    },
    {
        "name": "冷补料修补", "entity_type": "Repair",
        "description": "使用预拌的冷拌沥青混合料修补坑洞，无需加热，可全天候施工，适合应急修补。",
        "severity_level": "low", "priority": 1, "cost_range": "100-250 元/m",
        "properties": {"temperature_range": "-20°C ~ 40°C", "curing_time": "无需养生或1-3天", "durability": "临时或短期"}
    },
    {
        "name": "热补修补", "entity_type": "Repair",
        "description": "切除损坏区域后，使用热拌沥青混合料填补，是坑洞修补的标准方法。",
        "severity_level": "medium", "priority": 2, "cost_range": "200-450 元/m",
        "properties": {"layer_treatment": "切除+回填", "lifespan": "3-5年", "temperature": "需要加热至150-170°C"}
    },
    {
        "name": "翻修重建", "entity_type": "Repair",
        "description": "挖除全部或大部分路面结构层，重新修建，适用于路面结构严重损坏的情况。",
        "severity_level": "critical", "priority": 5, "cost_range": "500-1500 元/m",
        "properties": {"depth": "100-500mm", "full_reconstruction": True, "lifespan": "15-20年", "cost": "最高"}
    },
    {
        "name": "薄层罩面", "entity_type": "Repair",
        "description": "在原路面上加铺一层薄沥青面层（20-40mm），恢复路面平整度和使用性能。",
        "severity_level": "medium", "priority": 2, "cost_range": "40-80 元/m",
        "properties": {"thickness": "20-40mm", "types": ["SMA", "OGFC", "密级配"], "lifespan": "3-6年"}
    },
    {
        "name": "车辙填补", "entity_type": "Repair",
        "description": "针对车辙病害，使用专用的车辙填补料或铣刨后重铺，恢复路面横坡。",
        "severity_level": "medium", "priority": 3, "cost_range": "60-200 元/m",
        "properties": {"methods": ["填补料直接填补", "铣刨重铺"], "depth_range": "5-30mm", "rutting_type": "失稳型车辙"}
    },
]

# =====================================================================
# 材料实体 (Material)
# =====================================================================
MATERIAL_ENTITIES = [
    {
        "name": "普通沥青混凝土", "entity_type": "Material",
        "description": "以普通沥青为胶结料，与集料拌和形成的混合料，是最常用的路面材料。",
        "properties": {"grades": ["AC-10", "AC-13", "AC-16", "AC-20", "AC-25"], "binder": "普通沥青(A级/B级)", "applications": ["上面层", "中面层", "下面层"]}
    },
    {
        "name": "改性沥青混凝土", "entity_type": "Material",
        "description": "在普通沥青中加入改性剂（SBS、SBR、PE等）提高性能，适用于重载交通和高温地区。",
        "properties": {"modifier_types": ["SBS", "SBR", "PE", "橡胶沥青"], "high_temp_performance": "显著提升", "applications": ["上面层", "重载路段"]}
    },
    {
        "name": "SMA沥青玛蹄脂碎石混合料", "entity_type": "Material",
        "description": "以沥青玛蹄脂填充粗集料骨架形成的间断级配混合料，抗车辙和抗滑性能优异。",
        "properties": {"骨架类型": "粗集料骨架", "最大公称粒径": "13/16mm", "advantages": ["抗车辙", "抗滑", "耐久性好"]}
    },
    {
        "name": "OGFC排水沥青混合料", "entity_type": "Material",
        "description": "大孔隙开级配排水沥青混合料，孔隙率15-25%，快速排除路面积水，提高雨天行车安全。",
        "properties": {"porosity": "15-25%", "drainage": "快速排水", "noise_reduction": "显著降噪", "applications": ["上面层"]}
    },
    {
        "name": "乳化沥青", "entity_type": "Material",
        "description": "沥青以微粒状态分散在水中形成的乳液，用于冷拌冷铺、透层、粘层等。",
        "properties": {"types": ["阳离子", "阴离子"], "applications": ["透层", "粘层", "冷补料", "稀浆封层"]}
    },
    {
        "name": "水泥稳定碎石", "entity_type": "Material",
        "description": "以碎石为骨架，水泥为结合料，经拌和、摊铺、碾压形成的半刚性基层材料。",
        "properties": {"cement_content": "3-6%", "strength": "3-6MPa", "layer": "基层/底基层", "rigidity": "高"}
    },
    {
        "name": "二灰碎石", "entity_type": "Material",
        "description": "以石灰、粉煤灰和碎石为主要材料形成的半刚性基层材料，具有良好的后期强度。",
        "properties": {"mix_ratio": "石灰:粉煤灰:碎石=5~8:15~20:60~75", "strength_gain": "慢", "environmental": "利用工业废渣"}
    },
    {
        "name": "级配碎石", "entity_type": "Material",
        "description": "经过精心级配设计的碎石材料，用于柔性基层或底基层，具有良好的透水性。",
        "properties": {"layer": "基层/底基层", "drainage": "良好", "strength": "依靠级配嵌挤"}
    },
    {
        "name": "高模量沥青混凝土", "entity_type": "Material",
        "description": "添加了聚酯纤维或硬沥青的高模量沥青混合料，具有优异的高温抗车辙性能。",
        "properties": {"modulus": "高", "high_temp_stability": "优异", "applications": ["重载路段", "长大坡道"]}
    },
]

# =====================================================================
# 技术标准实体 (Standard)
# =====================================================================
STANDARD_ENTITIES = [
    {
        "name": "JTG D81《公路交通安全设施设计规范》", "entity_type": "Standard",
        "description": "规定了公路交通安全设施的设计要求，包括路面标线、防撞设施等。",
        "properties": {"issuing_authority": "交通运输部", "implementation_date": "2017年"}
    },
    {
        "name": "JTG E60《公路路基路面现场测试规程》", "entity_type": "Standard",
        "description": "规定了路基路面现场测试的方法和要求，包括病害调查、弯沉检测等。",
        "properties": {"issuing_authority": "交通运输部", "key_tests": ["FWD弯沉", "摩擦系数", "构造深度"]}
    },
    {
        "name": "JTG 5142《公路沥青路面养护技术规范》", "entity_type": "Standard",
        "description": "规定了沥青路面养护技术要求，包括养护决策、养护对策等。",
        "properties": {"issuing_authority": "交通运输部", "PCI_PCI": "路面损坏状况指数", "养护分类": ["预防性养护", "中修", "大修"]}
    },
    {
        "name": "CJJ 36《城镇道路养护技术规范》", "entity_type": "Standard",
        "description": "规定了城镇道路的养护技术要求，包括日常养护、预防性养护和修复性养护。",
        "properties": {"issuing_authority": "住房和城乡建设部", "适用范围": "城镇道路"}
    },
    {
        "name": "《公路沥青路面设计规范》(JTG D50)", "entity_type": "Standard",
        "description": "规定了沥青路面结构设计的方法和要求，包括设计参数、结构组合等。",
        "properties": {"issuing_authority": "交通运输部", "design_method": "力学-经验法"}
    },
    {
        "name": "《公路工程质量检验评定标准》(JTG F80)", "entity_type": "Standard",
        "description": "规定了公路工程质量检验评定的标准和方法，是施工质量控制的依据。",
        "properties": {"issuing_authority": "交通运输部", "grading": ["合格", "优良"]}
    },
]

# =====================================================================
# 道路构件实体 (Component)
# =====================================================================
COMPONENT_ENTITIES = [
    {
        "name": "沥青混凝土面层", "entity_type": "Component",
        "description": "路面的最上层，直接承受车辆荷载和环境作用，由沥青混合料铺筑而成。",
        "properties": {"layers": ["上面层", "中面层", "下面层"], "thickness": "40-180mm", "main_functions": ["承受荷载", "提供平整度", "抗滑耐磨"]}
    },
    {
        "name": "半刚性基层", "entity_type": "Component",
        "description": "位于面层之下，以水泥稳定碎石、二灰碎石等半刚性材料为主的结构层。",
        "properties": {"materials": ["水泥稳定碎石", "二灰碎石", "水泥粉煤灰碎石"], "thickness": "200-400mm", "rigidity": "高"}
    },
    {
        "name": "柔性基层", "entity_type": "Component",
        "description": "以级配碎石、沥青碎石等柔性材料为主的基层，适用于重载或有特殊要求的路段。",
        "properties": {"materials": ["级配碎石", "沥青碎石", "排水基层"], "advantages": ["减少反射裂缝", "排水性能好"]}
    },
    {
        "name": "路基土", "entity_type": "Component",
        "description": "路面结构的最底层，承受全部路面重量和车辆荷载，对路面整体性能起关键作用。",
        "properties": {"cbr_requirement": "≥8%", "compaction": "≥93%", "stability": "路基稳定性"}
    },
    {
        "name": "排水垫层", "entity_type": "Component",
        "description": "位于路基与基层之间，具有排水和隔离功能的结构层，常用级配碎石或砂砾。",
        "properties": {"thickness": "100-200mm", "functions": ["排水", "隔离", "防冻"]}
    },
    {
        "name": "路缘石", "entity_type": "Component",
        "description": "设置在路面边缘的条形构造物，用于区分车行道与人行道、分隔路面与路肩。",
        "properties": {"materials": ["混凝土", "石材"], "height": "100-300mm", "functions": ["分隔", "引导", "保护"]}
    },
    {
        "name": "检查井", "entity_type": "Component",
        "description": "设置在路面上的各类地下管线检查设施，包括雨水井、污水井、电缆井等。",
        "properties": {"井盖材料": ["铸铁", "钢纤维混凝土", "复合材料"], "常见问题": ["沉降", "破损", "移位"]}
    },
]

# =====================================================================
# 风险等级实体 (Risk)
# =====================================================================
RISK_ENTITIES = [
    {
        "name": "低风险", "entity_type": "Risk",
        "description": "病害轻微，对路面使用性能和行车安全影响小，应进行日常监测和预防性养护。",
        "properties": {"pci_range": "80-100", "speed_of_progression": "缓慢", "recommended_action": "日常养护+预防性养护", "response_time": "3-6个月"}
    },
    {
        "name": "中等风险", "entity_type": "Risk",
        "description": "病害发展较快，需要进行功能性修复，防止进一步恶化。",
        "properties": {"pci_range": "60-79", "speed_of_progression": "中等", "recommended_action": "功能性修复", "response_time": "1-3个月"}
    },
    {
        "name": "高风险", "entity_type": "Risk",
        "description": "病害严重，路面结构已经受损，需要进行结构性修复或重建。",
        "properties": {"pci_range": "40-59", "speed_of_progression": "快速", "recommended_action": "结构性修复", "response_time": "1-4周"}
    },
    {
        "name": "紧急风险", "entity_type": "Risk",
        "description": "病害已经严重影响行车安全或路面结构，需要立即采取紧急措施。",
        "properties": {"pci_range": "<40", "speed_of_progression": "极快", "recommended_action": "紧急处置+重建评估", "response_time": "<1周"}
    },
]

# =====================================================================
# 区域/路段实体 (Region)
# =====================================================================
REGION_ENTITIES = [
    {
        "name": "交叉口", "entity_type": "Region",
        "description": "道路交叉口区域，由于车辆频繁加减速、转向和渠化，交通荷载复杂，病害类型特殊。",
        "properties": {"loading_pattern": "复杂+频繁", "common_diseases": ["车辙", "拥包", "推移"], "maintenance_priority": "高"}
    },
    {
        "name": "桥头路段", "entity_type": "Region",
        "description": "桥梁两端与路基的连接段，由于结构差异易产生不均匀沉降，形成桥头跳车。",
        "properties": {"main_problem": "差异沉降", "approaches": ["台背回填", "搭板", "注浆加固"], "evaluation_index": "桥头跳车指数"}
    },
    {
        "name": "公交站台", "entity_type": "Region",
        "description": "公交车辆停靠区域，由于频繁制动和启动荷载，路面承受特殊的车辙和推移病害。",
        "properties": {"loading_pattern": "频繁制动启动", "common_diseases": ["车辙", "推移", "拥包"], "maintenance_priority": "高"}
    },
    {
        "name": "弯道", "entity_type": "Region",
        "description": "道路曲线段，车辆产生离心力作用，路面承受侧向力，易产生推移和拥包。",
        "properties": {"lateral_force": "存在", "common_diseases": ["推移", "拥包", "外侧车辙"]}
    },
    {
        "name": "长大纵坡", "entity_type": "Region",
        "description": "坡度较大的长距离上坡或下坡路段，重载车辆行驶困难，对路面造成特殊损坏。",
        "properties": {"slope_range": ">3%", "length": ">500m", "common_diseases": ["车辙", "推移", "层间滑移"]}
    },
]

# =====================================================================
# 合并所有实体
# =====================================================================
def get_all_entities():
    entities = []
    entities.extend(DISEASE_ENTITIES)
    entities.extend(CAUSE_ENTITIES)
    entities.extend(REPAIR_ENTITIES)
    entities.extend(MATERIAL_ENTITIES)
    entities.extend(STANDARD_ENTITIES)
    entities.extend(COMPONENT_ENTITIES)
    entities.extend(RISK_ENTITIES)
    entities.extend(REGION_ENTITIES)
    return entities


# =====================================================================
# 关系定义
# =====================================================================
RELATIONS = [
    # 病害 ← 成因
    {"source": "纵向裂缝", "target": "温度应力疲劳", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "纵向裂缝", "target": "车辆荷载疲劳", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "纵向裂缝", "target": "路基压实不足", "relation": "CAUSED_BY", "weight": 0.6},
    {"source": "纵向裂缝(边缘型)", "target": "路基压实不足", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "纵向裂缝(边缘型)", "target": "施工质量缺陷", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "横向裂缝", "target": "温度应力疲劳", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "横向裂缝", "target": "半刚性基层温缩", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "横向裂缝(不规则型)", "target": "基层强度不足", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "横向裂缝(不规则型)", "target": "排水系统失效", "relation": "CAUSED_BY", "weight": 0.6},
    {"source": "龟裂/网裂", "target": "车辆荷载疲劳", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "龟裂/网裂", "target": "水损害", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "龟裂/网裂", "target": "沥青老化", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "坑洞", "target": "水损害", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "坑洞", "target": "车辆荷载疲劳", "relation": "CAUSED_BY", "weight": 0.6},
    {"source": "坑洞", "target": "施工质量缺陷", "relation": "CAUSED_BY", "weight": 0.5},
    {"source": "块裂", "target": "基层强度不足", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "块裂", "target": "水损害", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "井盖沉降", "target": "路基压实不足", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "井盖沉降", "target": "施工质量缺陷", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "车辙", "target": "重载交通", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "车辙", "target": "高温软化", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "车辙", "target": "基层强度不足", "relation": "CAUSED_BY", "weight": 0.6},
    {"source": "拥包", "target": "高温软化", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "拥包", "target": "施工质量缺陷", "relation": "CAUSED_BY", "weight": 0.6},
    {"source": "波浪/搓板", "target": "施工质量缺陷", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "波浪/搓板", "target": "重载交通", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "沉陷", "target": "路基压实不足", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "沉陷", "target": "地下水位过高", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "翻浆", "target": "水损害", "relation": "CAUSED_BY", "weight": 0.9},
    {"source": "翻浆", "target": "冻融循环", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "翻浆", "target": "地下水位过高", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "翻浆", "target": "排水系统失效", "relation": "CAUSED_BY", "weight": 0.7},
    {"source": "裂缝修补失效", "target": "施工质量缺陷", "relation": "CAUSED_BY", "weight": 0.8},
    {"source": "裂缝修补失效", "target": "沥青老化", "relation": "CAUSED_BY", "weight": 0.5},

    # 病害 → 病害（伴随发生/导致）
    {"source": "龟裂/网裂", "target": "坑洞", "relation": "LEADS_TO", "weight": 0.8},
    {"source": "横向裂缝", "target": "唧浆", "relation": "LEADS_TO", "weight": 0.7},
    {"source": "纵向裂缝", "target": "剥落", "relation": "LEADS_TO", "weight": 0.6},
    {"source": "沉陷", "target": "裂缝", "relation": "LEADS_TO", "weight": 0.7},
    {"source": "唧浆", "target": "翻浆", "relation": "LEADS_TO", "weight": 0.7},
    {"source": "唧浆", "target": "沉陷", "relation": "LEADS_TO", "weight": 0.6},

    # 病害 → 维修方法
    {"source": "纵向裂缝", "target": "裂缝填封", "relation": "TREATED_BY", "weight": 0.9},
    {"source": "纵向裂缝", "target": "铣刨重铺", "relation": "TREATED_BY", "weight": 0.6},
    {"source": "横向裂缝", "target": "裂缝填封", "relation": "TREATED_BY", "weight": 0.9},
    {"source": "横向裂缝", "target": "贴缝带处理", "relation": "TREATED_BY", "weight": 0.7},
    {"source": "龟裂/网裂", "target": "铣刨重铺", "relation": "TREATED_BY", "weight": 0.9},
    {"source": "龟裂/网裂", "target": "就地冷再生", "relation": "TREATED_BY", "weight": 0.7},
    {"source": "龟裂/网裂", "target": "翻修重建", "relation": "TREATED_BY", "weight": 0.5},
    {"source": "坑洞", "target": "冷补料修补", "relation": "TREATED_BY", "weight": 0.8},
    {"source": "坑洞", "target": "热补修补", "relation": "TREATED_BY", "weight": 0.9},
    {"source": "坑洞", "target": "结构修补", "relation": "TREATED_BY", "weight": 0.6},
    {"source": "井盖沉降", "target": "注浆加固", "relation": "TREATED_BY", "weight": 0.8},
    {"source": "井盖沉降", "target": "调整高程", "relation": "TREATED_BY", "weight": 0.7},
    {"source": "井盖沉降", "target": "重新砌筑", "relation": "TREATED_BY", "weight": 0.4},
    {"source": "车辙", "target": "微表处", "relation": "TREATED_BY", "weight": 0.7},
    {"source": "车辙", "target": "铣刨重铺", "relation": "TREATED_BY", "weight": 0.8},
    {"source": "车辙", "target": "就地热再生", "relation": "TREATED_BY", "weight": 0.7},
    {"source": "车辙", "target": "车辙填补", "relation": "TREATED_BY", "weight": 0.6},
    {"source": "拥包", "target": "铣刨重铺", "relation": "TREATED_BY", "weight": 0.9},
    {"source": "波浪/搓板", "target": "铣刨重铺", "relation": "TREATED_BY", "weight": 0.9},
    {"source": "沉陷", "target": "注浆加固", "relation": "TREATED_BY", "weight": 0.8},
    {"source": "沉陷", "target": "翻修重建", "relation": "TREATED_BY", "weight": 0.6},
    {"source": "翻浆", "target": "翻修重建", "relation": "TREATED_BY", "weight": 0.9},
    {"source": "翻浆", "target": "换填处理", "relation": "TREATED_BY", "weight": 0.7},
    {"source": "裂缝修补失效", "target": "裂缝填封", "relation": "TREATED_BY", "weight": 0.8},
    {"source": "磨光", "target": "薄层罩面", "relation": "TREATED_BY", "weight": 0.9},

    # 维修方法 → 材料
    {"source": "裂缝填封", "target": "乳化沥青", "relation": "USES_MATERIAL", "weight": 0.9},
    {"source": "微表处", "target": "改性沥青混凝土", "relation": "USES_MATERIAL", "weight": 0.9},
    {"source": "铣刨重铺", "target": "普通沥青混凝土", "relation": "USES_MATERIAL", "weight": 0.9},
    {"source": "铣刨重铺", "target": "改性沥青混凝土", "relation": "USES_MATERIAL", "weight": 0.7},
    {"source": "薄层罩面", "target": "SMA沥青玛蹄脂碎石混合料", "relation": "USES_MATERIAL", "weight": 0.8},
    {"source": "就地冷再生", "target": "乳化沥青", "relation": "USES_MATERIAL", "weight": 0.8},
    {"source": "就地冷再生", "target": "级配碎石", "relation": "USES_MATERIAL", "weight": 0.7},
    {"source": "注浆加固", "target": "普通沥青混凝土", "relation": "USES_MATERIAL", "weight": 0.9},
    {"source": "热补修补", "target": "普通沥青混凝土", "relation": "USES_MATERIAL", "weight": 0.9},
    {"source": "热补修补", "target": "改性沥青混凝土", "relation": "USES_MATERIAL", "weight": 0.6},

    # 病害 → 构件
    {"source": "纵向裂缝", "target": "沥青混凝土面层", "relation": "AFFECTS_COMPONENT", "weight": 0.9},
    {"source": "龟裂/网裂", "target": "沥青混凝土面层", "relation": "AFFECTS_COMPONENT", "weight": 0.9},
    {"source": "龟裂/网裂", "target": "半刚性基层", "relation": "AFFECTS_COMPONENT", "weight": 0.8},
    {"source": "车辙", "target": "沥青混凝土面层", "relation": "AFFECTS_COMPONENT", "weight": 0.9},
    {"source": "沉陷", "target": "路基土", "relation": "AFFECTS_COMPONENT", "weight": 0.9},
    {"source": "翻浆", "target": "路基土", "relation": "AFFECTS_COMPONENT", "weight": 0.9},
    {"source": "翻浆", "target": "排水垫层", "relation": "AFFECTS_COMPONENT", "weight": 0.7},
    {"source": "井盖沉降", "target": "检查井", "relation": "AFFECTS_COMPONENT", "weight": 0.9},

    # 病害 → 区域
    {"source": "车辙", "target": "交叉口", "relation": "OCCURS_IN", "weight": 0.9},
    {"source": "车辙", "target": "公交站台", "relation": "OCCURS_IN", "weight": 0.9},
    {"source": "车辙", "target": "长大纵坡", "relation": "OCCURS_IN", "weight": 0.8},
    {"source": "推移", "target": "交叉口", "relation": "OCCURS_IN", "weight": 0.9},
    {"source": "拥包", "target": "交叉口", "relation": "OCCURS_IN", "weight": 0.7},
    {"source": "沉陷", "target": "桥头路段", "relation": "OCCURS_IN", "weight": 0.9},
    {"source": "沉陷", "target": "长大纵坡", "relation": "OCCURS_IN", "weight": 0.6},
    {"source": "波浪/搓板", "target": "长大纵坡", "relation": "OCCURS_IN", "weight": 0.8},
    {"source": "推移", "target": "长大纵坡", "relation": "OCCURS_IN", "weight": 0.8},
    {"source": "拥包", "target": "弯道", "relation": "OCCURS_IN", "weight": 0.8},

    # 病害相关
    {"source": "纵向裂缝", "target": "横向裂缝", "relation": "CO_OCCURS", "weight": 0.6},
    {"source": "龟裂/网裂", "target": "坑洞", "relation": "CO_OCCURS", "weight": 0.7},
    {"source": "车辙", "target": "推移", "relation": "CO_OCCURS", "weight": 0.7},
    {"source": "沉陷", "target": "裂缝", "relation": "CO_OCCURS", "weight": 0.6},
    {"source": "唧浆", "target": "翻浆", "relation": "CO_OCCURS", "weight": 0.8},

    # 病害 → 标准
    {"source": "路面养护", "target": "JTG 5142《公路沥青路面养护技术规范》", "relation": "APPLIES_STANDARD", "weight": 1.0},
    {"source": "路面检测", "target": "JTG E60《公路路基路面现场测试规程》", "relation": "APPLIES_STANDARD", "weight": 1.0},
    {"source": "桥头跳车", "target": "JTG D81《公路交通安全设施设计规范》", "relation": "APPLIES_STANDARD", "weight": 0.8},
]
