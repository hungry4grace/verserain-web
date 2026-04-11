const fs = require('fs');

const raw = `
# 1. **約翰福音 3:16** 「神愛世人，甚至將他的獨生子賜給他們，叫一切信他的，不至滅亡，反得永生。」
# 2. **箴言 3:5-6** 「你要專心仰賴耶和華，不可倚靠自己的聰明，在你一切所行的事上都要認定他，他必指引你的路。」
# 3. **腓立比書 4:6-7** 「應當一無掛慮，只要凡事藉著禱告、祈求，和感謝，將你們所要的告訴神。神所賜出人意外的平安必在基督耶穌裡保守你們的心懷意念。」
# 4. **耶利米書 29:11** 「耶和華說：我知道我向你們所懷的意念是賜平安的意念，不是降災禍的意念，要叫你們末後有指望。」
# 5. **以賽亞書 41:10** 「你不要害怕，因為我與你同在；不要驚惶，因為我是你的神。我必堅固你，我必幫助你，我必用我公義的右手扶持你。」
# 6. **詩篇 23:1** 「耶和華是我的牧者，我必不致缺乏。」
# 7. **馬太福音 11:28** 「凡勞苦擔重擔的人可以到我這裡來，我就使你們得安息。」
# 8. **以賽亞書 40:31** 「但那等候耶和華的必從新得力。他們必如鷹展翅上騰；他們奔跑卻不困倦，行走卻不疲乏。」
# 9. **彼得前書 5:7** 「你們要將一切的憂慮卸給神，因為他顧念你們。」
# 10. **哥林多前書 13:13** 「如今常存的有信，有望，有愛這三樣，其中最大的是愛。」
# 11. **哥林多後書 5:17** 「若有人在基督裡，他就是新造的人，舊事已過，都變成新的了。」
# 12. **以弗所書 2:8** 「你們得救是本乎恩，也因著信；這並不是出於自己，乃是神所賜的。」
# 13. **羅馬書 3:23** 「因為世人都犯了罪，虧缺了神的榮耀。」
# 14. **羅馬書 6:23** 「因為罪的工價乃是死；惟有神的恩賜，在我們的主基督耶穌裡，乃是永生。」
# 15. **約書亞記 1:9** 「我豈沒有吩咐你嗎？你當剛強壯膽！不要懼怕，也不要驚惶；因為你無論往哪裡去，耶和華─你的神必與你同在。」
# 16. **詩篇 46:1** 「神是我們的避難所，是我們的力量，是我們在患難中隨時的幫助。」
# 17. **加拉太書 2:20** 「我已經與基督同釘十字架，現在活著的不再是我，乃是基督在我裡面活著。」
# 18. **雅各書 1:19** 「我親愛的弟兄們，這是你們所知道的，但你們各人要快快的聽，慢慢的說，慢慢的動怒。」
# 19. **彌迦書 6:8** 「世人哪，耶和華已指示你何為善。他向你所要的是什麼呢？只要你行公義，好憐憫，存謙卑的心，與你的神同行。」
# 20. **約翰福音 14:6** 「耶穌說：我就是道路、真理、生命；若不藉著我，沒有人能到父那裡去。」
`;

const lines = raw.split('\n').filter(l => l.trim().length > 0);
const parsedVerses = lines.map((line, idx) => {
    // # 1. **約翰福音 3:16** 「神愛世人...」
    const regex = /\*\*(.*?)\*\*\s+「(.*)」/;
    const match = line.match(regex);
    if (!match) return null;
    return {
        id: `chiayi-sunday-school-${idx+1}`,
        reference: match[1].trim(),
        title: "嘉義聖教會兒童主日學",
        text: match[2].trim()
    }
}).filter(Boolean);

const newGroupCode = `    {
        id: "chiayi-sunday-school-competition",
        title: "嘉義聖教會兒童主日學聖經比賽",
        description: "本系列包含 20 節經典必背經文，適合兒童主日學聖經比賽與默想。",
        verses: ${JSON.stringify(parsedVerses, null, 4).replace(/\\n/g, '').split('\\n').join('\n')}
    },`;

// Read verses.js
const versesPath = '/Users/davidhwang/venv/VerseScramble/verserain-web/src/verses.js';
let content = fs.readFileSync(versesPath, 'utf-8');

// Insert the new group into the VERSE_SETS array
content = content.replace(
    'export const VERSE_SETS = [', 
    'export const VERSE_SETS = [\n' + newGroupCode
);

fs.writeFileSync(versesPath, content);
console.log("Successfully added new verse campagin.");
