import httpClient from "./httpClient";

export const categoriesAPI = {
  // 全カテゴリー取得
  getAll: async () => {
    return httpClient.get("/products/categories");
  },

  // アクティブなカテゴリーのみ取得
  getActive: async () => {
    return httpClient.get("/products/categories", { is_active: true });
  },
};
