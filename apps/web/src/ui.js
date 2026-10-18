import React from 'react';
import { platforms } from './model.js';

export const h = React.createElement;
export const go = path => { window.location.hash = path; };
export const list = value => Array.isArray(value) ? value : [];
export const notice = (text, kind = 'info') => h('div', { className: `notice ${kind}`, role: kind === 'error' ? 'alert' : 'status' }, text);
export const button = (text, onClick, props = {}) => h('button', { type: 'button', onClick, ...props }, text);
export const badge = (text, state = '') => h('span', { className: `badge ${state}` }, text);
export const blank = (title, text) => h('div', { className: 'empty' }, h('span', { className: 'empty-mark', 'aria-hidden': true }, '◇'), h('h3', null, title), h('p', null, text));
export const textList = items => h('ul', null, ...list(items).map((item, index) => h('li', { key: index }, String(item))));
export function Section({ title, children, className = '' }) { return h('section', { className: `panel ${className}` }, h('h2', null, title), children); }
export function Field({ label, name, value, onChange, error, multiline = false, options, disabled = false, required = false, placeholder = '' }) {
  const props = { id: name, name, value, disabled, required, placeholder, onChange: e => onChange(e.target.value), 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${name}-error` : undefined };
  return h('div', { className: 'field' }, h('label', { htmlFor: name }, label, required && h('span', { className: 'required' }, ' *')),
    options ? h('select', props, ...Object.entries(options).map(([key, title]) => h('option', { key, value: key }, title))) : multiline ? h('textarea', { ...props, rows: 3 }) : h('input', props),
    error && h('small', { className: 'field-error', id: `${name}-error` }, error));
}
export function InputFields({ value, setValue, errors = {}, disabled }) {
  const field = (name, label, props = {}) => h(Field, { key: name, name, label, value: value[name], disabled, error: errors[name], onChange: next => setValue(current => ({ ...current, [name]: next })), ...props });
  return h('div', { className: 'form-grid' },
    field('product_query', '产品关键词', { required: true, placeholder: '填写具体产品型号与版本' }),
    field('platform', '内容平台', { options: platforms, required: true }),
    field('audience_hint', '目标人群', { placeholder: '描述想触达的人群，也可稍后确认' }),
    field('goal', '目标动作', { required: true, placeholder: '例如：预约到店体验' }),
    field('scenario', '使用场景', { required: true, multiline: true, placeholder: '描述人群在什么场景下需要这款产品' }));
}
