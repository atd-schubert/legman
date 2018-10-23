FROM node:latest

MAINTAINER Arne Schubert <atd.schubert@gmail.com>

WORKDIR /opt/legman

# Make dependencies cacheable
COPY ./package-lock.json ./package.json /opt/legman/
RUN npm i

COPY . /opt/legman
RUN npm run transpile

CMD ["npm", "test"]
