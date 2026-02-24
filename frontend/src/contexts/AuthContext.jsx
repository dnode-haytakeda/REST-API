import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/authAPI";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  // 初回ロード時: トークンがあれば現在のユーザー情報を取得
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        setUser(response.data.user);
      } catch (err) {
        console.error("Auth initialization error", err);
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]);

  // ログイン
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);

      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem("token", response.data.token);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  };

  // ユーザー登録
  const register = async (name, email, password) => {
    try {
      const response = await authAPI.register(name, email, password);

      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem("token", response.data.token);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.warn("Logout request failed", err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// カスタムフック: useAuth()
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
