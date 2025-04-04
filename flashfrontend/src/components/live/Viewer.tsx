import { useState, useEffect } from 'react';
import { Room, RemoteParticipant, RemoteTrack, Track } from 'livekit-client';
import livekitService from '../../services/livekitService';
import Chat from './Chat';
import '../../styles/Viewer.css';

interface ViewerProps {
  userName: string;
  roomName: string;
  onClose: () => void;
}

const Viewer: React.FC<ViewerProps> = ({ userName, roomName, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [broadcaster, setBroadcaster] = useState<RemoteParticipant | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  
  // 비디오 요소 참조 설정
  const setVideoRef = (element: HTMLVideoElement | null) => {
    if (element && element !== videoElement) {
      setVideoElement(element);
    }
  };
  
  // 방송자 비디오 트랙 찾기 및 연결
  const attachBroadcasterVideo = (participant: RemoteParticipant) => {
    if (!videoElement) return;
    
    let videoTrack: RemoteTrack | undefined;
    
    participant.trackPublications.forEach(publication => {
      if (publication.kind === Track.Kind.Video) {
        videoTrack = publication.track;
      }
    });
    
    if (videoTrack) {
      videoTrack.attach(videoElement);
      console.log('방송자 비디오 연결 성공');
    } else {
      console.log('방송자 비디오 트랙을 찾을 수 없습니다');
    }
  };
  
  // 방 연결
  useEffect(() => {
    const joinRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 토큰 생성
        const token = await livekitService.createToken(userName, roomName, userName);
        console.log('토큰 생성 성공');
        
        // 시청자로 방 참여
        const connectedRoom = await livekitService.joinAsViewer(token);
        console.log('방 참여 성공:', connectedRoom.name);
        setRoom(connectedRoom);
        
        // 방송자 찾기
        connectedRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
          if (participant.metadata && participant.metadata.includes('host')) {
            setBroadcaster(participant);
            
            // 비디오 요소가 준비되면 방송자 비디오 연결
            if (videoElement) {
              attachBroadcasterVideo(participant);
            }
          }
        });
        
        // 시청자 수 설정
        setViewerCount(connectedRoom.remoteParticipants.size + 1); // +1 for local participant
        
        // 방송자 연결 이벤트
        connectedRoom.on('participantConnected', (participant: RemoteParticipant) => {
          if (participant.metadata && participant.metadata.includes('host')) {
            setBroadcaster(participant);
            
            // 비디오 요소가 준비되면 방송자 비디오 연결
            if (videoElement) {
              attachBroadcasterVideo(participant);
            }
          }
          
          setViewerCount(connectedRoom.remoteParticipants.size + 1);
        });
        
        // 참가자 연결 해제 이벤트
        connectedRoom.on('participantDisconnected', (participant: RemoteParticipant) => {
          if (participant.metadata && participant.metadata.includes('host')) {
            setBroadcaster(null);
            setError('방송이 종료되었습니다.');
          }
          
          setViewerCount(connectedRoom.remoteParticipants.size + 1);
        });
        
        // 트랙 구독 이벤트
        connectedRoom.on('trackSubscribed', (track, _publication, participant: RemoteParticipant) => {
          if (participant.metadata && participant.metadata.includes('host') && track.kind === Track.Kind.Video) {
            if (videoElement) {
              track.attach(videoElement);
              console.log('방송자 비디오 트랙 구독 및 연결 성공');
            }
          }
        });
        
      } catch (error) {
        console.error('방 참여 중 오류 발생:', error);
        setError(error instanceof Error ? error.message : '방 참여에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    joinRoom();
    
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [roomName, userName]);
  
  // 비디오 요소가 변경될 때 방송자 비디오 연결
  useEffect(() => {
    if (videoElement && broadcaster) {
      attachBroadcasterVideo(broadcaster);
    }
  }, [videoElement, broadcaster]);
  
  // 방 나가기
  const handleLeaveRoom = () => {
    if (room) {
      room.disconnect();
    }
    onClose();
  };
  
  if (isLoading) {
    return (
      <div className="viewer-container loading">
        <div className="loading-spinner"></div>
        <p>방송 연결 중입니다...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="viewer-container error">
        <div className="error-icon">❌</div>
        <h3>오류가 발생했습니다</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={onClose}>닫기</button>
      </div>
    );
  }
  
  return (
    <div className="viewer-container">
      <div className="broadcast-header">
        <div className="broadcast-info">
          <span className="live-badge">LIVE</span>
          <span className="room-name">{roomName}</span>
        </div>
        <div className="broadcast-controls">
          <span className="viewer-count">👁️ {viewerCount}</span>
          <button className="btn btn-secondary" onClick={handleLeaveRoom}>나가기</button>
        </div>
      </div>
      
      <div className="broadcast-content">
        <div className="video-container">
          <video 
            ref={setVideoRef}
            id="remote-video"
            autoPlay 
            playsInline 
            className="remote-video"
          />
          {!broadcaster && (
            <div className="no-broadcast">
              <p>방송이 시작되지 않았거나 종료되었습니다.</p>
            </div>
          )}
        </div>
        
        <div className="chat-container-wrapper">
          <Chat roomName={roomName} userName={userName} />
        </div>
      </div>
    </div>
  );
};

export default Viewer; 