// 価格バリデーション
const validatePrice = (price) => {
  if (typeof price !== "number")
    return { valid: false, error: "Price must be a number" };
  if (price <= 0) return { valid: false, error: "Price must be positive" };
  if (!Number.isFinite(price))
    return { valid: false, error: "Price must be finite" };
  return { valid: true };
};

// 在庫バリデーション
const validateStock = (stock) => {
  if (!Number.isInteger(stock))
    return { valid: false, error: "Stock must be integer" };
  if (stock < 0) return { valid: false, error: "Stock must be non-negative" };
  return { valid: true };
};

// 製品名バリデーション
const validateProductName = (name) => {
  if (!name || name.trim().length === 0)
    return { valid: false, error: "Name is required" };
  if (name.length > 200)
    return { valid: false, error: "Name must be <= 200 characters" };
  return { valid: true };
};

module.exports = {
  validatePrice,
  validateStock,
  validateProductName,
};
