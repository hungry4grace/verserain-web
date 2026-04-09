import json

def process_psalms():
    # Use utf-8-sig to handle potential BOM
    with open('bible_cuv.json', 'r', encoding='utf-8-sig') as f:
        bible = json.load(f)
    
    psalms_book = None
    for book in bible:
        if book['abbrev'].lower() == 'ps' or book['name'] == '詩篇':
            psalms_book = book
            break
    
    if not psalms_book:
        print("Psalms not found")
        return

    result_verses = []
    # Take chapters 1 to 41 (index 0 to 40)
    for chapter_idx in range(min(41, len(psalms_book['chapters']))):
        chapter = psalms_book['chapters'][chapter_idx]
        chapter_num = chapter_idx + 1
        for verse_idx, verse_text in enumerate(chapter):
            verse_num = verse_idx + 1
            # Remove character spacing: "不 從 惡 人" -> "不從惡人"
            clean_text = verse_text.replace(' ', '').strip()
            
            result_verses.append({
                "reference": f"詩篇 {chapter_num}:{verse_num}",
                "title": f"詩篇 第{chapter_num}篇",
                "text": clean_text
            })
    
    new_set = {
        "id": "psalms-1-41",
        "title": "詩篇 1-41",
        "description": "和合本 詩篇 第 1 篇至第 41 篇（第一卷）。",
        "verses": result_verses
    }
    
    # Write to a temporary JS file
    with open('psalms_cuv.js', 'w', encoding='utf-8') as f:
        f.write("export const PSALMS_1_41 = ")
        json.dump(new_set, f, ensure_ascii=False, indent=4)
        f.write(";")
    print(f"Successfully processed {len(result_verses)} verses.")

if __name__ == "__main__":
    process_psalms()
