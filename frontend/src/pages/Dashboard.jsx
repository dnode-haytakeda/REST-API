import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productsAPI } from "../services/productsAPI";
import LoadingSpinner from "../components/LoadingSpinner";

const Dashboard = () => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 人気商品を取得
    const fetchPopularProducts = async () => {
      try {
        const response = await productsAPI.getPopular(8); // 8件取得
        setPopularProducts(response.data || []);
      } catch (err) {
        console.error("Failed to fetch popular products:", err);
        setError("人気商品の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchPopularProducts();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="dashboard-page">
      <h1>ホーム</h1>
      <p className="dashboard-subtitle">よく検索される製品をご紹介します</p>

      {error && <div className="error-message">{error}</div>}

      {/** 人気製品セクション */}
      <section className="popular-products-section">
        <div className="section-header">
          <h2>人気製品</h2>
          <Link to="/mypage/products" className="view-all-link">
            全ての製品を見る →
          </Link>
        </div>

        {popularProducts.length === 0 ? (
          <p>現在、人気製品はありません</p>
        ) : (
          <div className="popular-products-grid">
            {popularProducts.map((product) => (
              <Link
                key={product.id}
                to={`/mypage/products/${product.id}`}
                className="popular-product-card"
              >
                <div className="product-image">
                  <img
                    src={product.image_url || "/placeholder.jpg"}
                    alt={product.name}
                  />
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-price">
                    ¥{Number(product.price).toLocaleString()}
                  </p>
                  <div className="product-meta">
                    <span className="rating">
                      {product.rating
                        ? Number(product.rating).toFixed(1)
                        : "未評価"}
                    </span>
                    {product.view_count && (
                      <span className="view-count">
                        {product.view_count.toLocaleString()} views
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/** 追加のセクション（オプション） */}
      <section className="dashboard-info">
        <div className="info-card">
          <h3>新着製品</h3>
          <p>最新の製品をチェック</p>
          <Link to="/mypage/products?sort=created_at&order=desc" className="btn btn-outline">
            新着を見る
          </Link>
        </div>
        <div className="info-card">
          <h3>高評価製品</h3>
          <p>レビュー評価の高い製品</p>
          <Link to="/mypage/products?sort=rating&order=desc" className="btn btn-outline">
            高評価を見る
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
