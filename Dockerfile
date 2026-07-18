FROM node:20-alpine
WORKDIR /workspace
ENV HOST=0.0.0.0
ENV PORT=5173
COPY server ./server
EXPOSE 5173
CMD ["node", "server/local-server.mjs"]
