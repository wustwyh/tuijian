import React, { useState } from 'react';
import { h, button, badge, notice, Section, Field } from './ui.js';
import { channelOptions } from './marketing-options.js';

const directions = [
  { id: 'scenario', title: '场景体验', line: '从日常问题开始，让客户代入自己的使用场景。', headline: '从一次真实体验，找到自己的节奏。' },
  { id: 'guide', title: '选购指南', line: '先梳理需求，再带着软件、配置和预算问题到店咨询。', headline: '选电脑之前，先想清楚这三个问题。' },
  { id: 'invite', title: '到店邀约', line: '用清晰的体验安排和行动引导，推动下一次沟通。', headline: '带上你的日常需求，来店里体验一下。' },
];
export const defaultStrategy = { direction: 'scenario', tone: '自然分享', message: '', goal: '到店体验', platform: 'xiaohongshu' };
export function StrategyEditor({ product, persona, customer, value, onChange, onApply, onAudience }) {
  const [saved, setSaved] = useState(false);
  const chosen = directions.find(d => d.id === value.direction) || directions[0];
  const update = (key, next) => { onChange(current => ({ ...current, [key]: next })); setSaved(false); };
  return h(React.Fragment, null,
    h('header', { className: 'page-heading' }, h('div', null, h('p', { className: 'eyebrow' }, 'C / MARKETING STRATEGY'), h('h1', null, '选一个方向，让表达更有重点。'), h('p', { className: 'muted' }, '选择内容方向，调整语气与行动目标，再把策略带入内容工坊。'))),
    h('div', { className: 'strategy-context' }, badge(product?.name || 'HUAWEI MateBook 14（鸿蒙版）'), badge(persona.name), customer && badge(`客户：${customer.name}`), button('调整目标人群', onAudience, { className: 'quiet' })),
    h('div', { className: 'strategy-options', role: 'group', 'aria-label': '营销方向' }, ...directions.map((d, index) => button(h(React.Fragment, null, h('small', null, `DIRECTION 0${index + 1}`), h('h2', null, d.title), h('p', null, d.line), h('strong', null, value.direction === d.id ? '✓ 当前采用' : '选择这个方向 →')), () => update('direction', d.id), { key: d.id, className: `strategy-option ${value.direction === d.id ? 'selected' : ''}`, 'aria-pressed': value.direction === d.id }))),
    h('div', { className: 'pipeline-layout' },
      h(Section, { title: '策略设置' }, h(Field, { name: 'strategy-platform', label: '投放平台', value: value.platform, options: channelOptions, onChange: v => update('platform', v) }), h(Field, { name: 'strategy-tone', label: '表达语气', value: value.tone, options: { '自然分享': '自然分享', '专业清晰': '专业清晰', '轻松亲切': '轻松亲切', '简洁有力': '简洁有力' }, onChange: v => update('tone', v) }),
        h(Field, { name: 'strategy-goal', label: '行动目标', value: value.goal, options: { '到店体验': '到店体验', '咨询了解': '咨询了解', '预约体验': '预约体验' }, onChange: v => update('goal', v) }), h(Field, { name: 'strategy-message', label: '核心表达（可修改）', value: value.message || chosen.headline, multiline: true, onChange: v => update('message', v) }),
        h('div', { className: 'strategy-actions' }, button('采用当前策略', () => setSaved(true)), button('应用策略并进入内容工坊 →', () => onApply({ ...value, message: value.message || chosen.headline, directionLabel: chosen.title }), { className: 'primary' })), saved && notice('已采用当前策略，可继续调整或进入内容工坊。')),
      h(Section, { title: '执行预览' }, h('div', { className: 'strategy-hero' }, h('p', { className: 'eyebrow' }, chosen.title), h('h2', null, value.message || chosen.headline), h('p', null, `${value.tone} · ${channelOptions[value.platform]}`)), h('h3', null, '人群与需求'), h('p', null, customer?.needs || persona.need), h('ol', null, h('li', null, `围绕“${persona.scene}”组织内容`), h('li', null, chosen.line), h('li', null, `结尾引导：${value.goal}`)), h('h3', null, '事实与风险'), h('p', { className: 'muted' }, '规格、价格和兼容性以产品资料为准，避免无法证实的效果承诺。'))));
}
