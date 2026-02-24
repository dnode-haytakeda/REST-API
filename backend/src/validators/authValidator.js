const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateLoginPayload = ({ email, password }) => {
  const errors = [];
  if (!isEmail(email || "")) errors.push("email is invalid");
  if (!password || password.length < 8)
    errors.push("password must be at least 8 chars");
  return { valid: errors.length === 0, errors };
};

module.exports = { validateLoginPayload };
