fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/garden?player=Nathaniel")
  .then(res => res.json())
  .then(data => {
    const gardenData = data.gardenData || {};
    // Remove bad keys
    for (const key of Object.keys(gardenData)) {
      if (key.startsWith('john-')) delete gardenData[key];
    }
    // Add valid keys
    const validRefs = ["約翰福音 3:16", "箴言 3:5-6", "腓立比書 4:6-7", "耶利米書 29:11", "以賽亞書 41:10", "詩篇 23:1"];
    validRefs.forEach((ref, index) => {
      gardenData[ref] = { gridIndex: index, stage: 10, fruits: 9, setId: "Verses" };
    });

    return fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/save-garden", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: "Nathaniel",
        gardenData: gardenData
      })
    });
  })
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
