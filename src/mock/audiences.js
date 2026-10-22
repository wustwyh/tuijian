// 客户场景 mock：audiences.json 由 P8-客户场景库 11 个大类的文档自动提取
// （人群范围 / 任务链 / 典型痛点）。购买触发点、顾虑暂为 null，留待补全。
// 「12-行业场景」下 30 个细分行业本批不接。
import list from './audiences.json';

export const AUDIENCES = list;

// 「为这台推荐」：营销假设，仅用于演示，正式版由场景判断调用给出
const RECOMMEND = {
  'HUAWEI MateBook Fold 非凡大师': ['商务管理', '内容创作', '移动办公'],
  'HUAWEI MateBook Pro': ['移动办公', '商务管理', '内容创作'],
  'HUAWEI MateBook Pro S': ['移动办公', '学生学习'],
  'HUAWEI MateBook 14': ['学生学习', '移动办公', '家庭换新'],
  'MateBook 14 酷睿 Ultra': ['移动办公', '中小企业'],
  'MateBook D 14': ['学生学习', '家庭换新'],
  'MateBook D 16': ['家庭换新', '中小企业'],
  'MateBook D 16 SE 版': ['学生学习', '家庭换新'],
  'MateBook GT 系列': ['内容创作', '学生学习'],
  'MateBook X系列': ['商务管理', '移动办公'],
};

const FALLBACK = {
  '鸿蒙电脑': ['移动办公', '商务管理'],
  'Windows 笔记本': ['学生学习', '家庭换新'],
};

export function recommendFor(product) {
  const names = RECOMMEND[product.dir] || FALLBACK[product.category] || [];
  return names.map((n) => AUDIENCES.find((a) => a.name === n)).filter(Boolean);
}
