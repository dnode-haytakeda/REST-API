import { useState, useEffect } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/api";
import UserForm from "../components/UserForm";
import UserItem from "../components/UserItem";
import EditForm from "../components/EditForm";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name, email) => {
    try {
      await createUser(name, email);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (id, name, email) => {
    try {
      await updateUser(id, name, email);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="users-page">
      <h1>ユーザー管理</h1>

      {error && <p style={{ color: "red" }}>エラー: {error}</p>}

      <section>
        <h2>{editingUser ? "編集" : "新規作成"}</h2>
        {editingUser ? (
          <EditForm
            user={editingUser}
            onSubmit={handleUpdate}
            onCancel={() => setEditingUser(null)}
          />
        ) : (
          <UserForm onSubmit={handleCreate} />
        )}
      </section>

      <section>
        <h2>ユーザー一覧</h2>
        {loading ? (
          <p>読み込み中...</p>
        ) : users.length === 0 ? (
          <p>ユーザーがいません</p>
        ) : (
          <ul>
            {users.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                onEdit={setEditingUser}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default UsersPage;
