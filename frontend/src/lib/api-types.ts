// Knowledge Graph API types

export interface GraphNodeResponse {
  id: number;
  name: string;
  entity_type: string;
  code?: string;
  description?: string;
  properties?: Record<string, unknown>;
  severity_level?: string;
  priority?: number;
  cost_range?: string;
  symbolSize?: number;
  color?: string;
}

export interface GraphLinkResponse {
  source: number;
  target: number;
  source_name?: string;
  target_name?: string;
  relation_type: string;
  weight?: number;
  properties?: Record<string, unknown>;
  lineStyle?: {
    color?: string;
    width?: number;
    type?: string;
  };
}

export interface GraphCategory {
  name: string;
  label?: { show?: boolean; fontSize?: number };
  itemStyle?: { color?: string };
}

export interface GraphStats {
  total_entities: number;
  total_relations: number;
  type_distribution: Record<string, number>;
  relation_types: string[];
}

export interface GraphResponse {
  nodes: GraphNodeResponse[];
  links: GraphLinkResponse[];
  categories: GraphCategory[];
  stats?: GraphStats;
}

export interface EntityDetail {
  id: number;
  name: string;
  entity_type: string;
  code?: string;
  description?: string;
  properties?: Record<string, unknown>;
  severity_level?: string;
  priority?: number;
  cost_range?: string;
  source_document?: string;
  confidence?: number;
  incoming_relations: EntityRelation[];
  outgoing_relations: EntityRelation[];
  related_entities: RelatedEntity[];
}

export interface EntityRelation {
  id: number;
  source_id?: number;
  target_id?: number;
  source_name: string;
  target_name: string;
  relation_type: string;
  relation_label?: string;
  weight?: number;
  properties?: Record<string, unknown>;
  direction: "outgoing" | "incoming";
}

export interface RelatedEntity {
  id: number;
  name: string;
  type: string;
}

export interface EntityListItem {
  id: number;
  name: string;
  entity_type: string;
  code?: string;
  description?: string;
  properties?: Record<string, unknown>;
  severity_level?: string;
  priority?: number;
  cost_range?: string;
  source_document?: string;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EntityListResponse {
  items: EntityListItem[];
  total: number;
  page: number;
  limit: number;
  entity_types: string[];
}

export interface SemanticSearchResult {
  id: number;
  name: string;
  entity_type: string;
  code?: string;
  description?: string;
  severity_level?: string;
  cost_range?: string;
  priority?: number;
  score: number;
  matched_fields: string[];
}

export interface SemanticSearchResponse {
  query: string;
  results: SemanticSearchResult[];
}

export interface GraphStatistics {
  total_entities: number;
  total_relations: number;
  type_distribution: Record<string, number>;
  relation_type_distribution: Record<string, number>;
  popular_entities: Array<{ name: string; type: string; relations: number }>;
  entity_types: string[];
  relation_types: string[];
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  content?: string;
  file_path?: string;
  file_type?: string;
  source_url?: string;
  category?: string;
  tags?: string[];
  status: string;
  entity_count: number;
  relation_count: number;
  created_at?: string;
}

export interface DocumentListResponse {
  items: KnowledgeDocument[];
  total: number;
}

export interface TypeInfo {
  type: string;
  label: string;
  color: string;
}

export interface TypeInfoResponse {
  entity_types: TypeInfo[];
  relation_types: Array<{ type: string; label: string; color: string }>;
}
