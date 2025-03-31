import { useState, useEffect, useRef } from 'react';
import '../../styles/Chat.css';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface ChatProps {
  roomName: string;
  userName: string;
}

const Chat: React.FC<ChatProps> = ({ roomName, userName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 간단한 채팅을 위한 데모 메시지
  useEffect(() => {
    // 시스템 메시지로 입장 알림
    addMessage({
      id: Date.now().toString(),
      sender: 'system',
      content: `${roomName} 채팅방에 오신 것을 환영합니다!`,
      timestamp: new Date()
    });
    
    // 몇 가지 예시 메시지
    setTimeout(() => {
      addMessage({
        id: (Date.now() + 1).toString(),
        sender: '시청자1',
        content: '안녕하세요! 오늘 방송 주제가 뭔가요?',
        timestamp: new Date()
      });
    }, 2000);
    
    setTimeout(() => {
      addMessage({
        id: (Date.now() + 2).toString(),
        sender: '시청자2',
        content: '화면이 너무 깨끗하네요! 카메라가 뭔가요?',
        timestamp: new Date()
      });
    }, 5000);
  }, [roomName]);
  
  // 채팅창 스크롤 자동 이동
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '') return;
    
    // 새 메시지 추가
    addMessage({
      id: Date.now().toString(),
      sender: userName,
      content: inputValue,
      timestamp: new Date()
    });
    
    setInputValue('');
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>라이브 채팅</h3>
        <span className="chat-room">{roomName}</span>
      </div>
      
      <div className="chat-messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`chat-message ${message.sender === 'system' ? 'system-message' : ''} ${message.sender === userName ? 'my-message' : ''}`}
          >
            <div className="message-header">
              <span className="message-sender">{message.sender}</span>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="메시지 입력..."
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn">전송</button>
      </form>
    </div>
  );
};

export default Chat; 