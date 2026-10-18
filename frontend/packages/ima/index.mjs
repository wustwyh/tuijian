import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const KNOWLEDGE_BASE_NAME = '任德耀新建华为PC知识库';
export const DEMO_PRODUCT = 'HUAWEI MateBook 14（鸿蒙版）';
const API_ORIGIN = 'https://ima.qq.com';
const ALLOWED_READS = new Set(['search_knowledge_base', 'get_knowledge_base', 'search_knowledge', 'get_media_info']);

export class ImaError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ImaError';
    this.code = code;
    this.details = details;
  }
  toJSON() { return { error: { code: this.code, message: this.message, details: this.details } }; }
}

function fail(code, message, details) { throw new ImaError(code, message, details); }
function readSafe(path) { try { return readFileSync(path, 'utf8').trim(); } catch { return ''; } }
function credentials(env, configDir) {
  const clientId = env.IMA_OPENAPI_CLIENTID || env.IMA_CLIENT_ID || readSafe(join(configDir, 'client_id'));
  const apiKey = env.IMA_OPENAPI_APIKEY || env.IMA_API_KEY || readSafe(join(configDir, 'api_key'));
  if (!clientId || !apiKey) fail('IMA_AUTH_FAILED', '未配置 IMA 服务端凭证，请在服务器配置环境变量或 ~/.config/ima/。');
  return { clientId, apiKey };
}
function redact(value, secrets = []) {
  let text = String(value || 'ima 请求失败').replace(/https?:\/\/\S+/g, '[URL omitted]');
  for (const secret of secrets) if (secret) text = text.split(secret).join('[redacted]');
  return text.slice(0, 500);
}
function normalize(value) { return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s_（）()\-]/g, ''); }
function isMateBook14(value) {
  const match = /matebook[\s_-]*14(?=$|[\s_（）()\-.,｜|])/i.exec(String(value));
  if (!match) return false;
  const suffix = String(value).slice(match.index + match[0].length);
  return !/^[\s_-]*(?:pro|plus|gt|x|s)(?=$|[\s_（）()\-.,｜|])/i.test(suffix);
}
function isHarmony(value) {
  return isMateBook14(value) && /matebook[\s_-]*14[\s_（(\-]*(?:鸿蒙版|harmonyos(?:[\s_-]*version)?)(?=$|[\s_）)\-.,｜|])/i.test(value);
}
function isImage(item) { return item.media_type === 9 || /\.(png|jpe?g|webp)$/i.test(item.title); }
function isMarkdown(item) { return item.media_type === 7 || /\.md$/i.test(item.title); }
function cleanExcerpt(text) {
  // Runtime evidence retains a bounded original excerpt, including the card's limitations.
  return text.replace(/https?:\/\/[^\s)\]>]+/g, value => {
    try { const u = new URL(value); return u.search ? '[临时来源链接已省略]' : value; } catch { return '[链接已省略]'; }
  }).slice(0, 10000);
}
function stableOfficialSource(text) {
  for (const match of text.matchAll(/https:\/\/[^\s)\]>]+/g)) {
    try {
      const url = new URL(match[0]);
      if (!url.search && ['consumer.huawei.com', 'www.vmall.com'].includes(url.hostname)) return url.href;
    } catch { /* Leave unknown URLs unknown. */ }
  }
  return null;
}

/** Inspect bytes rather than trusting the media title or HTTP header. */
export function inspectImage(bytes, contentType) {
  const type = String(contentType || '').split(';')[0].trim().toLowerCase();
  let format, width, height;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii', 12, 16) === 'IHDR') {
    format = 'png'; width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
  } else if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216) {
    format = 'jpeg';
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) {
        height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5); break;
      }
      offset += length;
    }
  } else if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    format = 'webp';
    const chunk = bytes.toString('ascii', 12, 16);
    if (chunk === 'VP8X') { width = 1 + bytes.readUIntLE(24, 3); height = 1 + bytes.readUIntLE(27, 3); }
    else if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = bytes.readUInt16LE(26) & 16383; height = bytes.readUInt16LE(28) & 16383;
    } else if (chunk === 'VP8L' && bytes[20] === 47) {
      const bits = bytes.readUInt32LE(21); width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1;
    }
  }
  if (!format || !width || !height || type !== `image/${format}`) fail('IMA_FETCH_FAILED', '产品图内容类型、文件头或尺寸校验失败。');
  return { width, height, format, content_type: type, byte_length: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), usage: '产品外观（发布前核验具体颜色与素材权限）' };
}

