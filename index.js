const express = require('express');
const path = require('path');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
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
const livekitUrl = 'https://livekitserver1.picklive.show';

// LiveKit Room Service 클라이언트 생성
const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

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
    
    // metadata 객체에 role 정보 추가 처리
    const tokenMetadata = {
      ...metadata,
      role: metadata?.role || 'viewer' // 기본값은 시청자
    };
    
    console.log('토큰 메타데이터:', tokenMetadata);
    
    // 토큰 생성
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: tokenMetadata.name || identity,
      metadata: JSON.stringify(tokenMetadata) // 메타데이터를 문자열로 변환하여 저장
    });
    
    // 참가자 권한 설정 - role에 따라 권한 차등 부여
    const isPublisher = tokenMetadata.role === 'host' || tokenMetadata.role === 'broadcaster';
    
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isPublisher, // 방송자만 게시 가능
      canPublishData: true,    // 모든 참가자가 데이터 채널을 통해 메시지 전송 가능
      canSubscribe: true,      // 모두 구독 가능
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

// 활성 방 목록 가져오는 엔드포인트
app.get('/api/rooms', async (req, res) => {
  try {
    console.log('활성 방 목록 요청 받음');
    
    // LiveKit 서버에서 활성 방 목록 조회
    const rooms = await roomService.listRooms();
    
    console.log('활성 방 목록:', rooms);
    
    // 클라이언트에게 필요한 정보만 필터링하고 BigInt를 문자열로 변환
    const roomList = rooms.map(room => ({
      name: room.name,
      numParticipants: room.numParticipants,
      creationTime: room.creationTime ? room.creationTime.toString() : '',
      metadata: room.metadata ? JSON.parse(room.metadata) : null,
      activeRecording: room.activeRecording
    }));
    
    res.json({ rooms: roomList });
  } catch (error) {
    console.error('방 목록 조회 오류:', error);
    res.status(500).json({ 
      error: '방 목록을 가져오는데 실패했습니다.', 
      details: error.message 
    });
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

console.log(`LiveKit 서버 연결 시도: ${livekitUrl}`);