import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    setIsLoading(false);

    if (result.success) {
      navigate("/mypage");
    } else {
      setError(result.error || "ログインに失敗しました");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ログイン</h1>
        <p className="auth-subtitle">エンドユーザーでログイン</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
            <label htmlFor="password">パスワード</label>
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

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={isLoading}
          >
            {isLoading ? "ログイン中" : "ログイン"}
          </button>
        </form>

        <p className="auth-link">
          アカウントを持ちでない方は{" "}
          <Link to="/mypage/register">こちらから登録</Link>
        </p>

        <p className="auth-link">
          <Link to="/">役割選択に戻る</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
