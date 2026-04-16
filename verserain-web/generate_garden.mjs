import fs from 'fs';
const garden = {};
for(let i=0; i<154; i++) {
  garden["FakeVerse " + i] = {
    gridIndex: i,
    stage: Math.floor(Math.random() * 10) + 1,
    fruits: Math.floor(Math.random() * 5),
    setId: null
  };
}
fs.writeFileSync('inject_garden.json', JSON.stringify(garden));
