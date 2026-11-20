FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.html online.js online.css premium.js premium.css premium-world.js scene3d.js ./
COPY assets/ ./assets/
COPY server/ ./server/
USER node
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
