const distractionLevel = 0;
const maxGridSize = distractionLevel <= 1 ? 4 : 9;
const fakesCount = distractionLevel > 0 ? distractionLevel : 0;
const realBlocksAvailable = 5;

const initialRealCount = Math.min(maxGridSize - fakesCount, realBlocksAvailable);
const initialIndices = Array.from({ length: initialRealCount }, (_, i) => i);

const newBlocks = initialIndices.map((pIndex) => ({
  seqIndex: pIndex
}));

if (fakesCount > 0) { }

const currentLength = newBlocks.length;
for (let i = currentLength; i < maxGridSize; i++) {
  newBlocks.push({
    seqIndex: -99
  });
}
console.log("Length:", newBlocks.length); // Should be 4!
