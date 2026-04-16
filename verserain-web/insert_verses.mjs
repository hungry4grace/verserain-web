import fs from 'fs';

function insertVerses(filename, extraContent, placeholder) {
  let content = fs.readFileSync(filename, 'utf8');
  if (content.includes("matthew-important-kjv")) return; // already injected
  content = content.replace(placeholder, ',\n' + extraContent + '\n' + placeholder);
  fs.writeFileSync(filename, content);
}

let kjvData = fs.readFileSync('src/_generated_kjv.txt', 'utf8');
insertVerses('src/verses_kjv.js', kjvData.trim(), '];\n\n// Fallback');

console.log("KJV Verses injected successfully.");
