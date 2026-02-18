import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import useProducts from "../hooks/useProducts";
import FilterPanel from "../components/FilterPanel";
import ProductCard from "../components/ProductCard";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/components.css";

const ProductList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading, error, pagination, fetchProducts } = useProducts({
    search: searchParams.get("search") || undefined,
  });

  const handleFilter = async (filters) => {
    await fetchProducts({ ...filters, page: 1 });
  };

  const handlePageChange = async (page) => {
    await fetchProducts({ page });
  };

  if (error) {
    return <div className="error-message">エラー: {error}</div>;
  }

  return (
    <div className="product-list-page">
      <h1>製品一覧</h1>

      <div className="product-list-container">
        {/* フィルタパネル */}
        <FilterPanel onFilter={handleFilter} />

        {/* メインコンテンツ */}
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
