import { Link } from 'react-router-dom';

type HeaderProps = {
  isHomePage?: boolean;
}

function Header({ isHomePage = false }: HeaderProps) {
  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <Link to="/">
            <h1>FlashSale</h1>
          </Link>
        </div>
        <nav className="nav">
          <ul>
            {isHomePage ? (
              <>
                <li><a href="#features">기능</a></li>
                <li><a href="#pricing">요금제</a></li>
                <li><a href="#faq">FAQ</a></li>
              </>
            ) : (
              <li><Link to="/">홈으로</Link></li>
            )}
            <li><Link to="/live" className="btn btn-primary">라이브 방송</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;