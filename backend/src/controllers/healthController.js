const { buildHealth } = require("../services/healthService");

const getHealth = (req, res) => {
  const payload = buildHealth();
  res.status(200).json(payload);
};

module.exports = { getHealth };
