const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Not Found" });
};

// eslintを使う場合は next を探す
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
};

module.exports = { notFoundHandler, errorHandler };
