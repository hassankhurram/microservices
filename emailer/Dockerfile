FROM node:20-alpine

WORKDIR /home/node/app

COPY package*.json ./

COPY .env .env

ENV PORT=${PORT}

RUN npm install

COPY . .

EXPOSE ${PORT}

CMD [ "node", "index.js" ]