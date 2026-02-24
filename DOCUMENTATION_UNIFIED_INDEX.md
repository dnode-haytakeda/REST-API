# DOCUMENTATION UNIFIED INDEX（最初に読むページ）

ドキュメントが多くて迷わないように、読む順番を固定します。

---

## 1. まず読む（必須）

1. `MASTER_DEVELOPMENT_BOOK.md`  
	- 再構築手順、改善手順、CI/CD、AWS を順番に説明
2. `SYSTEM_DESIGN_SPEC.md`  
	- Mermaid 図で全体連携を理解
3. `DOCUMENTATION_UNIFIED_INDEX.md`（このファイル）

---

## 2. 深掘り（必要な時だけ）

### DB を深掘り
- `DATABASE_STRUCTURE_GUIDE.md`
- `DATABASE_AUTH_IMPLEMENTATION.md`
- `db/README.md`
- `db/ER_DIAGRAM.md`

### Backend を深掘り
- `BACKEND_APP_DEVELOPMENT.md`
- `BACKEND_AUTH_IMPLEMENTATION.md`
- `backend/README.md`

### Frontend を深掘り
- `FRONTEND_APP_DEVELOPMENT.md`
- `FRONTEND_AUTH_IMPLEMENTATION.md`
- `frontend/README.md`
- `frontend/README_FE.md`
- `frontend/REACT_ARCHITECTURE_GUIDE.md`

### 横断テーマ
- `AUTH_IMPLEMENTATION_GUIDE.md`
- `DOCKER_SETUP.md`

---

## 3. 更新ルール（運用）

1. 仕様変更は最初に `MASTER_DEVELOPMENT_BOOK.md` を更新
2. 構成変更は `SYSTEM_DESIGN_SPEC.md` の図を更新
3. 詳細変更は該当の個別ドキュメントへ反映
4. 破壊的変更があれば本ファイルに追記

---

## 4. 初学者向けの学習順

1. ローカル起動まで（MASTER 2章）
2. ログインの流れ理解（MASTER 3章 + DESIGN 2章）
3. 管理者API権限理解（DESIGN 5章）
4. CI/CD と AWS（MASTER 5章・6章）
