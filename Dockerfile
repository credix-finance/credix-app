FROM node:14.17.0-alpine

ARG PROGRAM_ADDRESS
ENV ENV_PROGRAM_ADDRESS=$PROGRAM_ADDRESS

ARG ENVIRONMENT
ARG ENV_ENVIRONMENT=$ENVIRONMENT

WORKDIR /app

COPY . .

RUN yarn install --silent
RUN yarn global add react-scripts@3.4.1 --silent

RUN REACT_APP_CLUSTER=$ENV_ENVIRONMENT REACT_APP_PROGRAM_ID=$ENV_PROGRAM_ADDRESS yarn run build --production

RUN yarn global add serve --silent

CMD serve -p 8080 -s build

EXPOSE 8080
