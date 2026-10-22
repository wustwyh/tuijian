import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadEnv} from 'vite';

export function knowledgeRoot(projectRoot) {
  const configured=process.env.KNOWLEDGE_ROOT || loadEnv(process.env.NODE_ENV || 'development',projectRoot,'').KNOWLEDGE_ROOT;
  const root=resolve(projectRoot,configured || '../华为PC知识库/华为PC全板块深度知识库_v7');
  if(!existsSync(resolve(root,'P1-产品参数库')))throw new Error('找不到统一知识库目录，请在服务器 .env 中设置 KNOWLEDGE_ROOT');
  return root;
}
