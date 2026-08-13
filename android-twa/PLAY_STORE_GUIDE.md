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

> 📍 **2026-08-11：keystore 不在 `android-twa/` 了，已移出到個人筆記庫。**
>
> **確切位置與密碼刻意不寫在這裡 —— 本 repo 是公開的。**
> 兩者都在密碼管理器的 VerseRain keystore 條目裡。
>
> `twa-manifest.json` 的 `signingKey.path` 仍寫 `./android.keystore`，
> 所以 build 前要先把那個 .jks 複製過來（複製的那份會被 `.gitignore`
> 擋住，不會進 git）：
>
> ```bash
> cp <keystore 路徑> android-twa/android.keystore
> ```
>
> **alias 是 `key0`，不是 `android`。** 用錯會失敗在
> `entry "android" does not contain a key`。`twa-manifest.json` 已改成 `key0`。
> 憑證：`O=Hope of Glory LLC, CN=David Hwang`，
> SHA-256 `AC:EB:9D:5A:BD:BD:8F:78:52:95:A1:6D:4A:F5:DA:78:3A:C8:F5:F2:89:7B:9E:6B:1D:76:9B:E2:0C:7E:68:DF`
>
> ⚠️ **但這把不是 Play 認得的上傳金鑰。** 已在 Play Console 核對過：
> 註冊的上傳金鑰是 `87:81:FC:43:...`（= `assetlinks.json` 第一組），
> Play 自己的簽署金鑰是 `94:A9:CE:F1:...`（第二組）。
> 筆記庫裡那把 keystore 建立於 2026-05-22，比 Bubblewrap 專案（06-13）還早，
> 是更早的另一把金鑰；Bubblewrap 當時自己產的 `android.keystore` 才是真正的上傳金鑰，
> **那一把已經遺失**。
>
> **解法：重設上傳金鑰**，把手上這把 `key0` 註冊成新的上傳金鑰（不必再產新的）：
>
> ```bash
> # 匯出憑證（會問密碼）
> /opt/homebrew/opt/openjdk@17/bin/keytool -export -rfc \
>   -keystore ./android.keystore -alias key0 -file upload_certificate.pem
> ```
>
> Play Console → 設定 → 應用程式完整性 → 應用程式簽署 →
> **Request upload key reset** → 上傳這個 .pem。
>
> ✅ **整件事已於 2026-08-13 完成。** 流程記錄：
> 08-11 送出重設（Google 回信的指紋與本機 .pem 完全相符，
> SHA1 `6F:E1:29:58:2F:89:3D:CC:13:30:4B:BA:DD:43:2F:E6:14:7A:D7:B4`）→
> 08-13 09:16 UTC 生效 → 同日上傳 `app-release-bundle.aab` 成功，
> 不用重 build、不用改版號。
>
> **Play 後台確認：`44 (3.6.2)` / API levels 21+ / Target SDK 36**，
> 已在 Internal testing 軌上線。API 36 的規定就此滿足（本來的期限 08-31、
> 已申請的延期 11-01 都不再有意義）。
>
> `assetlinks.json` 也已同步：舊的上傳金鑰指紋 `87:81:FC:43:...` 換成
> `AC:EB:9D:5A:...`，Play 簽署金鑰 `94:A9:CE:F1:...` 不動（commit 048bdfcf）。
>
> 下一步跟 API level 無關：Internal testing 不算封閉測試的門檻，
> 要拿正式版權限得把同一個 bundle 放到 **Closed testing**
> （建立版本時用「Add from library」挑 44，不必重傳），跑滿 12 位測試者 × 14 天。
>
> **教訓**：`.gitignore` 保護了金鑰不外流，但也讓它在換機／搬檔時無聲消失，
> 全機 `find` 要跑好幾分鐘、Spotlight 甚至索引不到 Obsidian vault。
> 金鑰搬家時，請同步更新本檔案的路徑。

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

## 建置環境（2026-08-11 重建並驗證過）

這台機器換過之後，JDK、Android SDK、keystore 全部不見了（都在 `.gitignore` 裡）。
重建步驟：

```bash
brew install openjdk@17
npm i -g @bubblewrap/cli@latest
```

然後寫 `~/.bubblewrap/config.json`：

```json
{
  "jdkPath": "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk",
  "androidSdkPath": "/Users/<你的帳號>/.bubblewrap/android_sdk"
}
```

**`jdkPath` 一定要指到 `.jdk` bundle 根目錄，不是 `Contents/Home`。**
Bubblewrap 在 macOS 上會自己接 `/Contents/Home/`（見 `@bubblewrap/core` 的
`JdkHelper.getJavaHome()`），指到 `Contents/Home` 會變成
`Contents/Home/Contents/Home`，然後報 `The jdkPath isn't correct`。
（本檔案舊版寫的 `JAVA_HOME=/opt/homebrew/opt/openjdk@17` 也是錯的，那是 keg-only
前綴，不是 JDK home。）

Android SDK 用 `bubblewrap doctor` 下載，但它**只會抓 `tools`，不會抓 platform**，
build 會炸在 `SdkHandler.initTarget`。要自己補：

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
~/.bubblewrap/android_sdk/tools/bin/sdkmanager \
  --sdk_root=$HOME/.bubblewrap/android_sdk \
  "platforms;android-36" "build-tools;36.0.0" "platform-tools"
```

驗證：`bubblewrap doctor` 要回 `Your jdkpath and androidSdkPath are valid.`

## Target API level（Google Play 強制要求）

Google Play 每年拉高門檻，**2026-08-31 起必須 target API 36（Android 16）**。
可申請延期到 2026-11-01（本專案已申請並獲准）。

`targetSdkVersion` **不在任何進 git 的檔案裡** — 它在 Bubblewrap 產生的
`app/build.gradle`（被 gitignore）。所以升 API level 不用改任何程式碼，
只要升 Bubblewrap 再重新產生專案：

```bash
npm i -g @bubblewrap/cli@latest   # 1.25.0 的樣板 = targetSdkVersion 36
cd android-twa
bubblewrap update --appVersionName=<新版號>   # 會自動把 appVersionCode +1
```

驗證產出的 APK 真的是 36（不要只看 build.gradle）：

```bash
~/.bubblewrap/android_sdk/build-tools/36.0.0/aapt2 dump badging \
  app-release-unsigned-aligned.apk | grep -E "^package|targetSdkVersion"
```

## 日後更新版本

```bash
cd android-twa
bubblewrap update --appVersionName=<新版號>   # appVersionCode 自動 +1
BUBBLEWRAP_KEYSTORE_PASSWORD=$(cat .keystore-password.txt) \
BUBBLEWRAP_KEY_PASSWORD=$(cat .keystore-password.txt) \
bubblewrap build --skipPwaValidation
```

不簽章的試建（驗證編譯有沒有過，不需要 keystore）：加 `--skipSigning`。

注意：**網站內容更新不用發新版** — TWA 載入的是線上網站，`vercel --prod` 即生效。
只有改 app 殼（icon、名稱、顏色、版本號）才需要重新 build + 上傳。

`twa-manifest.json` 的 `iconUrl` / `maskableIconUrl` 必須指向**線上網址**
（`https://www.verserain.com/icons/icon-512.png`）。原本指著建立當天的本機
dev server `http://127.0.0.1:8123`，任何時候重新產生專案都會炸 `ECONNREFUSED`。

## 實機測試（上架前建議）

```bash
adb install android-twa/app-release-signed.apk
```

檢查：開啟後**不應**看到 Chrome 網址列（需 assetlinks.json 已部署且指紋相符）、
Google 登入、語音模式、推播通知。
