import fs from 'fs';

const content = fs.readFileSync('/Users/davidhwang/Obsidian-vaults/DavidHwang-remoteVault/互惠經濟 重要經文（KJV）.md', 'utf8');

const verses = [];
const lines = content.split('\n');
let currentVerse = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('### ')) {
    // New verse header
    const match = line.match(/### \d+\.\s+(.*?)\s+—\s+(.*)/);
    if (match) {
      if (currentVerse) verses.push(currentVerse);
      currentVerse = {
        reference: match[1].trim(),
        title: match[2].trim(),
        text: ''
      };
    }
  } else if (line.startsWith('>') && currentVerse) {
    // Verse text
    let textLine = line.substring(1).trim();
    if (textLine) {
      if (currentVerse.text) currentVerse.text += ' ';
      currentVerse.text += textLine;
    }
  } else if (line.startsWith('---') && currentVerse) {
    // End of verse or separator
  }
}
if (currentVerse) verses.push(currentVerse);

const newSet = {
  id: "mutualized-economy-main-kjv",
  title: "Mutualized Economy main verses (KJV)",
  description: "30 Core Scriptures ranked by relevance to the Mutualized Economy framework.",
  verses: verses
};

console.log(JSON.stringify(newSet, null, 2));
