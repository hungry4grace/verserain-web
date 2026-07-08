import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import data from './data/verses.json';
import {
  loadVoices,
  chineseVoices,
  savedVoiceName,
  setSavedVoiceName,
  speak,
  stopSpeaking,
  supportsSpeech,
  supportsRecognition,
  createRecognition,
  scoreMatch,
  referenceForSpeech,
  playChime,
} from './lib/speech.js';

const SETS = data.sets;
// Prefer a short-verse topical set as the default (Proverbs ships first but is
// whole-chapter-per-entry — great for listening, impractical for memorizing).
const DEFAULT_SET_ID =
  SETS.find((s) => s.id === 'gospel-of-john')?.id ||
  SETS.find((s) => s.verses.every((v) => v.text.length <= 120))?.id ||
  SETS[0]?.id;
const STORE = {
  setId: 'vrb_setId',
  rate: 'vrb_rate',
  autoVoice: 'vrb_autoVoice',
  count: 'vrb_count',
  streak: 'vrb_streak',
};

const PASS = 80; // similarity % counted as "memorized"

const PRAISE = [
  '太好了！',
  '背得很棒！',
  '阿們，你記住了！',
  '很好，繼續加油！',
  '神的話正住在你心裡！',
];
const ENCOURAGE = [
  '沒關係，再聽一次，慢慢來。',
  '快接近了，再試一次。',
  '別灰心，多聽幾次就會了。',
];

