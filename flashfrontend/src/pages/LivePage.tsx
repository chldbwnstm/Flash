import { useState, FormEvent } from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import Broadcaster from '../components/live/Broadcaster';
import '../styles/LivePage.css';

function LivePage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showBroadcaster, setShowBroadcaster] = useState<boolean>(false);
  const [roomName, setRoomName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleStartBroadcast = (e: FormEvent) => {
    e.preventDefault();
    console.log('방송 시작 폼 제출됨:', { roomName, userName, category, description });
    // 폼이 유효한지 확인
    if (roomName && category) {
      console.log('방송 시작 조건 충족');
      setShowBroadcaster(true);
    } else {
      console.log('방송 시작 조건 불충족:', { roomName, category });
    }
  };

  const handleCloseBroadcast = () => {
    setShowBroadcaster(false);
  };

  // 방송자 컴포넌트가 표시되면 메인 컨텐츠 대신 보여줌
  if (showBroadcaster) {
    return (
      <div className="live-page">
        <Header isHomePage={false} />
        <main className="live-container">
          <Broadcaster 
            userName={userName || '익명 사용자'} 
            roomName={roomName} 
            onClose={handleCloseBroadcast} 
          />
        </main>
        <Footer simplified={true} />
      </div>
    );
  }

  return (
    <div className="live-page">
      {/* 헤더 영역 */}
      <Header isHomePage={false} />

      <main className="live-container">
        <h1 className="live-title">라이브 방송</h1>
        <p className="live-description">라이브 방송을 통해 제품을 홍보하고 실시간으로 고객과 소통하세요.</p>
        
        <div className="options-container">
          <div 
            className={`option-card ${selectedOption === 'broadcast' ? 'selected' : ''}`}
            onClick={() => handleOptionSelect('broadcast')}
          >
            <div className="option-icon">📹</div>
            <h2>방송하기</h2>
            <p>제품 라이브 방송을 시작하고 고객과 실시간으로 소통하세요.</p>
            <button className="btn btn-primary" onClick={(e) => {
              e.stopPropagation(); // 부모 요소의 클릭 이벤트 방지
              handleOptionSelect('broadcast');
            }}>방송 시작하기</button>
          </div>
          
          <div 
            className={`option-card ${selectedOption === 'watch' ? 'selected' : ''}`}
            onClick={() => handleOptionSelect('watch')}
          >
            <div className="option-icon">👁️</div>
            <h2>시청하기</h2>
            <p>진행 중인 라이브 방송을 확인하고 참여하세요.</p>
            <button className="btn btn-primary">라이브 찾기</button>
          </div>
        </div>
        
        {selectedOption === 'broadcast' && (
          <div className="option-details">
            <h3>방송 시작하기</h3>
            <p>방송을 시작하기 전에 다음 정보를 확인해 주세요:</p>
            <ul>
              <li>제품 정보가 정확히 입력되어 있는지 확인하세요.</li>
              <li>카메라와 마이크 연결 상태를 확인하세요.</li>
              <li>인터넷 연결이 안정적인지 확인하세요.</li>
            </ul>
            <form className="broadcast-form" onSubmit={handleStartBroadcast}>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="방송 제목" 
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="방송자 이름" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">카테고리 선택</option>
                  <option value="fashion">패션/의류</option>
                  <option value="beauty">뷰티/화장품</option>
                  <option value="food">식품</option>
                  <option value="home">홈/리빙</option>
                  <option value="digital">디지털/가전</option>
                </select>
              </div>
              <div className="form-group">
                <textarea 
                  placeholder="방송 설명" 
                  rows={3} 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-full">방송 시작하기</button>
            </form>
          </div>
        )}
        
        {selectedOption === 'watch' && (
          <div className="option-details">
            <h3>라이브 방송 둘러보기</h3>
            <p>현재 진행 중인 인기 라이브 방송:</p>
            <div className="live-list">
              <div className="live-item">
                <div className="live-thumbnail">
                  <span className="live-badge">LIVE</span>
                  <div className="viewer-count">👁️ 1,245</div>
                </div>
                <h4>봄맞이 신상 의류 50% 할인 특가</h4>
                <p>패션스토어 | 23분 전 시작</p>
              </div>
              <div className="live-item">
                <div className="live-thumbnail">
                  <span className="live-badge">LIVE</span>
                  <div className="viewer-count">👁️ 857</div>
                </div>
                <h4>최신 스마트폰 언박싱 & 리뷰</h4>
                <p>테크월드 | 10분 전 시작</p>
              </div>
              <div className="live-item">
                <div className="live-thumbnail">
                  <span className="live-badge">LIVE</span>
                  <div className="viewer-count">👁️ 492</div>
                </div>
                <h4>홈케어 제품 할인전</h4>
                <p>리빙마트 | 45분 전 시작</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 푸터 영역 */}
      <Footer simplified={true} />
    </div>
  );
}

export default LivePage;