export function createImaClient({ fetchImpl = globalThis.fetch, env = process.env, configDir = join(homedir(), '.config', 'ima'), timeoutMs = 30000 } = {}) {
  async function post(operation, body) {
    if (!ALLOWED_READS.has(operation)) fail('VALIDATION_ERROR', '仅允许 ima 只读操作。');
    const { clientId, apiKey } = credentials(env, configDir);
    let response;
    try {
      response = await fetchImpl(`${API_ORIGIN}/openapi/wiki/v1/${operation}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'ima-openapi-clientid': clientId, 'ima-openapi-apikey': apiKey, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body)
      });
    } catch { fail('IMA_FETCH_FAILED', 'ima 官方接口连接失败或超时。'); }
    if (!response.ok) fail([401,403].includes(response.status) ? 'IMA_AUTH_FAILED' : 'IMA_FETCH_FAILED', `ima HTTP ${response.status}。`);
    let result;
    try { result = await response.json(); } catch { fail('IMA_FETCH_FAILED', 'ima 返回了无效 JSON。'); }
    if (result.code !== 0) fail([110030,401,403].includes(result.code) ? 'IMA_AUTH_FAILED' : 'IMA_FETCH_FAILED', redact(result.msg, [clientId, apiKey]), { upstream_code: result.code });
    if (!result.data || typeof result.data !== 'object') fail('IMA_FETCH_FAILED', 'ima 返回数据缺失。');
    return result.data;
  }

  async function pages(operation, body, key) {
    const items = [], cursors = new Set();
    let cursor = '';
    for (let page = 0; page < 20; page++) {
      const data = await post(operation, { ...body, cursor });
      if (!Array.isArray(data[key])) fail('IMA_FETCH_FAILED', 'ima 列表结构不符合预期。');
      items.push(...data[key]);
      // The live search endpoint omits both pagination fields on its terminal page.
      if (data.is_end === true || (data.is_end === undefined && !data.next_cursor)) return items;
      if (!data.next_cursor || cursors.has(data.next_cursor)) fail('IMA_FETCH_FAILED', 'ima 分页游标缺失或重复。');
      cursor = data.next_cursor; cursors.add(cursor);
    }
    fail('IMA_FETCH_FAILED', 'ima 搜索分页超过限制，请缩小关键词。');
  }

  async function resolveKnowledgeBase(id) {
    if (!id) {
      const matches = (await pages('search_knowledge_base', { query: KNOWLEDGE_BASE_NAME, limit: 20 }, 'info_list'))
        .filter(item => (item.name || item.kb_name) === KNOWLEDGE_BASE_NAME);
      if (matches.length !== 1) fail('IMA_NO_RESULT', '未唯一找到指定线上共享知识库。');
      id = matches[0].id || matches[0].kb_id;
    }
    if (!id || typeof id !== 'string') fail('VALIDATION_ERROR', 'knowledgeBaseId 无效。');
    const info = (await post('get_knowledge_base', { ids: [id] })).infos?.[id];
    if (!info || (info.name || info.kb_name) !== KNOWLEDGE_BASE_NAME) fail('VALIDATION_ERROR', '只能检索指定的华为 PC 共享知识库。');
    return id;
  }

  async function download(mediaId) {
    const data = await post('get_media_info', { media_id: mediaId });
    if (!data.url_info?.url) fail('IMA_FETCH_FAILED', '请使用ima客户端查看原文；API 未返回可读取地址。');
    let url;
    try { url = new URL(data.url_info.url); } catch { fail('IMA_FETCH_FAILED', 'ima 素材地址无效。'); }
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !(url.hostname === 'ima.qq.com' || url.hostname.endsWith('.myqcloud.com'))) {
      fail('IMA_FETCH_FAILED', 'ima 返回了未允许的素材地址。');
    }
    const headers = {};
    const { clientId, apiKey } = credentials(env, configDir);
    for (const [key, value] of Object.entries(data.url_info.headers || {})) {
      if (/^ima-openapi-/i.test(key) || String(value).includes(clientId) || String(value).includes(apiKey)) fail('IMA_FETCH_FAILED', '拒绝向素材地址发送 ima 凭证。');
      headers[key] = value;
    }
    let response;
    try { response = await fetchImpl(url.href, { headers, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) }); }
    catch { fail('IMA_FETCH_FAILED', '请使用ima客户端查看原文；素材下载失败或超时。'); }
    if (!response.ok) fail('IMA_FETCH_FAILED', `请使用ima客户端查看原文；素材 HTTP ${response.status}。`);
    const chunks = []; let size = 0;
    try {
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 20 * 1024 * 1024) { await response.body.cancel().catch(() => {}); fail('IMA_FETCH_FAILED', '素材超过 20 MiB 读取限制。'); }
        chunks.push(Buffer.from(chunk));
      }
    } catch (error) { if (error instanceof ImaError) throw error; fail('IMA_FETCH_FAILED', '素材读取失败。'); }
    const bytes = Buffer.concat(chunks);
    return { bytes, contentType: response.headers.get('content-type'), mediaType: data.media_type, origin: url.origin };
  }

  async function search(query, id) {
    return pages('search_knowledge', { query, knowledge_base_id: id }, 'info_list');
  }

  async function retrieveProductEvidence({ query, needImages = true, confirmedProduct, knowledgeBaseId } = {}) {
    if (typeof query !== 'string' || !query.trim() || query.length > 200 || typeof needImages !== 'boolean') fail('VALIDATION_ERROR', 'query 应为 1—200 字符，needImages 应为布尔值。');
    if (confirmedProduct !== undefined && normalize(confirmedProduct) !== normalize(DEMO_PRODUCT)) fail('VALIDATION_ERROR', 'I1 当前只支持已确认的 HUAWEI MateBook 14（鸿蒙版）。');
    const id = await resolveKnowledgeBase(knowledgeBaseId);
    const items = await search(query.trim(), id);
    const scoped = items.filter(item => isMateBook14(item.title));
    if (!isMateBook14(query) || !scoped.length) fail('IMA_NO_RESULT', '未检索到可用的 MateBook 14 型号证据，请更换关键词。');
    if (!confirmedProduct && !isHarmony(query)) {
      const candidates = [];
      if (scoped.some(item => isHarmony(item.title))) candidates.push({ product: DEMO_PRODUCT, reason: '线上条目明确标注鸿蒙版或 harmonyos' });
      if (scoped.some(item => /酷睿\s*Ultra|matebook-14-2024/i.test(item.title))) candidates.push({ product: 'HUAWEI MateBook 14 酷睿 Ultra', reason: '线上条目包含其他处理器/年份版本' });
      if (!candidates.length) fail('IMA_NO_RESULT', '未找到可明确识别版本的产品资料。');
      return { status: 'ambiguous', knowledgeBaseId: id, candidates, warnings: ['请先确认具体版本；未读取或混用相近型号事实。'] };
    }
    const exactItems = scoped.filter(item => isHarmony(item.title));
    const markdowns = exactItems.filter(isMarkdown).sort((a,b) => Number(/^02-HUAWEI/.test(b.title)) - Number(/^02-HUAWEI/.test(a.title)));
    if (!markdowns.length) fail('IMA_NO_RESULT', '未找到该型号的 Markdown 原文条目。');
    const doc = markdowns[0], document = await download(doc.media_id);
    if (document.mediaType !== 7 || !/^(text\/(markdown|x-markdown|plain)|application\/(md|markdown|octet-stream))(;|$)/i.test(document.contentType || '')) fail('IMA_FETCH_FAILED', '原文媒体类型不符合 Markdown。');
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(document.bytes); } catch { fail('IMA_FETCH_FAILED', 'Markdown 原文不是有效 UTF-8。'); }
    if (!isHarmony(text.slice(0, 1000)) || /^\s*</.test(text)) fail('IMA_FETCH_FAILED', 'Markdown 原文型号未匹配或内容无效。');
    const fetchedAt = new Date().toISOString();
    const common = { knowledge_base_id: id, query: query.trim(), fetched_at: fetchedAt, applicable_model: DEMO_PRODUCT, applicable_version: '鸿蒙版；具体 SKU/系统版本待核验', verification_status: 'pending' };
    const evidence = [{ ...common, media_id: doc.media_id, media_type: 'MARKDOWN', title: doc.title,
      source_url: stableOfficialSource(text), fact_excerpt: cleanExcerpt(text),
      source_metadata: { retrieval: 'ima_openapi', content_type: document.contentType, byte_length: document.bytes.length, sha256: createHash('sha256').update(document.bytes).digest('hex'), download_origin: document.origin, requires_refresh: true, source_url_note: 'source_url 为原文标注的官方入口；未独立抓取核验。ima 临时下载 URL 不持久化。', checks: ['online_read', 'utf8', 'model_in_document'], scope: '产品发现卡；不是完整规格档案' }
    }];
    if (needImages) {
      // An exact model filename is required; 2024/Ultra images are never substituted.
      const image = exactItems.filter(isImage).sort((a,b) => Number(/正面产品展示/.test(b.title)) - Number(/正面产品展示/.test(a.title)))[0];
      if (!image) fail('IMA_NO_RESULT', '未找到明确属于该型号的产品图。');
      const downloaded = await download(image.media_id);
      if (downloaded.mediaType !== 9) fail('IMA_FETCH_FAILED', '产品图 media_type 不符。');
      evidence.push({ ...common, fetched_at: new Date().toISOString(), media_id: image.media_id, media_type: 'IMG', title: image.title, source_url: null,
        image_metadata: inspectImage(downloaded.bytes, downloaded.contentType),
        source_metadata: { retrieval: 'ima_openapi', download_origin: downloaded.origin, requires_refresh: true, source_url_note: '无稳定素材 URL；以 media_id 重新获取链接及来源签名 headers，由后端代理。', checks: ['online_read', 'content_type', 'magic_bytes', 'dimensions', 'model_in_title'], model_match_basis: '线上素材标题含 matebook-14-harmonyos；发布前仍需人工检查颜色与具体 SKU' }
      });
    }
    return { status: 'resolved', product: DEMO_PRODUCT, knowledgeBaseId: id, evidence, warnings: ['来源/文件类型/型号关联已检查；最终营销事实核验待完成。', '原文为产品发现卡；参数、兼容性、价格、补贴、库存不可据此补齐。', ...(needImages ? ['产品图需后端按 media_id 刷新并代理，临时 URL 和来源签名 headers 不进入业务持久化。'] : [])] };
  }

  async function fetchProductImage({ knowledgeBaseId, mediaId, confirmedProduct } = {}) {
    if (normalize(confirmedProduct) !== normalize(DEMO_PRODUCT) || typeof mediaId !== 'string' || !mediaId) fail('VALIDATION_ERROR', '图片读取需要已确认型号与真实 mediaId。');
    const id = await resolveKnowledgeBase(knowledgeBaseId);
    const item = (await search('MateBook 14', id)).find(item => item.media_id === mediaId && isHarmony(item.title) && isImage(item));
    if (!item) fail('IMA_NO_RESULT', '该图片未在指定共享库的已确认型号条目中找到。');
    const downloaded = await download(item.media_id);
    if (downloaded.mediaType !== 9) fail('IMA_FETCH_FAILED', '产品图 media_type 不符。');
    return { bytes: downloaded.bytes, contentType: downloaded.contentType, imageMetadata: inspectImage(downloaded.bytes, downloaded.contentType), fetchedAt: new Date().toISOString() };
  }

  return { retrieveProductEvidence, fetchProductImage };
}

export const retrieveProductEvidence = input => createImaClient().retrieveProductEvidence(input);
export const fetchProductImage = input => createImaClient().fetchProductImage(input);
