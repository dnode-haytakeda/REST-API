const Pagination = ({ page, pages, onPageChange }) => {
  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5; // 表示する最大ページ数
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // 前へ
    buttons.push(
      <button
        key="prev"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="btn-pagination"
      >
        ← 前へ
      </button>
    );

    // ページ番号
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`btn-pagination ${i === page ? "active" : ""}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }

    // 次へ
    buttons.push(
      <button
        key="next"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
        className="btn-pagination"
      >
        次へ →
      </button>
    );

    return buttons;
  };

  return (
    <div className="pagination">
      {renderPageButtons()}
      <span className="pagination-info">
        ページ {page} / {pages}
      </span>
    </div>
  );
};

export default Pagination;