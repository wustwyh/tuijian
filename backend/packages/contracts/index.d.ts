/** seams-v1-20261018; authoritative semantics: docs/api-contract.md §8. */
export type Platform = 'wechat_official' | 'xiaohongshu' | 'wechat_moments' | 'store_poster';
export type VerificationStatus = 'passed' | 'pending' | 'rejected';
export type TaskStatus = 'draft' | 'retrieved' | 'generated' | 'verified' | 'exported';
export interface User { id: string; email: string; created_at: string }
export interface AuthInput { email: string; password: string }
export interface AuthResponse { user: User }
export interface TaskInput {
  product_query: string;
  platform: Platform;
  audience_hint?: string;
  scenario?: string;
  goal?: string;
}
export type TaskPatch = Partial<TaskInput>;
export interface MarketingTask {
  id: string;
  user_id: string;
  product_query: string;
  resolved_product_name: string | null;
  platform: Platform;
  audience_hint: string;
  scenario: string;
  goal: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}
/** B1 only; generated-result aggregation is not frozen yet. */
export interface TaskResponse { task: MarketingTask }
export interface TaskListResponse { tasks: MarketingTask[] }
export interface ApiErrorResponse {
  error: { code: string; message: string; details: unknown[] };
}
export interface ImageMetadata {
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp';
  content_type: string;
  byte_length: number;
  sha256: string;
  usage: string;
}
export interface ImaSourceMetadata {
  retrieval: 'ima_openapi';
  download_origin: string;
  requires_refresh: true;
  source_url_note: string;
  checks: string[];
  scope?: string;
  content_type?: string;
  byte_length?: number;
  sha256?: string;
  model_match_basis?: string;
}
/** Initial IMA evidence is pending; Backend assigns business ID/ownership. */
export interface EvidenceItem {
  id: string;
  task_id: string;
  knowledge_base_id: string;
  media_id: string;
  media_type: 'MARKDOWN' | 'IMG';
  title: string;
  source_url: string | null;
  query: string;
  fetched_at: string;
  applicable_model: string;
  applicable_version: string;
  verification_status: VerificationStatus;
  fact_excerpt?: string;
  image_metadata?: ImageMetadata;
  source_metadata: ImaSourceMetadata;
}
export interface LLMRequest {
  stage: 'personas' | 'strategy' | 'content' | 'verify';
  system: string;
  prompt: string;
  response_schema: Record<string, unknown>;
}
/** Return parsed business JSON or pure JSON text, never a provider envelope. */
export type LLMAdapter = (request: LLMRequest) => Promise<Record<string, unknown> | string>;
