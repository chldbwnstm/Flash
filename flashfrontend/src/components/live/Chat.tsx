import React, { useState, useEffect, useRef } from 'react';
import { Room, RemoteParticipant } from 'livekit-client';
import './Chat.css';

// 채팅 메시지 타입 정의
interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isSystem?: boolean;
  role?: string; // 역할 정보 추가
  isSelf?: boolean; // 자신이 보낸 메시지인지 표시
}

// 채팅 컴포넌트 props 정의
interface ChatProps {
  room: Room | null;
  userName: string;
}

// 채팅 컴포넌트
const Chat: React.FC<ChatProps> = ({ room, userName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userRole, setUserRole] = useState<string>('unknown');
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  
  // 메시지 추가 함수
  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  // 컴포넌트 마운트 시 실행
  useEffect(() => {
    if (!room) {
      console.log('Room이 없습니다. 채팅을 사용할 수 없습니다.');
      setConnectionStatus('disconnected');
      return;
    }

    // 사용자 역할 설정
    try {
      const metadata = room.localParticipant.metadata 
        ? JSON.parse(room.localParticipant.metadata) 
        : { role: 'viewer' };
      setUserRole(metadata.role || 'viewer');
      console.log('참가자 역할 설정:', metadata.role || 'viewer');
      setConnectionStatus('connected');
    } catch (e) {
      console.error('메타데이터 파싱 오류:', e);
      setUserRole('viewer'); // 기본값
    }

    // 시스템 메시지 추가
    addMessage({
      id: Date.now().toString(),
      sender: 'system',
      content: `채팅방에 연결되었습니다. ${room.name}`,
      timestamp: new Date(),
      isSystem: true
    });

    // LiveKit 권한 확인 로깅
    console.log('로컬 참가자 정보:', {
      identity: room.localParticipant.identity,
      metadata: room.localParticipant.metadata,
      sid: room.localParticipant.sid,
      permissions: room.localParticipant.permissions
    });

    // 데이터 수신 이벤트 리스너
    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const decoder = new TextDecoder();
        const dataStr = decoder.decode(payload);
        const data = JSON.parse(dataStr);

        console.log('데이터 수신됨:', {
          sender: participant?.identity || 'unknown',
          type: data.type,
          length: dataStr.length,
          time: new Date().toISOString()
        });

        if (data.type === 'chat') {
          // 참가자의 메타데이터에서 역할 정보 추출
          let role = 'viewer';
          try {
            if (participant?.metadata) {
              const metadata = JSON.parse(participant.metadata);
              role = metadata.role || 'viewer';
            }
          } catch (e) {
            console.error('참가자 메타데이터 파싱 오류:', e);
          }

          addMessage({
            id: data.id,
            sender: data.sender,
            content: data.content,
            timestamp: new Date(data.timestamp),
            role: role,
            isSelf: false // 수신된 메시지는 항상 다른 사람의 메시지
          });
        }
      } catch (error) {
        console.error('메시지 디코딩 오류:', error);
        console.log('원본 데이터:', new TextDecoder().decode(payload));
      }
    };

    // 참가자 연결 이벤트 리스너
    const handleParticipantConnected = (participant: RemoteParticipant) => {
      try {
        let role = 'viewer';
        if (participant.metadata) {
          const metadata = JSON.parse(participant.metadata);
          role = metadata.role || 'viewer';
        }
        
        addMessage({
          id: Date.now().toString(),
          sender: 'system',
          content: `${participant.identity}님이 입장했습니다. (${role})`,
          timestamp: new Date(),
          isSystem: true
        });
      } catch (e) {
        console.error('참가자 메타데이터 파싱 오류:', e);
        addMessage({
          id: Date.now().toString(), 
          sender: 'system',
          content: `${participant.identity}님이 입장했습니다.`,
          timestamp: new Date(),
          isSystem: true
        });
      }
    };

    // 참가자 연결 해제 이벤트 리스너
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      addMessage({
        id: Date.now().toString(),
        sender: 'system',
        content: `${participant.identity}님이 퇴장했습니다.`,
        timestamp: new Date(),
        isSystem: true
      });
    };

    // Connection 상태 변경 리스너
    const handleConnectionStateChanged = (state: string) => {
      console.log('LiveKit 연결 상태 변경:', state);
      setConnectionStatus(state);
      
      if (state === 'disconnected') {
        addMessage({
          id: Date.now().toString(),
          sender: 'system',
          content: '서버와의 연결이 끊어졌습니다.',
          timestamp: new Date(),
          isSystem: true
        });
      }
    };

    // 이벤트 리스너 등록
    room.on('dataReceived', handleDataReceived);
    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);
    room.on('connectionStateChanged', handleConnectionStateChanged);

    // Room 연결 상태 표시
    console.log('채팅 컴포넌트 - Room 상태:', {
      name: room.name,
      localParticipant: room.localParticipant.identity,
      connectState: room.state,
      participantsCount: room.numParticipants
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 해제
    return () => {
      room.off('dataReceived', handleDataReceived);
      room.off('participantConnected', handleParticipantConnected);
      room.off('participantDisconnected', handleParticipantDisconnected);
      room.off('connectionStateChanged', handleConnectionStateChanged);
    };
  }, [room, userName]);

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 메시지 전송
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '' || !room || !room.localParticipant) {
      console.log('메시지 전송 불가: 입력 비어있거나 방 또는 로컬 참가자 없음', {
        hasInput: !!inputValue.trim(),
        hasRoom: !!room,
        hasLocalParticipant: !!room?.localParticipant
      });
      return;
    }
    
    const messageId = Date.now().toString();
    
    // 먼저 내 화면에 메시지 표시
    addMessage({
      id: messageId,
      sender: userName,
      content: inputValue,
      timestamp: new Date(),
      role: userRole,
      isSelf: true
    });
    
    // 다른 참가자에게 메시지 전송
    const message = {
      type: 'chat',
      id: messageId,
      sender: userName,
      content: inputValue,
      timestamp: new Date().toISOString(),
      role: userRole
    };
    
    // 메시지 인코딩 및 전송
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));
    
    try {
      // 데이터 전송 시도
      console.log('메시지 전송 시도:', {
        messageLength: data.length,
        participant: room.localParticipant.identity,
        role: userRole,
        connectionState: room.state,
        permissions: room.localParticipant.permissions
      });
      
      // DataChannel API를 통한 데이터 전송
      await room.localParticipant.publishData(data, { reliable: true });
      console.log('채팅 메시지 전송 성공:', message);
    } catch (error) {
      console.error('채팅 메시지 전송 실패:', error);
      
      // 실패 시 대체 방법 시도: 실패 이유를 시스템 메시지로 표시
      addMessage({
        id: Date.now().toString(),
        sender: 'system',
        content: `메시지 전송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        timestamp: new Date(),
        isSystem: true
      });
    }
    
    setInputValue('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>채팅</h3>
        <div className="chat-status">
          <div className="user-role">역할: {userRole}</div>
          <div className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'connected' ? '연결됨' : '연결 안됨'}
          </div>
        </div>
      </div>
      <div className="messages-container">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message ${msg.isSystem ? 'system-message' : 'user-message'} ${msg.isSelf ? 'self-message' : ''}`}
          >
            {!msg.isSystem && (
              <div className="message-sender">
                {msg.sender}
                {msg.role && (
                  <span className={`role-${msg.role}`}>
                    {msg.role === 'host' ? '방송자' : '시청자'}
                  </span>
                )}
              </div>
            )}
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="message-input"
          disabled={connectionStatus !== 'connected'}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={connectionStatus !== 'connected'}
        >
          보내기
        </button>
      </form>
    </div>
  );
};

export default Chat; 