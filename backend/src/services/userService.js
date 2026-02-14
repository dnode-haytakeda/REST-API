const { findAll } = require("../models/userModel");

const listUsers = async () => {
  return findAll();
};

module.exports = { listUsers };
