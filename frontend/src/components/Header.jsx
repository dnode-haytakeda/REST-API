import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "../styles/components.css";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    // ProductList に検索クエリを渡す
    window.location.href = `/mypage/products?search=${encodeURIComponent(searchQuery)}`;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* ロゴ */}
        <Link to="/mypage" className="logo">
          🛍️ E-Commerce
        </Link>

        {/* 検索フォーム */}
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="製品を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary">
            検索
          </button>
        </form>

        {/* ナビゲーション */}
        <nav className="header-nav">
          <Link to="/mypage">ホーム</Link>
          <Link to="/mypage/products">製品</Link>
          <Link to="/mypage/orders">注文</Link>

          {/* ユーザー情報 */}
          {user && (
            <div className="user-menu">
              <span className="user-name">👤 {user.name}</span>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                ログアウト
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
