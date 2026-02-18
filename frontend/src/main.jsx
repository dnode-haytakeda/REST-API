import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/global.css";
import "./styles/variables.css";

// ページコンポーネント
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
        {/* App: ヘッダー・フッター含むレイアウト */}
        <Route element={<App />}>
          {/* 各ページ */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/users" element={<UsersPage />} />

          {/* 404 */}
          <Route path="*" element={<div>ページが見つかりません</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RootApp />);
