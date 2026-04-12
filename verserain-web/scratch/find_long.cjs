const fs = require('fs');

const versesCode = fs.readFileSync('src/verses.js', 'utf8');

// A crude way to extract the CUV texts just to inspect:
let inCUV = false;
let lines = versesCode.split('\n');
let cuvLines = [];
let kjvLines = [];

for (let line of lines) {
  if (line.includes('export const VERSES_CUV = [')) {
    inCUV = true;
  } else if (line.includes('export const VERSES_KJV = [')) {
    inCUV = false;
  } else if (line.includes('export const verseSets = [')) {
    inCUV = false;
  }
  
  if (inCUV) {
    let match = line.match(/text:\s*["']([^"']+)["']/);
    if (match) {
        let text = match[1];
        // Rules user wants:
        // 1. Remove (...) and （...）
        // 2. Remove numbers like 1, 2, 3
        // 3. Remove "he" -> "他"
        let cleaned = text.replace(/[（\(].*?[）\)]/g, '').replace(/[0-9]+/g, '').replace(/\bhe\b/gi, '他');
        // split by punctuation to check >8
        let chunks = cleaned.split(/[,，。；：「」、;:\.\?!！？『』《》\s]/).map(x => x.trim()).filter(Boolean);
        let violations = chunks.filter(c => c.length > 8);
        if (violations.length > 0) {
            console.log(`Original: ${text}`);
            console.log(`Cleaned : ${cleaned}`);
            console.log(`Violations : ${JSON.stringify(violations)}`);
            console.log("------------------------");
        }
    }
  }
}
