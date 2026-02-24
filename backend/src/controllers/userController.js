const {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  patchUser,
  removeUser,
} = require("../services/userService");

const getUsers = async (req, res, next) => {
  try {
    const users = await listUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const postUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: { message: "name and email are required" },
      });
    }
    const user = await createUser(name, email);
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const putUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: { message: "name and email are required" },
      });
    }
    const user = await updateUser(req.params.id, name, email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const patchUserHandler = async (req, res, next) => {
  try {
    const fields = req.body;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "No fields to update" },
      });
    }
    const user = await patchUser(req.params.id, fields);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const success = await removeUser(req.params.id);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUser,
  postUser,
  putUser,
  patchUserHandler,
  deleteUser,
};
