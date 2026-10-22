FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV KNOWLEDGE_ROOT=/app/knowledge
# 模型服务：外部 OpenAI 兼容网关 + deepseek flash。运行时只需在空间密钥里配 LLM_API_KEY；
# 想换网关或型号，就在后台加密变量里覆盖这两个值（运行时变量优先于镜像默认值）。
ENV LLM_BASE_URL=https://api.openai-next.com/v1
ENV LLM_MODEL=deepseek-v4.1-flash
RUN npm run build
ENV NODE_ENV=production
EXPOSE 7860
CMD ["npm", "run", "start"]
