import { useState, useEffect } from "react";

const useCart = () => {
  const [cart, setCart] = useState(() => {
    // localStorage から復元
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  // cartが変更されたら localStorage に保存
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addItem = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        // 既存商品：数量を増加
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // 新規商品を追加
        return [...prev, { ...product, quantity }];
      }
    });
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clear = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items: cart,
    count: cart.length,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  };
};

export default useCart;