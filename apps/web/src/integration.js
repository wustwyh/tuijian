// Adapts the actual B1 endpoints documented in Backend's handoff.
// This is a frontend binding, not a change to the shared API contract.
function required(value, message) {
  if (!value) throw new Error(message);
  return value;
}
const authRequest = async ({ request, signal, credentials }, action) => {
  const raw = await request(`/api/auth/${action}`, {
    method: 'POST', signal, notifyUnauthorized: false,
    body: { email: credentials.account, password: credentials.password },
  });
  return required(raw?.user?.id && raw.user, '账号服务未返回有效身份。');
};
export const integration = {
  auth: {
    async session({ request, signal }) {
      try {
        const raw = await request('/api/auth/me', { signal, notifyUnauthorized: false });
        return required(raw?.user?.id && raw.user, '账号服务未返回有效身份。');
      } catch (error) {
        if (error.status === 401) return null;
        throw error;
      }
    },
    login: context => authRequest(context, 'login'),
    register: context => authRequest(context, 'register'),
    logout: ({ request, signal }) => request('/api/auth/logout', { method: 'POST', signal }),
  },
  responses: {
    tasks(raw) {
      if (!Array.isArray(raw?.tasks)) throw new Error('任务列表响应格式不正确。');
      return raw.tasks;
    },
    task: raw => required(raw?.task?.id && raw.task, '服务未返回有效任务。'),
    detail(raw) {
      const task = required(raw?.task?.id && raw.task, '服务未返回有效任务。');
      // B1 only supplies task. Missing generated results remain absent.
      return { task, personas: raw.personas, strategy: raw.strategy, contents: raw.contents, verification: raw.verification };
    },
    evidence(raw) {
      if (!Array.isArray(raw?.evidence)) throw new Error('证据列表尚未接通或响应格式不正确。');
      return raw.evidence;
    },
  },
};
