import { Link } from "react-router-dom";
import { useState } from "react";
import "../styles/components.css";

const Header = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    // ProductList に検索クエリを渡す
    window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* ロゴ */}
        <Link to="/" className="logo">
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
          <Link to="/">ホーム</Link>
          <Link to="/products">製品</Link>
          <Link to="/orders">注文</Link>
          <Link to="/users" className="btn btn-outline">
            ユーザー管理
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
