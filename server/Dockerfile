FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY ./prisma .
    
RUN npm install
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 8000