import json
import re

def apply_fixes():
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject translation dicts
    try:
        with open('esDict.json', 'r', encoding='utf-8') as f:
            es = json.load(f)
        with open('trDict.json', 'r', encoding='utf-8') as f:
            tr = json.load(f)
        with open('deDict.json', 'r', encoding='utf-8') as f:
            de = json.load(f)
            
        es_str = "const esDict = " + json.dumps(es, ensure_ascii=False, indent=4) + ";\n"
        tr_str = "const trDict = " + json.dumps(tr, ensure_ascii=False, indent=4) + ";\n"
        de_str = "const deDict = " + json.dumps(de, ensure_ascii=False, indent=4) + ";\n"
        
        target = "  const t = (zh, en) => {"
        replacement = es_str + "\n" + tr_str + "\n" + de_str + "\n" + target
        
        if "const esDict =" not in content:
            content = content.replace(target, replacement)
            
        # Update t function mapping
        t_func_old = """  const t = (zh, en) => {
    if (uiLang === 'en') return en || zh;
    if (uiLang === 'fa') return faDict[zh] || en || zh;
    if (uiLang === 'he') return heDict[zh] || en || zh;
    if (uiLang === 'ja') return jaDict[zh] || zh;
    if (uiLang === 'ko') return koDict[zh] || zh;
    return zh; // default: 'zh'
  };"""
  
        t_func_new = """  const t = (zh, en) => {
    if (uiLang === 'en') return en || zh;
    if (uiLang === 'fa') return faDict[zh] || en || zh;
    if (uiLang === 'he') return heDict[zh] || en || zh;
    if (uiLang === 'ja') return jaDict[zh] || zh;
    if (uiLang === 'ko') return koDict[zh] || zh;
    if (uiLang === 'es') return esDict[zh] || en || zh;
    if (uiLang === 'tr') return trDict[zh] || en || zh;
    if (uiLang === 'de') return deDict[zh] || en || zh;
    if (uiLang !== 'zh' && uiLang !== 'cuv') return en || zh;
    return zh; // default: 'zh'
  };"""
  
        if t_func_old in content:
            content = content.replace(t_func_old, t_func_new)
            
    except Exception as e:
        print("Could not process translations:", e)

    # 2. Fix Challenge buttons
    # 2a. Random play button (around line 5174)
    old_random = """                                  setCampaignQueue(queue.slice(1));
                                  setCampaignResults([]);
                                  setActiveCampaignSetId(currentSet.id);
                                setActiveCampaignSetTotal(queue.length);
                                  setActiveVerse(queue[0]);
                                  setTimeout(() => startGame(false, queue), 50);"""
                                  
    new_random = """                                  setCampaignResults([]);
                                  setActiveCampaignSetId(currentSet.id);
                                  setActiveCampaignSetTotal(queue.length);
                                  setInitAutoStart({
                                    trigger: true,
                                    isAuto: false,
                                    verse: queue[0],
                                    campaignQueue: queue.slice(1)
                                  });"""
    content = content.replace(old_random, new_random)
    
    # 2b. Play all button (around line 5204)
    old_playall = """                                setCampaignQueue(queue.slice(1));
                                setCampaignResults([]);
                                setActiveCampaignSetId(currentSet.id);
                                setActiveCampaignSetTotal(queue.length);
                                setActiveVerse(queue[0]);
                                setTimeout(() => startGame(true, queue), 50);"""
                                
    new_playall = """                                setCampaignResults([]);
                                setActiveCampaignSetId(currentSet.id);
                                setActiveCampaignSetTotal(queue.length);
                                setInitAutoStart({
                                  trigger: true,
                                  isAuto: true,
                                  verse: queue[0],
                                  campaignQueue: queue.slice(1)
                                });"""
    content = content.replace(old_playall, new_playall)
    
    # 2c. Targetverse play button (around 6177)
    old_target = """                                        setActiveVerse(targetVerse);
                                        setTimeout(() => startGame(), 50);"""
                                        
    new_target = """                                        setInitAutoStart({
                                          trigger: true,
                                          isAuto: false,
                                          verse: targetVerse,
                                          campaignQueue: null
                                        });"""
    content = content.replace(old_target, new_target)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Fixes applied successfully!")

if __name__ == '__main__':
    apply_fixes()
