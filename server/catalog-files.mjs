import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const nameKey = (name) => name.normalize('NFKC').replace(/^HUAWEI\s*/i, '')
  .replace(/[\s()（）·]/g, '').toLowerCase();

export function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

// 图片说明中有逗号、引号和换行，不能用 split(',') 解析。
export function readCsv(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(field); field = '';
      if (char !== ',') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (char === '\r' && text[i + 1] === '\n') i++;
      }
    } else field += char;
  }
  if (quoted) throw new Error(`CSV 引号未闭合：${path}`);
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, i) => [key, values[i] || ''])));
}
