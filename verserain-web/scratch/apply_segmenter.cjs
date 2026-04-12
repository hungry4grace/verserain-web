const fs = require('fs');
const path = require('path');

const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });

const PUNCTUATION_AND_SPACE_REGEX = /([,，。；：「」、;:\.\?!！？『』《》\s])/;

const BIBLE_WORDS = [
    '禧年', '聖年', '耶和華', '耶穌基督', '哈利路亞', '以色列', '耶路撒冷', '逾越節', '大衛', '亞伯拉罕', '以撒', 
    '雅各', '聖靈', '保惠師', '便雅憫', '以法蓮', '瑪拿西', '基路伯', '亞倫', '摩西', '利未', '以利亞', 
    '彌賽亞', '平安', '恩典', '慈愛', '阿們', '基督', '耶穌', '萬軍之', '以馬內利', '和散那', '迦南',
    '法老', '西奈山', '迦南地', '約瑟', '所羅門', '撒母耳', '保羅', '彼得', '約翰', '雅各', '馬利亞',
    '猶大', '加利利', '拿撒勒', '撒但', '魔鬼', '天使', '使徒', '先知', '祭司', '利未人', '法利賽人', 
    '撒都該人', '文士', '外邦人', '會堂', '聖殿', '約櫃', '十誡', '律法', '福音', '救恩', '永生', 
    '十字架', '復活', '升天', '五旬節', '安息日', '十一奉獻', '受洗', '聖餐', '悔改', '重生', '稱義', 
    '成聖', '得榮耀', '細拉', '拉比', '亞當', '夏娃', '挪亞', '掃羅', '約拿單', '押沙龍', '以賽亞',
    '耶利米', '以西結', '但以理', '哥林多', '加拉太', '以弗所', '腓立比', '歌羅西', '帖撒羅尼迦', '提摩太', '啟示錄'
];

function tokenize(str) {
    const rawSegments = Array.from(segmenter.segment(str)).map(s => s.segment);
    let i = 0;
    let tokens = [];
    while (i < rawSegments.length) {
        let matched = false;
        for (let word of BIBLE_WORDS) {
            if (word.startsWith(rawSegments[i])) {
                let combined = '';
                let j = i;
                while (j < rawSegments.length && combined.length < word.length) {
                    combined += rawSegments[j];
                    j++;
                }
                if (combined === word) {
                    tokens.push(word);
                    i = j;
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) {
            tokens.push(rawSegments[i]);
            i++;
        }
    }
    return tokens;
}

function findPartition(tokens, index, memo) {
    if (index === tokens.length) return [];
    if (memo[index] !== undefined) return memo[index];
    
    let origStr = tokens.join('');
    for (let i = tokens.length; i > index; i--) {
        let chunkTokens = tokens.slice(index, i);
        let chunkStr = chunkTokens.join('');
        
        if (chunkStr.length > 8) continue;
        
        if (chunkStr.length === 1 && origStr.length > 1) {
             continue; // Never allow length 1 chunk if we can avoid it
        }
        
        let remainder = findPartition(tokens, i, memo);
        if (remainder !== null) {
            let res = [chunkStr, ...remainder];
            memo[index] = res;
            return res;
        }
    }
    memo[index] = null;
    return null; 
}

function greedyFallback(tokens) {
    let out = [];
    let current = '';
    for (let word of tokens) {
        if ((current.length + word.length) > 8) {
            if (current.length > 0) {
                out.push(current);
                current = word;
            } else {
                out.push(word);
                current = '';
            }
        } else {
            current += word;
        }
    }
    if (current) out.push(current);
    return out;
}

function smartSplit(segmentString) {
    if (segmentString.length <= 8) return segmentString;

    const tokens = tokenize(segmentString);
    
    let partition = findPartition(tokens, 0, {});
    if (partition === null) {
        partition = greedyFallback(tokens);
    }
    
    return partition.join(' ');
}

function processContent(content) {
    const textRegex = /["']?text["']?:\s*(["'])([\s\S]*?)\1/g; 
    
    let modified = content.replace(textRegex, (match, quote, innerText) => {
        if (!/[\u4e00-\u9fa5]/.test(innerText)) {
            return match;
        }
        
        let parts = innerText.split(PUNCTUATION_AND_SPACE_REGEX);
        
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                parts[i] = smartSplit(parts[i]);
            }
        }
        
        let cleaned = parts.join('');
        cleaned = cleaned.replace(/ {2,}/g, ' ');
        
        if (cleaned === innerText) return match;
        return match.replace(innerText, cleaned);
    });
    return modified;
}

const files = ['../src/verses.js', '../src/verses_psalms.js'];
let updatedFiles = 0;

for (let file of files) {
    let p = path.join(__dirname, file);
    if (fs.existsSync(p)) {
        let content = fs.readFileSync(p, 'utf8');
        let newContent = processContent(content);
        if (content !== newContent) {
             fs.writeFileSync(p, newContent, 'utf8');
             console.log(`Updated ${file}`);
             updatedFiles++;
        }
    }
}

if (updatedFiles === 0) {
    console.log("Everything is already perfectly segmented within <= 8 characters.");
}
