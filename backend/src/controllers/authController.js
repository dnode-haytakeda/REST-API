const {
  getUserByEmail,
  registerUser,
  loginUser,
} = require("../services/authService");

/**
 * ユーザー登録
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. バリデーション
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Name, email, and password are required",
          code: "VALIDATION_ERROR",
        },
      });
    }

    // パスワードの強度チェック（最低8文字）
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Password must be at least 8 characters long",
          code: "WEAK_PASSWORD",
        },
      });
    }

    // メールアドレスの形式チェック（簡易版）
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid email format",
          code: "INVALID_EMAIL",
        },
      });
    }

    // 2. 既存ユーザーチェック
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: "Email already exists",
          code: "EMAIL_EXISTS",
        },
      });
    }

    // 3. 登録処理(bcrypt/JWTはサービス層で処理)
    const { user, token } = await registerUser({ name, email, password });

    // 4. レスポンス（パスワードは含めない）
    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    console.error("Registration error", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
      },
    });
  }
};

/**
 * ログイン
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. バリデーション
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Email and password are required",
          code: "VALIDATION_ERROR",
        },
      });
    }

    // 2. ログイン処理(bcyrpt/JWTはサービス層で処理)
    const result = await loginUser({ email, password });

    if (result.error === "ACCOUNT_DISABLED") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Account is desabled",
          code: "ACCOUNT_DISABLED",
        },
      });
    }

    if (result.error === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
      });
    }

    // 3. レスポンス（パスワードは含めない）
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal server error",
        code: "SERVER_ERROR",
      },
    });
  }
};

/**
 * 現在のユーザー情報取得
 * GET /api/auth/me
 * ミドルウェア: authenticate
 */
const getCurrentUser = (req, res) => {
  // authenticat ミドルウェアで req.user が設定済み
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
};

/**
 * ログアウト
 * POST /api/auth/logout
 *
 * JWT方式ではサーバー側での処理不要（クライアント側でトークン削除）
 * 将来的にトークンブラックリストを実装する場合はここに追加
 */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: "Logged out successfully",
    },
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
};
