FROM node:20-bullseye-slim
WORKDIR /usr/src/app

# Dummy value so `prisma generate` (runs via postinstall) can resolve the
# datasource url at build time. The host (Render, Railway, etc.) overrides
# this with the real runtime value pointing at a Postgres database.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js"]
