import {readFileSync, writeFileSync} from "node:fs";
const f = "src/compose.jsx";
let s = readFileSync(f, "utf8");

s = s.replace(`  topicIds: [],
  extra: '',`, `  topicIds: [],
  recommendedTopics: [], // AI 按客户+平台现推的选题（空则用选题库）
  hotTopics: [], // 本次借势的热点
  extra: '',`);

s = s.replace(`      topicIds: Array.isArray(old.topicIds) ? old.topicIds : []};`, `      topicIds: Array.isArray(old.topicIds) ? old.topicIds : [],
      recommendedTopics: Array.isArray(old.recommendedTopics) ? old.recommendedTopics : [],
      hotTopics: Array.isArray(old.hotTopics) ? old.hotTopics : []};`);

s = s.replace(`    const topics = state.topicIds.map((id) => options.topics.find((s) => s.id === id)).filter(Boolean);`,
`    // 选题池：AI 推荐优先，没有推荐才退回选题库
    const aiTopics = Array.isArray(state.recommendedTopics) ? state.recommendedTopics : [];
    const topicPool = aiTopics.length ? aiTopics : options.topics;
    const topics = state.topicIds.map((id) => topicPool.find((s) => s.id === id)).filter(Boolean);`);

s = s.replace(`      selectedTopics: topics,
      topicNames: topics.map(t=>t.name),`,
`      topicPool,
      aiTopics,
      hotTopics: Array.isArray(state.hotTopics) ? state.hotTopics : [],
      selectedTopics: topics,
      topicNames: topics.map(t=>t.name),
      topicLabels: Object.fromEntries(topics.map(t=>[t.id,t.name])),
      setRecommendedTopics: (list) => setState((s) => {
        const next = Array.isArray(list) ? list : [];
        const ids = new Set(next.map(t => t.id));
        return {...s, recommendedTopics: next, topicIds: s.topicIds.filter(id => ids.has(id))};
      }),
      toggleTopicById: (topic) => setState((s) => {
        const on = s.topicIds.includes(topic.id);
        return {...s, topicIds: on ? s.topicIds.filter(id => id !== topic.id) : [...s.topicIds, topic.id],
          recommendedTopics: s.recommendedTopics.some(t => t.id === topic.id) ? s.recommendedTopics : [topic, ...s.recommendedTopics]};
      }),
      toggleHotTopic: (hot) => setState((s) => {
        const on = s.hotTopics.some(t => t.title === hot.title);
        return {...s, hotTopics: on ? s.hotTopics.filter(t => t.title !== hot.title) : [...s.hotTopics, hot].slice(0, 3)};
      }),
      clearHotTopics: () => setState((s) => ({...s, hotTopics: []})),`);

s = s.replace(`  const materials=useMaterials(state,setState);`, `  const materials=useMaterials(state,setState);`);
writeFileSync(f, s);
console.log("compose ok");
