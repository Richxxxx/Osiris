FROM node:19.6.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

ENV NEXT_PUBLIC_API=http://poseidon.com:8000/

COPY . .

RUN npm run build

CMD ["npm", "run", "dev"]