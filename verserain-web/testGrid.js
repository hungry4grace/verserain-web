for(let treeCount of [5, 50, 99, 100, 101, 150, 250, 500, 1000, 2000]) {
  const calc1 = Math.ceil(Math.sqrt(Math.max(treeCount, 1) * 1.5 / 100) * 10) * 10;
  const gridSize = Math.max(10, calc1 > 100 ? Math.ceil(Math.sqrt(treeCount * 1.5)) : 10);
  const maxCapacity = gridSize * gridSize;
  console.log(`Trees: ${treeCount} -> calc1: ${calc1}, gridSize: ${gridSize}, maxCapacity: ${maxCapacity}, enough spaces: ${maxCapacity >= treeCount}`);
}
