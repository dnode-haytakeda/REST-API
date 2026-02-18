import httpClient from "./httpClient";

export const productsAPI = {
  // 製品一覧取得（フィルター・ページング対応）
  getList: async (filters = {}) => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      sort: filters.sort || "created_at",
      order: filters.order || "asc",
    };

    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.min_price) params.min_price = filters.min_price;
    if (filters.max_price) params.max_price = filters.max_price;
    if (filters.search) params.search = filters.search;
    if (filters.is_featured !== undefined)
      params.is_featured = filters.is_featured;

    return httpClient.get("/products", params);
  },

  // 製品詳細取得
  getDetail: async (id) => {
    return httpClient.getDetail(`/products/${id}`);
  },

  // 製品作成
  create: async (productData) => {
    return httpClient.post("/products", productData);
  },

  // 製品更新
  update: async (id, updates) => {
    return httpClient.put(`products/${id}`, updates);
  },

  // 製品削除
  delete: async (id) => {
    return httpClient.delete(`products${id}`);
  },
};
