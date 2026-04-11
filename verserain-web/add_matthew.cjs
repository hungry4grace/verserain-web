const fs = require('fs');

let matthewJson = fs.readFileSync('matthew.json', 'utf8');
let versesJs = fs.readFileSync('src/verses.js', 'utf8');

const newSet = `    {
        id: "matthew-important",
        title: "馬太福音 重要經文",
        description: "馬太福音中的重要經文測驗與默想集合。",
        verses: ${matthewJson}
    },
`;

// Insert it right after the sid-roth-healing set or at the end.
// Since the file has PSALMS_... we can find the end of the sid-roth-healing block, which is `    },\n    PSALMS_1_41,`
versesJs = versesJs.replace('    },\n    PSALMS_1_41,', '    },\n' + newSet + '    PSALMS_1_41,');

fs.writeFileSync('src/verses.js', versesJs);
console.log('matthew set added');
