function findPartition(tokens, index, memo) {
    if (index === tokens.length) return [];
    if (memo[index] !== undefined) return memo[index];
    
    let origStr = tokens.join('');
    for (let i = tokens.length; i > index; i--) {
        let chunkTokens = tokens.slice(index, i);
        let chunkStr = chunkTokens.join('');
        
        if (chunkStr.length > 8) continue;
        
        if (chunkStr.length === 1 && origStr.length > 1) {
            continue; 
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

const tokens = ["你們", "在", "我", "面前", "是", "客", "旅"];
console.log(findPartition(tokens, 0, {}));

const tokens2 = ["耶和華", "的", "愛"];
console.log(findPartition(tokens2, 0, {}));

const tokens3 = ["這", "年", "必", "為", "你", "們", "的", "禧年"];
console.log(findPartition(tokens3, 0, {}));

const tokens4 = ["88888888", "1"]; 
console.log(findPartition(tokens4, 0, {}));
