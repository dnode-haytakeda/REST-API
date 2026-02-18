import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  const handleAddToCart = (e) => {
    e.preventDefault();
    // カート機能（後で実装）
    alert(`${product.name} をカートに追加しました`);
  };

  return (
    <div className="product-card">
      {/* 画像 */}
      <div className="product-image">
        <Link to={`/products/${product.id}`}>
          <img
            src={product.image_url || "/placeholder.jpg"}
            alt={product.name}
          />
        </Link>
        {product.is_featured && (
          <span className="badge-featured">おすすめ</span>
        )}
      </div>

      {/* 情報 */}
      <div className="product-info">
        <Link to={`/products/${product.id}`} className="product-name">
          <h3>{product.name}</h3>
        </Link>

        {/* 価格・レーティング */}
        <div className="product-meta">
          <span className="price">¥{Number(product.price).toLocaleString()}</span>
          <div className="rating">
            ★ {product.rating ? Number(product.rating).toFixed(1) : "未評価"}
            <span className="reviews-count">
              ({product.reviews_count || 0})
            </span>
          </div>
        </div>

        {/* 説明 */}
        <p className="product-description">
          {product.description?.slice(0, 50)}...
        </p>

        {/* アクション */}
        <button className="btn btn-primary" onClick={handleAddToCart}>
          {product.stock > 0 ? "カートに追加" : "売り切れ"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
