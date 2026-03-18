# ---- BUILD STAGE ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ---- PRODUCTION STAGE ----
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./

# Instala solo dependencias de producción
RUN npm ci --omit=dev

# Copia el build ya generado
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
