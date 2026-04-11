import json

with open("verses.js", "r") as f:
    orig = f.read()

# get the original array
orig_array_str = orig[orig.find('['):orig.rfind(']')+1]
orig_array = json.loads(orig_array_str.replace("    reference:", '    "reference":').replace("    title:", '    "title":').replace("    text:", '    "text":').replace("'", '"').replace("`", '"')) # Too fragile to parse manually via python since verses.js might be JS array not valid JSON

# We better just wrap it via string manipulation
