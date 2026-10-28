// 营销节点日历：按今天的日期算「接下来一个多月里会发生的节点」。
// 这些是从日历推出来的，不靠模型记忆，所以可以直接当事实给模型用。
const FIXED = [
  {name: '元旦', month: 1, day: 1},
  {name: '38 女神节', month: 3, day: 8},
  {name: '618 大促', month: 6, day: 18},
  {name: '国庆', month: 10, day: 1},
  {name: '双11', month: 11, day: 11},
  {name: '双12', month: 12, day: 12},
  {name: '年货节', month: 1, day: 15},
];

const SEASONAL = [
  {name: '开学季', month: 8, day: 20, note: '8 月下旬到 9 月中，学生和新生家长集中买电脑'},
  {name: '毕业季', month: 6, day: 10, note: '6 月毕业、求职，换机和送礼需求起来'},
  {name: '寒假', month: 1, day: 15, note: '寒假前后家长给孩子换机'},
];

const pad = (n) => String(n).padStart(2, '0');

export function upcomingNodes(today = new Date(), days = 75) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const out = [];
  for (const node of [...FIXED, ...SEASONAL]) {
    for (const yearOffset of [0, 1]) {
      const at = new Date(base.getFullYear() + yearOffset, node.month - 1, node.day);
      const away = Math.round((at - base) / 86400000);
      if (away < 0 || away > days) continue;
      out.push({
        name: node.name,
        date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
        daysAway: away,
        note: node.note || '',
      });
    }
  }
  return out.sort((a, b) => a.daysAway - b.daysAway).slice(0, 6);
}

export function todayText(today = new Date()) {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}
