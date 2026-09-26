FROM node:22-alpine AS builder
RUN npm install -g bun@latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
# Site configuration passed at build time (via docker-compose / .env).
# Falls back to the production defaults when not provided.
ARG SITE_HOST=cars.kinesis.world
ARG SITE_SCHEME=https
ARG BASE=/
ARG PUBLIC_API_URL=https://api.kinesis.world/x/cars/
ARG PUBLIC_MEDIA_ORIGIN=https://api.kinesis.world
ARG PUBLIC_UPLOAD_ORIGIN=
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51UJyZ5E2xZ1RP1YkW0khidIqjEsyLL35SINWEBy3oR7xGy1lyGECebponk5Ma2MzFfiVVLpxqEo7TbfQjXPrSS0O009uf6ZM26
ENV SITE_HOST=$SITE_HOST
ENV SITE_SCHEME=$SITE_SCHEME
ENV BASE=$BASE
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_MEDIA_ORIGIN=$PUBLIC_MEDIA_ORIGIN
ENV PUBLIC_UPLOAD_ORIGIN=$PUBLIC_UPLOAD_ORIGIN
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=$PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN bun run build
FROM nginx:alpine AS runner
# nginx image auto-renders *.template files with envsubst on startup,
# using SITE_HOST / SITE_SCHEME / SERVER_NAMES from the container environment.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]