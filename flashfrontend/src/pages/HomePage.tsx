import { useState } from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import '../styles/HomePage.css';

function HomePage() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 이메일 처리 로직 - 실제 구현에서는 서버로 보내거나 저장
    alert(`${email}로 신청되었습니다.`);
    setEmail('');
  };

  return (
    <div className="app">
      {/* 헤더 영역 */}
      <Header isHomePage={true} />

      {/* 히어로 섹션 */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h2 className="hero-title">단 하루만<br />특별한 할인 혜택을 제공합니다</h2>
            <p className="hero-description">
              FlashSale을 통해 한정된 시간 동안 최고의 할인 혜택을 제공하고
              매출을 극대화하세요.
            </p>
            <form className="signup-form" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">무료로 시작하기</button>
            </form>
            <p className="form-note">* 14일 무료 체험 후 구독이 필요합니다</p>
          </div>
        </div>
      </section>

      {/* 기능 섹션 */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">주요 기능</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>빠른 할인 설정</h3>
              <p>몇 번의 클릭만으로 시간 제한 특가 세일을 설정할 수 있습니다.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>실시간 매출 분석</h3>
              <p>할인 캠페인 효과를 실시간으로 분석하여 최적의 판매 전략을 수립할 수 있습니다.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>안전한 보안</h3>
              <p>모든 데이터는 암호화되어 안전하게 보호됩니다.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏱️</div>
              <h3>카운트다운 타이머</h3>
              <p>긴급성을 높이는 카운트다운 타이머로 고객의 구매 결정을 앞당길 수 있습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 가격 정책 섹션 */}
      <section id="pricing" className="pricing">
        <div className="container">
          <h2 className="section-title">플랜 선택</h2>
          <div className="pricing-cards">
            <div className="pricing-card">
              <h3>스타터</h3>
              <div className="price">₩29,000<span>/월</span></div>
              <ul className="pricing-features">
                <li>✓ 기본 기능 접근</li>
                <li>✓ 월 500회 연결</li>
                <li>✓ 이메일 지원</li>
                <li>✓ 기본 분석</li>
              </ul>
              <button className="btn btn-outline">시작하기</button>
            </div>
            <div className="pricing-card featured">
              <div className="featured-tag">인기</div>
              <h3>프로</h3>
              <div className="price">₩79,000<span>/월</span></div>
              <ul className="pricing-features">
                <li>✓ 모든 기본 기능</li>
                <li>✓ 무제한 연결</li>
                <li>✓ 우선 지원</li>
                <li>✓ 고급 분석</li>
                <li>✓ API 접근</li>
              </ul>
              <button className="btn btn-primary">시작하기</button>
            </div>
            <div className="pricing-card">
              <h3>엔터프라이즈</h3>
              <div className="price">문의</div>
              <ul className="pricing-features">
                <li>✓ 모든 프로 기능</li>
                <li>✓ 전용 매니저</li>
                <li>✓ 맞춤형 기능</li>
                <li>✓ 온보딩 지원</li>
                <li>✓ SLA 보장</li>
              </ul>
              <button className="btn btn-outline">문의하기</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ 섹션 */}
      <section id="faq" className="faq">
        <div className="container">
          <h2 className="section-title">자주 묻는 질문</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3>FlashSale은 어떤 서비스인가요?</h3>
              <p>FlashSale은 비즈니스가 한시적인 특별 할인을 쉽게 제공할 수 있는 플랫폼입니다. 몇 번의 클릭만으로 긴급 세일 이벤트를 시작할 수 있습니다.</p>
            </div>
            <div className="faq-item">
              <h3>무료 체험은 어떻게 이용하나요?</h3>
              <p>회원가입 후 14일 동안 모든 기능을 무료로 이용할 수 있습니다. 별도의 결제 정보 없이도 시작할 수 있습니다.</p>
            </div>
            <div className="faq-item">
              <h3>구독을 취소할 수 있나요?</h3>
              <p>네, 언제든지 구독을 취소할 수 있습니다. 취소 시 다음 결제일까지 서비스를 이용할 수 있습니다.</p>
            </div>
            <div className="faq-item">
              <h3>기술적 지원은 어떻게 받을 수 있나요?</h3>
              <p>이메일 또는 실시간 채팅을 통해 언제든지 기술 지원팀에 문의할 수 있습니다. 프로 및 엔터프라이즈 요금제는 우선 지원을 받습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 문의하기 섹션 */}
      <section id="contact" className="contact">
        <div className="container">
          <h2 className="section-title">문의하기</h2>
          <p className="contact-description">더 자세한 정보가 필요하시거나 질문이 있으신가요? 언제든지 연락주세요.</p>
          <div className="contact-form-container">
            <form className="contact-form">
              <div className="form-group">
                <input type="text" placeholder="이름" required />
              </div>
              <div className="form-group">
                <input type="email" placeholder="이메일" required />
              </div>
              <div className="form-group">
                <textarea placeholder="메시지" rows={5} required></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-full">보내기</button>
            </form>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <Footer />
    </div>
  );
}

export default HomePage;