import { Link } from 'react-router-dom';

type FooterProps = {
  simplified?: boolean;
}

function Footer({ simplified = false }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>FlashSale</h3>
            <p>한시적 특가 세일로 매출을 극대화하는 가장 쉬운 방법</p>
          </div>
          
          {!simplified && (
            <div className="footer-links">
              <div className="footer-links-column">
                <h4>제품</h4>
                <ul>
                  <li><Link to="/#features">기능</Link></li>
                  <li><Link to="/#pricing">요금제</Link></li>
                  <li><Link to="/#faq">FAQ</Link></li>
                </ul>
              </div>
              <div className="footer-links-column">
                <h4>회사</h4>
                <ul>
                  <li><Link to="#">소개</Link></li>
                  <li><Link to="#">블로그</Link></li>
                  <li><Link to="#">채용</Link></li>
                </ul>
              </div>
              <div className="footer-links-column">
                <h4>법률</h4>
                <ul>
                  <li><Link to="#">이용약관</Link></li>
                  <li><Link to="#">개인정보처리방침</Link></li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 FlashSale. All rights reserved.</p>
          {!simplified && (
            <div className="social-links">
              <a href="#" aria-label="Facebook"><span>Facebook</span></a>
              <a href="#" aria-label="Twitter"><span>Twitter</span></a>
              <a href="#" aria-label="Instagram"><span>Instagram</span></a>
              <a href="#" aria-label="LinkedIn"><span>LinkedIn</span></a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

export default Footer;