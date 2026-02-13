const getEnv = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value;
};

module.exports = { getEnv };
