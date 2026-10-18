export declare const KNOWLEDGE_BASE_NAME: string;
export declare const DEMO_PRODUCT: string;
export declare class ImaError extends Error {
  code: string;
  details: Record<string, unknown>;
  constructor(code: string, message: string, details?: Record<string, unknown>);
  toJSON(): { error: { code: string; message: string; details: Record<string, unknown> } };
}
export interface ImageMetadata {
  width: number; height: number; format: 'png' | 'jpeg' | 'webp';
  content_type: string; byte_length: number; sha256: string; usage: string;
}
/** Backend adds id/task_id/user ownership. source_url may be unknown. */
export interface UnpersistedEvidence {
  knowledge_base_id: string; media_id: string; media_type: 'MARKDOWN' | 'IMG';
  title: string; source_url: string | null; query: string; fetched_at: string;
  applicable_model: string; applicable_version: string; verification_status: 'pending';
  fact_excerpt?: string; image_metadata?: ImageMetadata;
  source_metadata: {
    retrieval: 'ima_openapi'; download_origin: string; requires_refresh: true;
    source_url_note: string; checks: string[]; scope?: string;
    content_type?: string; byte_length?: number; sha256?: string; model_match_basis?: string;
  };
}
export interface RetrieveInput { query: string; needImages?: boolean; confirmedProduct?: string; knowledgeBaseId?: string }
export type RetrieveResult = {
  status: 'resolved'; product: string; knowledgeBaseId: string; evidence: UnpersistedEvidence[]; warnings: string[];
} | {
  status: 'ambiguous'; knowledgeBaseId: string; candidates: Array<{ product: string; reason: string }>; warnings: string[];
};
export interface ImageInput { knowledgeBaseId?: string; mediaId: string; confirmedProduct: string }
export interface ImaClient {
  retrieveProductEvidence(input: RetrieveInput): Promise<RetrieveResult>;
  fetchProductImage(input: ImageInput): Promise<{ bytes: Buffer; contentType: string; imageMetadata: ImageMetadata; fetchedAt: string }>;
}
export declare function createImaClient(options?: { fetchImpl?: typeof fetch; env?: Record<string, string | undefined>; configDir?: string; timeoutMs?: number }): ImaClient;
export declare function retrieveProductEvidence(input: RetrieveInput): Promise<RetrieveResult>;
export declare function fetchProductImage(input: ImageInput): ReturnType<ImaClient['fetchProductImage']>;
export declare function inspectImage(bytes: Buffer, contentType: string): ImageMetadata;
