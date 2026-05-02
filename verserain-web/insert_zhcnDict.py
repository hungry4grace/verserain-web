import json

with open('zhcnDict.json', 'r', encoding='utf-8') as f:
    zhcnDict_content = f.read()

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app_jsx = f.read()

insertion = f"const zhcnDict = {zhcnDict_content};\n\n"

# insert before `const myDict = {`
app_jsx = app_jsx.replace('const myDict = {', insertion + 'const myDict = {')

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_jsx)

print("Inserted zhcnDict into App.jsx")
