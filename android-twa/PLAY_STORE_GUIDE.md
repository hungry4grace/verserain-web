# VerseRain — Google Play 上架指南

Android 版採用 **Trusted Web Activity (TWA)**：用 Bubblewrap 把 https://www.verserain.com/
包成原生 app，跑在使用者手機的 Chrome 引擎裡。和 iOS 的 WKWebView wrapper 概念相同，
但因為是真正的 Chrome，**Google 登入、cookie、Web Push 都直接可用**，不需要 native bridge。

## 專案檔案

| 檔案 | 用途 |
|------|------|
| `twa-manifest.json` | Bubblewrap 專案定義（package id、顏色、版本號…） |
| `android.keystore` | **上傳簽名金鑰** — 遺失需向 Google 重設，務必備份 |
| `.keystore-password.txt` | keystore 密碼（store + key 同一組）— 存進密碼管理器後可刪除 |
| `app-release-bundle.aab` | 上傳 Play Console 用的 bundle |
| `app-release-signed.apk` | 本機實機測試用 |

兩個金鑰檔都已加入 `.gitignore`，不會進 git。

## 一次性前置：部署網站更新（已備好，待部署）

1. `verserain-web/public/manifest.json` — 加了 PNG icons（192/512/maskable）
2. `verserain-web/public/.well-known/assetlinks.json` — Digital Asset Links（去掉 Chrome 網址列的關鍵）

部署：`cd verserain-web && vercel --prod`，然後確認
`https://www.verserain.com/.well-known/assetlinks.json` 回 200。

## Play Console 上架步驟

1. **建立應用程式**：Play Console → 建立應用程式
   - 名稱：`VerseRain 經文雨`，預設語言：中文（繁體），類型：應用程式，免費
2. **上傳 AAB**：測試與發布 → 正式版 → 建立新版本 → 上傳 `app-release-bundle.aab`
   - 第一次上傳會啟用 **Play 應用程式簽署**（Google 管理簽署金鑰）— 接受預設
   - package name 是 `com.verserain.app`（舊 Unity 版已永久佔用 `com.hopeofglory.verserain`，
     Play 不允許重用，即使 app 已下架）
3. **抓 Play 簽署憑證指紋**（關鍵步驟）：
   - 設定 → 應用程式完整性 → App signing key certificate → 複製 **SHA-256**
   - 把它**加進** `assetlinks.json` 的 `sha256_cert_fingerprints` 陣列（保留原本的上傳金鑰指紋，兩個都留）
   - 重新 `vercel --prod` 部署
   - 沒做這步的話，從 Play 安裝的 app 會頂著 Chrome 網址列跑
4. **商店資訊**（主要商店資訊）：
   - 簡短說明（80 字內）+ 完整說明（可沿用 App Store 文案）
   - App icon：512×512 PNG（用 `verserain-web/public/icons/icon-512.png`）
   - 主題圖片 feature graphic：1024×500 PNG
   - 手機截圖至少 2 張（16:9 或 9:16）；在手機 Chrome 開 verserain.com 截圖即可
5. **應用程式內容**（政策聲明，全部必填）：
   - 隱私權政策網址：`https://www.verserain.com/privacy`
   - 廣告：無 | 目標對象：13+（含兒童則需更多審查，建議選 13+）
   - 內容分級問卷：參考類／教育類，無暴力等 → 通常評 3+
   - 資料安全：會收集帳號資料（email 登入）、使用者內容（自訂經文組）；
     聲明「資料在傳輸中加密」「使用者可要求刪除資料」
6. **送審**：發布總覽 → 傳送變更以供審查。新帳號首次審查通常 1–7 天。

### 新個人開發者帳號的封閉測試門檻

2023 年後註冊的**個人**開發者帳號，正式發布前需先跑封閉測試：
**12 位測試者持續 14 天**。若你的帳號適用：
- 測試與發布 → 封閉測試 → 建立版本（上傳同一個 AAB）
- 邀請教會團契的弟兄姊妹當測試者（給 email list + opt-in 連結）
- 14 天後申請正式發布權限

## 日後更新版本

```bash
cd android-twa
# 改 twa-manifest.json: appVersionCode +1、appVersionName
JAVA_HOME=/opt/homebrew/opt/openjdk@17 \
BUBBLEWRAP_KEYSTORE_PASSWORD=$(cat .keystore-password.txt) \
BUBBLEWRAP_KEY_PASSWORD=$(cat .keystore-password.txt) \
npx @bubblewrap/cli build --skipPwaValidation
```

注意：**網站內容更新不用發新版** — TWA 載入的是線上網站，`vercel --prod` 即生效。
只有改 app 殼（icon、名稱、顏色、版本號）才需要重新 build + 上傳。

## 實機測試（上架前建議）

```bash
adb install android-twa/app-release-signed.apk
```

檢查：開啟後**不應**看到 Chrome 網址列（需 assetlinks.json 已部署且指紋相符）、
Google 登入、語音模式、推播通知。
