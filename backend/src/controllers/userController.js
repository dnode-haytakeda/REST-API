const { listUsers } = require("../services/userService");

const getUser = async (req, res, next) => {
  try {
    const users = await listUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

module.exports = { getUser };
