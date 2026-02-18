import { useState, useEffect } from "react";
import { productsAPI } from "../services/productsAPI";

const useProducts = (initialFilters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); // 初回ロード時はtrue
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
    limit: 20,
  });
  const [filters, setFilters] = useState(initialFilters);

  // 製品取得
  const fetchProducts = async (newFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const mergedFilters = {
        ...filters,
        ...newFilters,
        page: newFilters.page || filters.page || 1,
      };
      
      const response = await productsAPI.getList(mergedFilters);

      setProducts(response.data || []);
      setPagination(response.pagination || { page: 1, total: 0, pages: 0, limit: 20 });
      setFilters({ ...filters, ...newFilters });
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    loading,
    error,
    pagination,
    filters,
    fetchProducts,
  };
};

export default useProducts;
