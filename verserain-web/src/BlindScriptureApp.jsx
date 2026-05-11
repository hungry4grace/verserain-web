import React, { useEffect, useMemo, useRef, useState } from 'react';

const LANG = 'zh-TW';

function speak(text, rate = 0.92) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG;
    utterance.rate = rate;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText(text) {
  return String(text || '').replace(/[^\w\u4e00-\u9fff]/g, '').toLowerCase();
}

function scoreMatch(target, heard) {
  const t = cleanText(target);
  const h = cleanText(heard);
  if (!t || !h) return 0;
  if (h.includes(t) || t.includes(h)) return Math.min(100, Math.round((Math.min(t.length, h.length) / t.length) * 100));
  let matched = 0;
  let cursor = 0;
  for (const char of t) {
    const found = h.indexOf(char, cursor);
    if (found !== -1) {
      matched += 1;
      cursor = found + 1;
    }
  }
  return Math.round((matched / t.length) * 100);
}

function pickVerses(set, count) {
  const verses = [...(set?.verses || [])];
  return verses.sort(() => 0.5 - Math.random()).slice(0, Math.min(count, verses.length));
}

export default function BlindScriptureApp() {
  const [sets, setSets] = useState([]);
  const [setId, setSetId] = useState(sets[0]?.id || '');
  const [count, setCount] = useState(3);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [screen, setScreen] = useState('home');
  const [status, setStatus] = useState('歡迎使用視障經文遊戲。');
  const [transcript, setTranscript] = useState('');
  const [accuracy, setAccuracy] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const liveRef = useRef(null);

  const selectedSet = useMemo(() => sets.find(set => set.id === setId) || sets[0], [sets, setId]);
  const currentVerse = queue[index];
  const hasSpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const announce = (message, shouldSpeak = true) => {
    setStatus(message);
    if (liveRef.current) liveRef.current.textContent = message;
    if (shouldSpeak) speak(message);
  };

  useEffect(() => {
    let mounted = true;
    import('./verses').then(module => {
      if (!mounted) return;
      const nextSets = (module.VERSE_SETS || []).filter(set => set?.verses?.length);
      setSets(nextSets);
      setSetId(current => current || nextSets[0]?.id || '');
    });
    return () => { mounted = false; };
  }, []);

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  };

  const startListening = () => {
    if (!currentVerse) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      announce('這個瀏覽器不支援語音辨識。你仍然可以使用重聽、聽答案、自己判斷答對，繼續玩。');
      return;
    }

    stopListening();
    const recognition = new SpeechRecognition();
    recognition.lang = LANG;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setAccuracy(0);
      setStatus('正在聆聽。請開始背誦。');
    };
    recognition.onresult = (event) => {
      let heard = '';
      for (let i = 0; i < event.results.length; i += 1) {
        heard += event.results[i][0].transcript;
      }
      const nextAccuracy = scoreMatch(currentVerse.text, heard);
      setTranscript(heard);
      setAccuracy(nextAccuracy);
      if (nextAccuracy >= 80) {
        stopListening();
        setCorrectCount(value => value + 1);
        announce(`答對了。相似度 ${nextAccuracy}%。按 N 進入下一節。`);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      announce('麥克風或語音辨識遇到問題。可以按 A 聽答案，或按 C 自己標記答對。');
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const introduceVerse = async (verse = currentVerse) => {
    if (!verse) return;
    stopListening();
    setTranscript('');
    setAccuracy(0);
    setStatus(`第 ${index + 1} 節，${verse.reference}。`);
    await speak(`第 ${index + 1} 節。${verse.reference}`);
    await wait(2000);
    await speak('請背誦。準備好後，按空白鍵開始聆聽。');
  };

  const startGame = async () => {
    const nextQueue = pickVerses(selectedSet, Math.max(1, parseInt(count) || 1));
    setQueue(nextQueue);
    setIndex(0);
    setCorrectCount(0);
    setScreen('playing');
    setTranscript('');
    setAccuracy(0);
    await wait(100);
    await speak(`開始。${selectedSet.title}。共 ${nextQueue.length} 節。`);
    await wait(500);
    introduceVerse(nextQueue[0]);
  };

  const nextVerse = async () => {
    stopListening();
    if (index + 1 >= queue.length) {
      setScreen('done');
      announce(`完成了。本次答對 ${correctCount} 節，共 ${queue.length} 節。願神的話豐豐富富住在你心裡。`);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setTranscript('');
    setAccuracy(0);
    await wait(100);
    introduceVerse(queue[nextIndex]);
  };

  const readHelp = () => {
    speak('操作說明。按 Enter 開始遊戲。遊戲中按空白鍵開始或停止聆聽。按 R 重聽經文出處。按 A 聽完整答案。按 C 自己標記答對。按 N 下一節。按 Escape 回首頁。');
  };

  const markCorrect = () => {
    stopListening();
    setCorrectCount(value => value + 1);
    announce('已標記答對。按 N 進入下一節。');
  };

  useEffect(() => {
    const handler = (event) => {
      const key = event.key.toLowerCase();
      if (screen === 'home') {
        if (event.key === 'Enter') startGame();
        if (key === 'h') readHelp();
        return;
      }
      if (event.key === 'Escape') {
        stopListening();
        setScreen('home');
        announce('已回到首頁。', false);
      } else if (event.key === ' ') {
        event.preventDefault();
        if (isListening) stopListening();
        else startListening();
      } else if (key === 'r') {
        introduceVerse();
      } else if (key === 'a') {
        stopListening();
        speak(`${currentVerse?.reference || ''}。${currentVerse?.text || ''}`);
      } else if (key === 'c') {
        markCorrect();
      } else if (key === 'n') {
        nextVerse();
      } else if (key === 'h') {
        readHelp();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, selectedSet, count, queue, index, currentVerse, isListening, correctCount]);

  useEffect(() => () => {
    stopListening();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const pageStyle = {
    width: '100vw',
    height: '100dvh',
    overflowY: 'auto',
    background: '#000',
    color: '#fff',
    fontFamily: '"Noto Sans TC", system-ui, sans-serif',
    padding: 'clamp(1rem, 4vw, 3rem)'
  };
  const panelStyle = {
    maxWidth: '920px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  };
  const buttonStyle = {
    width: '100%',
    border: '4px solid #facc15',
    borderRadius: '10px',
    padding: '1.2rem',
    background: '#facc15',
    color: '#000',
    fontSize: '1.35rem',
    fontWeight: 900,
    cursor: 'pointer'
  };
  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#111827',
    color: '#fff',
    borderColor: '#93c5fd'
  };

  if (!sets.length) {
    return (
      <main style={pageStyle} aria-busy="true" aria-live="polite">
        <section style={panelStyle}>
          <h1 style={{ fontSize: 'clamp(2.4rem, 8vw, 5rem)', margin: 0 }}>正在載入中文經文</h1>
          <p style={{ fontSize: '1.35rem', lineHeight: 1.8 }}>請稍候。</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle} aria-label="視障經文遊戲">
      <div ref={liveRef} aria-live="assertive" aria-atomic="true" style={{ position: 'absolute', left: '-9999px' }} />

      {screen === 'home' && (
        <section style={panelStyle}>
          <p style={{ color: '#facc15', fontWeight: 900, fontSize: '1.1rem', margin: 0 }}>VerseRain 視障版</p>
          <h1 style={{ fontSize: 'clamp(2.4rem, 8vw, 5rem)', lineHeight: 1.05, margin: 0 }}>中文經文聽背遊戲</h1>
          <p style={{ fontSize: '1.35rem', lineHeight: 1.8, color: '#e5e7eb', margin: 0 }}>
            這是一個為視障朋友預備的簡化版。沒有排行榜、沒有動畫、沒有地圖、沒有園子。只聽經文、背經文、進入下一節。
          </p>

          <label style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            選擇經文組
            <select value={setId} onChange={(e) => setSetId(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.5rem', padding: '1rem', fontSize: '1.2rem', background: '#111827', color: '#fff', border: '3px solid #facc15', borderRadius: '8px' }}>
              {sets.map(set => <option key={set.id} value={set.id}>{set.title}，{set.verses.length} 節</option>)}
            </select>
          </label>

          <label style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            本次經文數量
            <input type="number" min="1" max={selectedSet?.verses?.length || 1} value={count} onChange={(e) => setCount(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.5rem', padding: '1rem', fontSize: '1.3rem', background: '#111827', color: '#fff', border: '3px solid #facc15', borderRadius: '8px' }} />
          </label>

          <button onClick={startGame} style={buttonStyle}>開始遊戲，Enter</button>
          <button onClick={readHelp} style={secondaryButtonStyle}>聽操作說明，H</button>

          <div style={{ background: '#111827', border: '2px solid #374151', borderRadius: '10px', padding: '1rem', fontSize: '1.05rem', lineHeight: 1.8 }}>
            <strong>快捷鍵：</strong> Enter 開始。空白鍵聆聽。R 重聽出處。A 聽答案。C 標記答對。N 下一節。Esc 回首頁。
          </div>

          {!hasSpeechRecognition && (
            <div role="alert" style={{ background: '#451a03', border: '3px solid #f97316', borderRadius: '10px', padding: '1rem', fontSize: '1.1rem', lineHeight: 1.7 }}>
              你的瀏覽器可能不支援語音辨識。建議使用 Chrome。仍可用聽答案與自行標記答對來遊玩。
            </div>
          )}
        </section>
      )}

      {screen === 'playing' && currentVerse && (
        <section style={panelStyle}>
          <p style={{ color: '#facc15', fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>第 {index + 1} / {queue.length} 節</p>
          <h1 style={{ fontSize: 'clamp(2rem, 7vw, 4rem)', margin: 0 }}>{currentVerse.reference}</h1>
          <p style={{ fontSize: '1.25rem', lineHeight: 1.8, color: '#e5e7eb', margin: 0 }}>{status}</p>

          <button onClick={isListening ? stopListening : startListening} style={buttonStyle}>
            {isListening ? '停止聆聽，空白鍵' : '開始聆聽，空白鍵'}
          </button>
          <button onClick={() => introduceVerse()} style={secondaryButtonStyle}>重聽出處與提示，R</button>
          <button onClick={() => speak(`${currentVerse.reference}。${currentVerse.text}`)} style={secondaryButtonStyle}>聽完整答案，A</button>
          <button onClick={markCorrect} style={secondaryButtonStyle}>我背對了，C</button>
          <button onClick={nextVerse} style={buttonStyle}>下一節，N</button>

          <div aria-live="polite" style={{ background: '#111827', border: '2px solid #374151', borderRadius: '10px', padding: '1rem', fontSize: '1.1rem', lineHeight: 1.8 }}>
            <div>聽到的內容：{transcript || '尚未聽到'}</div>
            <div>相似度：{accuracy}%</div>
            <div>已答對：{correctCount} 節</div>
          </div>
        </section>
      )}

      {screen === 'done' && (
        <section style={panelStyle}>
          <h1 style={{ fontSize: 'clamp(2.4rem, 8vw, 5rem)', margin: 0 }}>完成了</h1>
          <p style={{ fontSize: '1.5rem', lineHeight: 1.8 }}>本次答對 {correctCount} 節，共 {queue.length} 節。</p>
          <button onClick={() => setScreen('home')} style={buttonStyle}>回首頁</button>
          <button onClick={startGame} style={secondaryButtonStyle}>再玩一次</button>
        </section>
      )}
    </main>
  );
}
