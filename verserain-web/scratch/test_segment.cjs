const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'word' });
const text = "神所賜出人意外的平安必在基督耶穌裡保守你們的心懷意念";
const segments = Array.from(segmenter.segment(text));
let out = [];
let current = '';
for (let s of segments) {
    if ((current.length + s.segment.length) > 7) {
        out.push(current);
        current = s.segment;
    } else {
        current += s.segment;
    }
}
if (current) out.push(current);
console.log(out.join(' '));
