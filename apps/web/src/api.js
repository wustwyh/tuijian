export class ApiError extends Error {
  constructor(code, message, status = 0, details = []) {
    super(message);
    this.name = 'ApiError';
    Object.assign(this, { code, status, details });
  }
}

export function createApi({ integration = {}, fetchImpl = globalThis.fetch, onUnauthorized = () => {} } = {}) {
  async function request(path, { method = 'GET', body, signal } = {}) {
    if (!path.startsWith('/api/') || path.includes('..') || path.includes('\\')) {
      throw new ApiError('INVALID_API_PATH', '接口地址必须位于当前站点 /api 下。');
    }
    let response;
    try {
      response = await fetchImpl(path, {
        method, signal, credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ApiError('NETWORK_ERROR', '无法连接服务，请检查连接后重试。');
    }
    let raw = null;
    try { raw = await response.json(); } catch {
      if (response.ok && response.status !== 204) {
        throw new ApiError('INVALID_RESPONSE', '服务返回了无法读取的数据，请重试。', response.status);
      }
    }
    if (!response.ok) {
      if (response.status === 401 || raw?.error?.code === 'UNAUTHORIZED') onUnauthorized();
      throw new ApiError(raw?.error?.code || `HTTP_${response.status}`,
        raw?.error?.message || `请求失败（${response.status}），请稍后重试。`, response.status, raw?.error?.details || []);
    }
    return raw;
  }
  function requireBinding(group, key) {
    const fn = integration[group]?.[key];
    if (typeof fn !== 'function') throw new ApiError('INTEGRATION_PENDING',
      group === 'auth' ? '账号服务尚未接通，请联系演示负责人。' : '任务服务尚未接通，请联系演示负责人。');
    return fn;
  }
  async function decode(key, path, options) {
    const adapt = requireBinding('responses', key);
    return adapt(await request(path, options));
  }
  const taskPath = id => `/api/tasks/${encodeURIComponent(id)}`;
  return {
    request,
    session: async signal => requireBinding('auth', 'session')({ request, signal }),
    login: async (credentials, signal) => requireBinding('auth', 'login')({ request, signal, credentials }),
    logout: async signal => requireBinding('auth', 'logout')({ request, signal }),
    tasks: async signal => decode('tasks', '/api/tasks', { signal }),
    createTask: async (input, signal) => decode('task', '/api/tasks', { method: 'POST', body: input, signal }),
    task: async (id, signal) => decode('detail', taskPath(id), { signal }),
    evidence: async (id, signal) => decode('evidence', `${taskPath(id)}/evidence`, { signal }),
  };
}
