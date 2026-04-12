const fs = require('fs');
const path = require('path');

const files = ['../src/verses.js', '../src/verses_psalms.js'];

let violations = new Set();
let textMap = {};

function processText(text) {
    let original = text;
    // 1. "he" -> "他"
    text = text.replace(/\bhe\b/gi, '他');
    // 2. Remove parentheses and their contents
    text = text.replace(/[（\(][^）\)]*[）\)]/g, '');
    // 3. Remove standalone numbers (and numbers attached to things?)
    // "Remove numbers like 1, 2, 3 etc." 
    text = text.replace(/[0-9]+/g, '');
    // 4. Clean up any weird spaces left over
    text = text.replace(/\s+/g, ' ').trim();
    
    // Now check for chunks > 8
    let chunks = text.split(/[,，。；：「」、;:\.\?!！？『』《》\s]/).map(x => x.trim()).filter(Boolean);
    let isViolated = false;
    for (let c of chunks) {
        if (c.length > 8) {
            isViolated = true;
            violations.add(c);
        }
    }
    
    if (isViolated) {
        textMap[original] = text;
    }
}

for (let file of files) {
    let p = path.join(__dirname, file);
    if (!fs.existsSync(p)) continue;
    let content = fs.readFileSync(p, 'utf8');
    
    // Match text fields, avoiding matching JS code roughly.
    let regex = /text:\s*(["'])(.*?)\1/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        processText(match[2]);
    }
}

console.log("Violating chunks found:");
console.log(JSON.stringify(Array.from(violations), null, 2));

console.log("\nOriginal Texts that need fixing:");
console.log(JSON.stringify(Object.keys(textMap), null, 2));
