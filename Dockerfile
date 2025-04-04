FROM node:18

WORKDIR /app

# 백엔드 종속성 설치
COPY package*.json ./
RUN npm install

# 프론트엔드 종속성 설치
COPY flashfrontend/package*.json ./flashfrontend/
RUN cd flashfrontend && npm install

# 소스 코드 복사
COPY . .

# 파일 구조 확인
RUN ls -la
RUN ls -la flashfrontend

# 프론트엔드 빌드
RUN cd flashfrontend && npm run build

# 빌드 결과 확인
RUN ls -la flashfrontend/dist
RUN ls -la flashfrontend/dist/assets || echo "assets 디렉토리가 없습니다"

# 포트 노출
EXPOSE 8080

# 앱 실행
CMD ["node", "index.js"] 