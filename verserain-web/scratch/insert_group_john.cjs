const fs = require('fs');

const raw = `
# 1. **約翰福音 1:1** 「太初有道，道與神同在，道就是神。」
# 2. **約翰福音 1:12** 「凡接待他的，就是信他名的人，他就賜他們權柄，作神的兒女。」
# 3. **約翰福音 1:14** 「道成了肉身，住在我們中間，充充滿滿地有恩典有真理。我們也見過他的榮光，正是父獨生子的榮光。」
# 4. **約翰福音 3:16** 「神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不至滅亡，反得永生。」
# 5. **約翰福音 4:24** 「神是個靈，所以拜他的必須用心靈和誠實拜他。」
# 6. **約翰福音 8:12** 「耶穌又對眾人說：我是世界的光。跟從我的，就不在黑暗裡走，必要得著生命的光。」
# 7. **約翰福音 8:31-32** 「耶穌對信他的猶太人說：你們若常常遵守我的道，就真是我的門徒；你們必曉得真理，真理必叫你們得以自由。」
# 8. **約翰福音 10:10** 「盜賊來，無非要偷竊，殺害，毀壞；我來了，是要叫羊得生命，並且得的更豐盛。」
# 9. **約翰福音 10:11** 「我是好牧人；好牧人為羊捨命。」
# 10. **約翰福音 11:25-26** 「耶穌對他說：復活在我，生命也在我。信我的人雖然死了，也必復活，凡活著信我的人必永遠不死。你信這話嗎？」
# 11. **約翰福音 14:1** 「你們心裡不要憂愁；你們信神，也當信我。」
# 12. **約翰福音 14:6** 「耶穌說：我就是道路、真理、生命；若不藉著我，沒有人能到父那裡去。」
# 13. **約翰福音 14:21** 「有了我的命令又遵守的，這人就是愛我的；愛我的必蒙我父愛他，我也要愛他，並且要向他顯現。」
# 14. **約翰福音 15:5** 「我是葡萄樹，你們是枝子。常在我裡面的，我也常在他裡面，這人就多結果子；因為離了我，你們就不能做什麼。」
# 15. **約翰福音 15:7** 「你們若常在我裡面，我的話也常在你們裡面，凡你們所願意的，祈求，就給你們成就。」
# 16. **約翰福音 16:33** 「我將這些事告訴你們，是要叫你們在我裡面有平安。在世上，你們有苦難；但你們可以放心，我已經勝了世界。」
`;

const lines = raw.split('\n').filter(l => l.trim().length > 0);
const parsedVerses = lines.map((line, idx) => {
    const regex = /\*\*(.*?)\*\*\s+「(.*)」/;
    const match = line.match(regex);
    if (!match) return null;
    return {
        id: `john-core-${idx+1}`,
        reference: match[1].trim(),
        title: "約翰福音 核心經文",
        text: match[2].trim()
    }
}).filter(Boolean);

const newGroupCode = `    {
        id: "gospel-of-john",
        title: "約翰福音 核心經文",
        description: "精選約翰福音中最為關鍵的宣告、應許與真理。",
        verses: ${JSON.stringify(parsedVerses, null, 4).replace(/\\n/g, '').split('\\n').join('\n')}
    },`;

const versesPath = '/Users/davidhwang/venv/VerseScramble/verserain-web/src/verses.js';
let content = fs.readFileSync(versesPath, 'utf-8');

if (!content.includes('id: "gospel-of-john"')) {
    content = content.replace(
        'export const VERSE_SETS = [', 
        'export const VERSE_SETS = [\n' + newGroupCode
    );
    fs.writeFileSync(versesPath, content);
    console.log("Successfully added the Gospel of John verse set.");
} else {
    console.log("Gospel of John verse set already exists in file.");
}
