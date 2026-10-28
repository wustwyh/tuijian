import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import {knowledgeRoot} from './knowledge-root.mjs';

const PRESENTATIONS = {
  '01': ['wechat', 'article', '分章节长文与配图'],
  '02': ['news', 'article', '事实导语、信息主体与配图'],
  '03': ['zhihu', 'article', '问题、证据与条件对照'],
  '04': ['xhs', 'xhs', '封面、图文笔记与检查清单'],
  '05': ['weibo', 'moments', '短文案、主题配图与互动'],
  '11': ['store', 'poster', '产品长图与分区信息'],
  '12': ['moments', 'moments', '短文案与场景配图'],
  '13': ['business', 'article', '需求、候选、验证与方案图文'],
};


const field = (text, key) => text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim() || '';

export function composeOptions(projectRoot) {
  const root = knowledgeRoot(projectRoot);
  const casesRoot = join(root, 'P6-营销素材库/13-多平台公开案例研究');
  const platforms = readdirSync(casesRoot, {withFileTypes:true}).filter(d => d.isDirectory() && PRESENTATIONS[d.name.slice(0,2)])
    .sort((a,b)=>a.name.localeCompare(b.name)).map(d => {
      const [id, form, output] = PRESENTATIONS[d.name.slice(0,2)];
      const cases = readdirSync(join(casesRoot, d.name)).filter(n=>n.endsWith('.md')).sort().flatMap(name => {
        const path = join(casesRoot, d.name, name), text = readFileSync(path, 'utf8');
        if (/视频|直播/.test(field(text, 'platform'))) return [];
        return [{id:field(text, 'case_id'), title:field(text, 'title'), theme:field(text, 'theme'),
          source:relative(root, path).replaceAll('\\', '/')}];
      });
      return {id, form, output, name:d.name.replace(/^\d+-/, ''), cases,
        source:relative(root, join(casesRoot, d.name)).replaceAll('\\','/')};
    });

  const topicPath = join(root, 'P6-营销素材库/07-选题库/服务型内容选题.md');
  const text = readFileSync(topicPath, 'utf8');
  const topics = [...text.matchAll(/^## 选题卡[^｜\r\n]+｜([^\r\n]+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(m => {
    const fields = Object.fromEntries([...m[2].matchAll(/^- ([^：\r\n]+)：(.+)$/gm)].map(x=>[x[1],x[2].trim()]));
    return {id:`topic-${createHash('sha256').update(m[1]).digest('hex').slice(0,12)}`,
      name:m[1].trim(), desc:fields['用户问题'] || '', guide:m[2].trim(), source:relative(root, topicPath).replaceAll('\\','/')};
  });
  if (topics.length !== 8) throw new Error('选题库格式变化，请核对选题标题');
  return {platforms, topics, tasks:['选型号','看屏幕','比便携','查续航','核软件','做协同','迁资料','用会议','找售后'],
    formats:['问题清单','避坑指南']};
}