function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}
function set(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function yesterdayStr() {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readStreak() {
  try {
    return JSON.parse(get(STORE.streak, '') || 'null') || { count: 0, lastDate: '' };
  } catch {
    return { count: 0, lastDate: '' };
  }
}

// Count today's listening/memorizing toward a daily streak. Returns new count.
function markActiveToday() {
  const s = readStreak();
  const today = todayStr();
  if (s.lastDate === today) return s.count;
  const next = { count: s.lastDate === yesterdayStr() ? s.count + 1 : 1, lastDate: today };
  set(STORE.streak, JSON.stringify(next));
  return next.count;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [setId, setSetId] = useState(() => get(STORE.setId, DEFAULT_SET_ID));
  const [rate, setRate] = useState(() => Number(get(STORE.rate, '0.92')) || 0.92);
  const [autoVoice, setAutoVoice] = useState(() => get(STORE.autoVoice, '1') !== '0');
  const [voiceName, setVoiceName] = useState(() => savedVoiceName());
  const [voices, setVoices] = useState([]);
  const [status, setStatus] = useState('歡迎使用經文雨聆聽版。');
  const [streak] = useState(() => readStreak().count);

  // Listen-mode state
  const [listenIndex, setListenIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Memorize-mode state
  const [memoCount, setMemoCount] = useState(() => Number(get(STORE.count, '3')) || 3);
  const [queue, setQueue] = useState([]);
  const [memoIndex, setMemoIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [accuracy, setAccuracy] = useState(0);

  const headingRef = useRef(null);
  const primedRef = useRef(false);
  const playTokenRef = useRef(0);
  const recognitionRef = useRef(null);
  const autoVoiceRef = useRef(autoVoice);
  const rateRef = useRef(rate);
  autoVoiceRef.current = autoVoice;
  rateRef.current = rate;

  const activeSet = useMemo(() => SETS.find((s) => s.id === setId) || SETS[0], [setId]);
  const listenVerse = activeSet?.verses[listenIndex];
  const memoVerse = queue[memoIndex];

  // ---- speech helpers ----------------------------------------------------
  const say = useCallback((text) => {
    if (!autoVoiceRef.current || !primedRef.current) return Promise.resolve();
    return speak(text, { rate: rateRef.current });
  }, []);

  const announce = useCallback(
    (text) => {
      setStatus(text);
      return say(text);
    },
    [say],
  );

  // Load TTS voices once.
  useEffect(() => {
    loadVoices().then((all) => setVoices(chineseVoices(all)));
  }, []);

  // First user gesture anywhere "primes" audio (browsers block TTS until then).
  useEffect(() => {
    if (primedRef.current) return undefined;
    const prime = () => {
      if (primedRef.current) return;
      primedRef.current = true;
      // Re-announce the current screen now that audio is allowed.
      say(status);
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, [say, status]);

  // Move focus to the heading on every screen change (screen-reader context).
  useEffect(() => {
    const id = setTimeout(() => headingRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [screen]);

  // Stop everything on unmount.
  useEffect(
    () => () => {
      stopSpeaking();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  // ---- navigation --------------------------------------------------------
  const goHome = useCallback(() => {
    playTokenRef.current += 1;
    setPlaying(false);
    setListening(false);
    stopSpeaking();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setScreen('home');
    announce('已回到首頁。請選擇每日聆聽，或背經文。');
  }, [announce]);

  // ---- LISTEN mode -------------------------------------------------------
  const startListen = useCallback(() => {
    setListenIndex(0);
    setScreen('listen');
    setPlaying(true);
    const n = markActiveToday();
    announce(
      `開始聆聽。${activeSet.title}，共 ${activeSet.verses.length} 節。你已連續聆聽 ${n} 天。`,
    );
  }, [activeSet, announce]);

  // The audio-Bible loop: speak current verse, then auto-advance while playing.
  useEffect(() => {
    if (screen !== 'listen' || !playing || !listenVerse) return undefined;
    if (!autoVoiceRef.current || !primedRef.current) return undefined;
    const token = ++playTokenRef.current;
    let cancelled = false;
    (async () => {
      const spoken = `${referenceForSpeech(listenVerse.reference)}。${listenVerse.text}`;
      setStatus(`第 ${listenIndex + 1} / ${activeSet.verses.length} 節：${listenVerse.reference}`);
      await speak(spoken, { rate: rateRef.current });
      if (cancelled || token !== playTokenRef.current) return;
      await new Promise((r) => setTimeout(r, 900));
      if (cancelled || token !== playTokenRef.current) return;
      setListenIndex((i) => (i + 1) % activeSet.verses.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [screen, playing, listenIndex, listenVerse, activeSet]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      const next = !p;
      if (next) {
        announce('繼續播放。');
      } else {
        playTokenRef.current += 1;
        stopSpeaking();
        announce('已暫停。再按一次繼續。');
      }
      return next;
    });
  }, [announce]);

  const listenStep = useCallback(
    (delta) => {
      playTokenRef.current += 1;
      stopSpeaking();
      setListenIndex((i) => {
        const len = activeSet.verses.length;
        return (i + delta + len) % len;
      });
      setPlaying(true);
    },
    [activeSet],
  );

  const repeatVerse = useCallback(() => {
    if (!listenVerse) return;
    playTokenRef.current += 1;
    stopSpeaking();
    say(`${referenceForSpeech(listenVerse.reference)}。${listenVerse.text}`).then(() => {
      // resume autoplay after a manual repeat
      setPlaying(true);
    });
  }, [listenVerse, say]);

  // ---- MEMORIZE mode -----------------------------------------------------
  const openMemoSetup = useCallback(() => {
    setScreen('memo-setup');
    announce(
      `背經文。目前經文組是 ${activeSet.title}。請選擇本次要背幾節，然後按開始。`,
    );
  }, [activeSet, announce]);

  const startMemo = useCallback(() => {
    const n = Math.min(memoCount, activeSet.verses.length);
    const q = shuffle(activeSet.verses).slice(0, n);
    setQueue(q);
    setMemoIndex(0);
    setCorrect(0);
    setHeard('');
    setAccuracy(0);
    setScreen('memo');
    markActiveToday();
  }, [memoCount, activeSet]);

  // Introduce each verse when it becomes current.
  useEffect(() => {
    if (screen !== 'memo' || !memoVerse) return;
    setHeard('');
    setAccuracy(0);
    const ref = referenceForSpeech(memoVerse.reference);
    setStatus(`第 ${memoIndex + 1} / ${queue.length} 節：${memoVerse.reference}`);
    (async () => {
      await say(`第 ${memoIndex + 1} 節。${ref}。先聽一次。`);
      await say(memoVerse.text);
      await say('準備好後，按「開始背誦」，對著麥克風背出來。');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, memoIndex, memoVerse]);

  const stopRecognition = useCallback(() => {
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const passVerse = useCallback(
    (acc) => {
      stopRecognition();
      setCorrect((c) => c + 1);
      playChime('success');
      announce(`${pick(PRAISE)} 相似度 ${acc}%。按「下一節」繼續。`);
    },
    [announce, stopRecognition],
  );

  const startRecognition = useCallback(() => {
    if (!memoVerse) return;
    if (!supportsRecognition()) {
      announce('這個瀏覽器不支援語音辨識，建議用 Chrome。你仍然可以按「聽答案」，再按「我背對了」。');
      return;
    }
    stopSpeaking();
    stopRecognition();
    const rec = createRecognition();
    rec.onstart = () => {
      setListening(true);
      setHeard('');
      setAccuracy(0);
      setStatus('正在聆聽，請開始背誦。');
    };
    rec.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i += 1) text += event.results[i][0].transcript;
      const acc = scoreMatch(memoVerse.text, text);
      setHeard(text);
      setAccuracy(acc);
      if (acc >= PASS) passVerse(acc);
    };
    rec.onerror = () => {
      setListening(false);
      announce('麥克風好像有點問題。可以按「聽答案」，或按「我背對了」。');
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [memoVerse, announce, stopRecognition, passVerse]);

  const hearAnswer = useCallback(() => {
    if (!memoVerse) return;
    stopRecognition();
    say(`${referenceForSpeech(memoVerse.reference)}。${memoVerse.text}`);
  }, [memoVerse, say, stopRecognition]);

  const markCorrect = useCallback(() => {
    stopRecognition();
    setCorrect((c) => c + 1);
    playChime('success');
    announce('已記下你背對了。按「下一節」繼續。');
  }, [announce, stopRecognition]);

  const nextMemo = useCallback(() => {
    stopRecognition();
    stopSpeaking();
    if (memoIndex + 1 >= queue.length) {
      setScreen('memo-done');
      const n = markActiveToday();
      announce(
        `完成了！本次背對 ${correct} 節，共 ${queue.length} 節。連續第 ${n} 天，願神的話豐豐富富住在你心裡。`,
      );
      return;
    }
    setMemoIndex((i) => i + 1);
  }, [memoIndex, queue.length, correct, announce, stopRecognition]);

  // ---- optional keyboard helpers (buttons remain the primary path) -------
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'BUTTON') return;
      if (screen === 'listen') {
        if (e.key === ' ') {
          e.preventDefault();
          togglePlay();
        } else if (e.key === 'ArrowRight') {
          listenStep(1);
        } else if (e.key === 'ArrowLeft') {
          listenStep(-1);
        } else if (e.key === 'Escape') {
          goHome();
        }
      } else if (screen === 'memo' && e.key === 'Escape') {
        goHome();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, togglePlay, listenStep, goHome]);

  // ---- persistence -------------------------------------------------------
  const changeSet = (id) => {
    setSetId(id);
    set(STORE.setId, id);
  };
  const changeRate = (delta) => {
    setRate((r) => {
      const next = Math.min(1.3, Math.max(0.6, Math.round((r + delta) * 100) / 100));
      set(STORE.rate, next);
      return next;
    });
  };
  const changeVoice = (name) => {
    setVoiceName(name);
    setSavedVoiceName(name);
  };
  const toggleAutoVoice = () => {
    setAutoVoice((v) => {
      const next = !v;
      set(STORE.autoVoice, next ? '1' : '0');
      return next;
    });
  };
  const changeCount = (delta) => {
    setMemoCount((c) => {
      const max = activeSet.verses.length;
      const next = Math.min(max, Math.max(1, c + delta));
      set(STORE.count, next);
      return next;
    });
  };

  const rateLabel = rate <= 0.75 ? '慢' : rate >= 1.05 ? '快' : '正常';

  // ---- render ------------------------------------------------------------
  return (
    <main className="app" aria-label="經文雨聆聽版">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status}
      </div>

      {screen === 'home' && (
        <>
          <p className="eyebrow">VerseRain 聆聽版</p>
          <h1 ref={headingRef} tabIndex={-1}>
            經文雨・聽聖經
          </h1>
          <p className="lede">
            為看不見、或看不清楚的朋友預備。每天聽聖經、背聖經。
            {streak > 0 ? `你已連續 ${streak} 天。` : ''}
          </p>
          <div className="stack">
            <button className="btn huge" onClick={startListen}>
              每日聆聽
              <span className="hint">聽今天的聖經</span>
            </button>
            <button className="btn huge secondary" onClick={openMemoSetup}>
              背經文
              <span className="hint">聽一次，然後自己背</span>
            </button>
            <button className="btn ghost" onClick={() => { setScreen('settings'); announce('設定。可以選經文組、語音、和速度。'); }}>
              設定（經文組・語音・速度）
            </button>
            <div className="status" aria-hidden="true">
              目前經文組：{activeSet.title}（{activeSet.verses.length} 節）
            </div>
          </div>
        </>
      )}

      {screen === 'listen' && listenVerse && (
        <>
          <p className="eyebrow">每日聆聽</p>
          <h1 ref={headingRef} tabIndex={-1} style={{ fontSize: 'clamp(1.6rem,6vw,2.4rem)' }}>
            {activeSet.title}
          </h1>
          <p className="meta">
            第 {listenIndex + 1} / {activeSet.verses.length} 節
          </p>
          <div className="verse-card">
            <p className="verse-ref">{listenVerse.reference}</p>
            <p className="verse-text">{listenVerse.text}</p>
          </div>
          <div className="stack" style={{ marginTop: '1rem' }}>
            <button
              className={`btn huge ${playing ? 'pulse' : ''}`}
              aria-pressed={playing}
              onClick={togglePlay}
            >
              {playing ? '暫停' : '繼續播放'}
              <span className="hint">空白鍵</span>
            </button>
            <div className="row">
              <button className="btn secondary" onClick={() => listenStep(-1)}>
                上一節
              </button>
              <button className="btn secondary" onClick={() => listenStep(1)}>
                下一節
              </button>
            </div>
            <button className="btn secondary" onClick={repeatVerse}>
              重複這一節
            </button>
            <button className="btn ghost" onClick={goHome}>
              回首頁
            </button>
          </div>
        </>
      )}

      {screen === 'memo-setup' && (
        <>
          <p className="eyebrow">背經文</p>
          <h1 ref={headingRef} tabIndex={-1}>
            準備背誦
          </h1>
          <p className="lede">經文組：{activeSet.title}。本次要背幾節？</p>
          <div className="stack">
            <div role="group" aria-label="本次背誦節數">
              <span className="field" style={{ marginBottom: 0 }}>
                本次節數
              </span>
              <div className="stepper">
                <button onClick={() => changeCount(-1)} aria-label="減少一節">
                  −
                </button>
                <div className="value" aria-live="polite">
                  {Math.min(memoCount, activeSet.verses.length)}
                </div>
                <button onClick={() => changeCount(1)} aria-label="增加一節">
                  ＋
                </button>
              </div>
            </div>
            <button className="btn huge" onClick={startMemo}>
              開始背誦
            </button>
            {!supportsRecognition() && (
              <div className="alert" role="alert">
                你的瀏覽器可能不支援麥克風語音辨識（建議用 Chrome）。仍然可以「聽答案」後，自己按「我背對了」。
              </div>
            )}
            <button className="btn ghost" onClick={goHome}>
              回首頁
            </button>
          </div>
        </>
      )}

      {screen === 'memo' && memoVerse && (
        <>
          <p className="eyebrow">背經文</p>
          <h1 ref={headingRef} tabIndex={-1} aria-label={referenceForSpeech(memoVerse.reference)}>
            {memoVerse.reference}
          </h1>
          <p className="meta">
            第 {memoIndex + 1} / {queue.length} 節・已背對 {correct} 節
          </p>
          <p className="status" aria-hidden="true">
            {status}
          </p>
          <div className="stack" style={{ marginTop: '0.5rem' }}>
            <button
              className={`btn huge ${listening ? 'pulse' : ''}`}
              aria-pressed={listening}
              onClick={listening ? stopRecognition : startRecognition}
            >
              {listening ? '停止聆聽' : '開始背誦（錄音）'}
            </button>
            <div className="row">
              <button className="btn secondary" onClick={hearAnswer}>
                聽答案
              </button>
              <button className="btn secondary" onClick={markCorrect}>
                我背對了
              </button>
            </div>
            <button className="btn" onClick={nextMemo}>
              下一節
            </button>
            <div className="status" aria-live="polite">
              聽到：{heard || '尚未聽到'}　｜　相似度 {accuracy}%
            </div>
            <button className="btn ghost" onClick={goHome}>
              回首頁
            </button>
          </div>
        </>
      )}

      {screen === 'memo-done' && (
        <>
          <p className="eyebrow">背經文</p>
          <h1 ref={headingRef} tabIndex={-1}>
            完成了
          </h1>
          <p className="lede">
            本次背對 {correct} 節，共 {queue.length} 節。願神的話豐豐富富住在你心裡。
          </p>
          <div className="stack">
            <button className="btn huge" onClick={startMemo}>
              再背一次
            </button>
            <button className="btn secondary" onClick={openMemoSetup}>
              換節數
            </button>
            <button className="btn ghost" onClick={goHome}>
              回首頁
            </button>
          </div>
        </>
      )}

      {screen === 'settings' && (
        <>
          <p className="eyebrow">設定</p>
          <h1 ref={headingRef} tabIndex={-1}>
            設定
          </h1>
          <div className="stack">
            <label className="field">
              經文組
              <select
                className="control"
                value={setId}
                onChange={(e) => changeSet(e.target.value)}
              >
                {SETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}（{s.verses.length} 節）
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              朗讀語音
              <select
                className="control"
                value={voiceName}
                onChange={(e) => changeVoice(e.target.value)}
              >
                <option value="">系統預設</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}（{v.lang}）
                  </option>
                ))}
              </select>
            </label>

            <div role="group" aria-label="朗讀速度">
              <span className="field" style={{ marginBottom: 0 }}>
                朗讀速度：{rateLabel}
              </span>
              <div className="stepper">
                <button onClick={() => changeRate(-0.1)} aria-label="放慢">
                  慢
                </button>
                <div className="value">{rate.toFixed(2)}×</div>
                <button onClick={() => changeRate(0.1)} aria-label="加快">
                  快
                </button>
              </div>
            </div>

            <button
              className="btn secondary"
              onClick={() => {
                primedRef.current = true;
                speak(
                  `這是試聽。${referenceForSpeech(activeSet.verses[0].reference)}。${activeSet.verses[0].text}`,
                  { rate },
                );
              }}
            >
              試聽
            </button>

            <button
              className="toggle"
              aria-pressed={autoVoice}
              onClick={toggleAutoVoice}
            >
              <span>自動朗讀</span>
              <span className="state">{autoVoice ? '開' : '關'}</span>
            </button>
            <div className="note">
              如果你已經開啟手機的「旁白 / VoiceOver」或「TalkBack」螢幕報讀，建議把「自動朗讀」關掉，避免兩個聲音重疊。
              {!supportsSpeech() && '（這個瀏覽器似乎不支援朗讀。）'}
            </div>

            <button className="btn ghost" onClick={goHome}>
              回首頁
            </button>
          </div>
        </>
      )}
    </main>
  );
}
