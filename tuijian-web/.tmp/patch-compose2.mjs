import {readFileSync, writeFileSync} from "node:fs";
const f = "src/compose.jsx";
let s = readFileSync(f, "utf8");
s = s.replace(`      toggleTopicById: (topic) => setState((s) => {
        const on = s.topicIds.includes(topic.id);
        return {...s, topicIds: on ? s.topicIds.filter(id => id !== topic.id) : [...s.topicIds, topic.id],
          recommendedTopics: s.recommendedTopics.some(t => t.id === topic.id) ? s.recommendedTopics : [topic, ...s.recommendedTopics]};
      }),`,
`      toggleTopicById: (topic) => setState((s) => {
        const on = s.topicIds.includes(topic.id);
        const ids = on ? s.topicIds.filter(id => id !== topic.id) : [...s.topicIds, topic.id];
        // 只有在用 AI 推荐池时，才把新选题并进池里；选题库模式不动池。
        const pool = s.recommendedTopics.length && !s.recommendedTopics.some(t => t.id === topic.id)
          ? [topic, ...s.recommendedTopics]
          : s.recommendedTopics;
        return {...s, topicIds: ids, recommendedTopics: pool};
      }),`);
writeFileSync(f, s);
console.log("ok");
