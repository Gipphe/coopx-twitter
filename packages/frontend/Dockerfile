FROM node:12 AS base
WORKDIR /home/docker/twitter/frontend
# npm is unable to extract downloaded bins because of access privilege issues.
# With --unsafe-perm, npm does not switch uid while downloading dependencies,
# meaning they are downloaded and extracted with root. This is not advised
# for production environments.
RUN npm i -g --unsafe-perm elm create-elm-app
COPY ./elm.json ./package.json ./
COPY ./src ./src
COPY ./public ./public

FROM base AS prod-build
ARG ELM_APP_API_RULES_URL
ARG ELM_APP_API_STREAM_SOCKET
RUN yarn build

FROM node:12-alpine AS frontend
RUN npm i -g serve
RUN adduser -S docker
USER docker
WORKDIR /home/docker/twitter/frontend
COPY --from=prod-build /home/docker/twitter/frontend/build ./
EXPOSE 8080
CMD ["serve", "-l", "8080", "."]

FROM base AS dev
CMD ["yarn", "start"]
