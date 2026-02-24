const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/jwtUtils");
const {
  findByEmail,
  findByEmailWithPassword,
  createAuthUser,
  setLastLoginAt,
  findByIdForAuth,
} = require("../models/userModel");

const getUserByEmail = async (email) => {
  return findByEmail(email);
};

const getUserForAuth = async (userId) => {
  return findByIdForAuth(userId);
};

const registerUser = async ({ name, email, password }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = await createAuthUser(name, email, hashedPassword);

  const token = generateToken({
    userId,
    email,
    role: "user",
  });

  return {
    user: { id: userId, name, email, role: "user" },
    token,
  };
};

const loginUser = async ({ email, password }) => {
  const user = await findByEmailWithPassword(email);
  if (!user) return { error: "INVALID_CREDENTIALS" };
  if (!user.is_active) return { error: "ACCOUNT_DISABLED" };

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return { error: "INVALID_CREDENTIALS" };

  await setLastLoginAt(user.id);

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

module.exports = {
  getUserByEmail,
  getUserForAuth,
  registerUser,
  loginUser,
};
