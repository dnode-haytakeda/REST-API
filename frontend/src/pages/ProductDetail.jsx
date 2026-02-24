import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { productsAPI } from "../services/productsAPI";
import useCart from "../hooks/useCart";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    productsAPI
      .getDetail(parseInt(id))
      .then(setProduct)
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      alert(`${product.name} を ${quantity} 個カートに追加しました`);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;
  if (!product) return <div>製品が見つかりません</div>;

  return (
    <div className="product-detail-page">
      <div className="detail-container">
        {/* 画像 */}
        <div className="detail-image">
          <img
            src={product.image_url || "/placeholder.jpg"}
            alt={product.name}
          />
        </div>

        {/* 情報 */}
        <div className="detail-info">
          <h1>{product.name}</h1>
          <div className="detail-meta">
            <span className="price">¥{Number(product.price).toLocaleString()}</span>
            <span className="rating">
              ⭐ {product.rating ? Number(product.rating).toFixed(1) : "未評価"} ({product.reviews_count || 0}件)
            </span>
          </div>

          <p className="description">{product.description}</p>

          <div className="detail-stock">
            在庫: {product.stock > 0 ? `${product.stock}個` : "売り切れ"}
          </div>

          {/* 数量・カート */}
          <div className="detail-actions">
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value)))
              }
              disabled={product.stock === 0}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              カートに追加
            </button>
          </div>

          {/* 関連製品 */}
          {product.similar_products && product.similar_products.length > 0 && (
            <div className="similar-products">
              <h3>関連製品</h3>
              <div className="similar-grid">
                {product.similar_products.map((related) => (
                  <div key={related.id} className="similar-item">
                    <img
                      src={related.image_url || "/placeholder.jpg"}
                      alt={related.name}
                    />
                    <p>{related.name}</p>
                    <span>¥{related.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
