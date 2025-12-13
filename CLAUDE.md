# Chromatic Alchemist - 專案設定

## 專案概述

**光譜紀元：孤光行者** - 純文字 TRPG 網頁遊戲

玩家扮演最後的折光師學徒，在稜鏡大陸上收集七塊聖杯碎片，對抗虛無教團，拯救世界。

---

## 技術架構

### 架構模式
- **前後端分離**
- **後端主導邏輯**：所有遊戲邏輯（骰子、戰鬥、狀態計算）在後端處理
- **前端純顯示**：前端只負責 UI 渲染和發送玩家選擇

### 前端 (frontend/)
| 項目 | 選擇 |
|------|------|
| 框架 | React 18+ |
| 語言 | **TypeScript（強制）** |
| 建置工具 | Vite |
| 樣式 | Tailwind CSS |
| 狀態管理 | React Context + useReducer |
| HTTP 客戶端 | Axios |
| 路由 | React Router v6 |

### 後端 (backend/)
| 項目 | 選擇 |
|------|------|
| 框架 | FastAPI |
| 語言 | Python 3.11+ |
| 資料庫 | PostgreSQL |
| ORM | SQLAlchemy 2.0 |
| 驗證 | Pydantic v2 |
| 認證 | JWT (python-jose) |
| 密碼雜湊 | bcrypt |

### 部署目標
- 未來部署至雲端
- 開發階段本地運行

---

## 功能規格

### 使用者系統
- Email + 密碼註冊/登入
- JWT Token 認證
- 每個帳號最多 **3 個存檔欄位**

### 遊戲範圍（第一階段）
- **只實作序章**（完整可玩）
- 包含：角色創建、探索、戰鬥教學、謎題、物品獲得

### 遊戲內容呈現
- 劇情/戰鬥訊息：**純文字**
- UI 元件：按鈕、血條、背包欄、狀態列等

---

## 目錄結構

chromatic-alchemist/
├── CLAUDE.md              # 本檔案 - LLM 專案設定
├── docs/
│   └── game-design/       # 遊戲設計文件（已完成）
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # UI 元件
│   │   ├── pages/         # 頁面元件
│   │   ├── contexts/      # React Context
│   │   ├── hooks/         # 自定義 Hooks
│   │   ├── services/      # API 呼叫
│   │   ├── types/         # TypeScript 型別
│   │   └── utils/         # 工具函式
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/               # FastAPI 後端
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── core/          # 核心設定
│   │   ├── models/        # SQLAlchemy 模型
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # 業務邏輯
│   │   ├── game/          # 遊戲引擎
│   │   └── main.py        # 應用程式入口
│   ├── requirements.txt
│   └── alembic/           # 資料庫遷移
└── shared/                # 共用型別定義（可選）

---

## 開發指令

### 前端
cd frontend
npm install          # 安裝依賴
npm run dev          # 開發伺服器 (localhost:5173)
npm run build        # 生產建置
npm run lint         # ESLint 檢查
npm run type-check   # TypeScript 型別檢查

### 後端
cd backend
python -m venv venv           # 建立虛擬環境
venv\Scripts\activate         # 啟用（Windows）
pip install -r requirements.txt
uvicorn app.main:app --reload # 開發伺服器 (localhost:8000)

### 資料庫
DATABASE_URL=postgresql://postgres:password@localhost:5432/chromatic_alchemist
alembic upgrade head

---

## API 設計原則

### 端點命名
- RESTful 風格
- 資源導向：/api/v1/users, /api/v1/game/saves
- 動作用 POST：/api/v1/game/action

### 回應格式
{
  success: true,
  data: { ... },
  message: 操作成功
}

### 錯誤處理
{
  success: false,
  error: {
    code: INVALID_ACTION,
    message: 無效的行動選擇
  }
}

---

## 遊戲引擎設計

### 核心模組 (backend/app/game/)
game/
├── engine.py          # 遊戲主引擎
├── dice.py            # 骰子系統
├── combat.py          # 戰鬥系統
├── alchemy.py         # 煉金系統
├── inventory.py       # 背包系統
├── story.py           # 劇情推進
└── data/              # 遊戲數據（JSON）
    ├── enemies.json
    ├── items.json
    ├── recipes.json
    └── chapters/
        └── prologue.json

---

## 編碼規範

### TypeScript（前端）
- 嚴格模式 (strict: true)
- 禁止 any，必須明確型別
- 元件使用 .tsx，純邏輯使用 .ts
- 使用 interface 定義 props

### Python（後端）
- Type hints 必須
- 使用 Pydantic 驗證所有輸入
- 遵循 PEP 8
- 使用 async/await

---

## 設計文件參考

遊戲設計文件位於 docs/game-design/：

| 文件 | 內容 |
|------|------|
| 01-world-setting.md | 世界觀、光之屬性 |
| 02-character-system.md | 角色創建、屬性 |
| 03-core-mechanics.md | 檢定、戰鬥系統 |
| 04-alchemy-system.md | 藥水配方、材料 |
| 05-bestiary.md | 敵人數據 |
| 06-story-chapters.md | 故事大綱 |
| 07-gm-guide.md | GM 指南 |
| 08-equipment.md | 武器裝備 |
| 09-status-effects.md | 異常狀態 |
| 10-economy.md | 經濟系統 |
| 11-npcs.md | NPC 資料 |
| 12-puzzles.md | 謎題設計 |
| chapters/00-prologue.md | 序章完整腳本 |

---

## 注意事項

1. **前端必須使用 TypeScript**，不接受純 JavaScript
2. **所有遊戲邏輯在後端**，前端不做計算
3. **API 先行**：先定義 API schema，再實作
4. **型別共享**：前後端使用相同的型別定義（透過 OpenAPI 生成）
5. **遊戲數據外部化**：敵人、物品、劇情等用 JSON 檔，不硬編碼

---

## 核心公式速查

成功率 = 屬性 × 20% + 難度修正
HP = 20 + (力量 × 2)
MP = 10 + (智力 × 2)
負重上限 = 10 + 力量

### 難度修正
- 簡單: +20%
- 普通: +0%
- 困難: -20%
- 極難: -40%

### 特殊骰值
- 01-05: 大成功
- 96-00: 大失敗

### 背景選擇
| 背景 | 加成 | 起始物品 |
|------|------|----------|
| 戰鬥學徒 | 力量 +1 | 紅光藥水 ×2 |
| 藥草學徒 | 感知 +1 | 綠光藥水 ×2 |
| 魔法學徒 | 智力 +1 | 藍光藥水 ×2 |