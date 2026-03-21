# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

# Routing для React SPA: все 404 → index.html
RUN printf 'server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
