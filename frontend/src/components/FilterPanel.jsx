import { useState, useEffect } from "react";
import { categoriesAPI } from "../services/categoriesAPI";
import { validatePriceRange } from "../utils/validators";

const FilterPanel = ({ onFilter }) => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category_id: null,
    min_price: null,
    max_price: null,
    sort: "created_at",
  });
  const [priceError, setPriceError] = useState(null);

  // カテゴリー読み込み
  useEffect(() => {
    categoriesAPI
      .getActive()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // 価格入力時のみバリデーション
    if (key === "min_price" || key === "max_price") {
      const validation = validatePriceRange(
        newFilters.min_price,
        newFilters.max_price,
      );

      if (!validation.isValid) {
        setPriceError(validation.error);
        return;
      } else {
        setPriceError(null);
      }
    }
  };

  // 「適用」押下時にのみフィルター実行
  const handleApplyFilter = () => {
    const validation = validatePriceRange(filters.min_price, filters.max_price);
    if (!validation.isValid) {
      setPriceError(validation.error);
      return;
    }

    setPriceError(null);
    onFilter(filters);
  };

  return (
    <aside className="filter-panel">
      <h3>フィルター</h3>

      {/* カテゴリー */}
      <div className="filter-group">
        <label>カテゴリー</label>
        <select
          value={filters.category_id || ""}
          onChange={(e) =>
            handleFilterChange("category_id", e.target.value || null)
          }
        >
          <option value="">すべて</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 価格帯 */}
      <div className="filter-group">
        <label>価格帯</label>
        <div className="price-inputs">
          <input
            type="number"
            placeholder="最小"
            value={filters.min_price || ""}
            onChange={(e) =>
              handleFilterChange(
                "min_price",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            min="0"
            step="100"
          />
          <span>～</span>
          <input
            type="number"
            placeholder="最大"
            value={filters.max_price || ""}
            onChange={(e) =>
              handleFilterChange(
                "max_price",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            min="0"
            step="100"
          />
        </div>
        {/** エラーメッセージ表示 */}
        {priceError && (
          <p className="validation-error">{priceError}</p>
        )}
      </div>

      {/* ソート */}
      <div className="filter-group">
        <label>並び順</label>
        <select
          value={filters.sort}
          onChange={(e) => handleFilterChange("sort", e.target.value)}
        >
          <option value="created_at">新着順</option>
          <option value="price">安い順</option>
          <option value="rating">評価が高い</option>
        </select>
      </div>

      {/** 適用ボタン（カテゴリー・価格帯・ソートを一括適用） */}
      <button 
        className="btn btn-primary full-width"
        onClick={handleApplyFilter}
        disabled={Boolean(priceError)}>
          フィルターを適用
      </button>

      {/* リセット */}
      <button
        className="btn btn-outline full-width"
        onClick={() => {
          const resetFilters = {
            category_id: null,
            min_price: null,
            max_price: null,
            sort: "created_at",
          };
          setFilters(resetFilters);
          setPriceError(null);
          onFilter(resetFilters);
        }}
      >
        フィルターをリセット
      </button>
    </aside>
  );
};

export default FilterPanel;
