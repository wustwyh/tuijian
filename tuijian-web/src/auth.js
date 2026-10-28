// 形式化登录：只在 localStorage 记一个账号名，不做真实鉴权
const KEY = 'tuijian_user';

export const getUser = () => localStorage.getItem(KEY);
export const login = (name) => localStorage.setItem(KEY, name);
export const updateUser = (name) => localStorage.setItem(KEY, name.trim());
export const logout = () => localStorage.removeItem(KEY);
