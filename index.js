require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'flashfrontend/dist')));

const port = process.env.PORT || 8080;

// 환경 변수 확인
console.log('환경 변수 확인:', {
  LIVEKIT_URL: process.env.LIVEKIT_URL,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? '설정됨' : '미설정',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ? '설정됨' : '미설정'
});

// LiveKit 서버 URL을 환경 변수에서 가져옴
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekitserver1.picklive.show';

// LiveKit 토큰 생성 엔드포인트
app.post('/api/create-token', async (req, res) => {
  try {
    const { identity, roomName, metadata } = req.body;
    console.log('토큰 생성 요청 본문:', req.body);
    console.log('토큰 생성 요청:', { identity, roomName, metadata });

    if (!roomName || !identity) {
      throw new Error('roomName과 identity가 필요합니다.');
    }

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      throw new Error('LiveKit API 키가 설정되지 않았습니다.');
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity,
        name: metadata?.name || identity,
        ttl: 60 * 60 * 2, // 2시간
      }
    );

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    console.log('토큰 생성 성공, 토큰 타입:', typeof token);
    res.json({ token });
  } catch (error) {
    console.error('토큰 생성 오류:', error);
    console.error('오류 상세:', error.stack);
    res.status(500).json({ 
      error: '토큰 생성 실패',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
app.get('*', (req, res) => {
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