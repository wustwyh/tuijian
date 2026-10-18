import React, { useState } from 'react';
import { platforms, verificationLabel } from './model.js';
import { h, list, badge, blank, notice, Section } from './ui.js';

const positions = { cover: '封面', body: '正文', ending: '结尾' };

export function ContentPreview({ contents, onViewEvidence }) {
  const [mode, setMode] = useState('preview');
  const drafts = list(contents);
  return h(Section, { title: '平台成稿' },
    !drafts.length ? blank('成稿尚未生成', '生成后可查看平台排版、标题、正文和逐图证据。') : h(React.Fragment, null,
      h('div', { className: 'preview-toolbar' },
        h('div', { className: 'segmented', role: 'group', 'aria-label': '内容展示方式' },
          ...[['preview', '排版预览'], ['structure', '内容结构']].map(([value, label]) => h('button', {
            key: value, type: 'button', 'aria-pressed': mode === value, onClick: () => setMode(value),
          }, label))),
        h('p', { className: 'muted' }, '预览保留原文，不代表已发布或已导出。')),
      ...drafts.map((content, index) => h(Draft, { key: content.id || index, content, mode, onViewEvidence }))));
}

function Draft({ content, mode, onViewEvidence }) {
  const isArticle = content.platform === 'wechat_official';
  const isNote = content.platform === 'xiaohongshu';
  const title = content.selected_title || list(content.title_options)[0] || '标题待确认';
  const images = list(content.image_plan);
  return h('article', { className: 'draft content-draft' },
    h('div', { className: 'list-heading' }, h('div', { className: 'draft-labels' },
      badge(platforms[content.platform] || '平台待确认'),
      h('span', { className: 'muted' }, Number.isInteger(content.version) && content.version > 0 ? `版本 ${content.version}` : '版本待确认')),
      badge(verificationLabel(content.verification_status), content.verification_status)),
    mode === 'preview' ? h('div', { className: `content-preview ${isArticle ? 'article-preview' : isNote ? 'note-preview' : ''}` },
      h('p', { className: 'preview-kicker' }, `${platforms[content.platform] || '平台待确认'} · 排版预览`),
      h('h3', { className: 'preview-title' }, title),
      typeof content.body === 'string' && content.body.trim()
        ? h('div', { className: 'draft-body' }, content.body)
        : notice('正文内容待确认，当前无法预览。'),
      content.cta && h('div', { className: 'preview-cta' }, h('span', null, '行动引导'), h('p', null, content.cta))) :
      h('div', { className: 'content-structure' },
        h('h3', null, title), h('h4', null, '备选标题'),
        list(content.title_options).length ? h('ol', null, ...content.title_options.map((text, index) => h('li', { key: index }, text))) : h('p', { className: 'muted' }, '尚无备选标题'),
        h('h4', null, '正文'), h('div', { className: 'draft-body' }, typeof content.body === 'string' ? content.body : '正文待确认'),
        h('h4', null, '行动引导'), h('p', null, content.cta || '待确认')),
    h('div', { className: 'image-plan' }, h('h4', null, '配图与证据', images.length > 0 && h('span', { className: 'count' }, images.length)),
      images.length ? h(React.Fragment, null,
        h('p', { className: 'muted image-plan-hint' }, '这里展示配图方案。实际图片需读取可访问的素材，来源条目链接不会当作图片直链。'),
        h('div', { className: 'image-plan-grid' }, ...images.map((image, index) => h('figure', { className: 'image-plan-card', key: index },
          h('div', { className: 'image-placeholder' }, h('span', { 'aria-hidden': true }, '▧'), h('span', null, '图片预览待接通')),
          h('figcaption', null, h('span', { className: 'image-position' }, `${String(index + 1).padStart(2, '0')} / ${positions[image.position] || image.position || '位置待确认'}`),
            h('strong', null, image.caption || '图注待确认'), h('p', null, image.purpose || '图片用途待确认'),
            h('small', null, `证据：${image.evidence_id || '待人工核验'}`),
            image.evidence_id && onViewEvidence && h('button', { type: 'button', className: 'quiet evidence-link', onClick: onViewEvidence }, '查看知识依据 ↗')))))) :
        h('p', { className: 'muted' }, '尚无配图方案，不补充无来源的产品图。')),
    content.poster_brief && h('details', { className: 'poster-brief' }, h('summary', null, '海报文案与版式说明'),
      h('h4', null, content.poster_brief.headline || '主标题待确认'), h('p', null, content.poster_brief.subheadline),
      h('p', { className: 'draft-body' }, content.poster_brief.layout_notes),
      h('small', { className: 'muted' }, '此处是文案与版式说明，尚非可下载的海报成品。')));
}

export function ExportEntry() {
  return h('div', { className: 'export-entry' },
    h('div', null, h('h3', null, '导出成稿与核验清单'),
      h('p', { id: 'export-unavailable', className: 'muted' }, '导出暂未接通。服务端确认核验状态和导出权限后，才能下载。')),
    h('div', { className: 'export-actions', role: 'group', 'aria-label': '导出格式' },
      ...['Markdown', 'JSON'].map(format => h('button', { key: format, type: 'button', disabled: true, 'aria-describedby': 'export-unavailable' }, `导出 ${format}`))));
}
