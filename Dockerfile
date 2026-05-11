# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# 使用与 package.json packageManager 字段完全一致的版本
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# 使用淘宝镜像加速（国内网络）
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --no-frozen-lockfile

# Copy source after install so code changes always trigger a fresh pnpm build
COPY . .
# Remove any stale dist artifacts from the build context before building
RUN rm -rf dist && pnpm build

# ── Stage 2: runtime (nginx) ─────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
