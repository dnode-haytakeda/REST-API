/**
 * 価格バリデーション関数
 * @param {number|string} minPrice - 最小価格
 * @param {number|string} maxPrice - 最大価格
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validatePriceRange = (minPrice, maxPrice) => {
  const min = minPrice ? parseFloat(minPrice) : null;
  const max = maxPrice ? parseFloat(maxPrice) : null;

  // 両方未入力はOK（フィルタなし）
  if (min === null && max === null) {
    return { isValid: true, error: null };
  }

  // 負の数値チェック
  if (min !== null && min < 0) {
    return { isValid: false, error: "最小価格は0以上で入力してください" };
  }
  if (max !== null && max < 0) {
    return { isValid: false, error: "最大価格は0以上で入力してください" };
  }

  // 最小 > 最大のチェック
  if (min !== null && max !== null && min > max) {
    return { isValid: false, error: "最小価格は最大価格以下にしてください" };
  }

  // 極端に大きな値のチェック（例: 1億円以上）
  const MAX_PRICE_LIMIT = 100000000; // 1億円
  if (min !== null && min > MAX_PRICE_LIMIT) {
    return { isValid: false, error: `最小価格は${MAX_PRICE_LIMIT.toLocaleString()}円以下にしてください` };
  }
  if (max !== null && max > MAX_PRICE_LIMIT) {
    return { isValid: false, error: `最大価格は${MAX_PRICE_LIMIT.toLocaleString()}円以下にしてください` };
  }

  return { isValid: true, error: null };
};


/**
 * 数値入力バリデーション（汎用）
 * @param {number|string} value - 数値
 * @param {Object} options - { min, max, required }
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateNumber = (value, options = {}) => {
  const { min = 0, max = Infinity, required = false } = options;

  // 未入力チェック
  if (value === "" || value === null || value === undefined) {
    if (required) {
      return { isValid: false, error: "この項目は必須です" };
    }
    return { isValid: true, error: null };
  }

  const num = parseFloat(value);

  // 数値チェック
  if (isNaN(num)) {
    return { isValid: false, error: "数値を入力してください" };
  }

  // 範囲チェック
  if (num < min) {
    return { isValid: false, error: `${min}以上の値を入力してください` };
  }
  if (num > max) {
    return { isValid: false, error: `${max}以下の値を入力してください` };
  }

  return { isValid: true, error: null };
};