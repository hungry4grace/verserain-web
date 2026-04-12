function findPartition(tokens, index) {
    if (index === tokens.length) return [];
    
    for (let i = tokens.length; i > index; i--) {
        let chunkTokens = tokens.slice(index, i);
        let chunkStr = chunkTokens.join('');
        
        if (chunkStr.length > 8) continue;
        
        if (chunkStr.length === 1 && tokens.length > 1) {
            if (i === tokens.length && index === tokens.length - 1) {
                return null; 
            }
        }
        
        let remainder = findPartition(tokens, i);
        if (remainder !== null) {
            return [chunkStr, ...remainder];
        }
    }
    return null; 
}

const tokens = ["你們", "在", "我", "面前", "是", "客", "旅"];
console.log(findPartition(tokens, 0));

const tokens2 = ["耶和華", "的", "愛"];
console.log(findPartition(tokens2, 0));

const tokens3 = ["這", "年", "必", "為", "你", "們", "的", "禧年"];
console.log(findPartition(tokens3, 0));
