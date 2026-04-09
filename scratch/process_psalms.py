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

    result_chapters = []
    # Take chapters 1 to 41 (index 0 to 40)
    for chapter_idx in range(min(41, len(psalms_book['chapters']))):
        chapter = psalms_book['chapters'][chapter_idx]
        chapter_num = chapter_idx + 1
        
        # Concatenate all verses in this chapter
        # We'll join them without spaces if they were character-spaced, 
        # but let's just join the cleaned version.
        full_text = ""
        for verse_text in chapter:
            clean_text = verse_text.replace(' ', '').strip()
            # Some chapters might need a separator? 
            # But the logic uses punctuation to split, so plain concatenation is fine.
            full_text += clean_text
            
        result_chapters.append({
            "reference": f"詩篇 {chapter_num}",
            "title": f"詩篇 第{chapter_num}篇",
            "text": full_text
        })
    
    new_set = {
        "id": "psalms-1-41",
        "title": "詩篇 1-41",
        "description": "和合本 詩篇 第 1 篇至第 41 篇（第一卷）。每一篇為一個完整的練習單位。",
        "verses": result_chapters
    }
    
    # Write to a temporary JS file
    with open('psalms_cuv.js', 'w', encoding='utf-8') as f:
        f.write("export const PSALMS_1_41 = ")
        json.dump(new_set, f, ensure_ascii=False, indent=4)
        f.write(";")
    print(f"Successfully processed {len(result_chapters)} chapters.")

if __name__ == "__main__":
    process_psalms()
