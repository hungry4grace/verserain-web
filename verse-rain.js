#!/usr/bin/env node

const text = process.argv[2];

if (!text) {
  console.log("❌ 錯誤：請提供經文文字。");
  console.log("💡 使用方法: verse-rain \"你的經文內容...\"");
  console.log("💡 範例: verse-rain \"John 3:16 For God so loved the world...\"");
  process.exit(1);
}

const encoded = encodeURIComponent(text);
const url = "https://verserain-web.vercel.app/?text=" + encoded;

console.log("============================================================");
console.log("🎯 成功生成專屬 VerseRain 闖關連結！");
console.log("============================================================");
console.log("");
console.log(url);
console.log("");
console.log("✨ 提示：您可以直接按住 Cmd (⌘) 點擊網址測試，或是複製貼給親朋好友！");
console.log("============================================================");
