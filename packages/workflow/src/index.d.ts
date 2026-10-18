export type Platform = 'xiaohongshu' | 'wechat_official' | 'wechat_moments' | 'store_poster';
export type VerificationStatus = 'passed' | 'pending' | 'rejected';
/** Local declarations for docs/api-contract.md, not a new shared contract. */
export interface MarketingTask {
  id: string;
  user_id: string;
  product_query: string;
  resolved_product_name?: string;
  platform: Platform;
  audience_hint: string;
  scenario: string;
  goal: string;
  status: 'draft' | 'retrieved' | 'generated' | 'verified' | 'exported';
  created_at: string;
  updated_at: string;
}
export interface EvidenceItem {
  id: string;
  task_id: string;
  knowledge_base_id: string;
  media_id: string;
  media_type: string;
  title: string;
  source_url: string;
  fetched_at: string;
  fact_excerpt?: string;
  image_metadata?: { width?: number; height?: number; format?: string; usage?: string };
  applicable_model: string;
  verification_status: VerificationStatus;
}
export interface Persona {
  name: string;
  typical_tasks: string[];
  pain_points: string[];
  buying_triggers: string[];
  objections: string[];
  content_angle: string;
  evidence_ids: string[];
  assumptions: string[];
  pending_checks: string[];
}
export interface PersonaReport {
  id: string;
  task_id: string;
  personas: Persona[];
  status: 'draft' | 'confirmed';
}
export interface Strategy {
  id: string;
  task_id: string;
  main_conflict: string;
  primary_persona: string;
  key_message: string;
  /** Each string includes at least one [evidence_id] citation. */
  proof_points: string[];
  outline: string[];
  cta: string;
  risk_notes: string[];
}
export interface ContentDraft {
  id: string;
  task_id: string;
  platform: Platform;
  version: number;
  title_options: string[];
  selected_title: string;
  body: string;
  cta: string;
  image_plan: { evidence_id: string; position: 'cover' | 'body' | 'ending'; caption: string; purpose: string }[];
  poster_brief?: { headline: string; subheadline: string; layout_notes: string };
  verification_status: 'draft' | VerificationStatus;
}
export interface VerificationCheck {
  type: 'fact' | 'image' | 'platform' | 'compliance' | 'identity';
  item: string;
  status: VerificationStatus;
  reason: string;
  evidence_ids: string[];
}
export interface VerificationReport {
  task_id: string;
  overall_status: VerificationStatus;
  checks: VerificationCheck[];
  manual_actions: string[];
}
export interface LLMRequest {
  stage: 'personas' | 'strategy' | 'content' | 'verify';
  system: string;
  prompt: string;
  response_schema: Record<string, unknown>;
}
export type LLMAdapter = (request: LLMRequest) => Promise<unknown>;
export interface BaseInput { task: MarketingTask; evidence: EvidenceItem[] }
export interface StrategyInput extends BaseInput { personaReport: PersonaReport; personaName: string }
export interface ContentInput extends BaseInput { personaReport: PersonaReport; strategy: Strategy; version?: number }
export interface VerifyInput extends ContentInput { draft: ContentDraft }
export interface Workflow {
  generatePersonas(input: BaseInput): Promise<PersonaReport>;
  generateStrategy(input: StrategyInput): Promise<Strategy>;
  generateContent(input: ContentInput): Promise<ContentDraft>;
  verifyContent(input: VerifyInput): Promise<VerificationReport>;
}
export declare class WorkflowError extends Error {
  code: 'VALIDATION_ERROR' | 'IMA_NO_RESULT' | 'LLM_FAILED';
  details: unknown[];
  constructor(code: WorkflowError['code'], message: string, details?: unknown[]);
}
export declare function createWorkflow(options: { llm: LLMAdapter; createId?: (prefix: string) => string }): Workflow;
