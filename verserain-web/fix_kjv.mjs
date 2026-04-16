const fs = require('fs');

let kjvText = fs.readFileSync('src/_generated_kjv.txt', 'utf8');
// remove Strong's numbers (1-4 digits following a word or space, mostly numbers inside strings)
// Since they were <S>1234</S>, they became just numbers attached to words. e.g. "In1722" -> "In". "him846" -> "him". 
// Let's use Regex to remove any digits that are preceded by a letter.
// Wait, the API had <S>1722</S>. In _generated_kjv.txt it is "In1722".
// We can just remove (\d+) if it's not preceded by a space and is inside the "text" field?
// No, some are preceded by spaces, like " 1519 ". 
// A better way: modify fetch_multilang.mjs to use: `text.replace(/<S>\d+<\/S>/g, '')`
