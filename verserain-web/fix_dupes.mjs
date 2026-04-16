import fs from 'fs';

function fixFile(filename, marker) {
  let content = fs.readFileSync(filename, 'utf8');
  let firstIdx = content.indexOf(marker);
  let lastIdx = content.lastIndexOf(marker);
  if (firstIdx !== -1 && lastIdx !== -1 && firstIdx !== lastIdx) {
    // Found dupes, truncate at lastIdx and close array
    content = content.substring(0, lastIdx).trim();
    if (content.endsWith(',')) content = content.slice(0, -1);
    content += '\n];\n';
    fs.writeFileSync(filename, content);
    console.log('Fixed', filename);
  } else {
    console.log('No duplicates or marker not found in', filename);
  }
}

fixFile('src/verses_ja.js', '// === ヨハネの福音書 核心聖句 ===');
fixFile('src/verses_ko.js', '// === 요한복음 핵심 구절 ===');
