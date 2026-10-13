FROM node:24-alpine
WORKDIR /app
ENV HOST=0.0.0.0 PORT=8766
COPY --chown=node:node server.mjs index.html styles.css script.js image-data.js ./
COPY --chown=node:node assets/starry-night.jpeg ./assets/starry-night.jpeg
USER node
EXPOSE 8766
CMD ["node", "server.mjs"]
