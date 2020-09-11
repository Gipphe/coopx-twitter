FROM node:12 AS backend
ARG PORT=8080
WORKDIR /usr/twitter/backend
COPY ./package.json ./yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
EXPOSE ${PORT}
CMD ["yarn", "start"]
