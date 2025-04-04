const express = require('express');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// CORS 설정 - 모든 출처 허용
app.use(cors({
  origin: '*',
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

// LiveKit 설정
const apiKey = '77d517fbde26187d4349fa09575776b2';
const apiSecret = '9732e928137c718a7a023a19415e8667e44c6385f863bb758e7679fde1fb8ead';

// WebSocket 프록시 설정 (단순함을 위해 http-proxy-middleware 사용)
const wsProxy = createProxyMiddleware({
  target: 'https://livekitserver1.picklive.show',
  changeOrigin: true,
  ws: true,
  secure: true,
  pathRewrite: {
    '^/livekit': ''  // /livekit 경로를 빈 문자열로 대체
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`웹 프록시 요청: ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`웹 프록시 응답: ${proxyRes.statusCode} (${req.url})`);
  },
  onError: (err, req, res) => {
    console.error(`프록시 오류: ${err.message}`);
    if (res.writeHead) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'LiveKit 서버 연결 오류', message: err.message }));
    }
  }
});

// LiveKit 프록시 설정
app.use('/livekit', wsProxy);

// 정적 파일 제공
const staticPath = path.join(__dirname, 'flashfrontend', 'dist');
console.log('정적 파일 경로:', staticPath);

app.use(express.static(staticPath, {
  setHeaders: function(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

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
    
    // 서명된 토큰 생성
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

// 리액트 라우팅을 위해 모든 경로를 index.html로 리다이렉트
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/livekit')) {
    return next();
  }
  
  // 파일 요청인 경우 (확장자가 있는 경우)
  if (req.url.includes('.')) {
    const filePath = path.join(staticPath, req.url);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      console.log('파일을 찾을 수 없음:', filePath);
      return res.status(404).send('File not found');
    }
  }
  
  // SPA 라우팅 처리 (HTML 페이지 요청)
  console.log('SPA 라우팅:', req.url);
  return res.sendFile(path.join(staticPath, 'index.html'));
});

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 지원을 위해 서버에 프록시 연결
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/livekit')) {
    console.log('WebSocket 업그레이드 요청:', req.url);
    wsProxy.upgrade(req, socket, head);
  }
});

const port = process.env.PORT || 8080;

// 서버 시작
server.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
    console.log('현재 디렉토리:', __dirname);
    console.log('정적 파일 경로:', staticPath);
    
    // 디렉토리 내용 로깅
    try {
      const files = fs.readdirSync(staticPath);
      console.log('정적 파일 디렉토리 내용:', files);
    } catch (err) {
      console.error('디렉토리 내용 확인 오류:', err);
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

// LiveKit 서버 URL 결정
const livekitUrl = 'wss://livekitserver1.picklive.show';

console.log(`LiveKit 서버 연결 시도: ${livekitUrl}`);