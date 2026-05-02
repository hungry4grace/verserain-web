const gardenData = {
  "_activity": { "2026-05-02": 10 },
  "john-1": { gridIndex: 0, stage: 10, fruits: 9, setId: "John" },
  "john-2": { gridIndex: 1, stage: 10, fruits: 9, setId: "John" },
  "john-3": { gridIndex: 2, stage: 10, fruits: 9, setId: "John" },
  "john-4": { gridIndex: 3, stage: 10, fruits: 9, setId: "John" },
  "john-5": { gridIndex: 4, stage: 10, fruits: 9, setId: "John" },
  "john-6": { gridIndex: 5, stage: 10, fruits: 9, setId: "John" }
};

fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/save-garden", {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerName: "Nathaniel",
    gardenData: gardenData
  })
}).then(res => res.json()).then(console.log).catch(console.error);
