const verses = [
  { reference: "約翰福音 3:16", text: "神愛世人..." },
  { reference: "詩篇 23:1", text: "耶和華是..." },
  { reference: "詩篇 1:1-3", text: "不從惡人的計謀..." }
];

function test(reference) {
  const sanitizeRef = (str) => str.toString().replace(/\s+/g, '').replace(/[–—~]/g, '-').replace(/[：]/g, ':').toLowerCase();
  const searchRef = sanitizeRef(reference);
  const found = verses.find(verse => {
      if (!verse.reference) return false;
      const dbRef = sanitizeRef(verse.reference);
      if (dbRef === searchRef) return true;
      
      const searchNumMatch = searchRef.match(/\d+.*$/);
      const dbNumMatch = dbRef.match(/\d+.*$/);
      
      if (searchNumMatch && dbNumMatch) {
          const searchNumPart = searchNumMatch[0];
          const dbNumPart = dbNumMatch[0];
          
          if (searchNumPart === dbNumPart) {
              const bookPart = searchRef.replace(searchNumPart, '');
              const dbBookPart = dbRef.replace(dbNumPart, '');
              let matchIdx = 0;
              for (let i = 0; i < dbBookPart.length && matchIdx < bookPart.length; i++) {
                  if (dbBookPart[i] === bookPart[matchIdx]) {
                      matchIdx++;
                  }
              }
              if (matchIdx === bookPart.length && matchIdx > 0) {
                  return true;
              }
          }
      }
      return false;
  });
  console.log(reference, "=>", found ? found.reference : "NOT FOUND");
}

test("約 3:1-5");
test("詩篇 1：1-3"); // uses full-width colon
test("約 1:1-5");
test("詩 1:1-3");
