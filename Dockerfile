# One image: builds the React client, then serves it and the API from a single Node process.
# Same origin means the httpOnly auth cookie works with no CORS or SameSite tuning.
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production SERVE_CLIENT=true PORT=5000
COPY server/package*.json ./server/
# bcrypt ships prebuilt binaries for alpine; the build tools are only a fallback.
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY --from=client /app/client/dist ./client/dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "server/server.js"]
