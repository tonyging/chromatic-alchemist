# Railway 部署指南

## 部署架構

```
Railway Project
├── backend (FastAPI)
├── frontend (React + Nginx)
└── PostgreSQL (Railway 內建)
```

## 部署步驟

### 1. 建立 Railway 專案

1. 前往 [railway.app](https://railway.app) 並登入
2. 點擊 "New Project"
3. 選擇 "Deploy from GitHub repo"
4. 選擇 `chromatic-alchemist` repository

### 2. 建立 PostgreSQL 資料庫

1. 在專案中點擊 "New"
2. 選擇 "Database" → "PostgreSQL"
3. 等待建立完成

### 3. 部署後端服務

1. 點擊 "New" → "GitHub Repo"
2. 選擇同一個 repository
3. 設定：
   - **Root Directory**: `backend`
   - **Service Name**: `backend`

4. 設定環境變數（Settings → Variables）：
   ```
   DATABASE_URL_RAW=${{Postgres.DATABASE_URL}}
   SECRET_KEY=<生成一個安全的隨機字串>
   CORS_ORIGINS_STR=https://<frontend-domain>.up.railway.app
   DEBUG=false
   ```

5. 生成公開 URL：Settings → Networking → Generate Domain

### 4. 部署前端服務

1. 點擊 "New" → "GitHub Repo"
2. 選擇同一個 repository
3. 設定：
   - **Root Directory**: `frontend`
   - **Service Name**: `frontend`

4. 設定環境變數（Settings → Variables）：
   ```
   VITE_API_URL=https://<backend-domain>.up.railway.app
   ```

5. 生成公開 URL：Settings → Networking → Generate Domain

### 5. 執行資料庫遷移

在後端服務的 Railway Shell 中執行：
```bash
cd /app
alembic upgrade head
```

或者在本地使用生產資料庫 URL：
```bash
DATABASE_URL=<railway-postgres-url> alembic upgrade head
```

## 環境變數總覽

### 後端 (backend)
| 變數 | 說明 | 範例 |
|------|------|------|
| DATABASE_URL_RAW | PostgreSQL 連線字串（自動轉換為 asyncpg） | ${{Postgres.DATABASE_URL}} |
| SECRET_KEY | JWT 簽章密鑰 | 隨機 32+ 字元 |
| CORS_ORIGINS_STR | 允許的前端來源 | https://xxx.up.railway.app |
| DEBUG | 除錯模式 | false |

### 前端 (frontend)
| 變數 | 說明 | 範例 |
|------|------|------|
| VITE_API_URL | 後端 API URL | https://xxx.up.railway.app |

## 生成 SECRET_KEY

```python
import secrets
print(secrets.token_urlsafe(32))
```

或使用線上工具：https://generate-secret.vercel.app/32

## 注意事項

1. **DATABASE_URL 格式**：Railway 提供的 URL 使用 `postgresql://`，程式會自動轉換為 `postgresql+asyncpg://`

2. **首次部署後**：記得執行資料庫遷移 (alembic upgrade head)

3. **費用估算**：
   - 免費額度：$5/月
   - 預估使用：小流量約 $3-5/月

4. **部署順序**：建議先部署 PostgreSQL → 後端 → 前端，確保 API URL 可用
