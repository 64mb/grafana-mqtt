FROM node:14.17.3-alpine3.14

ENV TZ Asia/Yekaterinburg
RUN apk --update --no-cache add tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && apk del tzdata

RUN mkdir -p /home/node/app

RUN npm i -g nodemon

WORKDIR /home/node/app

CMD [ "node", "./docker/docker_entry.js" ]
