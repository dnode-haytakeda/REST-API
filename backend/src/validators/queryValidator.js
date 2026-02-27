/**
 * クエリパラメータバリデーション
 *
 * 製品一覧APIに渡されるクエリパラメータを検証し、
 * SQLインジェクションを防止する。
 *
 * 設計思想: ホワイトリスト方式
 * → 明示的に許可された値のみ受け入れ、それ以外は全て拒否する
 */

// ========================================
// ホワイトリスト定義
// ========================================

/**
 * 許可されたソートフィールド
 * キー: クエリパラメータの値 / 値: SQLで使用する実際のカラム名
 * ※新しいソートフィールドを追加する場合はここに追加する
 */
const ALLOWED_SORT_FIELDS = {
  price: "p.price",
  rating: "p.rating",
  created_at: "p.created_at",
};

/** 許可されたソート方向 */
const ALLOWED_ORDER_DIRECTIONS = ["asc", "desc"];

// ========================================
// バリデーション関数
// ========================================

/**
 * ソートフィールドのバリデーション
 * 未指定の場合は "created_at" をデフォルト値として返す
 */
const validateSort = (sort) => {
  if (sort === undefined || sort === null || sort === "") {
    return { valid: true, error: null, value: "created_at" };
  }
  if (typeof sort !== "string") {
    return {
      valid: false,
      error: "sortは文字列で指定してください",
      value: null,
    };
  }
  const normalized = sort.toLowerCase().trim();
  if (!ALLOWED_SORT_FIELDS[normalized]) {
    const allowed = Object.keys(ALLOWED_SORT_FIELDS).join(", ");
    return {
      valid: false,
      error: `不正なソートフィールドです。許可値: ${allowed}`,
      value: null,
    };
  }
  return { valid: true, error: null, value: normalized };
};

/**
 * ソート方向のバリデーション
 * 未指定の場合は "asc" をデフォルト値として返す
 */
const validateOrder = (order) => {
  if (order === undefined || order === null || order === "") {
    return { valid: true, error: null, value: "asc" };
  }
  if (typeof order !== "string") {
    return {
      valid: false,
      error: "orderは文字列で指定してください",
      value: null,
    };
  }
  const normalized = order.toLowerCase().trim();
  if (!ALLOWED_ORDER_DIRECTIONS.includes(normalized)) {
    return {
      valid: false,
      error: `不正なソート方向です。許可値: ${ALLOWED_ORDER_DIRECTIONS.join(", ")}`,
      value: null,
    };
  }
  return { valid: true, error: null, value: normalized };
};

/** ページ番号のバリデーション */
const validatePage = (page) => {
  if (page === undefined || page === null || page === "") {
    return { valid: true, error: null, value: 1 };
  }
  const parsed = parseInt(page, 10);
  if (isNaN(parsed)) {
    return { valid: false, error: "pageは数値で指定してください", value: null };
  }
  if (parsed < 1) {
    return {
      valid: false,
      error: "pageは1以上で指定してください",
      value: null,
    };
  }
  if (parsed > 10000) {
    return {
      valid: false,
      error: "pageは10000以下で指定してください",
      value: null,
    };
  }
  return { valid: true, error: null, value: parsed };
};

/** 1ページあたりの件数バリデーション */
const validateLimit = (limit) => {
  if (limit === undefined || limit === null || limit === "") {
    return { valid: true, error: null, value: 20 };
  }
  const parsed = parseInt(limit, 10);
  if (isNaN(parsed)) {
    return {
      valid: false,
      error: "limitは数値で指定してください",
      value: null,
    };
  }
  if (parsed < 1) {
    return {
      valid: false,
      error: "limitは1以上で指定してください",
      value: null,
    };
  }
  if (parsed > 100) {
    return {
      valid: false,
      error: "limitは100以下で指定してください",
      value: null,
    };
  }
  return { valid: true, error: null, value: parsed };
};

/**
 * 検索キーワードのサニタイズ
 * FULLTEXT検索に使われるため、制御文字を除去する
 */
const validateSearch = (search) => {
  if (search === undefined || search === null || search === "") {
    return { valid: true, error: null, value: undefined };
  }
  if (typeof search !== "string") {
    return {
      valid: false,
      error: "searchは文字列で指定してください",
      value: null,
    };
  }
  if (search.length > 200) {
    return {
      valid: false,
      error: "検索キーワードは200文字以内にしてください",
      value: null,
    };
  }
  const sanitized = search.replace(/[\x00-\x1F]/g, "");
  return { valid: true, error: null, value: sanitized };
};

/**
 * 製品一覧クエリパラメータの一括バリデーション
 * @param {Object} query - req.query（Express のクエリパラメータ）
 * @returns {{ valid: boolean, errors: string[], sanitized: Object }}
 */
const validateProductListQuery = (query) => {
  const errors = [];
  const sanitized = {};

  const sortResult = validateSort(query.sort);
  if (!sortResult.valid) errors.push(sortResult.error);
  else sanitized.sort = sortResult.value;

  const orderResult = validateOrder(query.order);
  if (!orderResult.valid) errors.push(orderResult.error);
  else sanitized.order = orderResult.value;

  const pageResult = validatePage(query.page);
  if (!pageResult.valid) errors.push(pageResult.error);
  else sanitized.page = pageResult.value;

  const limitResult = validateLimit(query.limit);
  if (!limitResult.valid) errors.push(limitResult.error);
  else sanitized.limit = limitResult.value;

  const searchResult = validateSearch(query.search);
  if (!searchResult.valid) errors.push(searchResult.error);
  else sanitized.search = searchResult.value;

  if (query.category_id !== undefined) {
    const catId = parseInt(query.category_id, 10);
    if (isNaN(catId) || catId < 1) {
      errors.push("category_idは正の整数で指定してください");
    } else {
      sanitized.category_id = catId;
    }
  }

  if (query.min_price !== undefined) {
    const minPrice = parseFloat(query.min_price);
    if (isNaN(minPrice) || minPrice < 0) {
      errors.push("min_priceは0以上の数値で指定してください");
    } else {
      sanitized.min_price = minPrice;
    }
  }

  if (query.max_price !== undefined) {
    const maxPrice = parseFloat(query.max_price);
    if (isNaN(maxPrice) || maxPrice < 0) {
      errors.push("max_priceは0以上の数値で指定してください");
    } else {
      sanitized.max_price = maxPrice;
    }
  }

  if (query.is_featured !== undefined) {
    if (query.is_featured !== "true" && query.is_featured !== "false") {
      errors.push("is_featuredはtrue/falseで指定してください");
    } else {
      // 注意: 現行コードでは is_featured === "false" 時に undefined を返していたが、
      // ここでは boolean false を返す。これにより ?is_featured=false で
      // 「おすすめでない製品」のフィルターが正しく機能するようになる（動作変更）
      sanitized.is_featured = query.is_featured === "true";
    }
  }

  return { valid: errors.length === 0, errors, sanitized };
};

module.exports = {
  ALLOWED_SORT_FIELDS,
  ALLOWED_ORDER_DIRECTIONS,
  validateSort,
  validateOrder,
  validatePage,
  validateLimit,
  validateSearch,
  validateProductListQuery,
};
