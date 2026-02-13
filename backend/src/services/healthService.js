const buildHealth = () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
};

module.exports = { buildHealth };
