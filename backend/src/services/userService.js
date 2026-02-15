const {
  findAll,
  findById,
  create,
  update,
  partialUpdate,
  deleteById,
} = require("../models/userModel");

const listUsers = async () => {
  return findAll();
};

const getUserById = async (id) => {
  return findById(id);
};

const createUser = async (name, email) => {
  const id = await create(name, email);
  return { id, name, email };
};

const updateUser = async (id, name, email) => {
  const affectedRows = await update(id, name, email);
  if (affectedRows === 0) return null;
  return { id, name, email };
};

const patchUser = async (id, fields) => {
  const affectedRows = await partialUpdate(id, fields);
  if (affectedRows === 0) return null;
  return findById(id);
};

const removeUser = async (id) => {
  const affectedRows = await deleteById(id);
  return affectedRows > 0;
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  patchUser,
  removeUser,
};
