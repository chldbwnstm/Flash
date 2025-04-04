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
const staticPath = path.join(__dirname, 'flashfrontend/dist');
console.log('정적 파일 경로:', staticPath);

// 정적 파일 제공 
app.use(express.static(staticPath, {
  setHeaders: function(res, filePath) {
    console.log('정적 파일 요청:', filePath);
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// assets 폴더를 위한 명시적 라우트 추가
app.get('/assets/*', (req, res, next) => {
  const assetPath = path.join(staticPath, 'assets', req.params[0]);
  console.log('Asset 요청:', req.url, '-> 파일 경로:', assetPath);
  
  if (!require('fs').existsSync(assetPath)) {
    console.log('Asset 파일 없음:', assetPath);
    return res.status(404).send('Asset not found');
  }
  
  res.sendFile(assetPath);
});

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
    console.log('파일 요청 처리 중:', req.url);
    return next();
  }
  
  // API 요청은 무시
  if (req.url.startsWith('/api')) {
    console.log('API 요청 처리 중:', req.url);
    return next();
  }
  
  const indexPath = path.join(staticPath, 'index.html');
  console.log('SPA 라우팅:', req.url, '-> 파일 경로:', indexPath);
  
  if (!require('fs').existsSync(indexPath)) {
    console.log('index.html 파일 없음:', indexPath);
    return res.status(404).send('App entry point not found');
  }
  
  res.sendFile(indexPath);
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
    console.log('현재 디렉토리:', __dirname);
    
    // 배포 환경에서 디렉토리 구조 확인
    try {
      const fs = require('fs');
      
      // 현재 디렉토리 내용 확인
      console.log('\n현재 디렉토리 내용:');
      const rootFiles = fs.readdirSync(__dirname);
      console.log(rootFiles);
      
      // dist 디렉토리 확인
      const distPath = path.join(__dirname, 'flashfrontend', 'dist');
      if (fs.existsSync(distPath)) {
        console.log('\ndist 디렉토리 내용:');
        const distFiles = fs.readdirSync(distPath);
        console.log(distFiles);
        
        // assets 디렉토리 확인
        const assetsPath = path.join(distPath, 'assets');
        if (fs.existsSync(assetsPath)) {
          console.log('\nassets 디렉토리 내용:');
          const assetsFiles = fs.readdirSync(assetsPath);
          console.log(assetsFiles);
        } else {
          console.log('\nassets 디렉토리가 없습니다:', assetsPath);
        }
      } else {
        console.log('\ndist 디렉토리가 없습니다:', distPath);
      }
    } catch (err) {
      console.error('디렉토리 확인 중 오류 발생:', err);
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