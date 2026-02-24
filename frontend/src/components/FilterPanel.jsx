import { useState, useEffect } from "react";
import { categoriesAPI } from "../services/categoriesAPI";

const FilterPanel = ({ onFilter }) => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category_id: null,
    min_price: null,
    max_price: null,
    sort: "created_at",
  });

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
    onFilter(newFilters);
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
        />
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

      {/* リセット */}
      <button
        className="btn btn-outline full-width"
        onClick={() => {
          setFilters({
            category_id: null,
            min_price: null,
            max_price: null,
            sort: "created_at",
          });
          onFilter({});
        }}
      >
        フィルターをリセット
      </button>
    </aside>
  );
};

export default FilterPanel;
