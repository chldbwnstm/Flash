FROM node:18

WORKDIR /app

# 백엔드 종속성 설치
COPY package*.json ./
RUN npm install

# 프론트엔드 종속성 설치 및 빌드
COPY flashfrontend/package*.json ./flashfrontend/
RUN cd flashfrontend && npm install

# 소스 코드 복사
COPY . .

# 프론트엔드 빌드
RUN cd flashfrontend && npm run build

# 포트 노출
EXPOSE 8080

# 앱 실행
CMD ["node", "index.js"] 