/**
 * クエリパラメータバリデーション（フロントエンド版）
 *
 * - バックエンドの queryValidator.js と許可値を合わせること
 * - クエリパラメータの正当性を検証し、不正な値を排除する
 */

// バックエンドと同一のホワイトリストを定義
const ALLOWED_SORT_FIELDS = ["price", "rating", "created_at"];
const ALLOWED_ORDER_DIRECTIONS = ["asc", "desc"];

/**
 * URLSearchParams からクエリパラメータを検証する
 *
 * @param {URLSearchParams} searchParams - useSearchParams() で取得したパラメータ
 * @returns {{ isValid: boolean, errors: string[], sanitized: Object }}
 *
 * 使用例:
 *   const [searchParams] = useSearchParams();
 *   const { isValid, errors, sanitized } = validateQueryParams(searchParams);
 */
export const validateQueryParams = (searchParams) => {
  const errors = [];
  const sanitized = {};

  // --- sort ---
  const sort = searchParams.get("sort");
  if (sort !== null) {
    if (!ALLOWED_SORT_FIELDS.includes(sort.toLowerCase())) {
      errors.push(`不正なソートフィールド: "${sort}"`);
    } else {
      sanitized.sort = sort.toLowerCase();
    }
  }

  // --- order ---
  const order = searchParams.get("order");
  if (order !== null) {
    if (!ALLOWED_ORDER_DIRECTIONS.includes(order.toLowerCase())) {
      errors.push(`不正なソート方向: "${order}"`);
    } else {
      sanitized.order = order.toLowerCase();
    }
  }

  // --- search ---
  const search = searchParams.get("search");
  if (search !== null) {
    if (search.length > 200) {
      errors.push("検索キーワードは200文字以内にしてください");
    } else {
      sanitized.search = search;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

/**
 * ホワイトリスト定数をエクスポート（UIでの活用）
 */
export { ALLOWED_SORT_FIELDS, ALLOWED_ORDER_DIRECTIONS };