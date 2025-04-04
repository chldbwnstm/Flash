const express = require('express');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');
const app = express();
app.use(express.json());

// MIME 타입 설정 추가
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (ext === '.js' || ext === '.mjs') {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (ext === '.css') {
    res.setHeader('Content-Type', 'text/css');
  }
  next();
});

// 정적 파일 경로 설정
app.use(express.static('flashfrontend/dist', {
  setHeaders: function(res, path) {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

const port = process.env.PORT || 8080;

// LiveKit 설정
const apiKey = '77d517fbde26187d4349fa09575776b2';
const apiSecret = '9732e928137c718a7a023a19415e8667e44c6385f863bb758e7679fde1fb8ead';
const livekitHost = 'wss://livekitserver1.picklive.show';

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

// 리액트 라우팅을 위해 모든 경로를 index.html로 리다이렉트
app.get('*', (req, res, next) => {
  // assets 폴더의 정적 파일 요청은 무시 (이미 위에서 처리됨)
  if (req.url.includes('.')) {
    return next();
  }
  
  // API 요청은 무시
  if (req.url.startsWith('/api')) {
    return next();
  }
  
  console.log('SPA 라우팅:', req.url);
  res.sendFile(path.resolve(__dirname, 'flashfrontend', 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
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