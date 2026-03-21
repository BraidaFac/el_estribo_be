# syntax=docker/dockerfile:1
# Multi-stage: una sola `npm ci`, build y prune → imagen final sin devDependencies.

# ---------- build ----------
FROM node:22-alpine AS build

WORKDIR /app

# Capa cacheable: solo manifiestos
COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# No establecer NODE_ENV=production antes del build: hace falta @nestjs/cli (devDependency).
RUN npm run build && npm prune --omit=dev

# ---------- production ----------
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
# Alineado con main.ts (listen(process.env.PORT)); sobrescribible en compose/k8s
ENV PORT=3000

# Solo runtime: módulos ya podados + JS compilado
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

# Invocación directa a Node (sin shell de npm)
CMD ["node", "dist/main.js"]
