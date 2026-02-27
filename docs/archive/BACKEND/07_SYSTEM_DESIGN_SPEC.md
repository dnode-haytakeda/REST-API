# SYSTEM DESIGN SPEC（やさしい図解版）

この設計書は「どのファイルが、どの順番で、何をしているか」を図で理解するための資料です。

---

## 1. 全体アーキテクチャ

```mermaid
graph LR
  subgraph FE[Frontend]
    MAIN[main.jsx]
    ROUTER[React Router]
    CTX[AuthContext]
    PAGES[pages/*]
    FAPI[services/httpClient.js]
  end

  subgraph BE[Backend]
    APP[app.js/server.js]
    BR[routes/*]
    BMW[authMiddleware.js]
    BC[controllers/*]
    BS[services/*]
    BM[models/*]
    BU[jwtUtils.js]
  end

  subgraph DB[Database]
    MYSQL[(MySQL app_db)]
  end

  MAIN --> ROUTER --> PAGES --> CTX --> FAPI --> BR
  APP --> BR --> BMW --> BC --> BS --> BM --> MYSQL
  BS --> BU
```

---

## 2. 管理者ログインの流れ

```mermaid
sequenceDiagram
  actor U as 管理者
  participant ALP as frontend/pages/AdminLoginPage.jsx
  participant AC as frontend/contexts/AuthContext.jsx
  participant HC as frontend/services/httpClient.js
  participant AR as backend/routes/auth.js
  participant ACTRL as backend/controllers/authController.js
  participant ASRV as backend/services/authService.js
  participant UM as backend/models/userModel.js
  participant JWT as backend/utils/jwtUtils.js
  participant DB as MySQL users

  U->>ALP: メール/パスワード入力
  ALP->>AC: login(email, password)
  AC->>HC: POST /api/auth/login
  HC->>AR: HTTP送信
  AR->>ACTRL: login()
  ACTRL->>ASRV: loginUser()
  ASRV->>UM: findByEmailWithPassword(email)
  UM->>DB: SELECT ... FROM users
  DB-->>UM: user
  ASRV->>ASRV: bcrypt.compare()
  ASRV->>JWT: generateToken()
  JWT-->>ASRV: token
  ASRV-->>ACTRL: {user, token}
  ACTRL-->>HC: {success:true,data:{user,token}}
  HC-->>AC: response
  AC->>AC: setToken/setUser
  AC-->>ALP: success
  ALP->>ALP: role==='admin' を確認
  ALP->>U: /admin に遷移
```

---

## 3. フロントルーティング

```mermaid
graph TD
  ROOT[/ /] --> SEL[SelectRole]

  SEL --> ULOGIN[/mypage/login/]
  SEL --> ALOGIN[/admin/login/]

  ULOGIN --> MP[/mypage ProtectedRoute/]
  MP --> DASH[Dashboard]
  MP --> PROD[ProductList/ProductDetail]
  MP --> ORD[OrderList]

  ALOGIN --> ADM[/admin ProtectedRoute(requiredRole='admin')/]
  ADM --> USERS[UsersPage]
```

---

## 4. 認証状態（AuthContext）

```mermaid
stateDiagram-v2
  [*] --> Initializing
  Initializing --> Unauthenticated: tokenなし
  Initializing --> CheckingMe: tokenあり
  CheckingMe --> Authenticated: /auth/me 成功
  CheckingMe --> Unauthenticated: /auth/me 失敗

  Unauthenticated --> LoggingIn: login()
  LoggingIn --> Authenticated: 成功
  LoggingIn --> Unauthenticated: 失敗

  Authenticated --> Unauthenticated: logout()
```

---

## 5. Backend 責務分離（Controller/Service/Model）

```mermaid
graph TB
  R[routes/users.js]
  MW[authenticate + authorize]
  C[userController.js]
  S[userService.js]
  M[userModel.js]
  D[(MySQL)]

  R --> MW --> C --> S --> M --> D
```

### 役割
- Route: URL とミドルウェアの接続
- Controller: 入力確認・HTTPレスポンス
- Service: ビジネスロジック
- Model: SQL 実行

---

## 6. DB 主要テーブル関係

```mermaid
erDiagram
  USERS ||--o{ ORDERS : places
  USERS ||--o{ REVIEWS : writes
  PRODUCTS ||--o{ REVIEWS : receives
  ORDERS ||--o{ ORDER_ITEMS : contains
  PRODUCTS ||--o{ ORDER_ITEMS : included
  PRODUCT_CATEGORIES ||--o{ PRODUCTS : has
```

---

## 7. 重要ファイル早見表

- `frontend/src/main.jsx`: ルーティング定義
- `frontend/src/contexts/AuthContext.jsx`: ログイン状態の中心
- `frontend/src/services/httpClient.js`: token 自動付与
- `backend/src/routes/auth.js`: auth API 入口
- `backend/src/controllers/authController.js`: login/register/me/logout
- `backend/src/middlewares/authMiddleware.js`: 認証・認可
- `backend/src/services/authService.js`: bcrypt/JWT/ログイン実処理
- `backend/src/models/userModel.js`: users テーブル SQL

---

## 8. 実装時の注意

1. 認証ヘッダは `req.headers.authorization`
2. 管理者APIは `authorize("admin")` 必須
3. Frontend は API 結果を `response.data` で扱う
4. API 仕様は `success/data/error` を維持する
