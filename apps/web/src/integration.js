// Coordinator freezes authentication and response envelopes before these are wired.
// These functions adapt the agreed Backend API; never put server secrets here.
export const integration = {
  auth: null,
  // auth: { session: async ({ request, signal }) => User | null,
  //         login: async ({ request, signal, credentials }) => User,
  //         logout: async ({ request, signal }) => void }
  responses: null,
  // responses: { tasks: raw => MarketingTask[], task: raw => MarketingTask,
  //              detail: raw => ({ task, personas, strategy, contents, verification }),
  //              evidence: raw => EvidenceItem[] }
  // detail is a frontend view model, not a new Backend response contract.
};
