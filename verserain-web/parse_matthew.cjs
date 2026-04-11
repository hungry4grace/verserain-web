const https = require('https');
const fs = require('fs');

https.get('https://www.verserain.com/verseset/show/5d671d523f7ab018f5674a86', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        const verses = [];
        const regex = /<span class="reference"[^>]*>\s*(.*?)\s*<\/span>[\s\S]*?<div class="verse_text">(.*?)<\/div>/g;
        let match;
        let idCount = 1;
        while ((match = regex.exec(rawData)) !== null) {
            let ref = match[1].trim();
            let text = match[2].trim();
            // decode HTML entities
            text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            verses.push({
                id: `matthew-important-${idCount++}`,
                reference: ref,
                title: "馬太福音 重要經文",
                text: text
            });
        }
        
        console.log("Total verses extracted: " + verses.length);
        fs.writeFileSync('matthew.json', JSON.stringify(verses, null, 2));
    });
});
