FROM node:12

ENV HOME=/usr/src/app

COPY package.json $HOME/

WORKDIR $HOME
RUN npm install

CMD ["npm", "start"]
