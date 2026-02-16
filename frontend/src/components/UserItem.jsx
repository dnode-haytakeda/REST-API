const UserItem = ({ user, onEdit, onDelete }) => {
  const handleDelete = async () => {
    if (window.confirm(`${user.name} を削除しますか？`)) {
      await onDelete(user.id);
    }
  };

  return (
    <li>
      <span>
        {user.name} ({user.email})
      </span>
      <buttom onClick={() => onEdit(user)}>編集</buttom>
      <button onClick={handleDelete} style={{ color: "red" }}>
        削除
      </button>
    </li>
  );
};

export default UserItem;
