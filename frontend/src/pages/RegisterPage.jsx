import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // バリデーション: パスワード一致確認
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    // バリデーション: パスワード強度
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    setIsLoading(true);

    const result = await register(name, email, password);

    setIsLoading(false);

    if (result.success) {
      navigate("/mypage");
    } else {
      setError(result.error || "登録に失敗しました");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ユーザー登録</h1>
        <p className="auth-sbtitle">新規アカウントを作成</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">お名前</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="deloitte 太郎"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード（8文字以上）</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード（確認）</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={8}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={isLoading}
          >
            {isLoading ? "登録中..." : "登録"}
          </button>
        </form>

        <p className="auth-link">
          すでにアカウントを持ちの方は <Link to="/mypage/login"></Link>
        </p>

        <p className="auth-link">
          <Link to="/">← 役割選択に戻る</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
