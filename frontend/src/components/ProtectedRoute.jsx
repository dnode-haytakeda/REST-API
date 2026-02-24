import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * 認証が必要なルートを保護するコンポーネント
 * @param {Object} props
 * @param {React.ReactNode} props.children - 保護するコンポーネント
 * @param {string} props.requiredRole - 必要な役割('user' または 'admin')省略時は認証のみ
 * @param {string} props.redirectTo - リダイレクト先(省略時は /mypage/login)
 */
const ProtectedRoute = ({
  children,
  requiredRole,
  redirectTo = "/mypage/login",
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // 認証確認中はローディング表示
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  // 未認証の場合はログインページへ
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // 役割チェック(requiredRole が指定されている場合)
  if (requiredRole && user?.role !== requiredRole) {
    // 権限不足の場合は403ページまたはホームへ
    return (
      <div className="error-page">
        <h1>アクセス権限がありません</h1>
        <p>このページにアクセスする権限がありません</p>
      </div>
    );
  }

  // 認証済み & 権限OK → 子コンポーネント表示
  return children;
};

export default ProtectedRoute;
