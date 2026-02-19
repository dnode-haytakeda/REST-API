import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/global.css";
import "./styles/components.css";

// ページコンポーネント
import SelectRole from "./pages/SelectRole"
import Dashboard from "./pages/Dashboard";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import OrderList from "./pages/OrderList";
import UsersPage from "./pages/UsersPage";

// ショーケットコンポーネント
import App from "./pages/App";

function RootApp() {
  return (
    <Router>
      <Routes>
        {/* 起動直後の選択画面 */}
        <Route path="/" element={<SelectRole />} />

        {/* エンドユーザー: ヘッダー・フッター含むレイアウト */}
        <Route path="/mypage" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="orders" element={<OrderList />} />
        </Route>

        {/* 管理者 */}
        <Route path="/admin" element={<UsersPage />} />

        {/* 404 */}
        <Route path="*" element={<div>ページが見つかりません</div>} />
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RootApp />);
