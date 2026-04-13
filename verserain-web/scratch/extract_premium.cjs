const fs = require('fs');

const data = fs.readFileSync('/Users/davidhwang/Downloads/community_members.csv', 'utf8');
const lines = data.split('\n');
const premiumEmails = [];

// Skip header
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Quick regex to split csv handling quotes properly
  const cols = [];
  let inQuotes = false;
  let currentWord = '';
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(currentWord);
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  cols.push(currentWord);

  if (cols.length >= 14) {
    const email = cols[2].trim().toLowerCase();
    const tier = cols[13].trim().toLowerCase();
    if ((tier === 'premium' || tier === 'vip') && email && String(email).includes('@')) {
      premiumEmails.push(email);
    }
  }
}

// Deduplicate
const uniqueEmails = [...new Set(premiumEmails)];

let output = `// Auto-generated from Skool community members CSV\n`;
output += `export const PREMIUM_EMAILS = ` + JSON.stringify(uniqueEmails, null, 2) + `;\n`;

fs.writeFileSync('/Users/davidhwang/venv/VerseScramble/verserain-web/src/premiumEmails.js', output);
console.log(`Generated src/premiumEmails.js with ${uniqueEmails.length} emails.`);
