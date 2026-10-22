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

export function recommendFor(product, audiences) {
  const names = RECOMMEND[product.dir] || FALLBACK[product.category] || [];
  return names.map((n) => audiences.find((a) => a.name === n)).filter(Boolean);
}
