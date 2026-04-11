import json

with open("verses.js", "r") as f:
    orig = f.read()

# I will replace `export const verses = [` with exporting the new structure
