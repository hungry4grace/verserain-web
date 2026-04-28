const fs = require('fs');

const languages = ['tr', 'es', 'de'];

for (const lang of languages) {
    const versesFile = `src/verses_${lang}.js`;
    let content = fs.readFileSync(versesFile, 'utf8');
    
    const matthewJson = fs.readFileSync(`matthew_${lang}.json`, 'utf8');
    const matthewData = JSON.parse(matthewJson);
    
    const matthewSet = {
        id: `matthew-important-${lang}`,
        title: lang === 'tr' ? "Matta (Önemli Ayetler)" : lang === 'es' ? "Mateo (Versículos Importantes)" : "Matthäus (Wichtige Verse)",
        description: lang === 'tr' ? "Matta kitabından önemli ayetler." : lang === 'es' ? "Versículos clave del evangelio de Mateo." : "Wichtige Verse aus dem Matthäusevangelium.",
        language: lang,
        verses: matthewData
    };
    
    // Formatting the string to look somewhat like code
    let matthewString = JSON.stringify(matthewSet, null, 2).split('\n').map(l => '  ' + l).join('\n');
    matthewString = matthewString.trim();
    
    // Find where Gospel of John ends: "  },"
    const searchString = `    ]\n  },`;
    const index = content.indexOf(searchString);
    if (index !== -1) {
        content = content.substring(0, index + searchString.length) + `\n  // 2. Matthew Important Verses\n  ` + matthewString + `,` + content.substring(index + searchString.length);
        fs.writeFileSync(versesFile, content);
        console.log(`Updated ${versesFile}`);
    } else {
        console.log(`Could not find insert point in ${versesFile}`);
    }
}
