import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/global.css";
import "./styles/components.css";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";

// Pages
import SelectRole from "./pages/SelectRole";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import OrderList from "./pages/OrderList";
import UsersPage from "./pages/UsersPage";

// Components
import App from "./pages/App";
import ProtectedRoute from "./components/ProtectedRoute";

function RootApp() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 起動直後の選択画面（認証不要） */}
          <Route path="/" element={<SelectRole />} />

          {/* エンドユーザー: 認証関連（認証不要）*/}
          <Route path="/mypage/login" element={<LoginPage />} />
          <Route path="/mypage/register" element={<RegisterPage />} />

          {/* エンドユーザー: 保護されたルート */}
          <Route path="/mypage" element={<App />}>
            <Route
              index
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="products"
              element={
                <ProtectedRoute>
                  <ProductList />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/:id"
              element={
                <ProtectedRoute>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedRoute>
                  <OrderList />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 管理者: 認証関連（認証不要） */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* 管理者: 保護されたルート */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<div>ページが見つかりません</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RootApp />);
