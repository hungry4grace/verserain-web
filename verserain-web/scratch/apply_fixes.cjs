const fs = require('fs');
const path = require('path');

const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });

function smartSplit(text) {
    if (!(/[\u4e00-\u9fa5]/.test(text))) return text; // skip if not chinese
    
    // Split by existing punctuation/spaces
    const tokens = text.split(/([,，。；：「」、;:\.\?!！？『』《》\s]+)/);
    let output = '';
    
    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        if (!token) continue;
        
        // If it's punctuation, just append and continue
        if (/^[,，。；：「」、;:\.\?!！？『』《》\s]+$/.test(token)) {
            output += token;
            continue;
        }
        
        // Process the Chinese text chunk
        const words = Array.from(segmenter.segment(token));
        let chunkStr = '';
        let currentChunk = '';
        
        for (let wordObj of words) {
            let w = wordObj.segment;
            if (currentChunk.length + w.length > 8 && currentChunk.length > 0) {
                // If appending w makes length > 8, flush the current chunk
                chunkStr += currentChunk + ' ';
                currentChunk = w;
            } else {
                currentChunk += w;
            }
        }
        if (currentChunk) {
            chunkStr += currentChunk;
        }
        output += chunkStr;
    }
    return output;
}

function processContent(content) {
    const textRegex = /text:\s*(["'])([\s\S]*?)\1/g; // use \s\S for multiline or any char
    
    let modified = content.replace(textRegex, (match, quote, innerText) => {
        if (!/[\u4e00-\u9fa5]/.test(innerText)) {
            // English text, leave it alone.
            return match;
        }
        
        let cleaned = innerText;
        
        // 1. replace English 'he' / 'He' / 'HE' with '他'
        cleaned = cleaned.replace(/\bhe\b/gi, '他');
        // also handle instances where it might be adjacent to punctuation
        
        // 2. remove things in parenthesis
        cleaned = cleaned.replace(/[（\(][^）\)]*[）\)]/g, '');
        
        // 3. remove numbers
        cleaned = cleaned.replace(/[0-9]+/g, '');
        
        // clean up spaces that might have been left behind
        cleaned = cleaned.replace(/\s{2,}/g, ' ');
        
        // 4. smart split > 8 chars
        cleaned = smartSplit(cleaned.trim());
        
        return `text: ${quote}${cleaned}${quote}`;
    });
    return modified;
}

const files = ['../src/verses.js', '../src/verses_psalms.js'];

for (let file of files) {
    let p = path.join(__dirname, file);
    if (fs.existsSync(p)) {
        let content = fs.readFileSync(p, 'utf8');
        let newContent = processContent(content);
        if (content !== newContent) {
            fs.writeFileSync(p, newContent, 'utf8');
            console.log(`Updated ${file}`);
        }
    }
}
