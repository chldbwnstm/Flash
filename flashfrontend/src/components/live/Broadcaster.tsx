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
    const startBroadcast = async () => {
      try {
        console.log('방송 시작 시도:', { userName, roomName });
        setIsLoading(true);
        setError(null);
        
        // 1. 브라우저 미디어 권한 먼저 요청
        try {
          console.log('카메라/마이크 권한 요청');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: true 
          });
          console.log('카메라/마이크 권한 승인됨:', stream.getTracks().map(t => t.kind));
          
          // 테스트로 비디오를 직접 연결
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            console.log('테스트 비디오 소스 설정 완료');
          }
          
          // 사용이 끝난 후 트랙 해제 (LiveKit가 새로 만들 것이므로)
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('미디어 장치 접근 오류:', err);
          throw new Error('카메라 또는 마이크에 접근할 수 없습니다: ' + (err as Error).message);
        }
        
        // 2. 토큰 생성
        console.log('토큰 생성 요청');
        const token = await livekitService.createToken(userName, roomName, userName);
        console.log('토큰 생성 성공, 토큰 타입:', typeof token);
        if (typeof token !== 'string') {
          throw new Error('토큰이 문자열이 아닙니다');
        }
        
        // 3. 방송 시작 (방에 연결)
        console.log('LiveKit 방 연결 시도');
        const connectedRoom = await livekitService.startBroadcast(token);
        console.log('LiveKit 방 연결 성공:', connectedRoom.name);
        setRoom(connectedRoom);
        setIsConnected(true);
        
        // 4. 로컬 비디오 설정
        console.log('로컬 비디오 설정 시도');
        const localParticipant = livekitService.getLocalParticipant();
        if (localParticipant && localVideoRef.current) {
          console.log('로컬 참가자:', localParticipant.identity);
          
          // 모든 트랙 로깅
          const allTracks = localParticipant.trackPublications;
          console.log('모든 트랙:', Array.from(allTracks.values()).map(pub => ({
            kind: pub.kind,
            trackName: pub.trackName
          })));
          
          // 비디오 트랙 필터링
          const videoTracks = localParticipant.getTrackPublications().filter(
            track => track.kind === 'video'
          );
          
          console.log('비디오 트랙:', videoTracks.length);
          if (videoTracks.length > 0) {
            const videoTrack = videoTracks[0].track;
            if (videoTrack) {
              videoTrack.attach(localVideoRef.current);
              console.log('비디오 트랙 연결 성공');
            } else {
              console.error('비디오 트랙이 null입니다');
            }
          } else {
            console.error('비디오 트랙을 찾을 수 없습니다');
            
            // 직접 새 로컬 트랙 생성 시도
            try {
              console.log('새 비디오 트랙 직접 생성 시도');
              const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = mediaStream;
                console.log('비디오 요소에 직접 스트림 연결 성공');
              }
            } catch (directVideoError) {
              console.error('직접 비디오 생성 실패:', directVideoError);
            }
          }
        } else {
          console.error('로컬 참가자 또는 비디오 요소가 없습니다');
        }
        
        // 5. 시청자 수 업데이트
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
      
      <div className="broadcast-content">
        <div className="video-container">
          <video 
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