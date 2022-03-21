FROM node:14.17.3-alpine3.14

ENV TZ Asia/Yekaterinburg
RUN apk --update --no-cache add tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && apk del tzdata

RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm ci --only=production

COPY --chown=node:node . .

CMD [ "node", "server.js" ]
