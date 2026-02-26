/**
 * 製品バリデーション関数集
 * 
 * 各関数は { valid: boolean, error: string|null } を返す
 * エラー時は error にメッセージを設定
 */

// 価格バリデーション
const validatePrice = (price) => {
  if (price === undefined || price === null) {
    return { valid: false, error: "価格は必須です" };
  }
  if (typeof price !== "number") {
    return { valid: false, error: "価格は数値で指定してください" };
  }
  if (price <= 0) {
    return { valid: false, error: "価格は0より大きい値を指定してください" };
  }
  if (!Number.isFinite(price)) {
    return { valid: false, error: "価格に無限大は指定できません" };
  }
  if (price > 100000000) {
    return { valid: false, error: "価格は1億円以下にしてください" };
  }
  return { valid: true, error: null };
};

// 在庫バリデーション
const validateStock = (stock) => {
  if (stock === undefined || stock === null) {
    return { valid: false, error: "在庫数は必須です" };
  }
  if (!Number.isInteger(stock)) {
    return { valid: false, error: "在庫数は整数で指定してください" };
  }
  if (stock < 0) {
    return { valid: false, error: "在庫数は0以上にしてください" };
  }
  if (stock > 1000000) {
    return { valid: false, error: "在庫数は100万個以下にしてください" };
  }
  return { valid: true, error: null };
};

// 製品名バリデーション
const validateProductName = (name) => {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "製品名は必須です" };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "製品名は空白のみにできません" };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: "製品名は200文字以内にしてください" };
  }
  return { valid: true, error: null };
};

// ↓↓↓ 追加: 価格帯フィルターのバリデーション
const validatePriceRange = (minPrice, maxPrice) => {
  // 両方未指定はOK
  if (minPrice === undefined && maxPrice === undefined) {
    return { valid: true, error: null };
  }

  // 最小価格チェック
  if (minPrice !== undefined) {
    if (typeof minPrice !== "number" || minPrice < 0) {
      return { valid: false, error: "最小価格は0以上の数値で指定してください" };
    }
    if (minPrice > 100000000) {
      return { valid: false, error: "最小価格は1億円以下にしてください" };
    }
  }

  // 最大価格チェック
  if (maxPrice !== undefined) {
    if (typeof maxPrice !== "number" || maxPrice < 0) {
      return { valid: false, error: "最大価格は0以上の数値で指定してください" };
    }
    if (maxPrice > 100000000) {
      return { valid: false, error: "最大価格は1億円以下にしてください" };
    }
  }

  // 最小 > 最大のチェック
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { valid: false, error: "最小価格は最大価格以下にしてください" };
  }

  return { valid: true, error: null };
};

// ↓↓↓ 追加: カテゴリーIDバリデーション
const validateCategoryId = (categoryId) => {
  if (categoryId === undefined || categoryId === null) {
    return { valid: false, error: "カテゴリーIDは必須です" };
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { valid: false, error: "カテゴリーIDは正の整数で指定してください" };
  }
  return { valid: true, error: null };
};

// ↓↓↓ 追加: SKUバリデーション（オプション項目）
const validateSKU = (sku) => {
  // SKUは任意項目
  if (sku === undefined || sku === null || sku === "") {
    return { valid: true, error: null };
  }
  if (typeof sku !== "string") {
    return { valid: false, error: "SKUは文字列で指定してください" };
  }
  if (sku.length > 100) {
    return { valid: false, error: "SKUは100文字以内にしてください" };
  }
  // SKUフォーマットの例: 英数字とハイフンのみ
  if (!/^[A-Za-z0-9\-]+$/.test(sku)) {
    return { valid: false, error: "SKUは英数字とハイフンのみ使用できます" };
  }
  return { valid: true, error: null };
};

module.exports = {
  validatePrice,
  validateStock,
  validateProductName,
  validatePriceRange,
  validateCategoryId,
  validateSKU,
};