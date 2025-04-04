const express = require('express');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');
const fs = require('fs');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

// 프록시 서버 생성
const proxy = require('http-proxy').createProxyServer({
  target: 'wss://livekitserver1.picklive.show',
  ws: true,
  secure: true,
  changeOrigin: true
});

// 프록시 에러 처리
proxy.on('error', (err, req, res) => {
  console.error('프록시 오류:', err);
  if (res.writeHead) {
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    res.end('프록시 오류');
  }
});

const app = express();

// CORS 설정
app.use(cors({
  origin: ['https://picklive.show', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// MIME 타입 설정
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

// 정적 파일 경로 설정
const staticPath = path.join(__dirname, 'flashfrontend', 'dist');
console.log('정적 파일 경로:', staticPath);

// 정적 파일 제공
app.use(express.static(staticPath, {
  setHeaders: function(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// LiveKit 설정
const apiKey = '77d517fbde26187d4349fa09575776b2';
const apiSecret = '9732e928137c718a7a023a19415e8667e44c6385f863bb758e7679fde1fb8ead';
const livekitHost = 'wss://livekitserver1.picklive.show';

// LiveKit 프록시 설정
const livekitProxy = createProxyMiddleware({
  target: 'https://livekitserver1.picklive.show',
  ws: true,
  secure: true,
  changeOrigin: true,
  pathRewrite: {
    '^/livekit-proxy': ''
  },
  onError: (err, req, res) => {
    console.error('프록시 오류:', err);
    if (res.writeHead) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('LiveKit 서버 연결 오류');
    }
  },
  logLevel: 'debug'
});

// LiveKit 프록시 경로 설정
app.use('/livekit-proxy', livekitProxy);

// WebSocket 요청 처리
const server = require('http').createServer(app);

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/livekit-proxy')) {
    console.log('WebSocket 업그레이드 요청:', req.url);
    livekitProxy.upgrade(req, socket, head);
  }
});

// LiveKit 토큰 생성 엔드포인트
app.post('/api/create-token', async (req, res) => {
  try {
    const { identity, roomName, metadata } = req.body;
    
    console.log('토큰 생성 요청 받음:', { identity, roomName, metadata });
    
    if (!identity || !roomName) {
      return res.status(400).json({ error: 'identity and roomName are required' });
    }
    
    // 토큰 생성
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: metadata?.name || identity,
    });
    
    // 참가자 권한 설정
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    
    // 서명된 토큰 생성 (비동기 함수이므로 await 사용)
    const jwt = await token.toJwt();
    console.log('생성된 토큰 타입:', typeof jwt);
    
    if (typeof jwt === 'string') {
      console.log('생성된 토큰:', jwt.substring(0, 20) + '...');
    } else {
      console.log('생성된 토큰이 문자열이 아닙니다:', jwt);
    }
    
    // 서명된 토큰 반환
    res.json({ token: jwt });
  } catch (error) {
    console.error('Token creation error:', error);
    res.status(500).json({ error: 'Failed to create token', details: error.message });
  }
});

// API 엔드포인트
app.get('/api/pirates/:id', (req,res) => {
    const id = req.params.id;
    const pirate = getPirate(id);
    if(!pirate)
    {
        res.status(404).send({error: `Pirate ${id} not found`});
    }
    else
    {
        res.send({data: pirate});
    }
});

// 디렉토리 스캔 헬퍼 함수
function directoryTree(dir, depth = 0) {
  const result = [];
  if (depth > 2) return result; // 깊이 제한
  
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        result.push({
          type: 'directory',
          name: file,
          path: filePath,
          children: directoryTree(filePath, depth + 1)
        });
      } else {
        result.push({
          type: 'file',
          name: file,
          path: filePath,
          size: stat.size
        });
      }
    }
  } catch (err) {
    console.error(`디렉토리 스캔 오류 (${dir}):`, err);
  }
  
  return result;
}

// 리액트 라우팅을 위해 모든 경로를 index.html로 리다이렉트
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  
  // 파일 요청인 경우 (확장자가 있는 경우)
  if (req.url.includes('.')) {
    const filePath = path.join(staticPath, req.url);
    console.log('파일 요청:', req.url, '-> 파일 경로:', filePath);
    
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      }
      return res.sendFile(filePath);
    } else {
      console.log('파일을 찾을 수 없음:', filePath);
      // 트리 구조 출력 (디버깅용)
      const tree = directoryTree(staticPath);
      console.log('디렉토리 구조:', JSON.stringify(tree, null, 2));
      return res.status(404).send('File not found');
    }
  }
  
  // SPA 라우팅 처리 (HTML 페이지 요청)
  console.log('SPA 라우팅:', req.url);
  return res.sendFile(path.join(staticPath, 'index.html'));
});

const port = process.env.PORT || 8080;

// app.listen(port, () => {
server.listen(port, () => {
    console.log(`Listening on port ${port}`);
    console.log('현재 디렉토리:', __dirname);
    
    // 디렉토리 구조 출력
    try {
      console.log('\n정적 파일 디렉토리 구조:');
      const tree = directoryTree(staticPath);
      console.log(JSON.stringify(tree, null, 2));
    } catch (err) {
      console.error('디렉토리 구조 출력 오류:', err);
    }
});

function getPirate(id) {
    const pirates = [
        {id: 1, name: 'Klaus Störtebeker', active: '1392-1401', country: 'Germany'},
        {id: 2, name: 'Kristoffer Trondson', active: '1535-1542', country: 'Norway'},
        {id: 3, name: 'Jan de Bouff', active: '1602', country: 'Netherlands'},
        {id: 4, name: 'Jean Bart', active: '1672-1697', country: 'France'},
        {id: 5, name: 'Tuanku Abbas', active: 'to 1844', country: 'Malay Archipelago'},
        {id: 6, name: 'Ching Shih', active: '1807-1810', country: 'China'}
    ];
    
    return pirates.find(p => p.id == id);
}