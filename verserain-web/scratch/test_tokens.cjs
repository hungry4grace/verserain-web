const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });
const BIBLE_WORDS = ['禧年'];
const str = "這年必為你們的禧年";
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
console.log(tokens);

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
console.log(out.join(' '));
