import { useSearchParams } from "react-router-dom";
import useProducts from "../hooks/useProducts";
import FilterPanel from "../components/FilterPanel";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import { validateQueryParams } from "../utils/queryValidator";
import "../styles/components.css";

const ProductList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ↓↓↓ 追加: URLクエリパラメータをバリデーション
  const {
    isValid,
    errors: queryErrors,
    sanitized,
  } = validateQueryParams(searchParams);

  const { products, loading, error, pagination, fetchProducts } = useProducts(
    isValid
      ? {
          search: sanitized.search || undefined,
          sort: sanitized.sort || undefined,
          order: sanitized.order || undefined,
        }
      : {}, // バリデーションエラー時はフィルターなしで初期表示
  );

  const handleFilter = async (filters) => {
    await fetchProducts({ ...filters, page: 1 });
  };

  const handlePageChange = async (page) => {
    await fetchProducts({ page });
  };

  // ↓↓↓ 追加: クエリバリデーションエラーの表示
  if (!isValid) {
    return (
      <div className="product-list-page">
        <h1>製品一覧</h1>
        <div className="error-message">
          <p>URLのパラメータが不正です:</p>
          <ul>
            {queryErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">エラー: {error}</div>;
  }

  return (
    <div className="product-list-page">
      <h1>製品一覧</h1>

      <div className="product-list-container">
        <FilterPanel onFilter={handleFilter} />

        <main className="product-main">
          {loading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <p>製品が見つかりません</p>
          ) : (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <Pagination
                  page={pagination.page}
                  pages={pagination.pages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductList;
