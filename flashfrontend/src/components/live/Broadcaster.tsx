import { useState, useEffect, useRef } from 'react';
import { Room } from 'livekit-client';
import livekitService from '../../services/livekitService';
import Chat from './Chat';
import '../../styles/Broadcaster.css';

interface BroadcasterProps {
  userName: string;
  roomName: string;
  onClose: () => void;
}

const Broadcaster: React.FC<BroadcasterProps> = ({ userName, roomName, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  // 타이머 설정
  useEffect(() => {
    let interval: number | null = null;
    
    if (isConnected) {
      interval = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);
  
  // 방송 시작
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 토큰 생성
        const token = await livekitService.createToken(userName, roomName, userName);
        console.log('토큰 생성 성공');

        // 방 연결 및 방송 시작
        const connectedRoom = await livekitService.startBroadcast(token);
        console.log('방 연결 성공:', connectedRoom.name);
        setRoom(connectedRoom);
        setIsConnected(true);

        // 처음부터 로컬 비디오 요소 확인 
        console.log('localVideoRef 확인:', localVideoRef);
        console.log('localVideoRef.current 확인:', localVideoRef.current);
        console.log('document.getElementById 확인:', document.getElementById('video-preview'));

        // DOM이 완전히 렌더링될 때까지 약간 대기
        setTimeout(() => {
          try {
            // 비디오 요소를 직접 쿼리로 찾기
            const videoElement = document.getElementById('video-preview') as HTMLVideoElement;
            if (!videoElement) {
              console.error('document.getElementById로 비디오 요소를 찾을 수 없습니다');
              return;
            }
            
            console.log('비디오 요소를 성공적으로 찾았습니다');
            console.log('비디오 요소에 트랙 연결 시도...');
            
            if (!livekitService.attachVideoTrack(videoElement)) {
              console.error('비디오 트랙을 연결할 수 없습니다');
            }
          } catch (attachError) {
            console.error('비디오 연결 오류:', attachError);
          }
        }, 2000);

        // 시청자 수 업데이트
        connectedRoom.on('participantConnected', () => {
          const viewers = livekitService.getRemoteParticipants().length;
          setViewerCount(viewers);
        });

        connectedRoom.on('participantDisconnected', () => {
          const viewers = livekitService.getRemoteParticipants().length;
          setViewerCount(viewers);
        });

      } catch (error) {
        console.error('방 초기화 중 오류 발생:', error);
        setError(error instanceof Error ? error.message : '방송을 시작할 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRoom();

    return () => {
      if (room) {
        livekitService.stopBroadcast();
      }
    };
  }, [roomName, userName]);
  
  // 방송 종료
  const handleEndBroadcast = () => {
    if (room) {
      livekitService.stopBroadcast();
      setIsConnected(false);
      onClose();
    }
  };
  
  // 시간 형식 변환 (초 -> HH:MM:SS)
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hrs > 0 ? hrs.toString().padStart(2, '0') : null,
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
  };
  
  if (isLoading) {
    return (
      <div className="broadcaster-container loading">
        <div className="loading-spinner"></div>
        <p>방송을 준비 중입니다...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="broadcaster-container error">
        <div className="error-icon">❌</div>
        <h3>오류가 발생했습니다</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={onClose}>닫기</button>
      </div>
    );
  }
  
  return (
    <div className="broadcaster-container">
      <div className="broadcast-header">
        <div className="broadcast-info">
          <span className="live-badge">LIVE</span>
          <span className="room-name">{roomName}</span>
          <span className="time-elapsed">{formatTime(elapsedTime)}</span>
        </div>
        <div className="broadcast-controls">
          <span className="viewer-count">👁️ {viewerCount}</span>
          <button className="btn btn-danger" onClick={handleEndBroadcast}>방송 종료</button>
        </div>
      </div>
      
      <div className="broadcast-content">
        <div className="video-container">
          <video 
            id="video-preview"
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="local-video"
          />
        </div>
        
        <div className="chat-container-wrapper">
          <Chat roomName={roomName} userName={userName} />
        </div>
      </div>
      
      <div className="broadcast-footer">
        <p className="broadcast-tip">
          💡 방송 팁: 밝은 곳에서 방송하고, 명확하게 말하면 시청자들이 더 잘 이해할 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default Broadcaster; 