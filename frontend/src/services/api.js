const API_BASE = "http://localhost:3000/api";

// ユーザー一覧取得
export const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
};

// ユーザー詳細取得
export const fetchUser = async (id) => {
  const res = await fetch(`${API_BASE}/users/${id}`);
  if (!res.ok) throw new Error("User not found");
  return res.json();
};

// ユーザー作成
export const createUser = async (name, email) => {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
};

// ユーザー更新（全置き換え）
export const updateUser = async (id, name, email) => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
};

// ユーザー部分更新
export const patchUser = async (id, fields) => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Failed to patch user");
  return res.json();
};

// ユーザー削除
export const deleteUser = async (id) => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.status === 204 ? null : res.json();
};
