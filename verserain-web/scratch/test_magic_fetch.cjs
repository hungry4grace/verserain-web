const verses = [
  { reference: "馬太福音1:23" },
  { reference: "創世記 1:26–28" },
  { reference: "約翰福音 14:21" }
];

function test(reference) {
  const searchRef = reference.trim().replace(/\s+/g, '').toLowerCase();
  const found = verses.find(verse => {
      const dbRef = verse.reference.toString().replace(/\s+/g, '').toLowerCase();
      if (dbRef === searchRef) return true;
      
      const numPartMatch = searchRef.match(/\d+.*$/);
      if (numPartMatch) {
          const numPart = numPartMatch[0];
          const bookPart = searchRef.replace(numPart, '');
          
          if (dbRef.includes(numPart)) {
              const dbBookPart = dbRef.replace(numPart, '');
              let matchIdx = 0;
              for (let i = 0; i < dbBookPart.length && matchIdx < bookPart.length; i++) {
                  if (dbBookPart[i] === bookPart[matchIdx]) {
                      matchIdx++;
                  }
              }
              if (matchIdx === bookPart.length) {
                  return true;
              }
          }
      }
      return false;
  });
  console.log(reference, found ? "FOUND: " + found.reference : "NOT FOUND");
}

test("太1:23");
test("太 1:23");
test("創1:26-28");
test("創 1:26-28");
test("約14:21");
