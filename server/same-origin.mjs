// 反向代理（如魔搭创空间网关）会把 Host 改写成内网地址，而浏览器发来的 Origin
// 仍是公网域名。直接比较两者，会把所有写操作都误判成跨站请求并返回 403。
// 这里改为比较域名部分（忽略端口与协议），并同时接受代理转发头，既兼容部署，
// 也仍然只允许同站发起的写操作。
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // 非浏览器请求（服务端、命令行）不校验 Origin
  let originHostname;
  try {
    originHostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  const candidates = new Set();
  const add = (value) => {
    if (!value) return;
    for (const part of String(value).split(',')) {
      const host = part.trim().toLowerCase();
      if (!host) continue;
      candidates.add(host);
      candidates.add(host.replace(/:\d+$/, '').replace(/^\[|\]$/g, ''));
    }
  };
  add(req.headers.host);
  add(req.headers['x-forwarded-host']);
  add(req.headers['x-forwarded-server']);
  return candidates.has(originHostname);
}
