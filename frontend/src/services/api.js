import httpClient from "./httpClient";

// ユーザー一覧取得
export const fetchUsers = async () => {
  const response = await httpClient.get("/users");
  return response.data;
};

// ユーザー詳細取得
export const fetchUser = async (id) => {
  const response = await httpClient.get(`/users/${id}`);
  return response.data;
};

// ユーザー作成
export const createUser = async (name, email) => {
  const response = await httpClient.post("/users", { name, email });
  return response.data;
};

// ユーザー更新（全置き換え）
export const updateUser = async (id, name, email) => {
  const response = await httpClient.put(`/users/${id}`, { name, email });
  return response.data;
};

// ユーザー部分更新
export const patchUser = async (id, fields) => {
  const response = await httpClient.patch(`/users/${id}`, fields);
  return response.data;
};

// ユーザー削除
export const deleteUser = async (id) => {
  return httpClient.delete(`/users/${id}`);
};
