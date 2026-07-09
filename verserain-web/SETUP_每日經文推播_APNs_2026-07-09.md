# 每日經文推播 — APNs 升級 · Setup & Deploy

**Built:** 2026-07-09 · iOS App Store 版從「無推播」→「APNs 遠端推播(主)+ 本地通知(備援)」。

## 架構總覽(三條通道、同一個 7am 閘門、同一條深連結)

| 通道 | 對象 | 訂閱儲存 | 發送者 |
|---|---|---|---|
| Web Push | 桌面瀏覽器 / Android / iOS PWA | PartyKit `push:` | cron `send-morning-push.mjs` |
| **APNs(新)** | iOS App Store 版 | PartyKit `apns:` | 同一個 cron |
| 本地通知(備援) | iOS App(APNs 註冊失敗時) | 手機本機 | App 自己排程 |

使用者流程不變:App 內設定 →「開啟每日經文推播」→ 允許通知。App 自動優先走 APNs;點通知深連結 `/?listenDaily=<日期>&version=<譯本>` 直接進聆聽。

## 改了哪些檔案

| 檔案 | 變更 |
|---|---|
| `src/party/server.js` | +3 端點:`POST /save-apns-token`、`POST /delete-apns-token`、`GET /apns-tokens`(admin,與 `/push-subscriptions` 同一 token 閘)|
| `scripts/send-morning-push.mjs` | **新。** 統一發送腳本:Web Push + APNs(jose ES256 JWT + HTTP/2),410/BadDeviceToken 自動清 token,支援 force / dry_run |
| `.github/workflows/morning-push.yml` | 改為 checkout + 跑上面的腳本(原本是內嵌 heredoc);+APNs secrets;+手動 force/dry_run 選項 |
| `ios-vercel-wrapper/VerseRain/DailyVersePushBridge.swift` | APNs 優先:註冊 → 上傳 device token → 清掉本地排程;失敗降級本地通知;token 輪替自動重新上傳 |
| `ios-vercel-wrapper/VerseRain/VerseRainApp.swift` | +AppDelegate(收 device token 回呼)|
| `ios-vercel-wrapper/VerseRain/VerseRain.entitlements` | +`aps-environment`(distribution 簽章時 Xcode 自動改 production)|
| `src/App.jsx` | 原生訂閱多傳 `playerName`/`email`(cron 記錄與 Web Push 對齊)|

## 你要做的(依序)

### 1. Apple Developer — 建 APNs Auth Key(~5 分鐘,只做一次)
1. <https://developer.apple.com/account> → Certificates, Identifiers & Profiles → **Keys** → ➕
2. 名稱隨意(如 `VerseRain Push`),勾 **Apple Push Notifications service (APNs)** → Continue → Register
3. **下載 `.p8` 檔**(只能下載一次,收好)、記下 **Key ID**(10 碼)
4. 右上角記下 **Team ID**(10 碼)

> 一把 key 全帳號通用、不會過期,同時涵蓋 sandbox 與 production。

### 2. GitHub Actions secrets
Repo → Settings → Secrets and variables → Actions,新增:

| Secret | 值 |
|---|---|
| `APNS_TEAM_ID` | 你的 Team ID |
| `APNS_KEY_ID` | 上面的 Key ID |
| `APNS_PRIVATE_KEY` | `.p8` 檔的**完整內容**(含 BEGIN/END 行)|

沒加這三個之前,cron 照舊只發 Web Push(腳本會 log「APNs: … skipping」),不會壞。

### 3. 部署 PartyKit(新端點)
```bash
cd verserain-web
npx partykit deploy
```

### 4. Xcode — 開 Push 能力並出新 build
1. 開 `ios-vercel-wrapper/VerseRain.xcodeproj` → target **VerseRain** → Signing & Capabilities
2. 若沒看到 Push Notifications,➕ Capability → **Push Notifications**(entitlements 已寫好,自動簽章會同步 App ID)
3. Build 一次確認編譯過,真機跑:設定 →「開啟每日經文推播」→ 允許 → Xcode console 應看到 token 上傳
4. **注意:** Xcode debug build 的 token 屬於 *sandbox* APNs;cron 打 production 會回 BadDeviceToken 並清掉。**正式測試請用 TestFlight build**(走 production)。

### 5. 測試
1. TestFlight 裝新版,App 內訂閱推播
2. GitHub → Actions → **Morning Daily Verse Push** → Run workflow → 勾 **dry_run**+**force** → 看 log 應列出你的裝置
3. 再跑一次只勾 **force** → 手機應立刻收到今日經文
4. 沒問題後 bump build number 送審

## 行為細節
- **內容永遠當日新鮮**:APNs 由 cron 當天抓經文發送(與 Web Push 相同 payload)。
- **幾個月不開 App 也收得到**(APNs 特性;本地備援模式則需兩週內開一次)。
- **降級與升級全自動**:訂閱時 APNs 註冊失敗(離線等)→ 本地排程頂上;之後任何一次開 App 成功註冊 → 自動切回 APNs 並清掉本地排程,不會重複通知。
- **死 token 自動清理**:cron 收到 410/Unregistered/BadDeviceToken 即刪除該列。
- 換裝置/重裝 App:iOS 會發新 token,App 每次啟動自動重新上傳。
