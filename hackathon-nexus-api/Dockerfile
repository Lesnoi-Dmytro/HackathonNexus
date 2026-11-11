FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


FROM public.ecr.aws/docker/library/node:20-alpine

ARG PORT=3000
ENV PORT=$PORT

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE $PORT

CMD ["node", "dist/main.js"]
