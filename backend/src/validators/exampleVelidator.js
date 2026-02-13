const validateName = (name) => {
  if (typeof name !== "string" || name.trim().length === 0) {
    return "name is required";
  }
  return null;
};

module.exports = { validateName };
