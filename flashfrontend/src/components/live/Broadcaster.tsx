import { useState, useEffect, useRef } from 'react';
import { Room } from 'livekit-client';
import livekitService from '../../services/livekitService';
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
    const startBroadcast = async () => {
      try {
        console.log('방송 시작 시도:', { userName, roomName });
        setIsLoading(true);
        setError(null);
        
        // 1. 토큰 생성
        console.log('토큰 생성 요청');
        const token = await livekitService.createToken(userName, roomName, userName);
        console.log('토큰 생성 성공, 토큰 타입:', typeof token);
        if (typeof token !== 'string') {
          throw new Error('토큰이 문자열이 아닙니다');
        }
        
        // 2. 방송 시작 (방에 연결)
        console.log('LiveKit 방 연결 시도');
        const connectedRoom = await livekitService.startBroadcast(token);
        console.log('LiveKit 방 연결 성공:', connectedRoom.name);
        setRoom(connectedRoom);
        setIsConnected(true);
        
        // 3. 로컬 비디오 설정
        console.log('로컬 비디오 설정 시도');
        const localParticipant = livekitService.getLocalParticipant();
        if (localParticipant && localVideoRef.current) {
          const videoTracks = localParticipant.getTrackPublications().filter(
            track => track.kind === 'video'
          );
          
          console.log('비디오 트랙:', videoTracks.length);
          if (videoTracks.length > 0) {
            const videoTrack = videoTracks[0].track;
            if (videoTrack) {
              videoTrack.attach(localVideoRef.current);
              console.log('비디오 트랙 연결 성공');
            }
          }
        }
        
        // 4. 시청자 수 업데이트
        connectedRoom.on('participantConnected', () => {
          const viewers = livekitService.getRemoteParticipants().length;
          console.log('참가자 연결됨, 시청자 수:', viewers);
          setViewerCount(viewers);
        });
        
        connectedRoom.on('participantDisconnected', () => {
          const viewers = livekitService.getRemoteParticipants().length;
          console.log('참가자 연결 해제됨, 시청자 수:', viewers);
          setViewerCount(viewers);
        });
        
      } catch (err) {
        console.error('방송 시작 오류:', err);
        setError(err instanceof Error ? err.message : '방송을 시작할 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    startBroadcast();
    
    // 컴포넌트 언마운트 시 방송 종료
    return () => {
      if (room) {
        console.log('방송 종료 (컴포넌트 언마운트)');
        livekitService.stopBroadcast();
      }
    };
  }, [userName, roomName]);
  
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
      
      <div className="video-container">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="local-video"
        />
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