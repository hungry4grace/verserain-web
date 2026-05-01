import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, RotateCcw, Heart, Zap, Trophy, Crown, Star, Home, XCircle, Headphones, Music, VolumeX, Search, Share2, Dices, Mic, MicOff, Users, CloudRain, Info, Edit } from 'lucide-react';
import confetti from 'canvas-confetti';
import usePartySocket from 'partysocket/react';
import PartySocket from 'partysocket';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import './index.css';
import { BIBLE_BOOKS, getBookAbbr } from './bibleDictionary';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { PREMIUM_EMAILS } from './premiumEmails';
import WorldMap from './WorldMap';
import BlindModeGame from './BlindModeGame';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

let audioCtx = null;

const ROOM_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const SKOOL_LEVELS = [
  { level: 1, title: '互惠種子', enTitle: 'Mutuality Seed', points: 0 },
  { level: 2, title: '探索學員', enTitle: 'Exploring Learner', points: 2 },
  { level: 3, title: '共識實踐者', enTitle: 'Consensus Practitioner', points: 20 },
  { level: 4, title: '價值貢獻者', enTitle: 'Value Contributor', points: 65 },
  { level: 5, title: '生態連結者', enTitle: 'Eco Connector', points: 155 },
  { level: 6, title: '方田開拓者', enTitle: 'Field Pioneer', points: 515 },
  { level: 7, title: '互惠建設者', enTitle: 'Mutuality Builder', points: 2015 },
  { level: 8, title: '推廣大使', enTitle: 'Ambassador', points: 8015 },
  { level: 9, title: '生態系架構師', enTitle: 'Ecosystem Architect', points: 33015 },
];

function getSkoolLevel(points) {
  for (let i = SKOOL_LEVELS.length - 1; i >= 0; i--) {
    if (points >= SKOOL_LEVELS[i].points) {
      return {
        level: SKOOL_LEVELS[i].level,
        title: SKOOL_LEVELS[i].title,
        enTitle: SKOOL_LEVELS[i].enTitle,
        next: i < SKOOL_LEVELS.length - 1 ? SKOOL_LEVELS[i + 1].points : null
      };
    }
  }
  return { level: 1, title: '互惠種子', enTitle: 'Mutuality Seed', next: 2 };
}

function getRoomColor(roomId) {
  if (!roomId) return null;
  let hash = 0;
  for (const c of roomId) hash = (hash * 31 + c.charCodeAt(0)) % ROOM_COLORS.length;
  return ROOM_COLORS[hash];
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  // iOS Safari requires SpeechSynthesis to be touched directly in user event
  if ('speechSynthesis' in window && !window.__speechUnlocked) {
    const dummy = new SpeechSynthesisUtterance(' ');
    dummy.volume = 0;
    dummy.rate = 2; // finish fast
    window.speechSynthesis.speak(dummy);
    window.__speechUnlocked = true;
  }
}

function speakText(text, rate = 1.0, lang = 'zh-TW') {
  return new Promise(resolve => {
    if ('speechSynthesis' in window) {
      // Only cancel if something is actually speaking/pending — blind cancel() corrupts iOS audio
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;

      // Use user's preferred voice if set
      try {
        const savedVoiceName = localStorage.getItem('verseRain_voiceName');
        if (savedVoiceName) {
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(v => v.name === savedVoiceName);
          if (preferred) utterance.voice = preferred;
        }
      } catch (e) { /* localStorage unavailable */ }

      // Chrome GC bug workaround: keep a global reference to the utterance
      // so the garbage collector doesn't reap it before the audio finishes.
      window.__speech_utterances = window.__speech_utterances || [];
      window.__speech_utterances.push(utterance);

      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          utterance.onend = null;
          utterance.onerror = null;
          const idx = window.__speech_utterances.indexOf(utterance);
          if (idx !== -1) window.__speech_utterances.splice(idx, 1);
          resolve();
        }
      };

      utterance.onend = safeResolve;
      utterance.onerror = safeResolve;

      // Safety fallback — scale with text length but cap reasonably
      const timeoutMs = Math.max(3000, Math.min(text.length * 300, 15000));
      setTimeout(safeResolve, timeoutMs);

      // Small delay to let iOS audio session settle after cancel(), then speak
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    } else {
      resolve();
    }
  });
}

function playShuffleSound() {
  initAudio();
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    }, i * 35);
  }
}

function playBong() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(250, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

function playThunder(type = 'light') {
  initAudio();
  const isHeavy = type === 'heavy';
  const duration = isHeavy ? 4.0 : 1.5;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate brown noise
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = data[i];
    data[i] *= 4.0;
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(isHeavy ? 300 : 500, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + duration);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(isHeavy ? 1.5 : 0.6, audioCtx.currentTime + 0.1);
  if (isHeavy) {
    gain.gain.setValueAtTime(1.5, audioCtx.currentTime + 0.3);
    gain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(1.2, audioCtx.currentTime + 0.7);
  }
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noiseSource.start();
}

function playTada() {
  initAudio();
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 Arpeggio
  let startTime = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, startTime + i * 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + i * 0.15 + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.15 + 0.6);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(startTime + i * 0.15);
    osc.stop(startTime + i * 0.15 + 0.6);
  });
}

function playFireworksSound() {
  initAudio();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(Math.random() * 200 + 100, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.5);
}

import { loadLanguageSets } from './verseLoader';
import { getRandomFakePhrase } from './fakeLogic';

const Tooltip = ({ text, children }) => (
  <div className="fancy-tooltip-container">
    {children}
    <div className="fancy-tooltip-text">{text}</div>
  </div>
);

const findVerseByRef = (allVerses, ref) => {
  let target = allVerses.find(v => v.reference === ref);
  if (!target && ref) {
    const refTrim = ref.replace(/\s+/g, '');
    target = allVerses.find(v => v.reference.replace(/\s+/g, '') === refTrim);

    if (!target && refTrim.includes(':')) {
      const match = refTrim.match(/^(.*?)(\d+:\d+(-\d+)?)$/);
      if (match) {
        const bookStr = match[1];
        const cvStr = match[2];
        const bookObj = BIBLE_BOOKS.find(b =>
          b.names.includes(bookStr) || b.ja === bookStr || b.ko === bookStr || (b.names[3] === bookStr)
        );
        target = allVerses.find(v => {
          const vTrim = v.reference.replace(/\s+/g, '');
          if (!vTrim.endsWith(cvStr)) return false;
          const vBookStr = vTrim.replace(cvStr, '');
          if (bookObj) {
            return bookObj.names.includes(vBookStr) || bookObj.ja === vBookStr || bookObj.ko === vBookStr || (bookObj.names[3] === vBookStr);
          }
          return vTrim[0] === bookStr[0];
        });
      }
    }
  }
  return target;
};
const CHINESE_BOOK_MAP = {
  '創': '創世記', '出': '出埃及記', '利': '利未記', '民': '民數記', '申': '申命記',
  '書': '約書亞記', '士': '士師記', '得': '路得記', '撒上': '撒母耳記上', '撒下': '撒母耳記下',
  '王上': '列王紀上', '王下': '列王紀下', '代上': '歷代志上', '代下': '歷代志下',
  '拉': '以斯拉記', '尼': '尼希米記', '斯': '以斯帖記', '伯': '約伯記', '詩': '詩篇',
  '箴': '箴言', '傳': '傳道書', '歌': '雅歌', '賽': '以賽亞書', '耶': '耶利米書',
  '哀': '耶利米哀歌', '結': '以西結書', '但': '但以理書', '何': '何西阿書', '珥': '約珥書',
  '摩': '阿摩司書', '俄': '俄巴底亞書', '拿': '約拿書', '彌': '彌迦書', '鴻': '那鴻書',
  '哈': '哈巴谷書', '番': '西番雅書', '該': '哈該書', '亞': '撒迦利亞書', '瑪': '瑪拉基書',
  '太': '馬太福音', '可': '馬可福音', '路': '路加福音', '約': '約翰福音', '徒': '使徒行傳',
  '羅': '羅馬書', '林前': '哥林多前書', '林後': '哥林多後書', '加': '加拉太書', '弗': '以弗所書',
  '腓': '腓立比書', '西': '歌羅西書', '帖前': '帖撒羅尼迦前書', '帖後': '帖撒羅尼迦後書',
  '提前': '提摩太前書', '提後': '提摩太後書', '多': '提多書', '門': '腓利門書', '來': '希伯來書',
  '雅': '雅各書', '彼前': '彼得前書', '彼後': '彼得後書', '約一': '約翰一書', '約二': '約翰二書',
  '約三': '約翰三書', '猶': '猶大書', '啟': '啟示錄'
};

function formatVerseReferenceForDisplay(ref, version) {
  if (version !== 'cuv' && version !== 'zh') return ref;
  const match = ref.match(/(.+?)\s*(\d+)(?:\s*:\s*([\d,\s\-–]+))?/);
  if (!match) return ref;
  const book = match[1].trim();
  const chapter = match[2];
  const verses = match[3];
  const fullBookName = CHINESE_BOOK_MAP[book] || book;
  const chapterSuffix = fullBookName === '詩篇' ? '篇' : '章';

  if (verses) {
    return `${fullBookName} ${chapter}:${verses}`;
  } else {
    return `${fullBookName} ${chapter}${chapterSuffix}`;
  }
}

function formatVerseReferenceForSpeech(ref, version) {
  const match = ref.match(/(.+?)\s*(\d+)(?:\s*:\s*([\d,\s\-–]+))?/);
  if (!match) return ref;
  const book = match[1].trim();
  const chapter = match[2];
  const verses = match[3];

  if (version === 'kjv') {
    if (!verses) return `${book} chapter ${chapter}`;
    const versesStr = verses.replace(/-/g, ' to ').replace(/–/g, ' to ').trim();
    const isPlural = versesStr.includes('to') || versesStr.includes(',');
    return `${book} chapter ${chapter}, verse${isPlural ? 's' : ''} ${versesStr}`;
  } else if (version === 'ko') {
    if (!verses) return `${book} ${chapter}장`;
    const versesStr = verses.replace(/-/g, '에서 ').replace(/–/g, '에서 ').trim();
    return `${book} ${chapter}장 ${versesStr}절`;
  } else if (version === 'ja') {
    if (!verses) return `${book} 第${chapter}章`;
    const versesStr = verses.replace(/-/g, 'から ').replace(/–/g, 'から ').trim();
    return `${book} 第${chapter}章 ${versesStr}節`;
  } else if (version === 'fa') {
    if (!verses) return `${book} فصل ${chapter}`;
    const versesStr = verses.replace(/-/g, ' تا ').replace(/–/g, ' تا ').trim();
    return `${book} فصل ${chapter} آیه ${versesStr}`;
  } else if (version === 'he') {
    if (!verses) return `${book} פרק ${chapter}`;
    const versesStr = verses.replace(/-/g, ' עד ').replace(/–/g, ' עד ').trim();
    return `${book} פרק ${chapter} פסוק ${versesStr}`;
  } else {
    // Chinese (cuv, default)
    const fullBookName = CHINESE_BOOK_MAP[book] || book;
    const chapterSuffix = fullBookName === '詩篇' ? '篇' : '章';

    if (!verses) {
      return `${fullBookName} ${chapter}${chapterSuffix}`;
    }

    const versesStr = verses.replace(/-/g, '至').replace(/–/g, '至').trim();
    return `${fullBookName} ${chapter}${chapterSuffix}${versesStr}節`;
  }
}

const parseVerseRef = (v) => {
  if (v.book && v.verseInput) return v;
  if (!v.reference) return v;
  for (const book of BIBLE_BOOKS) {
    const allNames = [...(book.names || []), book.ja, book.ko].filter(Boolean);
    for (const name of allNames) {
      if (v.reference.startsWith(name)) {
        return {
          ...v,
          book: book.id,
          verseInput: v.reference.slice(name.length).trim()
        };
      }
    }
  }
  return v;
};

// --- Activity Heatmap Component ---
const ActivityHeatmap = ({ t }) => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const mockData = [];
    const today = new Date();
    // Generate 365 days of mock data
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      let val = 0;
      const rand = Math.random();
      // More recent activity has higher chance
      if (i > 30) {
         if (rand > 0.8) val = 1;
         if (rand > 0.95) val = 2;
      } else {
         if (rand > 0.4) val = 1;
         if (rand > 0.8) val = 2;
      }
      mockData.push({ date: d, value: val });
    }
    setData(mockData);
  }, []);

  const weeks = [];
  let currentWeek = [];
  data.forEach((day) => {
    // 0 = Sunday, 1 = Monday ... 6 = Saturday
    // Adjusting to start week on Monday
    const isMonday = day.date.getDay() === 1;
    if (isMonday && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Ensure first week is padded if it doesn't start on Monday
  if (weeks.length > 0 && weeks[0].length < 7) {
    const padCount = 7 - weeks[0].length;
    const pad = Array(padCount).fill(null);
    weeks[0] = [...pad, ...weeks[0]];
  }

  const getColor = (val) => {
    if (val === 0) return '#334155'; // Empty (Dark gray)
    if (val === 1) return '#4ade80'; // Active (Light green)
    if (val === 2) return '#15803d'; // High score (Dark green)
    return '#334155';
  };

  const getMonthLabels = () => {
    const labels = [];
    let currentMonth = -1;
    weeks.forEach((week, index) => {
      const firstValidDay = week.find(d => d !== null);
      if (firstValidDay) {
        const month = firstValidDay.date.getMonth();
        if (month !== currentMonth) {
          labels.push({ text: firstValidDay.date.toLocaleString('en-US', { month: 'short' }), index });
          currentMonth = month;
        }
      }
    });
    return labels;
  };

  const monthLabels = getMonthLabels();

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '1rem', fontWeight: 'bold' }}>{t("活動", "Activity")}</h3>
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ position: 'relative', height: '15px', marginBottom: '4px' }}>
          {monthLabels.map((lbl, i) => (
            <span key={i} style={{ position: 'absolute', left: `${(lbl.index * 16) + 30}px`, fontSize: '0.75rem', color: '#94a3b8' }}>
              {lbl.text}
            </span>
          ))}
        </div>
        <div style={{ display: 'inline-flex', gap: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', paddingRight: '8px', height: '108px', paddingTop: '4px' }}>
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
            <span>Sun</span>
          </div>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {week.map((day, dIdx) => {
                if (!day) return <div key={dIdx} style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'transparent' }} />;
                return (
                  <div 
                    key={dIdx} 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '2px', 
                      background: getColor(day.value) 
                    }} 
                    title={`${day.date.toLocaleDateString()}: ${day.value === 2 ? 'New High Score' : day.value === 1 ? 'Active' : 'No Activity'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.8rem' }}>
        <span style={{ cursor: 'pointer' }}>What is this?</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Less</span>
          <div style={{ width: '12px', height: '12px', background: '#334155', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', background: '#4ade80', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', background: '#15803d', borderRadius: '2px' }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [loadedLangs, setLoadedLangs] = useState({});
  const [isLangsLoading, setIsLangsLoading] = useState(true);

  const [version, setVersion] = useState(() => localStorage.getItem('verseRain_version') || 'cuv');
  useEffect(() => {
    localStorage.setItem('verseRain_version', version);
  }, [version]);

  useEffect(() => {
    let mounted = true;
    if (!loadedLangs[version]) {
      setIsLangsLoading(true);
      loadLanguageSets(version).then(data => {
        if (mounted) {
          setLoadedLangs(prev => ({ ...prev, [version]: data }));
          setIsLangsLoading(false);
        }
      });
    } else {
      setIsLangsLoading(false);
    }
    return () => { mounted = false; };
  }, [version]);

  const VERSES_CUV = loadedLangs['cuv']?.verses || [];
  const VERSES_KJV = loadedLangs['kjv']?.verses || [];
  const VERSES_JA = loadedLangs['ja']?.verses || [];
  const VERSES_KO = loadedLangs['ko']?.verses || [];
  const VERSES_FA = loadedLangs['fa']?.verses || [];
  const VERSES_HE = loadedLangs['he']?.verses || [];
  const VERSES_ES = loadedLangs['es']?.verses || [];
  const VERSES_TR = loadedLangs['tr']?.verses || [];
  const VERSES_DE = loadedLangs['de']?.verses || [];
  const VERSES_MY = loadedLangs['my']?.verses || [];


  const [playMode, setPlayMode] = useState('square_solo');
  const [distractionLevel, setDistractionLevel] = useState(0);
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem('verseRainPerformanceMode') === 'true');
  const [selectedSetId, setSelectedSetId] = useState(null);

  const [isPremium, setIsPremium] = useState(() => {
    const storedPremium = localStorage.getItem('verserain_is_premium') === 'true';
    const storedEmail = localStorage.getItem('verserain_player_email') || "";
    return storedPremium || PREMIUM_EMAILS.includes(storedEmail.toLowerCase());
  });
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('verserain_player_email') || "");
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('verserain_player_name') || "");
  // Unique random personal invite code (never changes, not linked to nickname)
  const [personalCode] = useState(() => {
    let code = localStorage.getItem('verserain_personal_code');
    if (!code) {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      code = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      localStorage.setItem('verserain_personal_code', code);
    }
    return code;
  });
  const playerNameRef = useRef(playerName);

  // UI Language — independent of Bible version for scalable i18n
  const [uiLang, setUiLang] = useState(() => {
    const stored = localStorage.getItem('verseRain_uiLang');
    if (stored) return stored;
    // Backwards-compatible: derive from Bible version on first load
    const bv = localStorage.getItem('verseRain_version') || 'cuv';
    if (bv === 'kjv') return 'en';
    if (bv === 'ja') return 'ja';
    if (bv === 'ko') return 'ko';
    return 'zh';
  });
  const setUiLangPersisted = (lang) => {
    localStorage.setItem('verseRain_uiLang', lang);
    setUiLang(lang);
  };
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  // On login: fetch garden from backend and merge with localStorage
  // This ensures data is not lost when using different browsers (e.g. LINE in-app browser)
  useEffect(() => {
    if (!playerName) return;
    const localGd = JSON.parse(localStorage.getItem('verseRain_gardenData') || '{}');
    fetch(`https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/garden?player=${encodeURIComponent(playerName)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const remoteGd = (data && data.gardenData && typeof data.gardenData === 'object') ? data.gardenData : {};
        // Merge: take all keys from both, keep the entry with the higher stage/fruits
        const merged = { ...remoteGd };
        Object.entries(localGd).forEach(([ref, localEntry]) => {
          if (!merged[ref]) {
            merged[ref] = localEntry;
          } else {
            // Keep higher stage and higher fruits
            merged[ref] = {
              ...merged[ref],
              stage: Math.max(merged[ref].stage || 0, localEntry.stage || 0),
              fruits: Math.max(merged[ref].fruits || 0, localEntry.fruits || 0),
            };
          }
        });
        const mergedCount = Object.keys(merged).length;
        const localCount = Object.keys(localGd).length;
        const remoteCount = Object.keys(remoteGd).length;
        if (mergedCount > 0) {
          localStorage.setItem('verseRain_gardenData', JSON.stringify(merged));
          setGardenData(merged);
          // If merged has more data than what was on the server, push the update back
          if (mergedCount > remoteCount) {
            fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/save-garden', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerName, gardenData: merged })
            }).catch(() => { });
          }
        } else if (localCount > 0) {
          // Local has data but remote is empty — push local up
          fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/save-garden', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, gardenData: localGd })
          }).catch(() => { });
        }
      })
      .catch(() => {
        // Network error — fall back to local only, and try to push it up
        if (Object.keys(localGd).length > 0) {
          fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/save-garden', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, gardenData: localGd })
          }).catch(() => { });
        }
      });
  }, [playerName]);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState(null); // { name, password }
  const [customVerseSets, setCustomVerseSets] = useState(() => {
    try {
      const saved = localStorage.getItem('verseRain_custom_sets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [editingCustomSet, setEditingCustomSet] = useState(null);
  const [bookPickerIdx, setBookPickerIdx] = useState(null); // which verse row has the book picker open

  const [publishedVerseSets, setPublishedVerseSets] = useState([]);
  const [viewCounts, setViewCounts] = useState({});

  const [versesetsPage, setVersesetsPage] = useState(1);
  const [versesetsSort, setVersesetsSort] = useState('popular'); // 'popular' | 'newest'
  const [searchSetsPage, setSearchSetsPage] = useState(1);
  const [searchVersesPage, setSearchVersesPage] = useState(1);



  // Local Leaderboard tracking (to be migrated to PartyKit on next deployment)
  const [globalUserStats, setGlobalUserStats] = useState(() => {
    let prev;
    try { prev = JSON.parse(localStorage.getItem('verseRain_globalUserStats')) || {}; } catch { prev = {}; }
    if (!prev.alltime) prev = { alltime: prev, daily: {}, monthly: {}, dateInfo: '', monthInfo: '' };
    return prev;
  });
  const [globalVerseStats, setGlobalVerseStats] = useState(() => {
    let prev;
    try { prev = JSON.parse(localStorage.getItem('verseRain_globalVerseStats')) || {}; } catch { prev = {}; }
    if (!prev.alltime) prev = { alltime: prev, daily: {}, monthly: {}, dateInfo: '', monthInfo: '' };
    return prev;
  });

  // Garden data: keyed by verseRef, each slot has { gridIndex, stage (1-10), fruits, setId }
  const [gardenData, setGardenData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('verseRain_gardenData')) || {}; } catch { return {}; }
  });

  const [creatorPoints, setCreatorPoints] = useState(0);
  const [creatorOnlyPoints, setCreatorOnlyPoints] = useState(0);
  const [referralOnlyPoints, setReferralOnlyPoints] = useState(0);
  const [creatorHistory, setCreatorHistory] = useState([]);
  const [referralHistory, setReferralHistory] = useState([]);
  const [referralHistoryPage, setReferralHistoryPage] = useState(1);
  const [creatorHistoryPage, setCreatorHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 5;

  useEffect(() => {
    if (playerName) {
      // Fetch verse authoring points (by playerName) + referral points (by personalCode)
      Promise.all([
        fetch(`/api/get-creator-points?author=${encodeURIComponent(playerName)}&history=true`).then(r => r.json()),
        (personalCode && personalCode !== playerName)
          ? fetch(`/api/get-creator-points?author=${encodeURIComponent(personalCode)}&history=true`).then(r => r.json())
          : Promise.resolve(null)
      ]).then(([d, dCode]) => {
        const totalCreatorPts = (d?.points || 0) + (dCode?.points || 0);
        const totalRefPts = (d?.referralPoints || 0) + (dCode?.referralPoints || 0);
        setCreatorOnlyPoints(totalCreatorPts);
        setReferralOnlyPoints(totalRefPts);
        setCreatorPoints(totalCreatorPts + totalRefPts);
        
        const mergedCreatorHist = [...(d?.creatorHistory || []), ...(dCode?.creatorHistory || [])];
        mergedCreatorHist.sort((a, b) => b.timestamp - a.timestamp);
        setCreatorHistory(mergedCreatorHist);
        
        const mergedRefHist = [...(d?.referralHistory || []), ...(dCode?.referralHistory || [])];
        mergedRefHist.sort((a, b) => b.timestamp - a.timestamp);
        setReferralHistory(mergedRefHist);
      }).catch(e => console.error(e));
    }
  }, [playerName, personalCode]);

  const localFruits = React.useMemo(() => Object.values(gardenData || {}).reduce((sum, curr) => sum + (curr.fruits || 0), 0), [gardenData]);
  const totalFruits = localFruits + creatorPoints;
  const skoolLevel = React.useMemo(() => getSkoolLevel(totalFruits), [totalFruits]);
  const hasPremiumAccess = isPremium || skoolLevel.level >= 3;
  const isAdmin = ['samhsiung@gmail.com', 'davidhwang1125@gmail.com', 'hsiungsam@gmail.com', 'hungry4grace@gmail.com'].includes(userEmail.toLowerCase()) || skoolLevel.level >= 5;
  const [selectedGardenCell, setSelectedGardenCell] = useState(null);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [showFruitInfo, setShowFruitInfo] = useState(false);
  const [levelCounts, setLevelCounts] = useState(null);
  const [globalFruitsMap, setGlobalFruitsMap] = useState({});
  const [viewingPlayerGarden, setViewingPlayerGarden] = useState(null); // { playerName, gardenData } or null
  const [guestChallengeMode, setGuestChallengeMode] = useState('square');
  const [guestChallengeLevel, setGuestChallengeLevel] = useState(0);
  const [guestGardenCell, setGuestGardenCell] = useState(null);
  const guestGardenClickTimer = useRef(null);

  useEffect(() => {
    if (!showLevelInfo) return;
    // Fetch fresh data every time the modal opens
    Promise.all([
      fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/all-gardens')
        .then(r => r.ok ? r.json() : { fruitsMap: {} }).catch(() => ({ fruitsMap: {} })),
      fetch('/api/get-all-scores')
        .then(r => r.ok ? r.json() : { bonusFruitsMap: {} }).catch(() => ({ bonusFruitsMap: {} }))
    ]).then(([gardensData, scoresData]) => {
      const fruitsMap = (gardensData && gardensData.fruitsMap) || {};
      const bMap = (scoresData && scoresData.bonusFruitsMap) || {};
      setGlobalFruitsMap(fruitsMap);

      const allPlayerNames = new Set([
        ...Object.keys(fruitsMap),
        ...Object.keys(bMap)
      ]);

      const counts = {};
      let total = 0;
      if (allPlayerNames.size === 0) {
        counts[skoolLevel.level] = 1;
        total = 1;
      } else {
        allPlayerNames.forEach(name => {
          const gardenF = fruitsMap[name] || 0;
          const creatorF = (bMap[name] && bMap[name].creatorPoints) || 0;
          const trueFruits = gardenF + creatorF;
          const lvl = getSkoolLevel(trueFruits).level;
          counts[lvl] = (counts[lvl] || 0) + 1;
        });
        if (playerName && !allPlayerNames.has(playerName)) {
          counts[skoolLevel.level] = (counts[skoolLevel.level] || 0) + 1;
        }
        total = Object.values(counts).reduce((a, b) => a + b, 0);
      }
      counts._total = total;
      setLevelCounts(counts);
    }).catch(err => console.error('Could not fetch level stats', err));
  }, [showLevelInfo, skoolLevel.level, playerName]);
  const gardenClickTimer = useRef(null);
  const versionBeforeChallenge = useRef(null); // saved version to restore after cross-lang challenge
  const updateGarden = React.useCallback((ref, type, setId, amount = 1) => {
    setGardenData(prev => {
      const updated = { ...prev };
      if (!updated[ref]) {
        const used = new Set(Object.values(updated).map(v => v.gridIndex));
        let idx = 0;
        while (used.has(idx)) idx++;
        updated[ref] = { gridIndex: idx, stage: 1, fruits: 0, setId: setId || null };
      } else if (type === 'played' && updated[ref].stage < 9) {
        updated[ref] = { ...updated[ref], stage: updated[ref].stage + 1 };
      } else if (type === 'completed') {
        updated[ref] = { ...updated[ref], stage: 10 };
      } else if (type === 'champ') {
        updated[ref] = { ...updated[ref], stage: 10, fruits: Math.min((updated[ref].fruits || 0) + amount, 9) };
      }
      localStorage.setItem('verseRain_gardenData', JSON.stringify(updated));
      // Sync to backend if logged in
      const pn = playerNameRef.current;
      if (pn) {
        fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/save-garden', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: pn, gardenData: updated })
        }).catch(() => { });
      }
      return updated;
    });
  }, []);

  const logEvent = (type, args) => {
    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7);

    const updateStats = (prev, idKey, field, amount) => {
      let updated = { ...prev };
      if (updated.dateInfo !== today) {
        updated.dateInfo = today;
        updated.daily = {};
      }
      if (updated.monthInfo !== month) {
        updated.monthInfo = month;
        updated.monthly = {};
      }
      if (!updated.alltime) updated.alltime = {};
      if (!updated.daily) updated.daily = {};
      if (!updated.monthly) updated.monthly = {};

      ['alltime', 'monthly', 'daily'].forEach(period => {
        if (!updated[period][idKey]) updated[period][idKey] = { champs: 0, completes: 0, plays: 0 };
        updated[period][idKey][field] = (updated[period][idKey][field] || 0) + amount;
      });
      return updated;
    };

    if (type === 'versePlayed') {
      const { ref, setId } = args;
      setGlobalVerseStats(prev => {
        const updated = updateStats(prev, ref, 'plays', 1);
        localStorage.setItem('verseRain_globalVerseStats', JSON.stringify(updated));
        return updated;
      });
      fetch('/api/submit-verse-stat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, type: 'plays' }) }).catch(() => { });
      updateGarden(ref, 'played', setId);
    }
    if (type === 'verseCompleted') {
      const { ref, name, isChamp, setId, amount } = args;
      setGlobalVerseStats(prev => {
        const updated = updateStats(prev, ref, 'completes', 1);
        localStorage.setItem('verseRain_globalVerseStats', JSON.stringify(updated));
        return updated;
      });
      fetch('/api/submit-verse-stat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, type: 'completes', amount: 1 }) }).catch(() => { });
      if (name) {
        setGlobalUserStats(prev => {
          let updated = updateStats(prev, name, 'completes', 1);
          if (isChamp) {
            updated = updateStats(updated, name, 'champs', 1);
          }
          localStorage.setItem('verseRain_globalUserStats', JSON.stringify(updated));
          return updated;
        });
      }
      updateGarden(ref, isChamp ? 'champ' : 'completed', setId, amount || 1);
    }
  };

  useEffect(() => {
    fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPublishedVerseSets(data);
      })
      .catch(err => console.error("Failed to fetch published sets", err));

    fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view")
      .then(res => res.json())
      .then(data => {
        if (data) {
          const cleanData = {};
          Object.keys(data).forEach(k => cleanData[k.replace('views:', '')] = data[k]);
          setViewCounts(cleanData);
        }
      })
      .catch(err => console.error("Failed to fetch view counts", err));
  }, []);

  const baseVerseSets = loadedLangs[version]?.sets || [];

  // Pick a random verse from the "rain-verses" set for the homepage subtitle
  const [rainVerseIndex, setRainVerseIndex] = React.useState(() => Math.floor(Math.random() * 10000));
  const randomRainVerse = React.useMemo(() => {
    const rainSet = baseVerseSets.find(s => s.id && s.id.startsWith('rain-verses'));
    if (rainSet && rainSet.verses && rainSet.verses.length > 0) {
      return rainSet.verses[rainVerseIndex % rainSet.verses.length];
    }
    return null;
  }, [baseVerseSets, rainVerseIndex]);

  const activeVerseSets = React.useMemo(() => {
    const merged = [];
    customVerseSets.forEach(cs => {
      const csLang = cs.language || 'cuv';
      if (csLang === version) {
        const pub = publishedVerseSets.find(p => p.id === cs.id);
        merged.push({ ...cs, authorName: (pub && pub.authorName !== "Anonymous") ? pub.authorName : (cs.authorName || playerName || "匿名玩家") });
      }
    });
    publishedVerseSets.forEach(ps => {
      const psLang = ps.language || 'cuv';
      if (psLang === version) {
        if (!merged.some(cs => cs.id === ps.id)) {
          merged.push(ps);
        }
      }
    });
    const filteredBase = baseVerseSets.filter(bs => !merged.some(m => m.id === bs.id));
    return [...filteredBase, ...merged];
  }, [customVerseSets, publishedVerseSets, baseVerseSets, playerName, version]);

  const dummySet = useMemo(() => [{
    id: "dummy",
    title: version === 'ja' ? '経文セットが見つかりません'
      : version === 'ko' ? '성경 구절 세트를 찾을 수 없습니다'
        : version === 'kjv' ? 'No Verse Sets Found'
          : version === 'fa' ? 'مجموعه‌ای یافت نشد'
            : version === 'he' ? 'לא נמצא סט פסוקים'
              : '尚未發現經文組',
    authorName: "System",
    verses: [{
      reference: "N/A", text: version === 'ja' ? '現在この言語には経文セットがありません。👑 マイ問題集から作成してください。'
        : version === 'ko' ? '현재 이 언어에 대한 구절 세트가 없습니다. 👑 내 문제집에서 만드십시오.'
          : version === 'kjv' ? 'There are no verse sets for this language yet. Create one in 👑 Custom Sets.'
            : version === 'fa' ? 'هنوز مجموعه‌ای برای این زبان وجود ندارد.'
              : version === 'he' ? 'עדיין אין סטי פסוקים לשפה זו.'
                : '目前此語言沒有經文組。請去 👑 我的題庫 中建立！'
    }]
  }], [version]);

  const safeActiveSets = activeVerseSets.length > 0 ? activeVerseSets : dummySet;

  const currentSet = (selectedSetId ? (safeActiveSets.find(s => s.id === selectedSetId) || customVerseSets.find(s => s.id === selectedSetId)) : null) || safeActiveSets[0];
  const VERSES_DB = currentSet.verses;

  const [activeVerse, setActiveVerse] = useState(VERSES_DB[0] || { reference: "N/A", text: "" });
  const [selectedVerseRefs, setSelectedVerseRefs] = useState([VERSES_DB[0]?.reference || "N/A"]);

  useEffect(() => {
    if (activeVerse?.reference === "N/A" && VERSES_DB && VERSES_DB.length > 0 && VERSES_DB[0].reference !== "N/A") {
      setActiveVerse(VERSES_DB[0]);
      setSelectedVerseRefs([VERSES_DB[0].reference]);
    }
  }, [VERSES_DB, activeVerse]);

  const [initAutoStart, setInitAutoStart] = useState(null);

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const bgmAudioRef = useRef(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    if (!bgmAudioRef.current) {
      bgmAudioRef.current = new Audio('/bgm.mp3');
      bgmAudioRef.current.loop = true;
      bgmAudioRef.current.volume = 0.2;
    }
    if (isMusicPlaying) {
      const playPromise = bgmAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log('Autoplay prevented, will play on interaction');
          setAutoplayBlocked(true);
          setIsMusicPlaying(false);
        });
      }
    } else {
      bgmAudioRef.current.pause();
    }
  }, [isMusicPlaying]);

  useEffect(() => {
    const unlockAutoplay = () => {
      if (autoplayBlocked) {
        setAutoplayBlocked(false);
        setIsMusicPlaying(true);
      }
    };
    if (autoplayBlocked) {
      window.addEventListener('click', unlockAutoplay);
      window.addEventListener('touchstart', unlockAutoplay);
    }
    return () => {
      window.removeEventListener('click', unlockAutoplay);
      window.removeEventListener('touchstart', unlockAutoplay);
    };
  }, [autoplayBlocked]);

  const handleVersionChange = async (newVer) => {
    setIsLangsLoading(true);
    let data = loadedLangs[newVer];
    if (!data) {
      data = await loadLanguageSets(newVer);
      setLoadedLangs(prev => ({ ...prev, [newVer]: data }));
    }
    setVersion(newVer);
    // Auto-sync UI language when switching Bible version
    if (newVer === 'fa') setUiLangPersisted('fa');
    else if (newVer === 'he') setUiLangPersisted('he');
    else if (newVer === 'kjv') setUiLangPersisted('en');
    else if (newVer === 'ja') setUiLangPersisted('ja');
    else if (newVer === 'ko') setUiLangPersisted('ko');
    else if (newVer === 'es') setUiLangPersisted('es');
    else if (newVer === 'tr') setUiLangPersisted('tr');
    else if (newVer === 'de') setUiLangPersisted('de');
    else if (newVer === 'my') setUiLangPersisted('my');
    else setUiLangPersisted('zh');

    let targetVerses = [];
    if (newVer === 'cuv') targetVerses = loadedLangs['cuv']?.verses || data.verses;
    else if (newVer === 'kjv') targetVerses = loadedLangs['kjv']?.verses || data.verses;
    else if (newVer === 'fa') targetVerses = loadedLangs['fa']?.verses || data.verses;
    else if (newVer === 'he') targetVerses = loadedLangs['he']?.verses || data.verses;

    if (targetVerses.length === 0) {
      targetVerses = [{ reference: "N/A", text: newVer === 'fa' ? 'آیه‌ای یافت نشد.' : (newVer === 'he' ? 'לא נמצא פסוק.' : (newVer === 'ja' ? '経文が見つかりません。' : (newVer === 'ko' ? '성경 구절을 찾을 수 없습니다.' : (newVer === 'kjv' ? 'No verses found.' : '目前的分類下沒有經文。')))) }];
    }
    setActiveVerse(targetVerses[0]);
    setSelectedVerseRefs([targetVerses[0].reference]);
    setCampaignQueue(null);
    setIsLangsLoading(false);
  };


  useEffect(() => {
    const parseUrlArgs = async () => {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      const dxParam = params.get('dx');
      const vParam = params.get('v');
      const textParam = params.get('text');
      const refParam = params.get('ref');

      if (refParam) {
        localStorage.setItem('verserain_inviter', refParam);
        localStorage.removeItem('verserain_invite_claimed');
      }

      let shouldAutoPlay = false;
      let loadedVerses = [];
      let overrideVersion = null;

      if (mParam) {
        const cleanM = mParam.replace(/['"]/gi, '').toLowerCase();
        if (cleanM === 'verse square' || cleanM === 'square') {
          setPlayMode('square');
        } else if (cleanM === 'blind') {
          setPlayMode('blind');
        } else if (cleanM === 'voice') {
          setPlayMode('voice');
        } else if (cleanM === 'voice_prompt') {
          setPlayMode('voice_prompt');
        } else if (cleanM === 'auto-played' || cleanM === 'auto-play') {
          shouldAutoPlay = true;
        } else {
          setPlayMode(cleanM); // Fallback for any other valid string
        }
      }

      if (dxParam) {
        const dx = parseInt(dxParam, 10);
        if (!isNaN(dx) && dx >= 0 && dx <= 3) {
          setDistractionLevel(dx);
        }
      }

      if (textParam) {
        let cleanText = textParam.replace(/['"]/g, '').trim();
        let title = "Custom Verse";

        const match = cleanText.match(/^([1-3]?\s*[a-zA-Z\u4e00-\u9fa5]+\s*\d+(?::\d+(?:-\d+)?)?:?)\s+([「"]?)(.*)/);
        if (match) {
          title = match[1].trim();
          cleanText = match[3].replace(/[」"]$/, '').trim();
        } else {
          const match2 = cleanText.match(/^([^\s「"]+[\d:]+)\s+([「"]?)(.*)/);
          if (match2) {
            title = match2[1].trim();
            cleanText = match2[3].replace(/[」"]$/, '').trim();
          }
        }

        const isEnglish = /^[a-zA-Z\s.,:;'"''‘’“”?!()\-]+$/.test(cleanText.substring(0, 50));
        setVersion(isEnglish ? 'kjv' : 'cuv');

        setActiveVerse({
          reference: title,
          title: "Custom Text",
          text: cleanText.replace(/\n/g, ' ').trim()
        });
        setSelectedVerseRefs([title]);
        setCampaignQueue(null);
        setCampaignResults([]);

      } else if (vParam) {
        const cleanV = vParam.replace(/['"]/gi, '');
        const refs = cleanV.split(';').map(s => s.trim()).filter(Boolean);

        for (let r of refs) {
          let cuvData = loadedLangs['cuv'];
          if (!cuvData) {
            cuvData = await loadLanguageSets('cuv');
            setLoadedLangs(prev => ({ ...prev, cuv: cuvData }));
          }
          let foundCuv = cuvData.verses.find(v => v.reference.toLowerCase().includes(r.toLowerCase()));
          if (foundCuv) {
            loadedVerses.push(foundCuv);
            if (!overrideVersion) overrideVersion = 'cuv';
            continue;
          }
          let kjvData = loadedLangs['kjv'];
          if (!kjvData) {
            kjvData = await loadLanguageSets('kjv');
            setLoadedLangs(prev => ({ ...prev, kjv: kjvData }));
          }
          let foundKjv = kjvData.verses.find(v => v.reference.toLowerCase().includes(r.toLowerCase()));
          if (foundKjv) {
            loadedVerses.push(foundKjv);
            if (!overrideVersion) overrideVersion = 'kjv';
            continue;
          }

          // Dynamic fetch fallback for English verses not in DB
          try {
            const res = await fetch(`https://bible-api.com/${encodeURIComponent(r)}?translation=kjv`);
            if (res.ok) {
              const data = await res.json();
              loadedVerses.push({
                reference: data.reference,
                title: "Custom Selection",
                text: data.text.replace(/\n/g, ' ').trim()
              });
              if (!overrideVersion) overrideVersion = 'kjv';
            }
          } catch (e) {
            console.error("Fetch failed", r, e);
          }
        }

        if (loadedVerses.length > 0) {
          if (overrideVersion && overrideVersion !== version) {
            setVersion(overrideVersion);
          }
          setActiveVerse(loadedVerses[0]);
          setSelectedVerseRefs(loadedVerses.map(v => v.reference));

          if (loadedVerses.length > 1) {
            setCampaignQueue(loadedVerses.slice(1));
          } else {
            setCampaignQueue(null);
          }
          setCampaignResults([]);
        }
      }

      // Trigger automatic start if requested by URL
      if (textParam || vParam || shouldAutoPlay) {
        setTimeout(() => {
          setInitAutoStart({ trigger: true, isAuto: shouldAutoPlay });
        }, 500);
      }
    };
    parseUrlArgs();
  }, []); // Run strictly once on mount

  const toggleSelection = (ref) => {
    setSelectedVerseRefs(prev =>
      prev.includes(ref)
        ? prev.filter(r => r !== ref)
        : [...prev, ref]
    );
  };

  const togglePerformanceMode = () => {
    setPerformanceMode(prev => {
      const newVal = !prev;
      localStorage.setItem('verseRainPerformanceMode', newVal);
      return newVal;
    });
  };


  const activePhrases = React.useMemo(() => {
    // Chinese (cuv) and Korean (ko): split on spaces to break down long sentences without punctuation.
    // Other languages (English, Hebrew, Farsi, Japanese) use spaces between words — keep them intact.
    const shouldSplitOnSpace = version === 'cuv' || version === 'ko';
    const regex = shouldSplitOnSpace
      ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/
      : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
    return activeVerse.text.split(regex).map(p => p.trim()).filter(Boolean);
  }, [activeVerse, version]);

  const activePhrasesRef = useRef([]);
  useEffect(() => { activePhrasesRef.current = activePhrases; }, [activePhrases]);

  const [gameState, setGameState] = useState('menu');
  const gameStateRef = useRef('menu');
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  // Restore original language after a cross-language garden challenge ends
  useEffect(() => {
    if (gameState === 'menu' && versionBeforeChallenge.current) {
      setVersion(versionBeforeChallenge.current);
      versionBeforeChallenge.current = null;
    }
  }, [gameState]);

  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const isAutoPlayRef = useRef(false);
  useEffect(() => { isAutoPlayRef.current = isAutoPlay; }, [isAutoPlay]);

  const [speakingTitle, setSpeakingTitle] = useState(false);

  const [blocks, setBlocks] = useState([]);

  const [currentSeqIndex, setCurrentSeqIndex] = useState(0);
  const currentSeqRef = useRef(0);
  useEffect(() => { currentSeqRef.current = currentSeqIndex; }, [currentSeqIndex]);

  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(3);
  const healthRef = useRef(3);
  useEffect(() => { healthRef.current = health; }, [health]);

  const [timeLeft, setTimeLeft] = useState(6000); // 60.00 seconds
  const timeLeftRef = useRef(6000);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const [bestScore, setBestScore] = useState(0);
  useEffect(() => {
    const loaded = parseInt(localStorage.getItem(`verseRainBestScore_${activeVerse.reference}`)) || 0;
    setBestScore(loaded);
  }, [activeVerse]);
  const [isFlawless, setIsFlawless] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [timeBonus, setTimeBonus] = useState(0);
  const [pureBaseScore, setPureBaseScore] = useState(0);
  const [campaignQueue, setCampaignQueue] = useState(null);
  const [activeCampaignSetId, setActiveCampaignSetId] = useState(null);
  const [activeCampaignSetTotal, setActiveCampaignSetTotal] = useState(0);
  const [showSetLeaderboard, setShowSetLeaderboard] = useState(false);
  const [leaderboardSetId, setLeaderboardSetId] = useState(null);
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const campaignQueueRef = useRef(null);
  useEffect(() => { campaignQueueRef.current = campaignQueue; }, [campaignQueue]);
  const localCampaignListRef = useRef([]); // full ordered verse list for square_solo mp
  const localVerseIndexRef = useRef(0);    // which verse this player is currently on
  const multiplayerSoloActiveRef = useRef(false); // true once any *_solo game is initialized; prevents re-init on every broadcast
  const [localNextVerse, setLocalNextVerse] = useState(null); // verse shown during intermission countdown
  const [campaignResults, setCampaignResults] = useState([]);
  const [isBlindMode, setIsBlindMode] = useState(() => localStorage.getItem('verseRain_blindMode') === 'true');
  const [isDebugMode, setIsDebugMode] = useState(() => localStorage.getItem('verseRain_debugMode') === 'true');

  const [lightningActive, setLightningActive] = useState(null);
  const [lightningKey, setLightningKey] = useState(0);

  const triggerLightning = React.useCallback((type) => {
    // Lightning visually disabled to reduce distraction
    return;
  }, []);  // Leaderboard specific state
  const [leaderboard, setLeaderboard] = useState({ alltime: [], monthly: [], daily: [] });
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('alltime');

  // Menu Leaderboard Modal
  const [leaderboardModalVerse, setLeaderboardModalVerse] = useState(null);
  const [leaderboardModalData, setLeaderboardModalData] = useState({ alltime: [], monthly: [], daily: [] });
  const [leaderboardModalTab, setLeaderboardModalTab] = useState('alltime'); // 'daily', 'monthly', 'alltime'
  const [isFetchingLeaderboard, setIsFetchingLeaderboard] = useState(false);
  const [mainTab, setMainTab] = useState('lobby');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search pages when query changes
  useEffect(() => {
    setSearchSetsPage(1);
    setSearchVersesPage(1);
  }, [searchQuery]);
  const [globalLeaderboardData, setGlobalLeaderboardData] = useState({ alltime: [], monthly: [], daily: [] });
  const [isFetchingGlobalLeaderboard, setIsFetchingGlobalLeaderboard] = useState(false);
  const [globalLeaderboardTab, setGlobalLeaderboardTab] = useState('daily');
  const [pageGlobalLeaderboard, setPageGlobalLeaderboard] = useState(1);
  const [pagePopularSets, setPagePopularSets] = useState(1);
  const [pagePopularVerses, setPagePopularVerses] = useState(1);
  const [globalLeaderboardPage, setGlobalLeaderboardPage] = useState(1);

  const fetchGlobalLeaderboard = () => {
    setIsFetchingGlobalLeaderboard(true);
    Promise.all([
      fetch('/api/get-all-scores').then(res => res.ok ? res.json() : {}).catch(() => ({})),
      fetch('/api/get-top-verses').then(res => res.ok ? res.json() : {}).catch(() => ({})),
      fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/all-gardens').then(r => r.ok ? r.json() : { fruitsMap: {} }).catch(() => ({ fruitsMap: {} }))
    ])
      .then(([scoresData, versesData, gardensData]) => {
        const parsed = scoresData && Array.isArray(scoresData.alltime) ? scoresData : { alltime: Array.isArray(scoresData) ? scoresData : [], monthly: [], daily: [] };
        // Preserve bonusFruitsMap for level calculation
        if (scoresData && scoresData.bonusFruitsMap) parsed.bonusFruitsMap = scoresData.bonusFruitsMap;
        setGlobalLeaderboardData(parsed);
        // Populate globalFruitsMap for leaderboard Lv. display
        if (gardensData && gardensData.fruitsMap) {
          setGlobalFruitsMap(gardensData.fruitsMap);
        }
        if (versesData && versesData.alltime) {
          // Merge server stats INTO local stats (don't replace — local history must be preserved)
          setGlobalVerseStats(prev => {
            const merged = {
              alltime: { ...(versesData.alltime || {}), ...(prev.alltime || {}) },
              monthly: { ...(versesData.monthly || {}), ...(prev.monthly || {}) },
              daily: { ...(versesData.daily || {}), ...(prev.daily || {}) },
              dateInfo: prev.dateInfo, monthInfo: prev.monthInfo
            };
            return merged;
          });
        }
      })
      .finally(() => setIsFetchingGlobalLeaderboard(false));
  };
  const [showLoginModal, setShowLoginModal] = useState(null);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verseViewModal, setVerseViewModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [qrShareModal, setQrShareModal] = useState(null); // { url, reference }
  const [multiplayerRoomId, setMultiplayerRoomId] = useState(null);
  const geoRef = useRef(null); // cached IP geolocation
  const [showMultiplayerVersePicker, setShowMultiplayerVersePicker] = useState(false);
  const [pickerSelectedSet, setPickerSelectedSet] = useState(null);
  const [multiplayerPlayMode, setMultiplayerPlayMode] = useState('square_solo');
  const [flyingBlocks, setFlyingBlocks] = useState([]);
  const [multiplayerDistractionLevel, setMultiplayerDistractionLevel] = useState(0);

  // Voice Control State
  const [availableVoices, setAvailableVoices] = useState([]);
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        setAvailableVoices(window.speechSynthesis.getVoices());
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  }, []);
  const [isMicOn, setIsMicOn] = useState(false);
  const [micStatusText, setMicStatusText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);
  const isMicOnRef = useRef(isMicOn);
  const phrasesRef = useRef(activePhrases);
  const currentSeqIndexRef = useRef(currentSeqIndex);
  const blocksRef = useRef(blocks);
  const statusRef = useRef(gameState);
  const handleBlockClickRef = useRef();

  // Keep refs updated for SpeechRecognition closure
  useEffect(() => {
    isMicOnRef.current = isMicOn;
    phrasesRef.current = activePhrases;
    currentSeqIndexRef.current = currentSeqIndex;
    blocksRef.current = blocks;
    statusRef.current = gameState;
  }, [isMicOn, activePhrases, currentSeqIndex, blocks, gameState]);
  const [multiplayerSelectedVerses, setMultiplayerSelectedVerses] = useState([]);
  const [randomPickCount, setRandomPickCount] = useState(1);
  const [multiplayerSearchText, setMultiplayerSearchText] = useState('');
  const [showPickerBrowser, setShowPickerBrowser] = useState(false);

  const multiplayerRoomRef = useRef(multiplayerRoomId);
  useEffect(() => { multiplayerRoomRef.current = multiplayerRoomId; }, [multiplayerRoomId]);

  // Submit location immediately when room changes (join/leave/game-over)
  useEffect(() => {
    const name = playerNameRef.current;
    if (!name) return;
    const activeRoomId = multiplayerRoomId; // null when leaving
    const doSubmit = (geo) => {
      fetch('/api/submit-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          score: 0,
          lat: parseFloat(geo.latitude),
          lng: parseFloat(geo.longitude),
          country: geo.country_name || geo.country || '',
          city: geo.city || '',
          verseRef: '',
          roomId: activeRoomId || null
        })
      }).catch(() => { });
    };
    if (geoRef.current) {
      doSubmit(geoRef.current);
    } else {
      // Try multiple geo services with fallback
      const tryGeo = async () => {
        const services = [
          async () => { const r = await fetch('https://ipapi.co/json/'); const d = await r.json(); if (d?.latitude) return { latitude: d.latitude, longitude: d.longitude, country_name: d.country_name, city: d.city }; throw new Error('no data'); },
          async () => { const r = await fetch('https://ip-api.com/json/?fields=lat,lon,country,city,status'); const d = await r.json(); if (d?.status === 'success') return { latitude: d.lat, longitude: d.lon, country_name: d.country, city: d.city }; throw new Error('no data'); },
        ];
        for (const svc of services) {
          try { const geo = await svc(); geoRef.current = geo; doSubmit(geo); return; } catch { }
        }
      };
      tryGeo();
    }
  }, [multiplayerRoomId]);

  const [multiplayerState, setMultiplayerState] = useState(null);
  const [myClientId, setMyClientId] = useState(null);
  const [intermissionCountdown, setIntermissionCountdown] = useState(0);
  const [joinRoomError, setJoinRoomError] = useState(null);
  const joinRoomTimeoutRef = useRef(null);
  const isGuestJoinRef = useRef(false);

  useEffect(() => {
    if (gameState === 'intermission' && intermissionCountdown > 0) {
      const timer = setTimeout(() => {
        setIntermissionCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'intermission' && intermissionCountdown === 0) {
      // square_solo: each player advances to their next verse independently
      if (multiplayerRoomId && multiplayerState?.playMode?.endsWith('_solo') && localNextVerse) {
        const verseObj = { reference: localNextVerse.reference, text: localNextVerse.text, title: 'Multiplayer' };
        setActiveVerse(verseObj);
        setCurrentSeqIndex(0);
        currentSeqRef.current = 0;
        setScore(0);
        setCombo(0);
        setHealth(3);
        const shouldSplitOnSpace = /[\u4e00-\u9fa5\uac00-\ud7af]/.test(localNextVerse.text);
        const regex = shouldSplitOnSpace ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/ : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
        const phraseCount = localNextVerse.text.split(regex).filter(p => p.trim()).length;
        setTimeLeft(500 + phraseCount * 500);
        setLocalNextVerse(null);
        setGameState('playing');
        if (multiplayerState.playMode === 'square_solo') {
          initSquareBlocks(false, null, verseObj);
        } else if (multiplayerState.playMode === 'rain_solo') {
          setBlocks([]);
          const spawnWhenReady = () => {
            if (activePhrasesRef.current.length > 0) {
              setTimeout(spawnNextBlock, 100);
              setTimeout(spawnNextBlock, 900);
              setTimeout(spawnNextBlock, 1700);
              setTimeout(spawnNextBlock, 2500);
              setTimeout(spawnNextBlock, 3300);
            } else if (gameStateRef.current === 'playing') {
              setTimeout(spawnWhenReady, 100);
            }
          };
          spawnWhenReady();
        }
      } else if (multiplayerState?.host === myClientId && multiplayerState.campaignQueue && multiplayerState.campaignQueue.length > 0) {
        const nextVerse = multiplayerState.campaignQueue[0];
        const shouldSplitOnSpace = /[\u4e00-\u9fa5\uac00-\ud7af]/.test(nextVerse.text);
        const regex = shouldSplitOnSpace ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/ : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
        const phrases = nextVerse.text.split(regex).map(p => p.trim()).filter(Boolean);

        const maxGridSize = multiplayerState.distractionLevel <= 1 ? 4 : 9;
        const fakesCount = multiplayerState.distractionLevel > 0 ? multiplayerState.distractionLevel : 0;
        const realBlocksAvailable = phrases.length;
        const initialRealCount = Math.min(maxGridSize - fakesCount, realBlocksAvailable);

        let newBlocks = Array.from({ length: initialRealCount }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: phrases[i],
          seqIndex: i,
          isSquare: true,
          error: false,
          correct: false,
          hidden: false
        }));

        if (fakesCount > 0) {
          for (let i = 0; i < fakesCount; i++) {
            newBlocks.push({ id: Math.random().toString(36).substr(2, 9), text: "---", seqIndex: -1, isSquare: true, error: false, correct: false, hidden: false, isFake: true });
          }
        }

        const currentLength = newBlocks.length;
        for (let i = currentLength; i < maxGridSize; i++) {
          newBlocks.push({ id: Math.random().toString(36).substr(2, 9), text: '', seqIndex: -99, isSquare: true, error: false, correct: false, hidden: true });
        }
        newBlocks.sort(() => Math.random() - 0.5);

        if (socketRef.current) {
          socketRef.current.send(JSON.stringify({
            type: 'NEXT_CAMPAIGN_ROUND',
            blocks: newBlocks,
            verseRef: nextVerse.reference,
            verseText: nextVerse.text,
            phrases: phrases
          }));
        }
      }
    }
  }, [gameState, intermissionCountdown, multiplayerState, myClientId, multiplayerRoomId, localNextVerse]);

  const socketRef = useRef(null);
  const pendingInvitePKRef = useRef(null);

  useEffect(() => {
    const targetRoom = multiplayerRoomId || "global-lobby";

    const socket = new PartySocket({
      host: "verserain-party.hungry4grace.partykit.dev", // Production Cloudflare Worker URL
      room: targetRoom,
      query: { name: playerName || "Player" + Math.floor(Math.random() * 999) }
    });

    socketRef.current = socket;

    const handleOpen = () => {
      setMyClientId(socket.id);
      if (pendingInvitePKRef.current) {
        const { queue, pm, dl } = pendingInvitePKRef.current;
        setActiveVerse(queue[0]);
        setPlayMode(pm);
        setDistractionLevel(dl);
        setInitAutoStart({ 
          trigger: true, 
          isAuto: false, 
          isMultiplayerReadyCheck: true, 
          campaignQueue: queue, 
          verse: queue[0], 
          playMode: pm 
        });
        pendingInvitePKRef.current = null;
      }
    };

    const handleMessage = (e) => {
      if (socket.id) setMyClientId(socket.id);
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'STATE_UPDATE') {
          setMultiplayerState(msg.state);
          // Room validation for guest join:
          // If we received a state AND there are other players (host exists), room is valid → clear timeout
          // If status='waiting' and only 1 player (just us), room is empty/nonexistent
          if (isGuestJoinRef.current) {
            const players = msg.state.players || {};
            const playerCount = Object.keys(players).length;
            if (playerCount > 1 || msg.state.status !== 'waiting') {
              // Room has a host — it's valid
              if (joinRoomTimeoutRef.current) {
                clearTimeout(joinRoomTimeoutRef.current);
                joinRoomTimeoutRef.current = null;
              }
              setJoinRoomError(null);
              isGuestJoinRef.current = false;
            }
            // else: still waiting — let the 5s timeout decide
          }

          // Only init game if we are NOT already in any game-active state
          const isGameActive = ['playing', 'intermission', 'waiting_for_others'].includes(gameStateRef.current);
          if (msg.state.status === 'playing' && !isGameActive) {
            // Fix: always reset autoplay when a multiplayer game starts
            setIsAutoPlay(false);
            isAutoPlayRef.current = false;

            setBlocks(msg.state.blocks);
            setGameState('playing');
            setHealth(3);
            setCombo(0);
            setScore(0);
            const shouldSplitOnSpace = /[\u4e00-\u9fa5\uac00-\ud7af]/.test(msg.state.verseText);
            const regex = shouldSplitOnSpace ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/ : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
            const phraseCount = msg.state.verseText.split(regex).filter(p => p.trim()).length;
            setTimeLeft(500 + phraseCount * 500);
            setCurrentSeqIndex(0);
            currentSeqRef.current = 0;
            // For square_solo: store full ordered verse list so each player can advance independently.
            // campaignQueue from the server already includes all verses starting from verse 0.
            // Only init if not already set (host sets it in initAutoStart before INIT_GAME)
            if (msg.state.playMode?.endsWith('_solo') && !multiplayerSoloActiveRef.current) {
              multiplayerSoloActiveRef.current = true;
              localCampaignListRef.current = (msg.state.campaignQueue && msg.state.campaignQueue.length > 0)
                ? msg.state.campaignQueue
                : [{ reference: msg.state.verseRef, text: msg.state.verseText, title: 'Multiplayer' }];
              localVerseIndexRef.current = 0;
            }
            // Set a placeholder activeVerse so HUD works
            const fakeVerse = { reference: msg.state.verseRef, title: "Multiplayer", text: msg.state.verseText || msg.state.blocks.filter(b => !b.isFake).map(b => b.text).join('') };
            setActiveVerse(fakeVerse);
            setPlayMode(msg.state.playMode || 'square');
            if (msg.state.distractionLevel !== undefined) {
              setDistractionLevel(msg.state.distractionLevel);
            }

            // Fix: submit location for ALL multiplayer players at game start (not just endGame)
            const nameAtStart = playerNameRef.current || socket?.id;
            if (nameAtStart) {
              const roomIdAtStart = multiplayerRoomRef.current;
              const submitLoc = (geo) => fetch('/api/submit-location', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameAtStart, score: 0, lat: geo.latitude, lng: geo.longitude, country: geo.country_name || geo.country, city: geo.city || '', verseRef: msg.state.verseRef || '', roomId: roomIdAtStart || null })
              }).catch(() => { });
              if (geoRef.current) {
                submitLoc(geoRef.current);
              } else {
                (async () => {
                  for (const svc of [
                    async () => { const d = await (await fetch('https://ipapi.co/json/')).json(); if (d?.latitude) return d; throw 0; },
                    async () => { const d = await (await fetch('https://ip-api.com/json/?fields=lat,lon,country,city,status')).json(); if (d?.status === 'success') return { latitude: d.lat, longitude: d.lon, country_name: d.country, city: d.city }; throw 0; }
                  ]) { try { const g = await svc(); geoRef.current = g; submitLoc(g); return; } catch { } }
                })();
              }
            }

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 10);


            if (msg.state.playMode === 'rain_solo') {
              setBlocks([]);
              const spawnWhenReady = () => {
                if (activePhrasesRef.current.length > 0) {
                  setTimeout(spawnNextBlock, 100);
                  setTimeout(spawnNextBlock, 900);
                  setTimeout(spawnNextBlock, 1700);
                  setTimeout(spawnNextBlock, 2500);
                  setTimeout(spawnNextBlock, 3300);
                } else if (gameStateRef.current === 'playing') {
                  setTimeout(spawnWhenReady, 100);
                }
              };
              spawnWhenReady();
            }
          } else if (msg.state.status === 'playing' && gameStateRef.current === 'playing') {
            // Vital logic: Apply the refreshed block array from the referee!
            if (!msg.state.playMode?.endsWith('_solo')) {
              setBlocks(msg.state.blocks);
            }
          }
          if (msg.state.status === 'intermission' && gameStateRef.current !== 'intermission') {
            setGameState('intermission');
            setIntermissionCountdown(0);
            if (timerRef.current) clearInterval(timerRef.current);
          }
          if (msg.state.status === 'waiting') {
            multiplayerSoloActiveRef.current = false; // server reset — allow re-init on next game start
          }
          if (msg.state.status === 'finished' && gameStateRef.current !== 'multiplayer_results') {
            multiplayerSoloActiveRef.current = false;
            setGameState('multiplayer_results');
            if (timerRef.current) clearInterval(timerRef.current);
          }
        } else if (msg.type === 'BLOCK_CLAIMED') {
          // Dom coordinate extraction for flying animation
          const el = document.querySelector(`[data-id="${msg.blockId}"]`);
          const targetContainer = document.getElementById('multiplayer-stack-cursor');
          if (el && targetContainer) {
            const rect = el.getBoundingClientRect();
            const targetRect = targetContainer.getBoundingClientRect();

            const newFlyingBlock = {
              id: Date.now() + Math.random(),
              text: msg.blockText,
              claimedByName: msg.claimedByName,
              color: msg.claimedBy === socket.id ? '#10b981' : '#f43f5e',
              startX: `${rect.left}px`,
              startY: `${rect.top}px`,
              endX: `${targetRect.left}px`,
              endY: `${targetRect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`
            };

            setFlyingBlocks(prev => [...prev, newFlyingBlock]);

            setTimeout(() => {
              setFlyingBlocks(prev => prev.filter(fb => fb.id !== newFlyingBlock.id));
            }, 500);
          }

          setBlocks(prev => prev.map(b => b.id === msg.blockId ? { ...b, claimedBy: msg.claimedBy, claimedByName: msg.claimedByName, correct: true } : b));
          setCurrentSeqIndex(msg.nextSeq);
          currentSeqRef.current = msg.nextSeq;

          if (msg.claimedBy === socket.id) {
            setScore(prev => prev + 100);
            setCombo(c => c + 1);
          } else {
            setCombo(0);
          }
        } else if (msg.type === 'MISTAKE') {
          setHealth(h => {
            const newHealth = msg.health !== undefined ? msg.health : Math.max(0, h - 1);
            if (newHealth === 2) {
              playThunder('light');
              triggerLightning('light');
            } else if (newHealth <= 0) {
              playThunder('heavy');
              triggerLightning('heavy');
            }
            return newHealth;
          });
        }
      } catch (err) { }
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.close();
      socketRef.current = null;
      multiplayerSoloActiveRef.current = false;
    };
  }, [multiplayerRoomId, playerName, triggerLightning]);


  // Process Challenge URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeRef = params.get('challenge');
    const setRef = params.get('set');
    const rcParam = params.get('rc');
    const roomParam = params.get('room');

    if (roomParam) {
      setMainTab('multiplayer');
      setMultiplayerRoomId(roomParam.toUpperCase().trim());
      // Small timeout to allow state applied before url replace
      setTimeout(() => window.history.replaceState({}, document.title, window.location.pathname), 100);
      return;
    }

    const viewSetRef = params.get('viewSet');
    if (viewSetRef) {
      const foundSet = activeVerseSets.find(s => s.id === viewSetRef);
      if (foundSet) {
        setSelectedSetId(foundSet.id);
        setMainTab('versesets');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    if (setRef) {
      if (!playerName) {
        setShowLoginModal('login');
      } else {
        const foundSet = activeVerseSets.find(s => s.id === setRef);
        if (foundSet) {
          setSelectedSetId(foundSet.id);
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => {
            let queue = [...foundSet.verses];
            if (rcParam) {
              const count = parseInt(rcParam, 10);
              if (!isNaN(count) && count > 0) {
                queue = queue.sort(() => 0.5 - Math.random()).slice(0, Math.min(queue.length, count));
              }
            }
            setCampaignQueue(queue.slice(1));
            setCampaignResults([]);
            setActiveVerse(queue[0]);
            setInitAutoStart({ trigger: true, isAuto: false, overrideVerse: queue[0] });
          }, 300);
          return;
        }
      }
    }

    if (challengeRef) {
      if (!playerName) {
        setShowLoginModal('login');
      } else {
        const allVerses = activeVerseSets.flatMap(s => s.verses || []);
        const targetVerse = allVerses.find(v => v.reference === challengeRef);
        if (targetVerse) {
          const isEnglish = /^[a-zA-Z]/.test(targetVerse.reference);
          // If the verse belongs to the opposite language, setting version triggers activeVerseSets change
          if ((isEnglish && version !== 'kjv') || (!isEnglish && version !== 'cuv')) {
            setVersion(isEnglish ? 'kjv' : 'cuv');
            return; // Wait for activeVerseSets to update on next render
          }
          setActiveVerse(targetVerse);
          setSelectedVerseRefs([targetVerse.reference]);
          window.history.replaceState({}, document.title, window.location.pathname);
          // Small delay ensures state is painted before starting the game
          setTimeout(() => {
            setInitAutoStart({ trigger: true, isAuto: false });
          }, 300);
        }
      }
    }
  }, [playerName, activeVerseSets, version, setActiveVerse, setSelectedVerseRefs, setInitAutoStart, setShowLoginModal, setVersion]);

  const timerRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => {
    // Dynamically scale animation speeds (10% increase compounding, or simply linear)
    // Here we compound by 5% every combo tier. 
    // Math.pow(1.05, 0) = 1.0; Math.pow(1.05, 1) = 1.05; Math.pow(1.05, 2) = 1.1025
    const rate = Math.min(Math.pow(1.05, combo), 2.2); // Cap at 2.2x speed

    // Grab all actively falling blocks and adjust their native playback rate on the fly
    const wrappers = document.querySelectorAll('.falling-wrapper');
    wrappers.forEach(el => {
      const anims = el.getAnimations();
      anims.forEach(anim => {
        // Only target fall animation and ensure it's not paused
        if (anim.effect && anim.effect.getComputedTiming && anim.effect.getComputedTiming().progress !== null) {
          anim.playbackRate = rate;
        } else {
          // Fallback for newer blocks just added
          anim.playbackRate = rate;
        }
      });
    });
  }, [combo, blocks]); // We keep blocks here because when a new block is added, we want it to inherit the Current rate instantly

  const spawnNextBlock = (expiredBlockId = null) => {
    if (isBlindMode) return;

    setBlocks(prev => {
      let expiredBlock = null;
      let remainingBlocks = prev;

      if (expiredBlockId) {
        expiredBlock = prev.find(b => b.id === expiredBlockId);
        remainingBlocks = prev.filter(b => b.id !== expiredBlockId);
      }

      const phrases = activePhrasesRef.current;
      const targetSeq = currentSeqRef.current;
      if (targetSeq >= phrases.length) return remainingBlocks;

      const onScreenIndices = remainingBlocks.map(b => b.seqIndex);
      const candidates = [];
      for (let i = targetSeq; i < phrases.length; i++) {
        if (!onScreenIndices.includes(i)) {
          candidates.push(i);
        }
      }

      if (candidates.length === 0) return remainingBlocks;

      let seqToSpawn = -1;
      let isFake = false;
      const fakesOnScreen = remainingBlocks.filter(b => b.isFake).length;
      let maxFakesAllowed = 0;
      if (distractionLevel === 3) maxFakesAllowed = 2;
      if (distractionLevel === 2) maxFakesAllowed = 1;
      if (distractionLevel === 1) maxFakesAllowed = 1;

      let spawnFake = distractionLevel > 0 && Math.random() < (distractionLevel * 0.3);
      if (fakesOnScreen >= maxFakesAllowed) spawnFake = false;

      if (candidates.includes(targetSeq)) {
        seqToSpawn = targetSeq; // Absolute guarantee the required phrase is spawned
      } else if (spawnFake && !playMode.startsWith('square')) {
        isFake = true;
        seqToSpawn = -1;
      } else {
        const nextImmediateCandidates = candidates.slice(0, 3);
        seqToSpawn = nextImmediateCandidates[Math.floor(Math.random() * nextImmediateCandidates.length)];
      }

      let xPos;
      if (expiredBlock && !isFake && expiredBlock.seqIndex === seqToSpawn) {
        xPos = expiredBlock.xPos;
      } else {
        const lanes = [5, 35, 65];
        const assignedLane = Math.floor(Math.random() * 3);
        xPos = lanes[assignedLane] + Math.random() * 10;
      }

      const newBlock = {
        id: Math.random().toString(36).substr(2, 9),
        text: isFake ? getRandomFakePhrase(version, VERSES_DB) : phrases[seqToSpawn],
        seqIndex: seqToSpawn,
        xPos: xPos,
        duration: 7.5 + Math.random() * 3,
        error: false,
        correct: false,
        isFake: isFake
      };

      return [...remainingBlocks, newBlock];
    });
  };

  const startSingleGame = () => {
    setCampaignQueue(null);
    setCampaignResults([]);
    startGame();
  };

  useEffect(() => {
    if (initAutoStart?.trigger) {
      if (initAutoStart.isMultiplayerReadyCheck) {
        if (initAutoStart.playMode?.endsWith('_solo') && initAutoStart.campaignQueue?.length > 0) {
          localCampaignListRef.current = initAutoStart.campaignQueue;
          localVerseIndexRef.current = 0;
          multiplayerSoloActiveRef.current = true;
        }
        if (initAutoStart.playMode === 'square_solo') {
          initSquareBlocks(true, initAutoStart.campaignQueue, initAutoStart.verse);
        } else if (initAutoStart.playMode === 'rain_solo' || initAutoStart.playMode === 'voice_solo') {
          if (socketRef.current) {
            const verse = initAutoStart.verse || activeVerse;
            const shouldSplitOnSpace = /[\u4e00-\u9fa5\uac00-\ud7af]/.test(verse.text);
            const regex = shouldSplitOnSpace ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/ : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
            const phrases = verse.text.split(regex).map(p => p.trim()).filter(Boolean);

            socketRef.current.send(JSON.stringify({
              type: 'INIT_GAME',
              blocks: [],
              verseRef: verse.reference,
              verseText: verse.text,
              playMode: initAutoStart.playMode,
              distractionLevel: multiplayerDistractionLevel,
              phrases: phrases,
              campaignQueue: initAutoStart.campaignQueue
            }));
          }
        }
      } else {
        startGame(initAutoStart.isAuto, initAutoStart.overrideVerse);
      }
      setInitAutoStart(null);
    }
  }, [initAutoStart]);

  const initSquareBlocks = (isMultiplayerReadyCheck = false, campaignQueue = null, overrideVerse = null) => {
    const verse = overrideVerse || activeVerse;
    let phrases;
    if (overrideVerse) {
      const shouldSplitOnSpace = /[\u4e00-\u9fa5\uac00-\ud7af]/.test(verse.text);
      const regex = shouldSplitOnSpace ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/ : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
      phrases = verse.text.split(regex).map(p => p.trim()).filter(Boolean);
    } else {
      phrases = activePhrasesRef.current;
    }

    // Grid size depends on difficulty
    const maxGridSize = distractionLevel <= 1 ? 4 : 9;

    const fakesCount = distractionLevel > 0 ? distractionLevel : 0;
    const realBlocksAvailable = phrases.length;

    const initialRealCount = Math.min(maxGridSize - fakesCount, realBlocksAvailable);
    const initialIndices = Array.from({ length: initialRealCount }, (_, i) => i);

    const newBlocks = initialIndices.map((pIndex) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: phrases[pIndex],
      seqIndex: pIndex,
      isSquare: true,
      error: false,
      correct: false,
      hidden: false
    }));

    if (fakesCount > 0) {
      for (let i = 0; i < fakesCount; i++) {
        newBlocks.push({
          id: Math.random().toString(36).substr(2, 9),
          text: getRandomFakePhrase(version, VERSES_DB),
          seqIndex: -1,
          isSquare: true,
          error: false,
          correct: false,
          hidden: false,
          isFake: true
        });
      }
    }

    // Pad to exactly maxGridSize blocks with hidden blocks if necessary to preserve grid
    const currentLength = newBlocks.length;
    for (let i = currentLength; i < maxGridSize; i++) {
      newBlocks.push({
        id: Math.random().toString(36).substr(2, 9),
        text: '',
        seqIndex: -99,
        isSquare: true,
        error: false,
        correct: false,
        hidden: true
      });
    }

    newBlocks.sort(() => Math.random() - 0.5);

    if (isMultiplayerReadyCheck && socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'INIT_GAME',
        blocks: newBlocks,
        verseRef: verse.reference,
        verseText: verse.text,
        playMode: playMode,
        distractionLevel: distractionLevel,
        phrases: phrases,
        campaignQueue: campaignQueue
      }));
    } else {
      setBlocks(newBlocks);
    }
  };

  const startGame = (isAuto = false, overrideVerse = null) => {
    initAudio();
    setGameState('playing');
    setIsAutoPlay(isAuto);
    setScore(0);
    setCombo(0);
    setHealth(3);
    const initialVerse = overrideVerse || activeVerse;
    if (initialVerse) {
      const shouldSplitOnSpace = /[\u4e00-\u9fa5\uac00-\ud7af]/.test(initialVerse.text);
      const regex = shouldSplitOnSpace ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/ : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
      const phraseCount = initialVerse.text.split(regex).filter(p => p.trim()).length;
      setTimeLeft(500 + phraseCount * 500);
    } else {
      setTimeLeft(6000);
    }
    setCurrentSeqIndex(0);
    currentSeqRef.current = 0;
    setBlocks([]);
    setIsFlawless(false);
    setIsNewHighScore(false);
    setIsFailed(false);
    setTimeBonus(0);

    const actualVerse = overrideVerse || activeVerse;
    if (actualVerse) {
      const shouldSplitOnSpace = /[\u4e00-\u9fa5\uac00-\ud7af]/.test(actualVerse.text);
      const regex = shouldSplitOnSpace ? /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》 ]/ : /\.{2,}|[,，。；؛၊။،：「」、;:\.\?!！？؟『』《》]/;
      activePhrasesRef.current = actualVerse.text.split(regex).map(p => p.trim()).filter(Boolean);
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1 && !isAutoPlayRef.current) {
          return 0; // The game now allows users to keep going past the time limit
        }
        return Math.max(0, t - 1);
      });
    }, 10);

    if (!isAuto) {
      if (playMode.startsWith('square')) {
        initSquareBlocks(false, null, actualVerse);
      } else {
        setTimeout(spawnNextBlock, 100);
        setTimeout(spawnNextBlock, 900);
        setTimeout(spawnNextBlock, 1700);
        setTimeout(spawnNextBlock, 2500);
        setTimeout(spawnNextBlock, 3300);
      }
    }

    if (actualVerse && !isAuto) {
      logEvent('versePlayed', { ref: actualVerse.reference, setId: selectedSetId });
    }
  };

  useEffect(() => {
    let cancelAutoPlay = false;

    const runAutoPlayLoop = async () => {
      if (!isAutoPlay || gameState !== 'playing') return;

      const getVoiceLang = (v) => {
        if (v === 'kjv') return 'en-US';
        if (v === 'ko') return 'ko-KR';
        if (v === 'ja') return 'ja-JP';
        if (v === 'he') return 'he-IL';
        if (v === 'fa') return 'fa-IR';
        if (v === 'es') return 'es-ES';
        if (v === 'tr') return 'tr-TR';
        if (v === 'de') return 'de-DE';
        if (v === 'my') return 'my-MM';
        return 'zh-TW';
      };
      const TTS_LANG = getVoiceLang(version);

      // Start from current position (supports mid-game activation)
      const startFrom = currentSeqRef.current;

      // Only announce title when starting from the beginning
      if (startFrom === 0 && !cancelAutoPlay && gameStateRef.current === 'playing') {
        setSpeakingTitle(true);
        speechRef.current = speakText(formatVerseReferenceForSpeech(activeVerse.reference, version), 1.0, TTS_LANG);
        await speechRef.current;
        setSpeakingTitle(false);
        await new Promise(r => setTimeout(r, 400));
      }
      for (let i = startFrom; i < activePhrasesRef.current.length; i++) {
        if (cancelAutoPlay || gameStateRef.current !== 'playing') break;

        setCurrentSeqIndex(i);
        currentSeqRef.current = i;

        const phraseToSpeak = activePhrasesRef.current[i];

        speechRef.current = speakText(phraseToSpeak, 1.0, TTS_LANG);
        await speechRef.current;
      }

      if (cancelAutoPlay || gameStateRef.current !== 'playing') return;

      // Mark complete. The existing currentSeqIndex -> endGame hook will handle success transition!
      setCurrentSeqIndex(activePhrasesRef.current.length);
      currentSeqRef.current = activePhrasesRef.current.length;
    };

    if (isAutoPlay && gameState === 'playing') {
      runAutoPlayLoop();
    }
    return () => { cancelAutoPlay = true; };
  }, [isAutoPlay, gameState, version, activeVerse.reference]);

  const triggerFireworks = () => {
    const duration = 2 * 1000;
    const end = Date.now() + duration;

    let soundTick = 0;
    (function frame() {
      if (soundTick % 10 === 0) playFireworksSound(); // Spread out sound
      soundTick++;

      confetti({
        particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
        colors: ['#3b82f6', '#fbbf24', '#f87171', '#34d399']
      });
      confetti({
        particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
        colors: ['#3b82f6', '#fbbf24', '#f87171', '#34d399']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const triggerFlawless = () => {
    confetti({
      particleCount: 150, spread: 100, origin: { y: 0.4 },
      colors: ['#fbbf24', '#fef08a']
    });
  }

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const isSuccess = currentSeqRef.current >= activePhrases.length;

    if (isAutoPlayRef.current) {
      setTimeout(() => {
        if (gameStateRef.current !== 'menu') {
          const currentQueue = campaignQueueRef.current;
          if (currentQueue !== null && currentQueue.length > 0) {
            setActiveVerse(currentQueue[0]);
            setCampaignQueue(currentQueue.slice(1));
            campaignQueueRef.current = currentQueue.slice(1);
            startGame(true, currentQueue[0]);
          } else {
            setGameState('menu');
          }
        }
      }, 2000);
      return;
    }

    setGameState(campaignQueue !== null ? 'campaign-results' : 'gameover');
    setBlocks([]); // clear arena

    const failed = !isSuccess;

    const f = isSuccess && healthRef.current === 3;

    let finalCalculatedScore = scoreRef.current;

    if (isSuccess) {
      setPureBaseScore(finalCalculatedScore);
      let timeMultiplier = playMode === 'blind' ? 0.65 : 0.5;
      const calculatedTimeBonus = Math.floor(Math.max(0, timeLeft) * timeMultiplier);
      setTimeBonus(calculatedTimeBonus);
      finalCalculatedScore += calculatedTimeBonus;

      if (distractionLevel > 0) {
        finalCalculatedScore = Math.floor(finalCalculatedScore * (1 + distractionLevel * 0.1));
      }

      setScore(finalCalculatedScore);
      scoreRef.current = finalCalculatedScore;
    } else {
      setPureBaseScore(finalCalculatedScore);
      setTimeBonus(0);
    }

    const hs = isSuccess && healthRef.current > 0 && finalCalculatedScore > bestScore && finalCalculatedScore > 0;

    setIsFlawless(f);
    setIsNewHighScore(hs);
    setIsFailed(failed || healthRef.current <= 0); // Consider it visually failed if health <= 0, but verse completes

    if (isSuccess && !isAutoPlayRef.current) {
      const estimateVerseCount = (ref, txt) => {
        let count = 1;
        const rangeMatch = ref.match(/[:：]\s*(\d+)\s*[~\-至]\s*(\d+)/);
        if (rangeMatch) {
          const s = parseInt(rangeMatch[1]);
          const e = parseInt(rangeMatch[2]);
          if (e >= s) count = e - s + 1;
        } else if (!ref.match(/[:：]/)) {
          count = Math.max(1, Math.round(txt.replace(/\s+/g, '').length / 40));
        }
        return Math.min(Math.max(1, count), 50);
      };

      const vCount = estimateVerseCount(activeVerse.reference, activeVerse.text);

      // Award point to the creator (or the player themselves if playing default sets)
      if (hs && playerName) {
        let authorToReward = playerName;
        let verseSetName = "系統預設經文";

        if (selectedSetId) {
          const foundSet = [...customVerseSets, ...publishedVerseSets, ...baseVerseSets].find(s => s.id === selectedSetId);
          if (foundSet && foundSet.authorName && foundSet.authorName !== "Anonymous" && foundSet.authorName !== "Verserain 官方") {
            authorToReward = foundSet.authorName; // If playing someone else's custom set, reward the creator
            verseSetName = foundSet.title || verseSetName;
          }
        }

        const currentPlayerName = playerName || localStorage.getItem('verserain_playerName') || 'Guest';

        fetch("/api/submit-creator-point", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author: authorToReward, amount: vCount, player: currentPlayerName, verseSetName })
        }).catch(e => e);

        // Phase 1 Gamification: Reward Inviter & Invitee (Using Dedicated Points, NOT Fruits)
        const inviter = localStorage.getItem('verserain_inviter');
        const claimed = localStorage.getItem('verserain_invite_claimed');
        if (inviter && inviter !== personalCode && !claimed) {
          // Reward the inviter (+1 fruit, +5000 score)
          fetch("/api/submit-referral-point", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author: inviter, amount: 1, scoreAmount: 5000, player: currentPlayerName, type: 'referred' })
          }).catch(e => e);

          // Reward the new player (+1 fruit)
          fetch("/api/submit-referral-point", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author: personalCode || currentPlayerName, amount: 1, scoreAmount: 0, player: inviter, type: 'invited_by' })
          }).catch(e => e);

          localStorage.setItem('verserain_invite_claimed', 'true');
          setToast(`🎉 成功透過 ${inviter} 的邀請首次過關！雙方各獲 1 顆果子，推薦者額外獲得 5000 積分！`);
          setTimeout(() => setToast(null), 4000);
        }
      }

      logEvent('verseCompleted', {
        ref: activeVerse.reference,
        name: playerName,
        isChamp: hs,
        setId: selectedSetId,
        amount: vCount
      });
      // Load current leaderboard initially
      fetch(`/api/get-scores?verseRef=${encodeURIComponent(activeVerse.reference)}`)
        .then(res => res.json())
        .then(data => setLeaderboard(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
        .catch(err => console.log("Leaderboard not ready or fetch failed"));

      // If user is already identified, auto-submit their score behind the scenes
      if (playerName && finalCalculatedScore > 0 && healthRef.current > 0) {
        setIsSubmittingScore(true);
        const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;

        setIsSubmittingScore(true);
        fetch('/api/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playerName, score: finalCalculatedScore, verseRef: activeVerse.reference, mode: actualModeName })
        }).then(() => {
          // Also submit geolocation for the world map (fire-and-forget)
          fetch('https://ipapi.co/json/')
            .then(r => r.json())
            .then(geo => {
              if (geo && geo.latitude && geo.longitude) {
                fetch('/api/submit-location', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: playerName,
                    score: finalCalculatedScore,
                    lat: geo.latitude,
                    lng: geo.longitude,
                    country: geo.country_name || geo.country,
                    city: geo.city || '',
                    verseRef: activeVerse.reference
                  })
                }).catch(() => { });
              }
            }).catch(() => { });
          return fetch(`/api/get-scores?verseRef=${encodeURIComponent(activeVerse.reference)}`);
        }).then(res => res.json())
          .then(data => setLeaderboard(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
          .catch(e => console.log(e))
          .finally(() => setIsSubmittingScore(false));
      }
    }

    if (hs) {
      setBestScore(finalCalculatedScore);
      localStorage.setItem(`verseRainBestScore_${activeVerse.reference}`, finalCalculatedScore);
    }

    if (isSuccess) {
      const playVictorySounds = () => {
        playTada();
        if (hs) {
          setTimeout(triggerFireworks, 500); // Small delay for the tada to ring out
        } else if (f) {
          triggerFlawless();
        }
      };

      if (speechRef.current) {
        speechRef.current.then(playVictorySounds);
      } else {
        playVictorySounds();
      }
    }

    setCampaignResults(prev => {
      if (campaignQueue !== null) {
        return [...prev, { verse: activeVerse, score: isSuccess ? finalCalculatedScore : 0, flawless: f, health: healthRef.current }];
      }
      return prev;
    });
  };

  useEffect(() => {
    if (currentSeqIndex >= activePhrases.length && activePhrases.length > 0 && gameState === 'playing') {
      if (multiplayerRoomId) {
        if (multiplayerState?.playMode?.endsWith('_solo')) {
          // Calculate time bonus for multiplayer verse completion
          let calculatedTimeBonus = 0;
          if (healthRef.current > 0) {
            calculatedTimeBonus = Math.floor(Math.max(0, timeLeftRef.current) * 0.5);
          }
          let finalCalculatedScore = scoreRef.current + calculatedTimeBonus;
          if (distractionLevel > 0 && finalCalculatedScore > 0) {
            finalCalculatedScore = Math.floor(finalCalculatedScore * (1 + distractionLevel * 0.1));
          }

          // Submit the score to the daily leaderboard if the user is logged in
          if (playerName && finalCalculatedScore > 0 && healthRef.current > 0) {
            const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;
            fetch('/api/submit-score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: playerName, score: finalCalculatedScore, verseRef: activeVerse.reference, mode: actualModeName })
            }).catch(() => { });
          }

          // Report this verse's score to server (server accumulates campaign results)
          if (socketRef.current) {
            socketRef.current.send(JSON.stringify({
              type: 'PLAYER_PROGRESS',
              score: finalCalculatedScore,
              health: healthRef.current,
              seqIndex: currentSeqIndex
            }));
            socketRef.current.send(JSON.stringify({
              type: 'PLAYER_FINISHED_VERSE',
              verseRef: activeVerse.reference,
              score: finalCalculatedScore,
              verseIndex: localVerseIndexRef.current
            }));
          }
          const nextIndex = localVerseIndexRef.current + 1;
          localVerseIndexRef.current = nextIndex;
          if (nextIndex < localCampaignListRef.current.length) {
            // Show 5-second countdown before next verse
            const nextVerse = localCampaignListRef.current[nextIndex];
            setLocalNextVerse(nextVerse);
            setGameState('intermission');
            // Countdown duration scales with difficulty level
            const countdownByLevel = [5, 3, 2, 1];
            setIntermissionCountdown(countdownByLevel[distractionLevel] || 5);
          } else {
            // All verses done — tell server and show the waiting room
            if (socketRef.current) {
              socketRef.current.send(JSON.stringify({ type: 'PLAYER_FINISHED_ALL' }));
            }
            setGameState('waiting_for_others');
          }
        }
        return;
      } else {
        if (campaignQueue !== null && campaignQueue.length > 0) {
          // Auto advance to next verse in campaign
          let calculatedTimeBonus = 0;
          if (healthRef.current > 0) {
            calculatedTimeBonus = Math.floor(Math.max(0, timeLeftRef.current) * 0.5);
          }
          let finalCalculatedScore = scoreRef.current + calculatedTimeBonus;
          if (distractionLevel > 0 && finalCalculatedScore > 0) {
            finalCalculatedScore = Math.floor(finalCalculatedScore * (1 + distractionLevel * 0.1));
          }

          const f = healthRef.current === 3;

          setCampaignResults(prev => [...prev, { verse: activeVerse, score: finalCalculatedScore, flawless: f, health: healthRef.current }]);

          if (playerName && finalCalculatedScore > 0 && healthRef.current > 0) {
            const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;
            fetch('/api/submit-score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: playerName, score: finalCalculatedScore, verseRef: activeVerse.reference, mode: actualModeName })
            }).catch(() => { });
          }

          playTada();

          const nextVerse = campaignQueue[0];
          setActiveVerse(nextVerse);
          setCampaignQueue(campaignQueue.slice(1));
          setCurrentSeqIndex(0);
          currentSeqRef.current = 0;
          setTimeout(() => {
            startGame(isAutoPlayRef.current, nextVerse);
          }, 50);
        } else {
          endGame();
        }
      }
    }
  }, [currentSeqIndex, gameState, activePhrases.length, multiplayerRoomId, multiplayerState?.playMode, campaignQueue, activeVerse, playerName, distractionLevel, playMode]);

  // Submit Verse Set score when campaign finishes
  useEffect(() => {
    if (gameState === 'campaign-results' && activeCampaignSetId && playerName) {
      const totalScore = campaignResults.reduce((sum, r) => sum + r.score, 0);
      const passedCount = campaignResults.filter(r => r.health > 0).length;
      const totalCount = activeCampaignSetTotal || campaignResults.length;
      const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;

      if (totalScore > 0) {
        fetch('/api/submit-set-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setId: activeCampaignSetId,
            name: playerName,
            score: totalScore,
            mode: actualModeName,
            passedCount,
            totalCount
          })
        }).catch(() => {});
      }
      
      // Clear the tracking id so it doesn't submit multiple times if state changes for other reasons
      setActiveCampaignSetId(null);
    }
  }, [gameState, activeCampaignSetId, playerName, campaignResults, playMode, distractionLevel]);

  // Fetch Set Leaderboard Data
  useEffect(() => {
    if (showSetLeaderboard && leaderboardSetId) {
      setIsLoadingLeaderboard(true);
      fetch(`/api/get-set-scores?setId=${leaderboardSetId}&limit=10&offset=${leaderboardPage * 10}`)
        .then(res => res.json())
        .then(data => {
          setLeaderboardData(data.records || []);
          setLeaderboardTotal(data.totalRecords || 0);
          setIsLoadingLeaderboard(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoadingLeaderboard(false);
        });
    }
  }, [showSetLeaderboard, leaderboardSetId, leaderboardPage]);

  // Sync individual progress for solo multiplayer mode
  useEffect(() => {
    if (multiplayerRoomId && gameState === 'playing' && multiplayerState?.playMode?.endsWith('_solo') && socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: 'PLAYER_PROGRESS',
        score: score,
        health: health,
        seqIndex: currentSeqIndex
      }));
    }
  }, [score, health, currentSeqIndex, multiplayerRoomId, gameState, multiplayerState?.playMode]);

  const handleAnimationEnd = (e, id) => {
    if (e.animationName === 'fall') {
      if (gameState === 'playing') {
        spawnNextBlock(id);
      } else {
        setBlocks(prev => prev.filter(b => b.id !== id));
      }
    }
  };

  const handleBlockClick = (block) => {
    if (block.correct || block.error || block.claimedBy) return;

    // Removed legacy speech stop to preserve Voice Mode buffer

    if (multiplayerRoomId && socketRef.current && gameState === 'playing') {
      if (!multiplayerState?.playMode?.endsWith('_solo')) {
        socketRef.current.send(JSON.stringify({ type: 'CLICK_BLOCK', blockId: block.id }));
        return; // Local state will be updated via socket broadcast
      }
    }

    if (block.seqIndex === currentSeqIndex || block.text === activePhrases[currentSeqIndex]) {
      // Voice should remain at normal speed so the user doesn't get nervous
      const voiceRate = 1.0;

      setScore(s => s + 100 + (combo * 50));
      setCombo(c => c + 1);

      const nextSeq = currentSeqIndex + 1;
      const getVoiceLang = (v) => {
        if (v === 'kjv') return 'en-US';
        if (v === 'ko') return 'ko-KR';
        if (v === 'ja') return 'ja-JP';
        if (v === 'he') return 'he-IL';
        if (v === 'fa') return 'fa-IR';
        if (v === 'es') return 'es-ES';
        if (v === 'tr') return 'tr-TR';
        if (v === 'de') return 'de-DE';
        if (v === 'my') return 'my-MM';
        return 'zh-TW';
      };
      const TTS_LANG = getVoiceLang(version);

      speechRef.current = speakText(block.text, voiceRate, TTS_LANG);
      setCurrentSeqIndex(nextSeq);
      currentSeqRef.current = nextSeq; // Update instantly before useEffect triggers

      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, correct: true } : b));

      if (gameState === 'playing') {
        if (playMode.startsWith('square')) {
          const maxGridSize = distractionLevel <= 1 ? 4 : 9;
          const fakesCount = distractionLevel > 0 ? distractionLevel : 0;
          const nextSpawnIndex = currentSeqIndex + (maxGridSize - fakesCount);
          setTimeout(() => {
            setBlocks(prev => {
              const fakesOnScreen = prev.filter(b => b.isFake && !b.hidden).length;
              let spawnFake = distractionLevel > 0 && fakesOnScreen < distractionLevel && Math.random() < 0.5;

              let updated = prev.map(b => {
                if (b.id !== block.id) return b;

                if (nextSpawnIndex < activePhrases.length) {
                  return {
                    id: Math.random().toString(36).substr(2, 9),
                    text: activePhrases[nextSpawnIndex],
                    seqIndex: nextSpawnIndex,
                    isSquare: true,
                    error: false,
                    correct: false,
                    hidden: false
                  };
                } else {
                  return { ...b, hidden: true };
                }
              });

              if (spawnFake) {
                const newFake = {
                  id: Math.random().toString(36).substr(2, 9),
                  text: getRandomFakePhrase(version, VERSES_DB),
                  seqIndex: -1,
                  isSquare: true, error: false, correct: false, hidden: false, isFake: true
                };
                const hiddenIdx = updated.findIndex(b => b.hidden);
                if (hiddenIdx !== -1) {
                  updated[hiddenIdx] = newFake;
                }
              }

              updated.sort(() => Math.random() - 0.5);
              return updated;
            });
          }, 400);
        } else {
          spawnNextBlock();
          setTimeout(() => {
            setBlocks(prev => prev.filter(b => b.id !== block.id));
          }, 400);
        }
      }

    } else {
      playBong();
      setCombo(0);
      setScore(s => Math.max(0, s - 100)); // Apply mistake penalty, preventing negative score
      setHealth(h => {
        const newHealth = h - 1;
        if (newHealth === 2) {
          playThunder('light');
          triggerLightning('light');
        } else if (newHealth <= 0) {
          playThunder('heavy');
          triggerLightning('heavy');
          // In multiplayer square_solo: auto-advance to next verse instead of being stuck
          if (multiplayerRoomId && multiplayerState?.playMode?.endsWith('_solo') && multiplayerSoloActiveRef.current) {
            setTimeout(() => {
              // Report failed verse with score 0
              if (socketRef.current) {
                socketRef.current.send(JSON.stringify({
                  type: 'PLAYER_FINISHED_VERSE',
                  verseRef: activeVerse?.reference || '',
                  score: 0,
                  verseIndex: localVerseIndexRef.current
                }));
              }
              const nextIndex = localVerseIndexRef.current + 1;
              localVerseIndexRef.current = nextIndex;
              if (nextIndex < localCampaignListRef.current.length) {
                const nextVerse = localCampaignListRef.current[nextIndex];
                setLocalNextVerse(nextVerse);
                setGameState('intermission');
                const countdownByLevel = [5, 3, 2, 1];
                setIntermissionCountdown(countdownByLevel[distractionLevel] || 5);
              } else {
                if (socketRef.current) {
                  socketRef.current.send(JSON.stringify({ type: 'PLAYER_FINISHED_ALL' }));
                }
                setGameState('waiting_for_others');
              }
            }, 800);
          }
          return 0;
        }
        return newHealth;
      });

      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, error: true } : b));
      setTimeout(() => {
        setBlocks(prev => {
          let updated = prev;
          if (playMode.startsWith('square') && block.seqIndex === -1) {
            // Return prev mapped to hidden so we preserve grid length
            updated = prev.map(b => b.id === block.id ? { ...b, error: false, hidden: true, isFake: false } : b);
          } else {
            updated = prev.map(b => b.id === block.id ? { ...b, error: false } : b);
          }

          return updated;
        });
      }, 400);
    }
  };

  const handleGlobalClick = (e) => {
    if (gameState !== 'playing') return;

    // Ignore clicks if they click directly on the top HUD UI elements
    if (e.target.closest('.hud-glass')) return;

    const elements = document.querySelectorAll('.falling-wrapper');
    if (elements.length === 0) return;

    let closestId = null;
    let minDistance = Infinity;

    elements.forEach(el => {
      const inner = el.querySelector('.falling-block-inner');
      if (!inner) return;

      const rect = inner.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Euclidean distance to determine "intent"
      const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));

      if (dist < minDistance) {
        minDistance = dist;
        closestId = el.getAttribute('data-id');
      }
    });

    if (closestId) {
      const clickedBlock = blocks.find(b => b.id === closestId);
      if (clickedBlock) {
        handleBlockClick(clickedBlock);
      }
    }
  };

  // ─── Farsi (Persian) UI Dictionary ───────────────────────────────────────
  const faDict = {
    // Navigation
    '大廳': 'خانه',
    '我的園子': 'باغ من',
    '🌳 我的園子': '🌳 باغ من',
    '多人連線': 'چند نفره',
    '排行榜': 'امتیازات',
    '搜尋': 'جستجو',
    '地圖': 'نقشه',
    '進階功能': 'ویژگی‌های پیشرفته',
    '👑 我的題庫': '👑 مجموعه‌های من',
    '回到大廳': 'بازگشت به خانه',

    // Auth
    '登入帳號': 'ورود به حساب',
    '登入': 'ورود',
    '登出': 'خروج',
    '註冊新帳號': 'ثبت نام',
    '建立新帳號 (需與 Skool Email 相同以獲取權限)': 'ایجاد حساب (از ایمیل Skool استفاده کنید)',
    '密碼': 'رمز عبور',
    '忘記密碼？': 'رمز عبور را فراموش کردید؟',
    '還沒有帳號？': 'حساب ندارید؟',
    '立即註冊': 'ثبت نام کنید',
    '✨ Premium 認證': '✨ حساب پریمیوم',
    '🔒 基本帳號': '🔒 حساب پایه',
    '🌟 Lv.${skoolLevel.level} 權限解鎖': '🌟 سطح ${skoolLevel.level} باز شد',

    // Game
    '開始遊戲': 'شروع بازی',
    '模式': 'حالت',
    '難度': 'سطح',
    '無干擾': 'بدون اشکال',
    '單字干擾': 'اشکال کلمه',
    '標點干擾': 'اشکال نشانه',
    '挑戰設定': 'تنظیمات چالش',
    '點擊查看經文，雙擊開始挑戰！': 'کلیک برای مشاهده، دوبار کلیک برای شروع چالش!',
    '點擊查看，雙擊挑戰！': 'کلیک برای مشاهده، دوبار کلیک برای چالش!',
    '新高分！': 'رکورد جدید!',
    '完美無瑕！': 'کامل!',
    '完美': 'کامل',
    '過關': 'پیروز',
    '失敗': 'شکست',
    '連戰結束！': 'پایان سری!',
    '對局結束！': 'پایان بازی!',
    '電腦自動完成（分數歸零）': 'تکمیل خودکار (امتیاز صفر)',
    '本週進度 : ': 'پیشرفت این هفته: ',

    // Leaderboard
    '本日排行': 'امروز',
    '本月排行': 'این ماه',
    '歷史總榜': 'همه زمان‌ها',
    '個人總積分排行榜': 'جدول کل امتیازات بازیکنان',
    '玩家名稱': 'نام بازیکن',
    '紀錄次數/完成數': 'تعداد بازی/تکمیل',
    '最高分': 'بالاترین امتیاز',
    '完成次數': 'تعداد تکمیل',
    '遊玩次數': 'تعداد بازی',
    '目前尚無紀錄': 'هنوز رکوردی ثبت نشده',
    '最受歡迎經文排行榜': 'محبوب‌ترین آیات',
    '最受歡迎經文組': 'محبوب‌ترین مجموعه‌های آیات',
    '排行': 'رتبه',
    '今天': 'امروز',
    '30天 (本月)': '۳۰ روز (این ماه)',
    '歷史': 'همه زمان‌ها',

    // Verse Sets / Custom Sets
    '經文組': 'مجموعه آیات',
    '解鎖經文組': 'باز کردن مجموعه',
    '此經文組的介面語言': 'زبان رابط این مجموعه',
    '尚未發現經文組': 'مجموعه‌ای یافت نشد',
    '沒有找到匹配的經文組。': 'مجموعه مطابقی یافت نشد.',
    '選擇比賽經文組': 'انتخاب مجموعه آیات برای مسابقه',
    '目前選擇': 'انتخاب فعلی',
    '返回目錄': 'بازگشت به فهرست',
    '標題': 'عنوان',
    '作者': 'نویسنده',
    '點閱次數': 'بازدیدها',
    '最受歡迎': 'محبوب‌ترین',
    '最新': 'جدیدترین',
    'Verserain 官方': 'Verserain رسمی',
    '匿名玩家': 'بازیکن ناشناس',

    // Custom Set Editor
    '編輯題庫': 'ویرایش مجموعه',
    '新增題庫': 'افزودن مجموعه',
    '新經文組名稱': 'نام مجموعه جدید',
    '新增經文': 'افزودن آیه',
    '準備儲存 (Local)': 'آماده ذخیره (محلی)',
    '您尚未解鎖此項功能！': 'این ویژگی هنوز برای شما باز نشده!',
    '刪除': 'حذف',
    '取消': 'لغو',
    '儲存': 'ذخیره',
    '編輯': 'ویرایش',
    '關閉': 'بستن',
    '返回': 'بازگشت',
    '重新整理': 'بارگذاری مجدد',
    '👑 發佈至全球 (Publish)': '👑 انتشار جهانی',
    '魔法一鍵抓取 (輸入出處)': 'دریافت آیه با یک کلیک (منبع را وارد کنید)',
    '從聖經抓取經文': 'دریافت آیه از کتاب مقدس',
    '經文內容': 'متن آیه',
    '經文出處 (點擊觀看)': 'مرجع آیه (کلیک برای مشاهده)',
    '經文出處': 'مرجع آیه',
    '正確答案 (例如 5,4,3,2,1 或留空自動順序)': 'ترتیب صحیح (مثلاً ۵،۴،۳،۲،۱ یا خالی بگذارید)',

    // Multiplayer
    '✔️ 已準備': '✔️ آماده',
    '等待中...': 'در انتظار...',
    '已準備': 'آماده',
    '準備！': 'آماده!',
    '等待遊戲開始...': 'در انتظار شروع بازی...',
    '現在等候遊戲主人選好經文，': 'منتظر انتخاب آیه توسط میزبان هستید،',
    '請稍後。。。': 'لطفاً صبر کنید...',
    '如果你準備好了，請按下「我準備好了」的鍵': 'اگر آماده‌اید، دکمه «آماده‌ام» را فشار دهید',
    '我準備好了': 'آماده‌ام',
    '請確認房間代碼是否正確': 'لطفاً کد اتاق را بررسی کنید',

    // Garden
    '種植': 'کاشته شده',
    '大樹': 'درخت بزرگ',
    '果子': 'میوه',
    '嫩芽': 'جوانه',
    '幼苗': 'نهال',
    '小樹': 'درخت کوچک',
    '成長中': 'در حال رشد',
    '快完成了': 'تقریباً تمام',
    '空地': 'زمین خالی',
    '挑戰設定': 'تنظیمات چالش',
    '可用手指滑動來瀏覽園子': 'برای مرور باغ انگشت بکشید',
    '點擊查看，雙擊挑戰！': 'برای مشاهده کلیک، برای چالش دو بار کلیک!',
    '棵植物': 'گیاه',
    '的園地': 'باغ',
    '該玩家尚未分享園地': 'این بازیکن هنوز باغ خود را به اشتراک نگذاشته',
    '這個玩家的園地還是空的！': 'باغ این بازیکن هنوز خالی است!',
    '無法載入': 'خطا در بارگذاری',
    '點擊查看此玩家的園地': 'کلیک کنید تا باغ این بازیکن را ببینید',

    // Level System
    '互惠種子': 'بذر همیاری',
    '探索學員': 'دانش‌آموز کاوشگر',
    '共識實踐者': 'عمل‌کننده مشترک',
    '價值貢獻者': 'مشارکت‌کننده ارزش',
    '生態連結者': 'رابط اکوسیستم',
    '方田開拓者': 'پیشگام',
    '互惠建設者': 'سازنده همیاری',
    '推廣大使': 'سفیر ترویج',
    '生態系架構師': 'معمار اکوسیستم',
    '互惠階級說明': 'توضیح سیستم سطح‌بندی',
    '目前階級': 'سطح فعلی',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': 'با مراقبت از نهال‌ها و رشد میوه در باغ، سطح همیاری خود را ارتقا دهید! وقتی به ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' میوه برسید، قابلیت ایجاد مجموعه اختصاصی به‌طور خودکار باز می‌شود!',
    '解鎖建立專屬題庫': 'باز کردن ایجاد مجموعه اختصاصی',
    '每挑戰一節新經文，就會在空地上長出嫩芽。持續練習讓它長大！通過經文變成大樹，創新高則結出果子🍎': 'با هر چالش آیه جدید، جوانه‌ای در زمین خالی می‌روید. تمرین کنید تا رشد کند! موفقیت آن را به درخت تبدیل می‌کند و رکورد جدید میوه می‌آورد🍎',
    '我的收成': 'برداشت من',
    '過關斬將結出果子，提升你的互惠階級！': 'با پیروزی در چالش‌ها میوه بیاورید و سطح همیاری را ارتقا دهید!',
    '總果子數量': 'مجموع میوه‌ها',

    // Search
    '搜尋經文': 'جستجوی آیات',
    '輸入關鍵字，例如「利未記」或「醫治」...': 'کلیدواژه وارد کنید، مثلاً «لاویان» یا «شفا»...',
    '請輸入關鍵字開始搜尋。': 'برای جستجو کلیدواژه‌ای وارد کنید.',

    // Map
    '全球玩家地圖': 'نقشه بازیکنان جهانی',
    '點擊標記查看玩家成績': 'روی نشانگر کلیک کنید تا امتیاز بازیکن را ببینید',
    '位玩家遍佈全球': 'بازیکن در سراسر جهان',
    '場比賽進行中': 'بازی در جریان',
    '還沒有玩家資料，完成一局遊戲後你的位置就會出現！': 'هنوز داده‌ای نیست. پس از اتمام بازی موقعیت شما نمایش داده می‌شود!',
    '最後上線': 'آخرین حضور',

    // History / Reciprocity
    '互惠點數紀錄': 'تاریخچه امتیازات همیاری',
    '推薦紀錄': 'تاریخچه معرفی‌ها',
    '專屬題庫遊玩紀錄': 'تاریخچه بازی مجموعه اختصاصی',
    '尚未有任何推薦紀錄。分享邀請碼邀請朋友獲得互惠點數！': 'هنوز تاریخچه‌ای ندارید. کد دعوت خود را به اشتراک بگذارید!',
    '尚未有玩家遊玩你的專屬題庫。建立更多題庫來吸引大家挑戰！': 'هنوز بازیکنی مجموعه شما را بازی نکرده. مجموعه‌های بیشتری بسازید!',
    '推薦了玩家': 'بازیکن',
    '加入了 VerseRain': 'را به VerseRain معرفی کردید',
    '透過': 'از طریق',
    '的推薦加入': 'به VerseRain پیوستید',
    '玩家': 'بازیکن',
    '突破了你的題庫': 'مجموعه شما را تکمیل کرد',
    '點': 'امتیاز',
    '查詢失敗': 'خطا در دریافت اطلاعات',
    '無法連線到伺服器': 'اتصال به سرور ناموفق بود',
    '次': 'بار',

    // Home / Welcome
    '歡迎來到 VerseRain': 'به VerseRain خوش آمدید',
    '澆灌心田，結出生命果子': 'دل را آبیاری کن، میوه حیات به بار آور',
    '經典挑戰': 'چالش کلاسیک',
    '挑戰全球經文組，鍛鍊記憶力與專注力。': 'مجموعه‌های جهانی را به چالش بکشید و حافظه خود را تقویت کنید.',
    '一起玩!': 'با هم بازی کنید!',
    '與家人朋友分享房間碼來PK同樣！': 'کد اتاق را با خانواده و دوستان به اشتراک بگذارید!',
    '與家人朋友分享房間碼來PK同樂！': 'کد اتاق را با خانواده و دوستان به اشتراک بگذارید!',
    '檢視你已經學會並種下生命樹的經文。': 'آیاتی که آموخته‌اید و به عنوان درخت حیات کاشته‌اید را ببینید.',

    // Manual / About
    '使用說明': 'راهنمای کاربر',
    '關於我們': 'درباره ما',
    '有關': 'اطلاعات',
    '意見回饋': 'بازخورد',
    '解鎖進階功能': 'باز کردن ویژگی‌های پیشرفته',
    '聯絡與建議': 'تماس و پیشنهادات',
    '加入進階群組': 'پیوستن به گروه پریمیوم',

    // Misc
    '載入中...': 'در حال بارگذاری...',
    '目前尚無紀錄': 'هنوز رکوردی ثبت نشده',
    '尚未發現經文組': 'مجموعه‌ای یافت نشد',
    'Auto-complete (score resets to 0)': 'تکمیل خودکار (امتیاز صفر می‌شود)',
    '電腦自動完成（分數歸零）': 'تکمیل خودکار (امتیاز صفر می‌شود)',
    '請先在上方的信箱欄位輸入您的信箱！': 'لطفاً ابتدا ایمیل خود را در فیلد بالا وارد کنید!',
    '哈囉 ': 'سلام ',
    '！您的密碼如下：': '! رمز عبور شما:',
    '請複製密碼後貼到上方密碼欄位登入': 'رمز عبور را کپی کرده و در فیلد بالا وارد کنید',
    '複製密碼': 'کپی رمز عبور',
    '找不到此信箱，請確認是否輸入正確': 'این ایمیل یافت نشد، لطفاً بررسی کنید',
    '在此裝置上未找到經文文字，但仍可雙擊挑戰': 'متن آیه در این دستگاه یافت نشد، اما می‌توانید دوبار کلیک کنید',
    '雙擊格子開始挑戰！': 'برای شروع چالش، روی خانه دوبار کلیک کنید!',
    '連線失敗 (Connection Error)': 'خطای اتصال',
    'Server unreachable': 'سرور در دسترس نیست',

    // ─── Comprehensive additions (批次補全) ───────────────────────────────
    '開始': 'شروع',
    '跳過': 'رد کردن',
    '送出': 'ارسال',
    '複製': 'کپی',
    '離開': 'خروج',
    '離開對戰': 'خروج از چالش',
    '離開房間': 'خروج از اتاق',
    '離開遊戲': 'خروج از بازی',
    '確定要刪除嗎？': 'آیا مطمئنید که می‌خواهید حذف کنید؟',
    '確認儲存': 'تأیید ذخیره',
    '再玩一次': 'بازی مجدد',
    '回到主頁': 'بازگشت به صفحه اصلی',
    '直接遊玩': 'بازی مستقیم',
    '立刻挑戰': 'چالش فوری',
    '測試遊玩': 'تست بازی',
    '隨機播放': 'پخش تصادفی',
    '隨機播放所選數量的經文圖卡與語音': 'پخش تصادفی تعداد آیات انتخاب شده با صدا',
    '遊玩這篇經文': 'بازی با این آیه',
    '分享挑戰連結': 'اشتراک‌گذاری لینک چالش',
    '分享整組經文連結': 'اشتراک‌گذاری لینک مجموعه',
    '📋 複製連結': '📋 کپی لینک',
    '邀請連結已複製！快發給好朋友吧！': 'لینک کپی شد! برای دوستانتان بفرستید!',
    '邀人PK': 'دعوت به رقابت',
    '讓大家掃描這個 QR 碼，一起來挑戰這段經文！': 'اجازه دهید همه این کد QR را اسکن کنند تا به این آیه چالش شوند!',
    '最終得分': 'نمره نهایی',
    '時間加成': 'پاداش زمان',
    '難度加成': 'پاداش سختی',
    '難度級別': 'سطح سختی',
    '通關基礎分': 'امتیاز پایه',
    '比賽開始': 'مسابقه شروع شد',
    '比賽結束': 'مسابقه تمام شد',
    '準備比賽！': 'آماده برای مسابقه!',
    '回合': 'دور',
    '回合紀錄': 'سابقه دوره‌ها',
    '下一回合': 'دور بعدی',
    '下一局加油，還有': 'در دور بعدی موفق باشید! دارید',
    '還剩': 'باقی‌مانده',
    '次的機會': 'فرصت',
    '完美的順序！': 'ترتیب عالی!',
    '對局結束！': 'بازی تمام شد!',
    '連戰結束！': 'کمپین تمام شد!',
    '再接再厲！': 'ادامه بده!',
    '出發！': 'بش بریم!',
    '太棒了！準備下一回合': 'عالی! آماده دور بعدی',
    '該玩家尚未分享園地': 'این بازیکن هنوز بوستان خود را به اشتراک نگذاشته',
    '這是最後一關了！為隊友祈禱吧！': 'آخرین سطح! برای هم‌تیمی دعا کن!',
    '防線已經崩潰。請等待隊友完成...': 'خط دفاعی شکست. لطفاً منتظر هم‌تیمی بمانید...',
    '您已出局！': 'شما حذف شدید!',
    '等待其他玩家完成...': 'در حال انتظار برای تمام شدن دیگر بازیکنان...',
    '等待玩家...': 'در حال انتظار بازیکنان...',
    '等待中...': 'در حال انتظار...',
    '雙方準備就緒後即將開始': 'بعد از آمادگی هر دو بازیکن، بازی آغاز می‌شود',
    '已加入的玩家:': 'بازیکنان ملحق شده:',
    '玩家狀態:': 'وضعیت بازیکن:',
    '選擇比賽經文': 'انتخاب آیه مسابقه',
    '建立房間 (Host Game)': 'ایجاد اتاق (Host Game)',
    '開房間邀請連線遊玩': 'ایجاد اتاق و دعوت به بازی',
    '請朋友輸入上方的代碼來加入您的遊戲': 'از دوستتان بخواهید کد بالا را وارد کنند',
    '或掃描此 QR Code 快速加入': 'یا این کد QR را اسکن کنید',
    '分享此代碼讓更多人加入': 'این کد را برای دعوت دیگران به اشتراک بگذارید',
    '查看成績': 'مشاهده نتیجه',
    '查看最終成績': 'مشاهده نتیجه نهایی',
    '英雄榜': 'تابلو افتخار',
    '全域英雄榜': 'تابلو افتخار جهانی',
    '總排名': 'رنک‌بندی کل',
    '總計得分': 'مجموع نمرات',
    '尚無排行紀錄，您是第一位！': 'این اولین رکورد است!',
    '尚無排行紀錄，趕緊成為第一位吧！': 'هنوز رکوردی ثبت نشده، اول باش!',
    '載入排行榜中...': 'در حال بارگذاری جدول امتیازات...',
    '登入': 'ورود',
    '密碼': 'رمز عبور',
    '電子郵件': 'ایمیل',
    '註冊新帳號': 'ثبت‌نام حساب جدید',
    '建立新帳號 ': 'ایجاد حساب جدید ',
    '已經有帳號？': 'قبلاً حساب داشتید؟',
    '設定': 'تنظیمات',
    '設定成功！觀迎遊玩，': 'تنظیمات ذخیره شد! خوش آمدید, ',
    '修改個人資料': 'ویرایش پروفایل',
    '個人資料修改成功！': 'پروفایل به‌روزرسانی شد!',
    '暱稱不能為空！': 'نام مستعار نمی‌تواند خالی باشد!',
    '請先告訴我們你的名字！': 'لطفاً ابتدا نام خود را بگویید!',
    '請先在上方的信箱欄位輸入您的信箱！': 'لطفاً ابتدا ایمیل خود را وارد کنید!',
    '請先在前方選定書卷並輸入章節，按下 Enter 或 Tab 後即可解鎖此欄位': 'ابتدا کتاب و فصل را وارد کنید سپس Enter یا Tab بزنید',
    '請先選擇書卷': 'ابتدا کتاب را انتخاب کنید',
    '請填寫標題': 'لطفاً عنوان را وارد کنید',
    '請至少新增一節經文': 'حداقل یک آیه اضافه کنید',
    '請輸入您目前的密碼以確認身分！': 'لطفاً رمز فعلی را وارد کنید',
    '加入': 'پیوستن',
    '儲存題庫': 'ذخیره مجموعه',
    '建立新題庫': 'مجموعه جدید',
    '公開此題庫 (Publish to Global Verse Sets)': 'انتشار جهانی (Publish)',
    '新增一節經文': 'افزودن یک آیه',
    '操作': 'عملیات',
    '描述一下這個題庫的用途...': 'کاربرد مجموعه را توضیح دهید...',
    '內容片段': 'بخشی از متن',
    '章:節 (如 3:16)': 'فصل:آیه (مثل 3:16)',
    '選擇書卷': 'انتخاب کتاب',
    '選擇隨機題數': 'تعداد تصادفی',
    '隨機挑戰所選題數': 'چالش تصادفی',
    '隨機挑選': 'انتخاب تصادفی',
    '單獨經文': 'آیه تکی',
    '返回經文組': 'بازگشت به مجموعه',
    '經文組資料夾': 'پوشه مجموعه‌ها',
    '簡介': 'توضیح',
    '新密碼 (選填)': 'رمز عبور جدید (اختیاری)',
    '目前密碼 (必填)': 'رمز عبور فعلی (اجباری)',
    '目前暱稱': 'نام مستعار فعلی',
    '顯示暱稱': 'نمایش نام مستعار',
    '輸入名稱...': 'نام را وارد کنید...',
    '輸入房間代碼': 'کد اتاق را وارد کنید',
    '輸入目前密碼驗證身分': 'رمز فعلی را وارد کنید',
    '你的暱稱': 'نام مستعار شما',
    '你的雷雨暱稱': 'نام مستعار شما در VerseRain',
    '若不修改請留空': 'در صورت عدم تغییر خالی بگذارید',
    '選一個頭像，或直接輸入文字': 'یک آواتار انتخاب کنید یا متن وارد کنید',
    '解鎖自訂經文組功能！': 'قابلیت سفارشی‌سازی را باز کنید!',
    '恭喜！你已解鎖專屬題庫功能！': 'مجموعه‌های اختصاصی را باز کردید!',
    '身為 Lv.3 以上的實踐者，你現在可以前往「進階功能 ➔ 我的專屬題庫」自由創建與分享你專屬的經文組了！': 'به عنوان Lv.3+، می‌توانید به «قابلیت‌های پیشرفته ➔ مجموعه‌های اختصاصی» بروید!',
    '互惠階級說明': 'توضیح سطح‌بندی',
    '了解並加入 Premium': 'آشنایی و پیوستن به Premium',
    '加入 Skool 成為 Premium 會員': 'پیوستن به Skool به عنوان عضو Premium',
    '回合': 'دور',
    '接下來：': 'بعدی:',
    '完成！': 'تمام شد!',
    '所有關卡完成！': 'همه سطح‌ها تمام شد!',
    '你完成了所有經文！': 'همه آیات را تمام کردید!',
    '出發': 'بش بریم',
    '想要將神聖高分刻在群組榜單上嗎？': 'می‌خواهید نمره عالی خود را ثبت کنید؟',
    '對戰連結': 'اتصال تعارضی رقابت',
    '挑戰連結已複製到剪貼簿！': 'لینک کپی شد!',
    '完成揀選': 'تأیید انتخاب',
    '上傳分數中...': 'در حال آپلود نمرات...',
    '很抱歉，沒有找到符合條件的經文或群組。': 'متأسفانه چیزی یافت نشد.',
    '恆已解鎖專屬題庫功能！': 'مجموعه‌های اختصاصی را باز کردید!',
    '新約': 'عهد جدید',
    '舊約': 'عهد عتیق',
    '等級 0 (無干擾方塊，2x2)': 'سطح 0 (بدون تداخل، 2x2)',
    '等級 1 (少量干擾，2x2)': 'سطح 1 (تداخل کم، 2x2)',
    '等級 2 (中等干擾，3x3)': 'سطح 2 (تداخل متوسط، 3x3)',
    '等級 3 (極限干擾，3x3)': 'سطح 3 (تداخل حداکثر، 3x3)',
    '等級越高，會有越多錯誤的干擾方塊混在裡面！': 'هرچه سطح بالاتر باشد، بلوک‌های مزاحم بیشتری خواهید دید!',
    '遊戲模式': 'حالت بازی',
    '進階設定與學習': 'تنظیمات پیشرفته',
    '語音控制開關': 'کنترل صدا',
    '朗讀經文': 'خواندن آیه',
    '目前尚無經文紀錄': 'هنوز هیچ رکورد آیه‌ای موجود نیست',
    '節經文': 'آیه',
    '在 VerseRain 遊戲的「我的園子」中持續挑戰經文，獲得 20 顆果子，達到 ': 'در بخش «باغ من» بازی VerseRain به چالش آیات ادامه دهید، 20 میوه بگیرید و به ',
    ' 個果子 🍎，達到 Lv.2 即可解鎖個人專屬連結！': ' برسید. با رسیدن به Lv.2 لینک شخصی باز می‌شود!',
    '再結出 ': 'دارید',
    '你還沒有建立任何專屬題庫。點擊上方按鈕開始！': 'هنوز مجموعه‌ای نساخته‌اید. دکمه بالا را بزنید!',
    '你目前還沒有權限建立專屬題庫。有兩種方式可以解鎖：': 'هنوز مجاز به ایجاد مجموعه نیستید. دو روش برای باز کردن:',
    '方式一：': 'روش اول:',
    '方式二：': 'روش دوم:',
    '掃描 QR 碼來挑戰！': 'اسکن QR برای چالش!',
    '或掃描上方 QR Code 快速加入': 'یا این کد QR را اسکن کنید',
    '所屬經文組': 'متعلق به مجموعه',
    '(你)': '(شما)',
    '第1次上線': 'اولین ورود',
    '邀請朋友一起玩': 'دعوت از دوستان برای بازی',
    '📨 邀請朋友一起玩': '📨 دعوت از دوستان برای بازی',
    '你的專屬推廣連結：當朋友們透過此連結直接進入加入 VerseRain，並完成他們的第一次背經遊戲，雙方都會自動獲得「推廣點數」獎勵，同時你也將累積推廣大使進度！': 'لینک دعوت شخصی شما: وقتی دوستان VerseRain را از طریق این لینک بارگیری کنند و اولین بازی خود را به پایان برسانند، هر دو امتیاز جایزه می‌گیرید!',
    '想要擁有你的個人推薦碼並賺取推廣點數嗎？': 'آیا می‌خواهید کد دعوت شخصی خود را دریافت کنید و امتیاز معرفی کسب کنید؟',
    'QR 碼': 'کد QR',
    '🌧️ VerseRain 經文雨 操作手冊': '🌧️ راهنمای کاربر VerseRain',
    '歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！': 'به <strong>VerseRain</strong> خوش آمدید! یک پلتفرم تعاملی حفظ آیات که چالش و یادگیری را ترکیب می‌کند.<br />در اینجا می‌توانید مجموعه‌های آیات جهانی را به چالش بکشید، کتابخانه شخصی خود را بسازید و در جدول امتیازات جهانی اقتصاد متقابل صعود کنید!',
    '🎯 一、如何開始遊玩？': '🎯 ۱. چگونه بازی کنیم؟',
    '只需簡單三步，您就能進入背經的挑戰中！': 'فقط سه مرحله ساده برای شروع چالش حفظ آیات!',
    '1. 切換至「經文組」': '۱. رفتن به «مجموعه‌های آیات»',
    '首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。': 'ابتدا روی برگه «مجموعه‌های آیات» در نوار پیمایش بالا سمت چپ کلیک کنید. این همه مجموعه‌های آیات عمومی ایجاد شده توسط سیستم و بازیکنان را نشان می‌دهد.',
    '切換經文組': 'تغییر مجموعه‌های آیات',
    '2. 選擇想要挑戰的經文組': '۲. انتخاب یک مجموعه آیات',
    '點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。': 'روی یک موضوع در لیست کلیک کنید (مثلاً آیات اصلی انجیل یوحنا) تا سطوح آیات درون آن گسترش یابد.',
    '選擇經文組': 'انتخاب مجموعه آیات',
    '3. 開始遊戲': '۳. شروع بازی',
    '點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！': 'روی نماد «جدول امتیازات/بازی» در کنار هر سطح آیه در زیر مجموعه کلیک کنید. باران آیات پس از 3 ثانیه شروع به باریدن می‌کند!',
    '開始遊戲': 'شروع بازی',
    '🎬 實際遊玩流程示範（動畫）：': '🎬 نمایش گیم‌پلی (انیمیشن):',
    '這是一段實際進入遊戲的流程示範！': 'در اینجا یک نمایش واقعی از گیم‌پلی وجود دارد!',
    '遊戲流程動畫': 'انیمیشن گیم‌پلی',
    '👑 二、如何自建專屬「經文組」？（Premium 會員獨享）': '👑 ۲. چگونه «مجموعه‌های آیات» سفارشی بسازیم؟ (فقط پریمیوم)',
    '如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！': 'اگر یکی از اعضای پریمیوم جامعه «اقتصاد متقابل» هستید، می‌توانید آزادانه کتابخانه‌های آیات سفارشی خود را برای مدرسه یکشنبه یا گروه‌های سلولی ایجاد کنید!',
    '點擊上方導航列的 <strong>「👑 我的題庫」</strong>。': 'روی <strong>«👑 مجموعه‌های سفارشی»</strong> در نوار پیمایش بالا کلیک کنید.',
    '在輸入框打下你想要的 <strong>新經文組名稱</strong>。': '<strong>عنوان جدید مجموعه آیات</strong> مورد نظر خود را در کادر ورودی تایپ کنید.',
    '利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。': 'از <strong>ویژگی قدرتمند دریافت با یک کلیک جادویی</strong> استفاده کنید: مرجع آیه را در بخش وارد کنید (مثلاً <code>یوحنا 3:16</code>) و روی دکمه ستاره جادویی کنار آن کلیک کنید.',
    '系統將為您自動帶入完整的經文內容！': 'سیستم به طور خودکار محتوای کامل آیه را برای شما وارد می‌کند!',
    '在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。': 'پس از تأیید درست بودن همه چیز، روی <strong>«انتشار»</strong> کلیک کنید.',
    '恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！': 'تبریک! این مجموعه آیات بلافاصله در پایگاه داده جهانی آپلود می‌شود و برای چالش عمومی در «مجموعه‌های آیات» در دسترس قرار می‌گیرد!',
    '<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！': '<strong>💡 نکته:</strong> دریافت با یک کلیک جادویی به یک پایگاه داده دقیق کتاب مقدس متصل می‌شود و زمان زیادی در تایپ دستی و تصحیح صرفه‌جویی می‌کند. سعی کنید «پیدایش 1:1» را وارد کنید تا واردات روان در 1 ثانیه را تجربه کنید!',
    '🏆 三、個人積分全球排行榜': '🏆 ۳. جدول امتیازات جهانی',
    '點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：': 'برای مشاهده رتبه‌بندی‌های برتر روی <strong>«جدول امتیازات»</strong> کلیک کنید:',
    '<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！': '<strong>رتبه‌بندی امتیازات شخصی:</strong> با تکمیل چالش‌ها امتیاز جمع کنید. شکستن رکورد خودتان هم به حساب می‌آید!',
    '<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。': '<strong>رتبه‌بندی محبوب‌ترین مجموعه‌های آیات:</strong> هر چه یک مجموعه آیات بیشتر بازی شود، شکوه آن در این جدول بیشتر می‌شود.',
    '想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！': 'رتبه خوب می‌خواهید؟ به چالش‌های مداوم ادامه دهید یا مجموعه آیاتی بسازید که همه دوستش داشته باشند!',
    '🎤 四、全新語音模式 (Voice Mode)': '🎤 ۴. حالت صوتی جدید',
    '除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>': 'علاوه بر کلیک روی بلوک‌ها، اکنون می‌توانید مستقیماً <strong>با استفاده از صدای خود</strong> آیات را تلاوت کنید!',
    '<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！': '<strong>تشخیص هوشمند فازی:</strong> سیستم دارای تطبیق قدرتمند پین‌یین فازی است. حتی با لهجه‌ها یا تلفظ غیردقیق، صداهای مشابه عبور خواهند کرد!',
    '<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。': '<strong>سیستم راهنمای مفید:</strong> اگر گیر کردید، سیستم پس از 3 ثانیه به طور خودکار یک راهنمایی جزئی ارائه می‌دهد تا به شما در ادامه کمک کند.',
    '<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！': '<strong>امتیاز اضافی:</strong> برای تشویق به اعلام بلند کلام خدا، وزن <strong>«پاداش زمان باقیمانده» شما در حالت صوتی ۳۰ درصد افزایش می‌یابد</strong>!',
    '⚔️ 五、多人即時連線對戰': '⚔️ ۵. نبرد چند نفره در زمان واقعی',
    '背經文不再是一個人孤單的事！': 'حفظ آیات دیگر یک کار انفرادی نیست!',
    '點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。': 'برای ایجاد یک اتاق خصوصی و دعوت از اعضای گروه یا خانواده خود برای پیوستن، روی <strong>«چند نفره»</strong> کلیک کنید.',
    '房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。': 'میزبان می‌تواند <strong>«آیات مسابقه»</strong> را از بانک آیات جهانی انتخاب کند.',
    '所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！': 'همه چالش را همزمان شروع می‌کنند و پس از پایان بازی می‌توانند جدول امتیازات را در زمان واقعی مشاهده کنند. برای فعالیت‌های مدرسه یکشنبه و گروه‌های دوستی بسیار عالی است!',
    'Verse Rain 讓背記經文變得生動有趣！': 'VerseRain حفظ آیات را سرگرم‌کننده می‌کند!',
    '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。': 'یک کلیسای چینی از اپلیکیشن VerseRain برای میزبانی «مسابقه حفظ کتاب مقدس» برای جماعت خود استفاده کرد. همه سنین در خانواده‌ها و گروه‌های کوچک شرکت کردند. آنها چهار پروژکتور نصب کردند که به چهار تیم اجازه می‌داد تا همزمان در حالت چالش با استفاده از مجموعه‌های آیات یکسان رقابت کنند.',
    '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。': 'یک پسر چهار ساله و خواهر سه ساله‌اش مشتاقانه نشان دادند که چگونه می‌توانند با بازی VerseRain «دعای ربانی» را به زبان چینی حفظ کنند. آنها در ایالات متحده متولد شده‌اند، اما می‌توانند چینی بخوانند و این بازی را انجام دهند.',
    '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。': 'کلمات آیات کتاب مقدس از آسمان می‌افتند و شما با کلیک کردن روی آیات به ترتیب درست امتیاز کسب می‌کنید. آیه با کلیک کردن با صدای بلند خوانده می‌شود تا حافظه شما را از نظر شنیداری و املا به صورت بصری تقویت کند.',
    '學習多種語言的聖經經文！': 'آیات کتاب مقدس را به چندین زبان بیاموزید!',
    '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。': 'خواندن کلامی تبدیل متن به گفتار هنگام کلیک روی کلمات برای تثبیت حفظ آیات در ذهن شما.',
    '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。': 'از طریق verserain، تقریباً از تعداد نامحدودی آیه، مجموعه‌های آیه و چندین نسخه کتاب مقدس پشتیبانی می‌کند.',
    '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。': 'سطوح دشواری چندگانه‌ای ارائه شده است که توسط کودکان تا بزرگسالان قابل بازی است.',
    '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。': 'حالت چالش به تقویت حافظه برای چندین آیه مرتبط در یک مجموعه آیه کمک می‌کند.',
    '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！': 'جدول امتیازات آنلاین برای ایجاد انگیزه در جماعت، گروه‌های جوانان و اعضای گروه‌های کوچک برای مشارکت و پیشرفت با هم!',
    '<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。': '<strong>حالت صوتی جدید:</strong> با ترکیب پیشرفته‌ترین تشخیص پین‌یین فازی، می‌توانید مستقیماً با صدای خود تلاوت کنید! حتی با تلفظ غیراستاندارد، می‌توانید هوشمندانه سطح را پاس کنید. کلام خدا را با صدای بلند اعلام کنید و 30% امتیاز اضافی دریافت کنید.',
    '<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！': '<strong>نبرد چند نفره در زمان واقعی:</strong> از ایجاد اتاق‌های خصوصی پشتیبانی می‌کند و به اعضای خانواده یا گروه اجازه می‌دهد تا به طور همزمان آیات یکسانی را در تلفن‌های خود به چالش بکشند و از هیجان رقابت در زمان واقعی لذت ببرند!',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': 'برای ارتقای سطح، در باغ خود میوه به ثمر برسانید! وقتی به ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' برسید، ایجاد مجموعه‌های آیات سفارشی به طور خودکار باز می‌شود!',
    '共識實踐者': 'Level 3',

      "我的專屬題庫": "مجموعه‌های من",
    "經文列表": "آیات",
    "語音模式": "حالت صوتی",
    "多人即時連線對戰": "چند نفره زنده",
    "通關紀錄": "رکوردها",
    "申請帳號": "ثبت نام",
    "操作詳解": "دستورالعمل‌های دقیق",
    "VerseRain 開發資訊": "اطلاعات و اعتبارات",
    "關閉視障經文雨": "غیرفعال کردن حالت نابینایان",
    "打開視障經文雨": "فعال کردن حالت نابینایان",
    "為視覺障礙朋友設計的語音模式": "حالت صوتی کم‌بینایان",
    "關閉效能模式": "غیرفعال کردن حالت عملکرد",
    "打開效能模式": "فعال کردن حالت عملکرد",
    "關閉華麗特效以提升流暢度": "غیرفعال کردن جلوه‌ها",
    "關閉 Debug": "غیرفعال کردن دیباگ",
    "打開 Debug": "فعال کردن دیباگ",
    "顯示除錯資訊": "نمایش اطلاعات دیباگ",
    "朗讀語音設定": "تنظیمات صدای خواندن",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "صدای ترجیحی خود را برای خواندن و بازی انتخاب کنید.",
    "系統預設語音": "صدای پیش‌فرض سیستم",
    "試聽": "پیش‌نمایش",
    "語音已更新！": "صدا به‌روزرسانی شد!",
    "這是你選擇的語音試聽。": "این پیش‌نمایشی از صدای انتخابی شماست.",
    "已記住你的語音偏好，下次回來會自動使用。": "ترجیح صوتی شما ذخیره شد و به طور خودکار استفاده خواهد شد.",
};

  // ─── Hebrew (עברית) UI Dictionary ────────────────────────────────────────
  const heDict = {
    // Navigation
    '大廳': 'בית',
    '我的園子': 'הגן שלי',
    '🌳 我的園子': '🌳 הגן שלי',
    '多人連線': 'רב-משתתפים',
    '排行榜': 'לוח תוצאות',
    '搜尋': 'חיפוש',
    '地圖': 'מפה',
    '進階功能': 'תכונות מתקדמות',
    '👑 我的題庫': '👑 הסטים שלי',
    '回到大廳': 'חזרה לבית',

    // Auth
    '登入帳號': 'כניסה לחשבון',
    '登入': 'כניסה',
    '登出': 'יציאה',
    '註冊新帳號': 'הרשמה',
    '建立新帳號 (需與 Skool Email 相同以獲取權限)': 'יצירת חשבון (השתמש באותו אימייל של Skool)',
    '密碼': 'סיסמה',
    '忘記密碼？': 'שכחת סיסמה?',
    '還沒有帳號？': 'אין לך חשבון?',
    '立即註冊': 'הירשם עכשיו',
    '✨ Premium 認證': '✨ חשבון Premium',
    '🔒 基本帳號': '🔒 חשבון בסיסי',
    '申請帳號': 'הרשמה',

    // Game
    '開始遊戲': 'התחל משחק',
    '模式': 'מצב',
    '難度': 'רמת קושי',
    '無干擾': 'ללא הפרעות',
    '單字干擾': 'הפרעת מילים',
    '標點干擾': 'הפרעת פיסוק',
    '挑戰設定': 'הגדרות אתגר',
    '點擊查看經文，雙擊開始挑戰！': 'לחץ לצפייה, לחץ פעמיים להתחלת אתגר!',
    '點擊查看，雙擊挑戰！': 'לחץ לצפייה, לחץ פעמיים לאתגר!',
    '新高分！': 'שיא חדש!',
    '完美無瑕！': 'מושלם!',
    '完美': 'מושלם',
    '過關': 'עבר',
    '失敗': 'נכשל',
    '連戰結束！': 'סיום סדרה!',
    '對局結束！': 'משחק הסתיים!',
    '電腦自動完成（分數歸零）': 'השלמה אוטומטית (ניקוד מאופס)',
    '本週進度 : ': 'התקדמות השבוע: ',

    // Leaderboard
    '本日排行': 'היום',
    '本月排行': 'החודש',
    '歷史總榜': 'כל הזמנים',
    '個人總積分排行榜': 'לוח תוצאות כולל',
    '玩家名稱': 'שם שחקן',
    '紀錄次數/完成數': 'מספר משחקים/השלמות',
    '最高分': 'ניקוד מרבי',
    '完成次數': 'מספר השלמות',
    '遊玩次數': 'מספר משחקים',
    '目前尚無紀錄': 'אין רשומות עדיין',
    '最受歡迎經文排行榜': 'פסוקים הפופולריים ביותר',
    '最受歡迎經文組': 'סטי הפסוקים הפופולריים ביותר',
    '排行': 'דירוג',
    '今天': 'היום',
    '30天 (本月)': '30 יום (החודש)',
    '歷史': 'כל הזמנים',

    // Verse Sets / Custom Sets
    '經文組': 'סט פסוקים',
    '解鎖經文組': 'פתיחת סט',
    '此經文組的介面語言': 'שפת ממשק לסט זה',
    '尚未發現經文組': 'לא נמצא סט פסוקים',
    '沒有找到匹配的經文組。': 'לא נמצא סט תואם.',
    '選擇比賽經文組': 'בחר סט פסוקים לתחרות',
    '目前選擇': 'בחירה נוכחית',
    '返回目錄': 'חזרה לתוכן עניינים',
    '標題': 'כותרת',
    '作者': 'מחבר',
    '點閱次數': 'צפיות',
    '最受歡迎': 'הפופולרי ביותר',
    '最新': 'החדש ביותר',
    'Verserain 官方': 'Verserain רשמי',
    '匿名玩家': 'שחקן אנונימי',

    // Custom Set Editor
    '編輯題庫': 'ערוך סט',
    '新增題庫': 'הוסף סט',
    '新經文組名稱': 'שם סט חדש',
    '新增經文': 'הוסף פסוק',
    '準備儲存 (Local)': 'מוכן לשמירה (מקומי)',
    '您尚未解鎖此項功能！': 'תכונה זו עדיין לא נפתחה עבורך!',
    '刪除': 'מחק',
    '取消': 'ביטול',
    '儲存': 'שמור',
    '編輯': 'ערוך',
    '關閉': 'סגור',
    '返回': 'חזרה',
    '重新整理': 'רענן',
    '👑 發佈至全球 (Publish)': '👑 פרסום גלובלי',
    '魔法一鍵抓取 (輸入出處)': 'קבל פסוק בלחיצה אחת (הזן מקור)',
    '從聖經抓取經文': 'קבל פסוק מהתנ"ך',
    '經文內容': 'תוכן הפסוק',
    '經文出處 (點擊觀看)': 'מקור הפסוק (לחץ לצפייה)',
    '經文出處': 'מקור הפסוק',
    '正確答案 (例如 5,4,3,2,1 或留空自動順序)': 'סדר נכון (לדוגמה 5,4,3,2,1 או השאר ריק)',

    // Multiplayer
    '✔️ 已準備': '✔️ מוכן',
    '等待中...': 'ממתין...',
    '已準備': 'מוכן',
    '準備！': 'מוכן!',
    '等待遊戲開始...': 'ממתין להתחלת המשחק...',
    '現在等候遊戲主人選好經文，': 'ממתין למארח שיבחר פסוק,',
    '請稍後。。。': 'אנא המתן...',
    '如果你準備好了，請按下「我準備好了」的鍵': 'אם אתה מוכן, לחץ על "מוכן"',
    '我準備好了': 'מוכן',
    '請確認房間代碼是否正確': 'אנא בדוק את קוד החדר',

    // Garden
    '種植': 'שתולים',
    '大樹': 'עץ גדול',
    '果子': 'פרי',
    '嫩芽': 'נבט',
    '幼苗': 'שתיל',
    '小樹': 'עץ קטן',
    '成長中': 'גדל',
    '快完成了': 'כמעט גמור',
    '空地': 'קרקע ריקה',
    '可用手指滑動來瀏覽園子': 'גרור באצבע לדפדוף בגן',
    '棵植物': 'צמחים',
    '的園地': 'גן',
    '該玩家尚未分享園地': 'שחקן זה עדיין לא שיתף את הגן שלו',
    '這個玩家的園地還是空的！': 'הגן של שחקן זה עדיין ריק!',
    '無法載入': 'שגיאת טעינה',
    '點擊查看此玩家的園地': 'לחץ לצפייה בגן של שחקן זה',

    // Level System
    '互惠種子': 'זרע הדדיות',
    '探索學員': 'חוקר מתחיל',
    '共識實踐者': 'מיישם הסכמה',
    '價值貢獻者': 'תורם ערך',
    '生態連結者': 'מחבר אקוסיסטם',
    '方田開拓者': 'חלוץ',
    '互惠建設者': 'בונה הדדיות',
    '推廣大使': 'שגריר קידום',
    '生態系架構師': 'ארכיטקט אקוסיסטם',
    '互惠階級說明': 'הסבר מערכת הרמות',
    '目前階級': 'רמה נוכחית',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': 'טפח שתילים בגן והניב פירות כדי לעלות ברמת ההדדיות! כשתגיע ל-',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' פירות, רשות יצירת הסט האישי תיפתח אוטומטית!',
    '解鎖建立專屬題庫': 'פתיחת יצירת סט אישי',
    '每挑戰一節新經文，就會在空地上長出嫩芽。持續練習讓它長大！通過經文變成大樹，創新高則結出果子🍎': 'עם כל אתגר פסוק חדש, נבט צומח בקרקע הריקה. תרגל עד שיגדל! הצלחה תהפוך אותו לעץ, ושיא חדש יניב פרי🍎',
    '我的收成': 'הקציר שלי',
    '過關斬將結出果子，提升你的互惠階級！': 'נצח באתגרים, הניב פירות וקדם את רמת ההדדיות שלך!',
    '總果子數量': 'סך הפירות',

    // Search
    '搜尋經文': 'חיפוש פסוקים',
    '輸入關鍵字，例如「利未記」或「醫治」...': 'הזן מילת מפתח, לדוגמה "ויקרא" או "ריפוי"...',
    '請輸入關鍵字開始搜尋。': 'הזן מילת מפתח כדי להתחיל חיפוש.',

    // Map
    '全球玩家地圖': 'מפת שחקנים גלובלית',
    '點擊標記查看玩家成績': 'לחץ על סמן לצפייה בניקוד שחקן',
    '位玩家遍佈全球': 'שחקנים ברחבי העולם',
    '場比賽進行中': 'משחקים פעילים',
    '還沒有玩家資料，完成一局遊戲後你的位置就會出現！': 'אין נתונים עדיין. לאחר סיום משחק מיקומך יוצג!',
    '最後上線': 'פעילות אחרונה',

    // History / Reciprocity
    '互惠點數紀錄': 'היסטוריית נקודות הדדיות',
    '推薦紀錄': 'היסטוריית המלצות',
    '專屬題庫遊玩紀錄': 'היסטוריית משחק בסט אישי',
    '尚未有任何推薦紀錄。分享邀請碼邀請朋友獲得互惠點數！': 'אין היסטוריה עדיין. שתף קוד הזמנה!',
    '尚未有玩家遊玩你的專屬題庫。建立更多題庫來吸引大家挑戰！': 'עדיין אין שחקנים שמשחקים את הסט שלך. צור עוד סטים!',
    '玩家': 'שחקן',
    '突破了你的題庫': 'השלים את הסט שלך',
    '點': 'נקודות',
    '查詢失敗': 'שגיאה בשאילתה',
    '無法連線到伺服器': 'חיבור לשרת נכשל',
    '次': 'פעמים',

    // Home / Welcome
    '歡迎來到 VerseRain': 'ברוכים הבאים ל-VerseRain',
    '澆灌心田，結出生命果子': 'השקה את הלב, הניב פרי חיים',
    '經典挑戰': 'אתגר קלאסי',
    '挑戰全球經文組，鍛鍊記憶力與專注力。': 'אתגר סטי פסוקים גלובליים ותחזק את הזיכרון והריכוז.',
    '一起玩!': 'בוא נשחק ביחד!',
    '與家人朋友分享房間碼來PK同樂！': 'שתף קוד חדר עם משפחה וחברים!',
    '與家人朋友分享房間碼來PK同樣！': 'שתף קוד חדר עם משפחה וחברים!',
    '檢視你已經學會並種下生命樹的經文。': 'צפה בפסוקים שלמדת ושתלת כעץ חיים.',

    // Manual / About
    '使用說明': 'מדריך למשתמש',
    '關於我們': 'אודותינו',
    '有關': 'מידע',
    '意見回饋': 'משוב',
    '解鎖進階功能': 'פתיחת תכונות מתקדמות',
    '聯絡與建議': 'צור קשר והצעות',
    '加入進階群組': 'הצטרף לקהילת Premium',

    // Misc
    '載入中...': 'טוען...',
    '目前尚無紀錄': 'אין רשומות עדיין',
    '尚未發現經文組': 'לא נמצא סט פסוקים',
    '電腦自動完成（分數歸零）': 'השלמה אוטומטית (ניקוד מאופס)',
    '在此裝置上未找到經文文字，但仍可雙擊挑戰': 'הטקסט לא נמצא במכשיר זה, אך עדיין ניתן ללחוץ פעמיים',
    '雙擊格子開始挑戰！': 'לחץ פעמיים על תא להתחלת אתגר!',
    '複製密碼': 'העתק סיסמה',
    '找不到此信箱，請確認是否輸入正確': 'האימייל לא נמצא, אנא בדוק',
    '哈囉 ': 'שלום ',
    '！您的密碼如下：': '! הסיסמה שלך:',
    '請複製密碼後貼到上方密碼欄位登入': 'העתק את הסיסמה והדבק בשדה למעלה',
    '連線失敗 (Connection Error)': 'שגיאת חיבור',
    '🌧️ VerseRain 經文雨 操作手冊': '🌧️ מדריך למשתמש של VerseRain',
    '歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！': 'ברוכים הבאים ל-<strong>VerseRain</strong>! פלטפורמה אינטראקטיבית לשינון פסוקים המשלבת אתגר ולמידה.<br />כאן תוכלו לאתגר סטים של פסוקים מרחבי העולם, ליצור ספרייה אישית משלכם ולטפס בטבלת המובילים העולמית של הכלכלה ההדדית!',
    '🎯 一、如何開始遊玩？': '🎯 1. איך לשחק?',
    '只需簡單三步，您就能進入背經的挑戰中！': 'רק שלושה שלבים פשוטים כדי להתחיל את אתגר שינון הפסוקים שלכם!',
    '1. 切換至「經文組」': '1. עבור אל "סטי פסוקים"',
    '首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。': 'ראשית, לחץ על הכרטיסייה "סטי פסוקים" בסרגל הניווט השמאלי העליון. פעולה זו תציג את כל סטי הפסוקים הציבוריים שנוצרו על ידי המערכת והשחקנים.',
    '切換經文組': 'החלף סטי פסוקים',
    '2. 選擇想要挑戰的經文組': '2. בחר סט פסוקים',
    '點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。': 'לחץ על נושא ברשימה (למשל, פסוקי ליבה מהבשורה על פי יוחנן) כדי להרחיב את רמות הפסוקים שבתוכו.',
    '選擇經文組': 'בחר סט פסוקים',
    '3. 開始遊戲': '3. התחל משחק',
    '點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！': 'לחץ על הסמל "טבלת מובילים/שחק" שליד כל רמת פסוק מתחת לסט הפסוקים. גשם הפסוקים יתחיל לרדת בעוד 3 שניות!',
    '開始遊戲': 'התחל משחק',
    '🎬 實際遊玩流程示範（動畫）：': '🎬 הדגמת משחקיות (אנימציה):',
    '這是一段實際進入遊戲的流程示範！': 'הנה הדגמה אמיתית של המשחקיות!',
    '遊戲流程動畫': 'אנימציית משחקיות',
    '👑 二、如何自建專屬「經文組」？（Premium 會員獨享）': '👑 2. איך ליצור "סטי פסוקים" מותאמים אישית? (פרימיום בלבד)',
    '如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！': 'אם אתה חבר פרימיום בקהילת "הכלכלה ההדדית", אתה יכול ליצור בחופשיות ספריות פסוקים מותאמות אישית משלך עבור בית הספר של יום ראשון או קבוצות קטנות!',
    '點擊上方導航列的 <strong>「👑 我的題庫」</strong>。': 'לחץ על <strong>"👑 סטים מותאמים אישית"</strong> בסרגל הניווט העליון.',
    '在輸入框打下你想要的 <strong>新經文組名稱</strong>。': 'הקלד את <strong>כותרת סט הפסוקים החדש</strong> הרצויה בתיבת הקלט.',
    '利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。': 'השתמש ב<strong>תכונת משיכה בלחיצה אחת הקסומה</strong> החזקה: הזן את הפניית הפסוק במקטע (למשל, <code>יוחנן ג\' 16</code>), ולחץ על כפתור כוכב הקסם שלידו.',
    '系統將為您自動帶入完整的經文內容！': 'המערכת תייבא עבורך באופן אוטומטי את תוכן הפסוק השלם!',
    '在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。': 'לאחר שווידאת שהכל נכון, לחץ על <strong>"פרסם"</strong>.',
    '恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！': 'מזל טוב! סט הפסוקים הזה יועלה באופן מיידי למסד הנתונים העולמי ויהיה זמין לאתגר ציבורי ב-"סטי פסוקים"!',
    '<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！': '<strong>💡 טיפ:</strong> משיכה בלחיצה אחת הקסומה מתחברת למסד נתונים מדויק של התנ"ך, וחוסכת זמן רב בהקלדה ידנית והגהה. נסה להזין "בראשית א\' 1" כדי לחוות ייבוא חלק תוך שנייה אחת!',
    '🏆 三、個人積分全球排行榜': '🏆 3. טבלת מובילים עולמית',
    '點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：': 'לחץ על <strong>"טבלת מובילים"</strong> כדי לראות את הדירוגים העליונים הראשיים:',
    '<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！': '<strong>דירוג נקודות סיום אישי:</strong> צבור נקודות על ידי השלמת אתגרים. גם שבירת השיא של עצמך נחשבת!',
    '<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。': '<strong>דירוג סטי הפסוקים הפופולריים ביותר:</strong> ככל שמשחקים יותר בסט פסוקים, כך תהילתו בלוח זה גבוהה יותר.',
    '想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！': 'רוצה דירוג טוב? המשך לאתגר את עצמך כל הזמן, או צור סט פסוקים שכולם אוהבים!',
    '🎤 四、全新語音模式 (Voice Mode)': '🎤 4. מצב קולי חדש',
    '除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>': 'מלבד לחיצה על בלוקים, כעת אתה יכול לדקלם פסוקים ישירות <strong>באמצעות הקול שלך!</strong>',
    '<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！': '<strong>זיהוי עמום חכם:</strong> המערכת כוללת התאמת פין-יין עמומה חזקה. אפילו עם מבטאים או הגייה לא מדויקת, צלילים דומים יעברו!',
    '<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。': '<strong>מערכת רמזים מועילה:</strong> אם תיתקע, המערכת תספק באופן אוטומטי רמז חלקי לאחר 3 שניות כדי לעזור לך להמשיך.',
    '<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！': '<strong>בונוס ניקוד:</strong> כדי לעודד להכריז את דבר אלוהים בקול רם, המשקל של <strong>"בונוס זמן נותר" שלך מוגדל ב-30%</strong> במצב הקולי!',
    '⚔️ 五、多人即時連線對戰': '⚔️ 5. קרב מרובה משתתפים בזמן אמת',
    '背經文不再是一個人孤單的事！': 'שינון פסוקים הוא כבר לא משימה בודדת!',
    '點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。': 'לחץ על <strong>"מרובה משתתפים"</strong> כדי ליצור חדר פרטי ולהזמין את חברי הקבוצה או המשפחה שלך להצטרף.',
    '房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。': 'המארח יכול לבחור <strong>"פסוקי תחרות"</strong> ממאגר הפסוקים העולמי.',
    '所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！': 'כולם מתחילים את האתגר בו-זמנית ויכולים לראות טבלאות מובילים בזמן אמת לאחר סיום המשחק. מושלם לפעילויות של בית הספר של יום ראשון ושוברי קרח קבוצתיים!',
    'Verse Rain 讓背記經文變得生動有趣！': 'VerseRain הופך את שינון הפסוקים למהנה!',
    '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。': 'כנסייה סינית השתמשה באפליקציית VerseRain כדי לארח "תחרות שינון תנ"ך" עבור קהילתה. השתתפו כל הגילאים במשפחות ובקבוצות קטנות. הם הקימו ארבעה מקרנים, מה שאפשר לארבע קבוצות להתחרות בו זמנית במצב אתגר באמצעות אותם סטי פסוקים.',
    '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。': 'ילד בן ארבע ואחותו בת השלוש הראו בהתלהבות איך הם יכולים לדקלם את "תפילת האדון" בסינית על ידי משחק VerseRain. למרות שנולדו בארה"ב, הם מסוגלים לקרוא סינית ולשחק במשחק הזה.',
    '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。': 'מילים של פסוקי תנ"ך נופלות מהשמיים, ואתה מרוויח נקודות על ידי לחיצה על הפסוק בסדר הנכון. הפסוק נאמר בקול רם בעת הלחיצה כדי לחזק את הזיכרון שלך מבחינה שמיעתית ואיות מבחינה חזותית.',
    '學習多種語言的聖經經文！': 'למד פסוקי תנ"ך במספר שפות!',
    '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。': 'קריאה מילולית של טקסט לדיבור בעת לחיצה על המילים כדי להטביע בזיכרונך את דקלום הפסוק.',
    '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。': 'באמצעות verserain, זה תומך במספר כמעט בלתי מוגבל של פסוקים, סטי פסוקים וגרסאות תנ"ך מרובות.',
    '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。': 'מוצעות רמות קושי מרובות למשחק על ידי ילדים ומבוגרים כאחד.',
    '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。': 'מצב האתגר עוזר לחזק את הזיכרון של מספר פסוקים קשורים באותו סט פסוקים.',
    '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！': 'טבלת מובילים מקוונת כדי להניע את הקהילה, קבוצות נוער וחברי קבוצות קטנות להשתתף ולהשתפר יחד!',
    '<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。': '<strong>מצב קולי חדש:</strong> בשילוב זיהוי עמום מתקדם ביותר, אתה יכול לדקלם ישירות עם הקול שלך! אפילו עם הגייה לא סטנדרטית, אתה יכול לעבור את השלב בצורה חכמה. הכרז את דבר אלוהים בקול רם וקבל בונוס ניקוד נוסף של 30%.',
    '<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！': '<strong>קרב מרובה משתתפים בזמן אמת:</strong> תומך ביצירת חדרים פרטיים, המאפשר לבני משפחה או חברי קבוצה לאתגר בו-זמנית את אותם פסוקים בטלפונים שלהם, וליהנות מהריגוש של תחרות בזמן אמת!',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': 'שא פירות בגינה שלך כדי לעלות רמה! כאשר תגיע ל',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' , יצירת סטי פסוקים מותאמים אישית תיפתח אוטומטית!',
    '共識實踐者': 'רמה 3',
      "我的專屬題庫": "הסטים שלי",
    "進階設定與學習": "הגדרות מתקדמות",
    "簡介": "תיאור",
    "經文列表": "פסוקים",
    "新增一節經文": "הוסף פסוק",
    "儲存題庫": "שמור",
    "公開此題庫 (Publish to Global Verse Sets)": "פרסם לכולם",
    "建立新題庫": "צור חדש",
    "測試遊玩": "בדוק/שחק",
    "設定": "הגדרות",
    "語音模式": "מצב קולי",
    "多人即時連線對戰": "רב משתתפים חי",
    "通關紀錄": "שיאים",
    "操作詳解": "הוראות מפורטות",
    "VerseRain 開發資訊": "מידע וקרדיטים",
    "關閉視障經文雨": "כבה מצב עיוורים",
    "打開視障經文雨": "הפעל מצב עיוורים",
    "為視覺障礙朋友設計的語音模式": "מצב קולי ללקויי ראייה",
    "關閉效能模式": "כבה מצב ביצועים",
    "打開效能模式": "הפעל מצב ביצועים",
    "關閉華麗特效以提升流暢度": "כבה אפקטים לביצועים טובים יותר",
    "關閉 Debug": "כבה דיבאג",
    "打開 Debug": "הפעל דיבאג",
    "顯示除錯資訊": "הצג מידע דיבאג",
    "朗讀語音設定": "הגדרות קול",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "בחר את הקול המועדף עליך לקריאה ולמשחק.",
    "系統預設語音": "קול ברירת מחדל של המערכת",
    "試聽": "האזן",
    "語音已更新！": "הקול עודכן!",
    "這是你選擇的語音試聽。": "זוהי תצוגה מקדימה של הקול שבחרת.",
    "已記住你的語音偏好，下次回來會自動使用。": "העדפת הקול שלך נשמרה ותשמש אוטומטית.",
};

  // --- Hebrew comprehensive additions ---
  Object.assign(heDict, {
    '開始': 'התחלה',
    '跳過': 'דלג',
    '送出': 'שלח',
    '複製': 'העתק',
    '離開': 'צא',
    '離開對戰': 'צא מהתחרות',
    '離開房間': 'צא מהחדר',
    '離開遊戲': 'צא מהמשחק',
    '確定要刪除嗎？': 'האם אתה בטוח שברצונך למחוק?',
    '確認儲存': 'אשר שמירה',
    '再玩一次': 'שחקשוב',
    '回到主頁': 'חזרה לראשי',
    '直接遊玩': 'שחק ישיר',
    '立刻挑戰': 'אתגר עכשיו',
    '測試遊玩': 'שחק ניסיון',
    '隨機播放': 'השמע באקראי',
    '隨機播放所選數量的經文圖卡與語音': 'השמע באקראי את מספר הפסוקים הנבחר עם שמע',
    '遊玩這篇經文': 'שחק פסוק זה',
    '分享挑戰連結': 'שתף קישור אתגר',
    '分享整組經文連結': 'שתף קישור הסט',
    '📋 複製連結': '📋 העתק קישור',
    '邀請連結已複製！快發給好朋友吧！': 'הקישור הועתק! שלח לחברים!',
    '邀人PK': 'הזמן תחרות',
    '讓大家掃描這個 QR 碼，一起來挑戰這段經文！': 'סרקו את קוד ה-QR לאתגר!',
    '最終得分': 'נקודה סופית',
    '時間加成': 'בונוס זמן',
    '難度加成': 'בונוס קושי',
    '難度級別': 'רמת קושי',
    '通關基礎分': 'נקודות בסיס',
    '比賽開始': 'התחרות התחילה',
    '比賽結束': 'התחרות הסתיימה',
    '準備比賽！': 'התכוננו לתחרות!',
    '回合': 'סיבוב',
    '回合紀錄': 'היסטוריית סיבובים',
    '下一回合': 'הסיבוב הבא',
    '還剩': 'נותר',
    '次的機會': 'הזדמנויות',
    '完美的順序！': 'סדר משוכל!',
    '對局結束！': 'המשחק נגמר!',
    '連戰結束！': 'קמפיין תמם!',
    '再接再厲！': 'המשך!',
    '出發！': 'בוא!',
    '太棒了！準備下一回合': 'מצוין! מתכוננים לסיבוב הבא',
    '等待其他玩家完成...': 'ממתין לשחקנים אחרים...',
    '等待玩家...': 'ממתין לשחקנים...',
    '等待中...': 'ממתין...',
    '雙方準備就緒後即將開始': 'המשחק יתחיל עוד מעט',
    '已加入的玩家:': 'שחקנים שהצטרפו:',
    '玩家狀態:': 'סטטוס שחקן:',
    '選擇比賽經文': 'בחר פסוק לתחרות',
    '建立房間 (Host Game)': 'צור חדר (Host Game)',
    '開房間邀請連線遊玩': 'צור חדר והזמן לשחק',
    '請朋友輸入上方的代碼來加入您的遊戲': 'מהחבר/ת-רות להזין את הקוד מעלה',
    '或掃描此 QR Code 快速加入': 'או סרקו את קוד הQR',
    '分享此代碼讓更多人加入': 'שתפו קוד תחרותי',
    '查看成績': 'מציג נתוצאה',
    '查看最終成績': 'מציג נתוצאה סופית',
    '英雄榜': 'לוח אל',
    '全域英雄榜': 'לוח אל עולמי',
    '總排名': 'דירוג כללי',
    '總計得分': 'סך הכל',
    '尚無排行紀錄，您是第一位！': 'רשומה ראשונה!',
    '尚無排行紀錄，趕緊成為第一位吧！': 'היה הראשון!',
    '載入排行榜中...': 'טוען דירוג...',
    '登入': 'התחבר',
    '密碼': 'סיסמה',
    '電子郵件': 'אימייל',
    '註冊新帳號': 'הרשמה חשבון חדש',
    '建立新帳號 ': 'יצירת חשבון ',
    '已經有帳號？': 'כבר יש לך חשבון?',
    '設定': 'הגדרות',
    '設定成功！觀迎遊玩，': 'הגדרות נשמרו! ברוכים הבאים, ',
    '修改個人資料': 'עריכת פרופיל',
    '個人資料修改成功！': 'פרופיל עודכן!',
    '暱稱不能為空！': 'כינוי לא יכול להיות ריק!',
    '請先告訴我們你的名字！': 'בבקשה הזן את שמך!',
    '請先在上方的信箱欄位輸入您的信箱！': 'בבקשה הזן את האימייל!',
    '請填寫標題': 'בבקשה מלא כותרת',
    '請至少新增一節經文': 'אנא הוסף פסוק אחד לפחות',
    '請輸入您目前的密碼以確認身分！': 'אנא הזן את הסיסמה לבדיקה',
    '加入': 'הצטרף',
    '儲存題庫': 'שמור סט',
    '建立新題庫': 'צור סט חדש',
    '公開此題庫 (Publish to Global Verse Sets)': 'פרסם בעולם (Publish)',
    '新增一節經文': 'הוסף פסוק',
    '操作': 'פעולות',
    '描述一下這個題庫的用途...': 'תאר את הסט...',
    '內容片段': 'קטע מתוך',
    '章:節 (如 3:16)': 'פרק:פסוק (למשל 3:16)',
    '選擇書卷': 'בחר ספר',
    '選擇隨機題數': 'מספר שאלות אקראי',
    '隨機挑戰所選題數': 'אתגר אקראי',
    '隨機挑選': 'בחר אקראי',
    '單獨經文': 'פסוק בודד',
    '返回經文組': 'חזרה לחבילה',
    '經文組資料夾': 'תיקיית חבילות',
    '簡介': 'תאור',
    '新密碼 (選填)': 'סיסמה חדשה (רשות)',
    '目前密碼 (必填)': 'סיסמה נוכחית (חובה)',
    '目前暱稱': 'כינוי נוכחי',
    '顯示暱稱': 'הצג כינוי',
    '輸入名稱...': 'הזן שם...',
    '輸入房間代碼': 'הזן קוד חדר',
    '輸入目前密碼驗證身分': 'הזן סיסמה לאימות',
    '你的暱稱': 'כינוי שלך',
    '你的雷雨暱稱': 'כינוי שלך ב-VerseRain',
    '若不修改請留空': 'במידה ואינך משנה, השאר ריק',
    '選一個頭像，或直接輸入文字': 'בחר אוואטר או הזן טקסט',
    '解鎖自訂經文組功能！': 'פתח תכונת התאמה אישית!',
    '恭喜！你已解鎖專屬題庫功能！': 'חבילות ייחודיות נפתחו!',
    '新約': 'ברית חדשה',
    '舊約': 'ברית ישנה',
    '等級 0 (無干擾方塊，2x2)': 'רמה 0 (ללא הפרעה, 2x2)',
    '等級 1 (少量干擾，2x2)': 'רמה 1 (הפרעה מועטה, 2x2)',
    '等級 2 (中等干擾，3x3)': 'רמה 2 (הפרעה בינונית, 3x3)',
    '等級 3 (極限干擾，3x3)': 'רמה 3 (הפרעה מקסימלית, 3x3)',
    '等級越高，會有越多錯誤的干擾方塊混在裡面！': 'כל גבוה יותר - יותר בלוקים מבלבלים!',
    '遊戲模式': 'מצב משחק',
    '進階設定與學習': 'הגדרות מתקדמות',
    '語音控制開關': 'בקרת קול',
    '朗讀經文': 'קריאת פסוק',
    '目前尚無經文紀錄': 'אין רשומות עדיין',
    '節經文': 'פסוק',
    '(你)': '(אתה)',
    '再結出 ': 'עוד ',
    '你還沒有建立任何專屬題庫。點擊上方按鈕開始！': 'עדיין לא יצרת חבילות. לחץ על הכפתור למעלה!',
    '你目前還沒有權限建立專屬題庫。有兩種方式可以解鎖：': 'עדיין אינך מורשה. שתי דרכים לפתיחה:',
    '方式一：': 'דרך ראשונה:',
    '方式二：': 'דרך שנייה:',
    '掃描 QR 碼來挑戰！': 'סרקו QR לאתגר!',
    '所屬經文組': 'שייך לחבילה',
    '確定要刪除嗎？': 'האם למחוק?',
    '想要將神聖高分刻在群組榜單上嗎？': 'רוצה לרשום נקודה בלוח השיאים?',
    '완성揀選': 'אישור בחירה',
    '上傳分數中...': 'מעלה נקודות...',
    '很抱歉，沒有找到符合條件的經文或群組。': 'התנצלנו, לא נמצא דבר.',
    '在 VerseRain 遊戲的「我的園子」中持續挑戰經文，獲得 20 顆果子，達到 ': 'בבוסטן שלי, המשך לאתגר, קבל 20 פרי ו',
    ' 個果子 🍎，達到 Lv.2 即可解鎖個人專屬連結！': ' הגע. עם Lv.2 הקישור האישי נפתח!',
    '了解並加入 Premium': 'להכיר ולהצטרף ל-Premium',
    '加入 Skool 成為 Premium 會員': 'הצטרף ל-Skool כחבר Premium',
    '這是最後一關了！為隊友祈禱吧！': 'השלב האחרון! התפלל בעד החבר שלך!',
    '防線已經崩潰。請等待隊友完成...': 'קו ההגנה נשבר. ממתין לחברים...',
    '您已出局！': 'נכשלת!',
    '邀請朋友一起玩': 'הזמן חברים לשחק',
    '📨 邀請朋友一起玩': '📨 הזמן חברים לשחק',
    '你的專屬推廣連結：當朋友們透過此連結直接進入加入 VerseRain，並完成他們的第一次背經遊戲，雙方都會自動獲得「推廣點數」獎勵，同時你也將累積推廣大使進度！': 'קישור ההזמנה האישי שלך: כשחברים טוענים את VerseRain דרך קישור זה ומשלימים את המשחק הראשון שלהם, שניכם מרוויחים נקודות בונוס!',
    '想要擁有你的個人推薦碼並賺取推廣點數嗎？': 'רוצה לקבל את קוד ההזמנה האישי שלך ולהרוויח נקודות הפניה?',
    'QR 碼': 'קוד QR',
  });


  const jaDict = {
    '經文組': '経文セット',
    '👑 我的題庫': '👑 マイ問題集',
    '多人連線': 'マルチプレイヤー',
    '排行榜': 'ランキング',
    '搜尋': '検索',
    '使用說明': 'マニュアル',
    '有關': '概要',
    '解鎖經文組': '経文セットをロック解除',
    '✨ Premium 認證': '✨ Premium 認証',
    '🔒 基本帳號': '🔒 通常アカウント',
    '編輯題庫': '問題集を編集',
    '新增題庫': '問題集を追加',
    '✔️ 已準備': '✔️ 準備完了',
    '等待中...': '待機中...',
    '已準備': '準備完了',
    '準備！': '準備！',
    '選擇比賽經文組': '経文セットを選択',
    '連戰結束！': '連戦終了！',
    '對局結束！': '対戦終了！',
    '新高分！': '新記録！',
    '完美無瑕！': 'パーフェクト！',
    '今天': '今日',
    '30天 (本月)': '30日 (今月)',
    '歷史': '歴代',
    '完美': 'パーフェクト',
    '過關': 'クリア',
    '失敗': '失敗',
    '註冊新帳號': '新規アカウント登録',
    '登入帳號': 'ログイン',
    '建立新帳號 (需與 Skool Email 相同以獲取權限)': '新規アカウント作成 (Skool Email と同じものを使用)',
    '登入': 'ログイン',
    '標題': 'タイトル',
    '作者': '作成者',
    '點閱次數': '閲覧数',
    '最受歡迎': '人気順',
    '最新': '最新順',
    'Verserain 官方': 'Verserain 公式',
    '匿名玩家': '匿名プレイヤー',
    '目前選擇': '現在の選択',
    '返回目錄': '目次に戻る',
    '沒有找到匹配的經文組。': '一致する経文セットが見つかりません。',
    '新經文組名稱': '新しい経文セットの名前',
    '新增經文': '経文を追加する',
    '準備儲存 (Local)': '保存を準備中 (Local)',
    '您尚未解鎖此項功能！': 'この機能はまだ解放されていません！',
    '刪除': '削除',
    '開始遊戲': 'ゲーム開始',
    '本週進度 : ': '今週の進捗 : ',
    '經文出處 (點擊觀看)': '出典（クリックして閲覧）',
    '排行': 'ランク',
    '魔法一鍵抓取 (輸入出處)': '魔法のワンクリック取得（出典を入力）',
    '從聖經抓取經文': '聖書から経文を取得',
    '經文內容': '経文の内容',
    '正確答案 (例如 5,4,3,2,1 或留空自動順序)': '正解 (例 5,4,3,2,1 または空白で自動順序)',
    '👑 發佈至全球 (Publish)': '👑 グローバル公開 (Publish)',
    '本日排行': 'デイリー',
    '本月排行': 'マンスリー',
    '歷史總榜': '歴代ランキング',
    '個人總積分排行榜': '個人の合計スコアランキング',
    '玩家名稱': 'プレイヤー名',
    '紀錄次數/完成數': '記録回数/クリア回数',
    '目前尚無紀錄': 'まだ記録がありません',
    '最受歡迎經文排行榜': '最も人気のある経文ランキング',
    '經文出處': '経文の出典',
    '遊玩次數': 'プレイ回数',
    '完成次數': 'クリア回数',
    '此經文組的介面語言': 'この経文セットのUI言語',
    '尚未發現經文組': '経文セットが見つかりません',
    '最高分': '最高スコア',
    '載入中...': '読み込み中...',
    '🌳 我的園子': '🌳 私の園',
    '我的園子': '私の園',
    '種植': '植えた数',
    '大樹': '大樹',
    '果子': '果実',
    '嫩芽': '芽',
    '幼苗': '苗',
    '小樹': '苗木',
    '成長中': '成長中',
    '快完成了': 'もうすぐ',
    '空地': '空地',
    '搜尋經文': '経文を検索',
    '輸入關鍵字，例如「利未記」或「醫治」...': 'キーワードを入力...例：「レビ記」または「癒やし」',
    '請輸入關鍵字開始搜尋。': '検索を開始するにはキーワードを入力してください。',
    '大廳': 'ホーム',
    '地圖': 'マップ',
    '進階功能': '高度な機能',
    '全球玩家地圖': 'グローバルプレイヤーマップ',
    '點擊標記查看玩家成績': 'マーカーをクリックしてスコアを確認',
    '位玩家遍佈全球': '名のプレイヤーが世界中にいます',
    '場比賽進行中': 'つのアクティブルーム',
    '重新整理': '更新',
    '還沒有玩家資料，完成一局遊戲後你的位置就會出現！': 'まだデータがありません。ゲーム終了後に位置が表示されます！',
    '最後上線': '最終オンライン',
    '等待遊戲開始...': 'ゲーム開始を待機中...',
    '現在等候遊戲主人選好經文，': 'ホストが経文を選ぶのを待っています、',
    '請稍後。。。': '少々お待ちください...',
    '如果你準備好了，請按下「我準備好了」的鍵': '準備ができたら「準備完了」ボタンを押してください',
    '我準備好了': '準備完了',
    '回到大廳': 'ホームに戻る',
    '登出': 'ログアウト',
    '互惠種子': '互恵の種',
    '探索學員': '探索の生徒',
    '共識實踐者': '共感の実践者',
    '價值貢獻者': '価値の貢献者',
    '生態連結者': 'エココネクター',
    '方田開拓者': '開拓者',
    '互惠建設者': '互恵の建設者',
    '推廣大使': '推進大使',
    '生態系架構師': 'エコシステムアーキテクト',
    '互惠階級說明': '互恵階級の説明',
    '目前階級': '現在の階級',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': '園で苗木を世話し続けて果実を結ばせると、互恵階級が上がります！次のレベルに達すると：',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' に達すると、「専用問題集」の作成権限が自動的に解放されます！',
    '解鎖建立專屬題庫': '専用問題集の作成を解放',
    '關閉': '閉じる',
    '每挑戰一節新經文，就會在空地上長出嫩芽。持續練習讓它長大！通過經文變成大樹，創新高則結出果子🍎': '新しい経文に挑戦するたびに空き地に新芽が出ます。練習を続けて成長させましょう！クリアすると大樹になり、最高スコアを出すと果実が実ります🍎',
    '我的收成': '私の収穫',
    '過關斬將結出果子，提升你的互惠階級！': '試練を乗り越えて果実を結び、互恵階級を上げよう！',
    '總果子數量': '果実の合計',
    '最受歡迎經文組': '最も人気のある経文セット',
    '歡迎來到 VerseRain': 'VerseRain へようこそ',
    '澆灌心田，結出生命果子': '心に水を注ぎ、命の果実を結ぼう',
    '經典挑戰': 'クラシックチャレンジ',
    '挑戰全球經文組，鍛鍊記憶力與專注力。': '世界の経文セットに挑戦し、記憶力と集中力を鍛えよう。',
    '一起玩!': '一緒に遊ぼう!',
    '與家人朋友分享房間碼來PK同樂！': '家族や友人とルームコードを共有して一緒に対戦しよう！',
    '檢視你已經學會並種下生命樹的經文。': 'あなたが学び、生命の樹として植えた経文をご覧ください。',
    // Comprehensive ja additions batch 2
    '開始': '開始',
    '跳過': 'スキップ',
    '送出': '送信',
    '複製': 'コピー',
    '離開': '退出',
    '離開對戰': '対戦を退出',
    '離開房間': '部屋を退出',
    '離開遊戲': 'ゲームを退出',
    '確定要刪除嗎？': '削除しますか？',
    '確認儲存': '保存を確認',
    '再玩一次': 'もう一度プレイ',
    '回到主頁': 'ホームに戻る',
    '直接遊玩': '直接プレイ',
    '立刻挑戰': '今すぐ挑戦',
    '測試遊玩': 'テストプレイ',
    '隨機播放': 'シャッフル再生',
    '隨機播放所選數量的經文圖卡與語音': '選択した数の経文カードと音声をランダム再生',
    '遊玩這篇經文': 'この経文をプレイ',
    '分享挑戰連結': '挑戦リンクをシェア',
    '分享整組經文連結': 'セットリンクをシェア',
    '📋 複製連結': '📋 リンクをコピー',
    '邀請連結已複製！快發給好朋友吧！': '招待リンクがコピーされました！',
    '邀人PK': '対戦に招待',
    '讓大家掃描這個 QR 碼，一起來挑戰這段經文！': 'QRコードをスキャンして挑戦してください！',
    '最終得分': '最終スコア',
    '時間加成': '時間ボーナス',
    '難度加成': '難易度ボーナス',
    '難度級別': '難易度レベル',
    '通關基礎分': 'クリア基本点',
    '比賽開始': '対戦開始',
    '比賽結束': '対戦終了',
    '準備比賽！': '対戦の準備をしてください！',
    '回合': 'ラウンド',
    '回合紀錄': 'ラウンド記録',
    '下一回合': '次のラウンド',
    '還剩': '残り',
    '次的機會': 'チャンス',
    '完美的順序！': '完璧な順番！',
    '對局結束！': 'ゲーム終了！',
    '連戰結束！': 'キャンペーン終了！',
    '再接再厲！': '頑張れ！',
    '出發！': '出発！',
    '太棒了！準備下一回合': '素晴らしい！次のラウンドへ',
    '等待其他玩家完成...': '他のプレイヤーを待つ...',
    '等待玩家...': 'プレイヤーを待つ...',
    '等待中...': '待機中...',
    '您已出局！': '脱落しました！',
    '防線已經崩潰。請等待隊友完成...': '防衛ラインが崩壊。チームメンバーを待って...',
    '這是最後一關了！為隊友祈禱吧！': '最後のステージ！チームメンバーに祈りを！',
    '雙方準備就緒後即將開始': '両者が準備完了後に開始',
    '已加入的玩家:': '参加したプレイヤー:',
    '玩家狀態:': 'プレイヤー状態:',
    '選擇比賽經文': '対戦経文を選択',
    '建立房間 (Host Game)': '部屋を作る (Host Game)',
    '開房間邀請連線遊玩': '部屋を作って招待',
    '請朋友輸入上方的代碼來加入您的遊戲': '友人に上のコードを入力してもらう',
    '或掃描此 QR Code 快速加入': 'またはQRコードをスキャン',
    '分享此代碼讓更多人加入': 'このコードをシェアして招待',
    '查看成績': '成績を見る',
    '查看最終成績': '最終成績を見る',
    '英雄榜': 'エースボード',
    '全域英雄榜': 'グローバルエースボード',
    '總排名': '総合ランキング',
    '總計得分': '総得点',
    '尚無排行紀錄，您是第一位！': '最初の記録です！',
    '尚無排行紀錄，趕緊成為第一位吧！': '最初の人になりましょう！',
    '載入排行榜中...': 'ランキング読み込み中...',
    '登入': 'ログイン',
    '密碼': 'パスワード',
    '電子郵件': 'メールアドレス',
    '註冊新帳號': '新規アカウント登録',
    '建立新帳號 ': '新規アカウント作成 ',
    '已經有帳號？': '既にアカウントをお持ちですか？',
    '設定': '設定',
    '設定成功！觀迎遊玩，': '設定完了！ようこそ, ',
    '修改個人資料': 'プロフィール編集',
    '個人資料修改成功！': 'プロフィールを更新しました！',
    '暱稱不能為空！': 'ニックネームは空にできません！',
    '請先告訴我們你的名字！': 'まずお名前を教えてください！',
    '請先在上方的信箱欄位輸入您的信箱！': 'まずメールアドレスを入力してください！',
    '請填寫標題': 'タイトルを入力してください',
    '請至少新增一節經文': '少なくとも1節の経文を追加してください',
    '請輸入您目前的密碼以確認身分！': '現在のパスワードを入力して確認してください！',
    '加入': '参加',
    '儲存題庫': 'セットを保存',
    '建立新題庫': '新しいセット',
    '公開此題庫 (Publish to Global Verse Sets)': '世界に公開 (Publish)',
    '新增一節經文': '1節追加',
    '操作': '操作',
    '描述一下這個題庫的用途...': 'セットの説明...',
    '內容片段': 'テキスト片段',
    '章:節 (如 3:16)': '章:節 (例 3:16)',
    '選擇書卷': '書を選択',
    '選擇隨機題數': 'ランダム問題数を選択',
    '隨機挑戰所選題數': 'ランダム挑戦',
    '隨機挑選': 'ランダム選択',
    '單獨經文': '単一経文',
    '返回經文組': 'セットに戻る',
    '經文組資料夾': 'セットフォルダ',
    '新密碼 (選填)': '新しいパスワード (任意)',
    '目前密碼 (必填)': '現在のパスワード (必須)',
    '目前暱稱': '現在のニックネーム',
    '顯示暱稱': 'ニックネームを表示',
    '輸入名稱...': '名前を入力...',
    '輸入房間代碼': '部屋コードを入力',
    '輸入目前密碼驗証身分': '現在のパスワードで認証',
    '若不修改請留空': '変更しない場合は空白のままに',
    '選一個頭像，或直接輸入文字': 'アバターを選択またはテキストを入力',
    '解鎖自訂經文組功能！': 'カスタム機能を解除！',
    '新約': '新約',
    '舊約': '旧約',
    '等級 0 (無干擾方塊，2x2)': 'レベル 0 (干渉なし, 2x2)',
    '等級 1 (少量干擾，2x2)': 'レベル 1 (少し干渉, 2x2)',
    '等級 2 (中等干擾，3x3)': 'レベル 2 (中程度干渉, 3x3)',
    '等級 3 (極限干擾，3x3)': 'レベル 3 (最大干渉, 3x3)',
    '等級越高，會有越多錯誤的干擾方塊混在裡面！': 'レベルが高いほど干渉ブロックが増えます！',
    '遊戲模式': 'ゲームモード',
    '語音控制開關': '音声コントロール',
    '朗讀經文': '経文を朗読',
    '目前尚無經文紀錄': 'まだ記録はありません',
    '節經文': '節',
    '(你)': '(あなた)',
    '再結出 ': 'また ',
    '你還沒有建立任何專屬題庫。點擊上方按鈕開始！': 'まだ専用問題集がありません。',
    '你目前還沒有權限建立專屬題庫。有兩種方式可以解鎖：': '専用問題集を作成する権限がありません。解除方法2つ:',
    '方式一：': '方法1:',
    '方式二：': '方法2:',
    '掃描 QR 碼來挑戰！': 'QRコードをスキャンして挑戦！',
    '所屬經文組': '所属セット',
    '了解並加入 Premium': 'Premiumを了解して参加',
    '加入 Skool 成為 Premium 會員': 'SkoolでPremiumメンバーに',
    '完成揀選': '選択を確認',
    '上傳分數中...': 'スコアをアップロード中...',
    '很抱歉，沒有找到符合條件的經文或群組。': '申し訳ありません。該当する経文が見つかりませんでした。',
    '想要將神聖高分刻在群組榜單上嗎？': 'グループランキングにスコアを刻みますか？',
    '挑戰連結已複製到剪貼簿！': 'リンクをコピーしました！',
    '接下來：': '次：',
    '完成！': '完了！',
    '所有關卡完成！': '全てのステージ完了！',
    '你完成了所有經文！': '全ての経文を完了しました！',
    '出發': '出発',
    '進階設定與學習': '高度な設定と学習',
    '在 VerseRain 遊戲的「我的園子」中持續挑戰經文，獲得 20 顆果子，達到 ': '「私の園」で経文に挑戦し続け、20個の果実を得て',
    ' 個果子 🍎，達到 Lv.2 即可解鎖個人專屬連結！': 'に達すると個人リンクが解除されます！',
    '邀請朋友一起玩': '友達を招待してプレイ',
    '📨 邀請朋友一起玩': '📨 友達を招待してプレイ',
    '你的專屬推廣連結：當朋友們透過此連結直接進入加入 VerseRain，並完成他們的第一次背經遊戲，雙方都會自動獲得「推廣點數」獎勵，同時你也將累積推廣大使進度！': 'あなたのパーソナル招待リンク: 友達がこのリンクからVerseRainをロードし、最初のゲームを完了すると、両方にボーナスポイントが付与されます！',
    '想要擁有你的個人推薦碼並賺取推廣點數嗎？': 'パーソナル招待コードを取得して、紹介ポイントを獲得しますか？',
    'QR 碼': 'QRコード',
    '🌧️ VerseRain 經文雨 操作手冊': '🌧️ VerseRain 経文の雨 ユーザーマニュアル',
    '歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！': '<strong>VerseRain 経文の雨</strong>へようこそ！これは挑戦と学習を組み合わせたインタラクティブな暗唱プラットフォームです。<br />ここでは、グローバルな経文セットに挑戦し、独自の個人的な問題集を作成し、互恵経済のグローバルリーダーボードに自分の名前を載せることができます！',
    '🎯 一、如何開始遊玩？': '🎯 1. 遊び方は？',
    '只需簡單三步，您就能進入背經的挑戰中！': 'たった3つの簡単なステップで、経文暗唱の挑戦を始められます！',
    '1. 切換至「經文組」': '1. 「経文セット」に切り替える',
    '首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。': 'まず、左上隅のナビゲーションバーにある「経文セット」タブをクリックします。ここには、システムとプレイヤーによって作成されたすべての公開経文が表示されます。',
    '切換經文組': '経文セットの切り替え',
    '2. 選擇想要挑戰的經文組': '2. 挑戦したい経文セットを選ぶ',
    '點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。': 'リストからトピック（例：ヨハネの福音書 核心経文）をクリックして、それに含まれる経文レベルを展開します。',
    '選擇經文組': '経文セットの選択',
    '3. 開始遊戲': '3. ゲームを開始する',
    '點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！': '経文セット内の任意の経文の横にある「リーダーボード/プレイアイコン」をクリックすると、3秒後に経文の雨が降り注ぎます！',
    '開始遊戲': 'ゲーム開始',
    '🎬 實際遊玩流程示範（動畫）：': '🎬 実際のゲームプレイドラフト（アニメーション）：',
    '這是一段實際進入遊戲的流程示範！': 'これは実際のゲームプレイのデモンストレーションです！',
    '遊戲流程動畫': 'ゲームプレイアニメーション',
    '👑 二、如何自建專屬「經文組」？（Premium 會員獨享）': '👑 2. 専用の「経文セット」を自作するには？（プレミアム会員専用）',
    '如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！': '「互恵経済」コミュニティのプレミアム会員であれば、日曜学校や小グループ向けの独自の経文問題集を自由に作成できます！',
    '點擊上方導航列的 <strong>「👑 我的題庫」</strong>。': '上部のナビゲーションバーにある <strong>「👑 マイ問題集」</strong> をクリックします。',
    '在輸入框打下你想要的 <strong>新經文組名稱</strong>。': '入力ボックスに作成したい <strong>新しい経文セットのタイトル</strong> を入力します。',
    '利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。': '強力な <strong>魔法のワンクリック取得機能</strong> を使用します: セクションに経文の出典（例: <code>ヨハネ 3:16</code>）を入力し、横にある星の魔法ボタンをクリックします。',
    '系統將為您自動帶入完整的經文內容！': 'システムが完全な経文コンテンツを自動的にインポートします！',
    '在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。': 'すべてが正しいことを確認した後、左上隅の <strong>「公開する (Publish)」</strong> をクリックします。',
    '恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！': 'おめでとうございます！この経文セットは瞬時にグローバルデータベースにアップロードされ、「経文セット」で挑戦できるようになります！',
    '<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！': '<strong>💡 ヒント：</strong> 魔法のワンクリック取得機能は、正確な中国語聖書データベースに接続されているため、手動での入力と校正の時間を大幅に節約できます。「創世記 1:1」と入力して、その1秒でのインポートの滑らかさを体験してみてください！',
    '🏆 三、個人積分全球排行榜': '🏆 3. 個人のスコアグローバルリーダーボード',
    '點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：': '<strong>「リーダーボード」</strong> をクリックすると、メインボードが表示されます：',
    '<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！': '<strong>個人のクリアポイントランキング：</strong> チャレンジをクリアする限りポイントが貯まり、自己ベストを更新してもカウントされます！',
    '<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。': '<strong>最も人気のある経文セットのランキング：</strong> 多くプレイされた経文セットほど、このボードで最高の栄誉を獲得します。',
    '想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！': '高順位を獲得したいですか？それなら根気よく挑戦し続けるか、誰もが楽しめる経文セットを作成しましょう！',
    '🎤 四、全新語音模式 (Voice Mode)': '🎤 4. 新しい音声モード',
    '除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>': 'ブロックをクリックするだけでなく、自分の声で直接<strong>経文を暗唱できるようになりました！</strong>',
    '<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！': '<strong>スマートな曖昧認識：</strong> システムには強力な曖昧な音声認識機能が組み込まれています。不正確な発音や訛りがあっても、似た音であれば通過できます！',
    '<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。': '<strong>役立つヒントシステム：</strong> もし行き詰まったら、システムは3秒後に自動的に部分的なヒントを出してくれます。',
    '<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！': '<strong>スコアボーナス：</strong> 神の言葉を声に出して宣言することを奨励するために、音声モードでは<strong>「残り時間ボーナス」の比重が30%増加します</strong>！',
    '⚔️ 五、多人即時連線對戰': '⚔️ 5. リアルタイムマルチプレイ',
    '背經文不再是一個人孤單的事！': '経文の暗唱はもう孤独な作業ではありません！',
    '點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。': '<strong>「マルチプレイ」</strong>をクリックして専用の部屋を作成し、グループメンバーや家族を招待して参加させましょう。',
    '房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。': 'ホストはグローバルな問題集から<strong>「競技用の経文」</strong>を選ぶことができます。',
    '所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！': '全員が同時に挑戦を開始し、ゲーム終了後にはリアルタイムの成績ランキングを見ることができます。日曜学校のアクティビティやグループの交流に最適です！',
    'Verse Rain 讓背記經文變得生動有趣！': 'VerseRainは聖書暗唱を楽しくします！',
    '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。': 'ある中国の教会では、VerseRainアプリを使って会衆向けに「聖書暗唱コンテスト」を開催しました。家族や小グループのすべての年齢層が参加できました。彼らは4台のプロジェクターを設置し、4つのチームが同時に同じ経文セットのチャレンジモードで競い合えるようにしました。',
    '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。': '4歳の男の子と3歳の妹が、VerseRainで中国語の「主の祈り」を暗唱できることを熱心に披露してくれました。彼らはアメリカで生まれましたが、中国語を読み、このゲームを遊ぶことができます。',
    '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。': '聖書の経文の単語が空から降ってきます。プレイヤーは正しい順序で経文をクリックしてスコアを獲得します。経文がクリックされると音声で読み上げられ、視覚と聴覚の両方から記憶を強化します。',
    '學習多種語言的聖經經文！': '多言語で聖書の経文を学びましょう！',
    '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。': '単語をクリックするとテキスト読み上げ機能で朗読され、暗唱の印象を深めます。',
    '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。': 'VerseRainを通じ、無限に近い経文、経文セット、様々な聖書翻訳をサポートします。',
    '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。': '複数の難易度が用意されており、子供から大人まで自分の限界に挑戦するのに最適です。',
    '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。': 'チャレンジモードは、同じ経文セット内の関連する複数の経文の記憶を強化するのに役立ちます。',
    '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！': 'オンラインリーダーボードは、会衆、青年フェローシップ、小グループのメンバーが一緒に参加して改善するよう動機付けます！',
    '<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。': '<strong>新しい音声モード：</strong> 最新の曖昧な音声認識技術を組み合わせることで、声に出して直接暗唱することができます！標準的でない発音でも、スマートにレベルをクリアできます。神の言葉を大声で宣言し、さらに30%のスコアボーナスを獲得しましょう。',
    '<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！': '<strong>リアルタイムマルチプレイ：</strong> 専用の部屋の作成をサポートし、家族やグループメンバーがそれぞれの携帯電話で同時に同じ経文に挑戦し、リアルタイムでの競争の楽しさを味わうことができます！',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': 'レベルを上げるために、あなたの庭で実を結びましょう！あなたが',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': 'に達すると、独自の経文セットの作成権限が自動的に解放されます！',
    '共識實踐者': 'レベル 3',

      "我的專屬題庫": "マイ問題集",
    "簡介": "説明",
    "經文列表": "経文リスト",
    "取消": "キャンセル",
    "編輯": "編集",
    "語音模式": "音声モード",
    "多人即時連線對戰": "リアルタイム対戦",
    "通關紀錄": "クリア記録",
    "申請帳號": "サインアップ",
    "操作詳解": "詳細な説明",
    "關於我們": "概要",
    "VerseRain 開發資訊": "開発情報とクレジット",
    "解鎖進階功能": "プレミアムを解除",
    "加入進階群組": "プレミアムコミュニティに参加",
    "意見回饋": "フィードバック",
    "聯絡與建議": "バグと提案",
    "關閉視障經文雨": "視覚障害者モードをオフ",
    "打開視障經文雨": "視覚障害者モードをオン",
    "為視覺障礙朋友設計的語音模式": "視覚障害者のための音声モード",
    "關閉效能模式": "パフォーマンスモードをオフ",
    "打開效能模式": "パフォーマンスモードをオン",
    "關閉華麗特效以提升流暢度": "パフォーマンス向上のためエフェクトをオフ",
    "關閉 Debug": "デバッグをオフ",
    "打開 Debug": "デバッグをオン",
    "顯示除錯資訊": "デバッグ情報を表示",
    "朗讀語音設定": "音声読み上げ設定",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "お好みの音声を選択してください。ホームの「読む」やゲーム内の音声で使用されます。",
    "系統預設語音": "システムのデフォルト音声",
    "試聽": "試聴",
    "語音已更新！": "音声が更新されました！",
    "這是你選擇的語音試聽。": "これは選択した音声の試聴です。",
    "已記住你的語音偏好，下次回來會自動使用。": "音声設定が保存されました。次回から自動的に適用されます。",
};

  const koDict = {
    '挑戰': '도전',
    '經文組': '구절 세트',
    '排行榜': '리더보드',
    '👑 我的題庫': '👑 내 문제집',
    '使用說明': '사용 설명서',
    '關於': '정보',
    '連線對戰': '멀티플레이',
    '你的名字:': '이름:',
    '登入 / 修改': '로그인 / 수정',
    '經文': '말씀',
    '無干擾': '방해 없음',
    '單字干擾': '단어 방해',
    '標點干擾': '기호 방해',
    '選擇': '선택',
    '創建主題：': '주제 생성:',
    '創建': '생성',
    '連線對戰 (2~4人)': '멀티플레이 (2~4인)',
    '發起對戰': '대결 시작',
    '加入對戰': '대결 참여',
    '房間代碼:': '방 코드:',
    '返回': '뒤로',
    '遊玩': '플레이',
    '自建題庫': '문제집 만들기',
    '標題': '제목',
    '例如：約翰福音核心經文': '예: 요한복음 핵심 구절',
    '簡介': '설명',
    '這是一組關於生命與愛的經文...': '이것은 생명과 사랑에 관한 구절입니다...',
    '作者 (選填)': '작성자 (선택)',
    '取消作者': '작성자 취소',
    '匿名玩家': '익명 플레이어',
    // Comprehensive ko additions batch 2
    '開始': '시작',
    '跳過': '건너뛰기',
    '送出': '제출',
    '複製': '복사',
    '離開': '나가기',
    '離開對戰': '대결 나가기',
    '離開房間': '방 나가기',
    '離開遊戲': '게임 나가기',
    '確定要刪除嗎？': '정말 삭제하시겠습니까?',
    '確認儲存': '저장 확인',
    '再玩一次': '다시 플레이',
    '回到主頁': '홈으로 돌아가기',
    '直接遊玩': '직접 플레이',
    '立刻挑戰': '지금 도전',
    '測試遊玩': '테스트 플레이',
    '隨機播放': '랜덤 재생',
    '隨機播放所選數量的經文圖卡與語音': '선택한 수의 구절과 오디오를 무작위로 재생',
    '遊玩這篇經文': '이 구절 플레이',
    '分享挑戰連結': '도전 링크 공유',
    '分享整組經文連結': '세트 링크 공유',
    '📋 複製連結': '📋 링크 복사',
    '邀請連結已複製！快發給好朋友吧！': '초대 링크가 복사되었습니다! 친구에게 보내세요!',
    '邀人PK': '대결 초대',
    '讓大家掃描這個 QR 碼，一起來挑戰這段經文！': 'QR 코드를 스캔해서 이 구절에 도전하세요!',
    '最終得分': '최종 점수',
    '時間加成': '시간 보너스',
    '難度加成': '난이도 보너스',
    '難度級別': '난이도 레벨',
    '通關基礎分': '클리어 기본 점수',
    '比賽開始': '대결 시작',
    '比賽結束': '대결 종료',
    '準備比賽！': '대결 준비를 하세요!',
    '回合': '라운드',
    '回合紀錄': '라운드 기록',
    '下一回合': '다음 라운드',
    '下一局加油，還有': '다음에도 파이팅! 남은',
    '還剩': '남은',
    '次的機會': '기회',
    '完美的順序！': '완벽한 순서!',
    '對局結束！': '게임 종료!',
    '連戰結束！': '연속 대결 종료!',
    '再接再厲！': '계속 파이팅!',
    '出發！': '출발!',
    '太棒了！準備下一回合': '대단해요! 다음 라운드 준비',
    '등待其他玩家完成...': '다른 플레이어를 기다리는 중...',
    '等待其他玩家完成...': '다른 플레이어를 기다리는 중...',
    '等待玩家...': '플레이어를 기다리는 중...',
    '等待中...': '대기 중...',
    '您已出局！': '탈락하셨습니다!',
    '防線已經崩潰。請等待隊友完成...': '방어선이 무너졌습니다. 팀원을 기다리는 중...',
    '這是最後一關了！為隊友祈禱吧！': '마지막 스테이지! 팀원을 응원하세요!',
    '雙方準備就緒後即將開始': '양쪽이 준비되면 시작됩니다',
    '已加入的玩家:': '참가한 플레이어:',
    '玩家狀態:': '플레이어 상태:',
    '選擇比賽經文': '대결 구절 선택',
    '建立房間 (Host Game)': '방 만들기 (Host Game)',
    '開房間邀請連線遊玩': '방 만들고 초대하기',
    '請朋友輸入上方的代碼來加入您的遊戲': '친구에게 위 코드를 입력하도록 하세요',
    '或掃描此 QR Code 快速加入': '또는 이 QR 코드를 스캔하세요',
    '分享此代碼讓更多人加入': '이 코드를 공유하여 더 많은 사람을 초대하세요',
    '查看成績': '성적 보기',
    '查看最終成績': '최종 성적 보기',
    '英雄榜': '영웅 보드',
    '全域英雄榜': '글로벌 영웅 보드',
    '總排名': '종합 순위',
    '總計得分': '총 점수 합계',
    '尚無排行紀錄，您是第一位！': '첫 번째 기록입니다!',
    '尚無排行紀錄，趕緊成為第一位吧！': '첫 번째가 되세요!',
    '載入排行榜中...': '리더보드 로딩 중...',
    '登入': '로그인',
    '密碼': '비밀번호',
    '電子郵件': '이메일',
    '註冊新帳號': '새 계정 등록',
    '建立新帳號 ': '새 계정 만들기 ',
    '已經有帳號？': '이미 계정이 있으신가요?',
    '設定': '설정',
    '設定成功！觀迎遊玩，': '설정 완료! 환영합니다, ',
    '修改個人資料': '프로필 수정',
    '個人資料修改成功！': '프로필이 업데이트되었습니다!',
    '暱稱不能為空！': '닉네임은 비워둘 수 없습니다!',
    '請先告訴我們你的名字！': '먼저 이름을 알려주세요!',
    '請先在上方的信箱欄位輸入您的信箱！': '먼저 이메일을 입력해 주세요!',
    '請先在前方選定書卷並輸入章節，按下 Enter 或 Tab 後即可解鎖此欄位': '먼저 책과 절을 입력하고 Enter 또는 Tab을 누르세요',
    '請先選擇書卷': '먼저 성경을 선택하세요',
    '請填寫標題': '제목을 입력해 주세요',
    '請至少新增一節經文': '적어도 구절 하나를 추가해 주세요',
    '請輸入您目前的密碼以確認身分！': '현재 비밀번호를 입력하세요!',
    '加入': '참가',
    '儲存題庫': '세트 저장',
    '建立新題庫': '새 문제집',
    '公開此題庫 (Publish to Global Verse Sets)': '전 세계에 공개 (Publish)',
    '新增一節經文': '한 구절 추가',
    '操作': '조작',
    '描述一下這個題庫的用途...': '세트의 용도를 설명하세요...',
    '內容片段': '텍스트 조각',
    '章:節 (如 3:16)': '장:절 (예: 3:16)',
    '選擇書卷': '성경 선택',
    '選擇隨機題數': '랜덤 문제 수 선택',
    '隨機挑戰所選題數': '랜덤 도전',
    '隨機挑選': '랜덤 선택',
    '單獨經文': '단일 구절',
    '返回經文組': '구절 세트로 돌아가기',
    '經文組資料夾': '세트 폴더',
    '新密碼 (選填)': '새 비밀번호 (선택)',
    '目前密碼 (必填)': '현재 비밀번호 (필수)',
    '目前暱稱': '현재 닉네임',
    '顯示暱稱': '닉네임 표시',
    '輸入名稱...': '이름 입력...',
    '輸入房間代碼': '방 코드 입력',
    '輸入目前密碼驗証身分': '확인을 위해 현재 비밀번호 입력',
    '若不修改請留空': '수정하지 않는 경우 빈칸으로 두세요',
    '選一個頭像，或直接輸入文字': '아바타를 선택하거나 텍스트를 입력하세요',
    '解鎖自訂經文組功能！': '맞춤 구절 세트 기능 잠금 해제!',
    '恭喜！你已解鎖專屬題庫功能！': '전용 문제집 기능을 잠금 해제했습니다!',
    '身為 Lv.3 以上的實踐者，你現在可以前往「進階功能 ➔ 我的專屬題庫」自由創建與分享你專屬的經文組了！': 'Lv.3+로서 고급 기능에서 전용 문제집을 만들 수 있습니다!',
    '新約': '신약',
    '舊約': '구약',
    '等級 0 (無干擾方塊，2x2)': '레벨 0 (방해 없음, 2x2)',
    '等級 1 (少量干擾，2x2)': '레벨 1 (소량 방해, 2x2)',
    '等級 2 (中等干擾，3x3)': '레벨 2 (중간 방해, 3x3)',
    '等級 3 (極限干擾，3x3)': '레벨 3 (극한 방해, 3x3)',
    '等級越高，會有越多錯誤的干擾方塊混在裡面！': '레벨이 높을수록 방해 블록이 많아집니다!',
    '遊戲模式': '게임 모드',
    '語音控制開關': '음성 제어',
    '朗讀經文': '구절 낭독',
    '目前尚無經文紀錄': '아직 구절 기록이 없습니다',
    '節經文': '절',
    '(你)': '(나)',
    '再結出 ': '다시 열매 ',
    '你還沒有建立任何專屬題庫。點擊上方按鈕開始！': '아직 전용 문제집을 만들지 않았습니다.',
    '你目前還沒有權限建立專屬題庫。有兩種方式可以解鎖：': '아직 전용 문제집을 만들 권한이 없습니다. 잠금 해제 방법:',
    '方式一：': '방법 1:',
    '方式二：': '방법 2:',
    '掃描 QR 碼來挑戰！': 'QR 코드를 스캔하여 도전하세요!',
    '所屬經文組': '속한 구절 세트',
    '了解並加入 Premium': 'Premium 알아보기',
    '加入 Skool 成為 Premium 會員': 'Skool에서 Premium 회원 되기',
    '완성揀選': '선택 확인',
    '完成揀選': '선택 확인',
    '上傳分數中...': '점수 업로드 중...',
    '很抱歉，沒有找到符合條件的經文或群組。': '죄송합니다. 조건에 맞는 구절이나 그룹을 찾지 못했습니다.',
    '想要將神聖高分刻在群組榜單上嗎？': '그룹 리더보드에 점수를 기록하고 싶으신가요?',
    '挑戰連結已複製到剪貼簿！': '링크가 복사되었습니다!',
    '接下來：': '다음:',
    '完成！': '완료!',
    '所有關卡完成！': '모든 스테이지 완료!',
    '你完成了所有經文！': '모든 구절을 완료했습니다!',
    '出發': '출발',
    '進階設定與學習': '고급 설정 및 학습',
    '在 VerseRain 遊戲的「我的園子」中持續挑戰經文，獲得 20 顆果子，達到 ': 'VerseRain의 나의 정원에서 계속 도전하여, 열매 20개를 얻고 ',
    ' 個果子 🍎，達到 Lv.2 即可解鎖個人專屬連結！': ' 에 도달하세요. Lv.2에 도달하면 개인 링크가 열립니다!',

    '新增經文': '구절 추가',
    '取消': '취소',
    '儲存': '저장',
    '編輯題庫': '문제집 편집',
    '新增題庫': '문제집 생성',
    '編輯': '편집',
    '刪除': '삭제',
    '開始遊戲': '게임 시작',
    '本週進度 : ': '이번 주 진도 : ',
    '經文出處 (點擊觀看)': '출처 (클릭하여 보기)',
    '排行': '순위',
    '魔法一鍵抓取 (輸入出處)': '마법 원클릭 (출처 입력)',
    '從聖經抓取經文': '성경에서 구절 가져오기',
    '經文內容': '구절 내용',
    '正確答案 (例如 5,4,3,2,1 或留空自動順序)': '정답 (예: 5,4,3,2,1 또는 빈칸)',
    '👑 發佈至全球 (Publish)': '👑 글로벌 게시 (Publish)',
    '本日排行': '일간',
    '本月排行': '월간',
    '歷史總榜': '전체 순위',
    '個人總積分排行榜': '개인 총점 순위',
    '玩家名稱': '플레이어 이름',
    '紀錄次數/完成數': '기록 횟수/완료 횟수',
    '目前尚無紀錄': '아직 기록이 없습니다',
    '最受歡迎經文排行榜': '가장 인기 있는 구절 순위',
    '經文出處': '구절 출처',
    '遊玩次數': '플레이 횟수',
    '完成次數': '완료 횟수',
    '此經文組的介面語言': '이 구절 세트의 UI 언어',
    '尚未發現經文組': '구절 세트를 찾을 수 없습니다',
    '有關': '소개',
    '解鎖經文組': '구절 세트 잠금 해제',
    '最高分': '최고 점수',
    '載入中...': '로딩 중...',
    '🌳 我的園子': '🌳 나의 정원',
    '我的園子': '나의 정원',
    '種植': '심은 수',
    '大樹': '큰 나무',
    '果子': '열매',
    '嫩芽': '새싹',
    '幼苗': '어린 싹',
    '小樹': '작은 나무',
    '成長中': '성장 중',
    '快完成了': '거의 다 됐',
    '空地': '빈 땅',
    '多人連線': '멀티플레이',
    '搜尋': '검색',
    '搜尋經文': '구절 검색',
    '輸入關鍵字，例如「利未記」或「醫治」...': '키워드 입력, 예: "레위기" 또는 "치유"...',
    '請輸入關鍵字開始搜尋。': '검색을 시작하려면 키워드를 입력하세요.',
    '大廳': '로비',
    '地圖': '지도',
    '進階功能': '고급 기능',
    '全球玩家地圖': '글로벌 플레이어 지도',
    '點擊標記查看玩家成績': '마커를 클릭하여 플레이어 점수 확인',
    '位玩家遍佈全球': '명의 전 세계 플레이어',
    '場比賽進行中': '개의 진행 중인 게임',
    '重新整理': '새로고침',
    '還沒有玩家資料，完成一局遊戲後你的位置就會出現！': '아직 데이터가 없습니다. 게임 완료 후 위치가 표시됩니다!',
    '最後上線': '최근 온라인',
    '等待遊戲開始...': '게임 시작 대기 중...',
    '現在等候遊戲主人選好經文，': '호스트가 구절을 선택하기를 기다리는 중입니다,',
    '請稍後。。。': '잠시만 기다려주세요...',
    '如果你準備好了，請按下「我準備好了」的鍵': '준비가 되었으면 "준비 완료" 버튼을 눌러주세요',
    '我準備好了': '준비 완료',
    '回到大廳': '로비로 돌아가기',
    '登出': '로그아웃',
    '互惠種子': '호혜 씨앗',
    '探索學員': '탐색 수강생',
    '共識實踐者': '공감 실천가',
    '價值貢獻者': '가치 공헌자',
    '生態連結者': '생태 연결자',
    '方田開拓者': '개척자',
    '互惠建設者': '호혜 건설자',
    '推廣大使': '홍보 대사',
    '生態系架構師': '생태계 설계자',
    '互惠階級說明': '호혜 계급 설명',
    '目前階級': '현재 계급',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': '동산에서 묘목을 계속 돌보고 열매를 맺으면 호혜 계급이 올라갑니다! ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': '에 도달하면, 전용 문제집 작성 권한이 자동으로 해제됩니다!',
    '解鎖建立專屬題庫': '전용 문제집 생성 잠금 해제',
    '關閉': '닫기',
    '每挑戰一節新經文，就會在空地上長出嫩芽。持續練習讓它長大！通過經文變成大樹，創新高則結出果子🍎': '새로운 구절에 도전할 때마다 빈터에 새싹이 자랍니다. 계속 연습하여 성장시키세요! 통과하면 큰 나무가 되고, 최고 점수를 기록하면 열매를 맺습니다🍎',
    '我的收成': '나의 수확',
    '過關斬將結出果子，提升你的互惠階級！': '시련을 이겨내고 열매를 맺어 호혜 계급을 올리세요!',
    '總果子數量': '총 열매 수',
    '最受歡迎經文組': '가장 인기 있는 구절 세트',
    '歡迎來到 VerseRain': 'VerseRain에 오신 것을 환영합니다',
    '澆灌心田，結出生命果子': '마음에 물을 주어, 생명의 열매를 맺으세요',
    '經典挑戰': '클래식 도전',
    '挑戰全球經文組，鍛鍊記憶力與專注力。': '전 세계 구절 세트에 도전하고 기억력과 집중력을 기르세요.',
    '一起玩!': '함께 놀아요!',
    '與家人朋友分享房間碼來PK同樂！': '가족, 친구와 방 코드를 공유하고 함께 대결하세요!',
    '與家人朋友分享房間碼來PK同樣！': '가족, 친구와 방 코드를 공유하고 함께 대결하세요!',
    '檢視你已經學會並種下生命樹的經文。': '당신이 배우고 생명나무로 심은 구절을 확인하세요.',

    // ─── 누락된 번역 일괄 추가 ─────────────────────
    // Game modes
    '九宮格': '성경비',
    '經文雨': '말씀비',
    '獨立九宮格 (Solo Square)': '솔로 성경비',
    '模式': '모드',
    '難度': '난이도',
    '挑戰設定': '도전 설정',
    '挑戰這節經文': '이 구절에 도전하기',
    '點擊查看，雙擊挑戰！': '클릭하여 보기, 두 번 클릭하여 도전!',
    '雙擊格子開始挑戰！': '셀을 두 번 클릭하여 도전하세요!',
    '點擊查看經文，雙擊開始挑戰！': '클릭하여 구절 보기, 두 번 클릭하여 도전!',
    '（在此裝置上未找到經文文字，但仍可雙擊挑戰）': '(이 기기에서 구절 텍스트를 찾을 수 없지만 두 번 클릭하여 도전 가능)',
    '在此裝置上未找到經文文字，但仍可雙擊挑戰': '이 기기에서 구절 텍스트를 찾을 수 없지만 두 번 클릭하여 도전 가능',
    '本機找不到此經文': '이 기기에서 구절을 찾을 수 없습니다',
    '(經文內容未找到)': '(내용 없음)',
    '示範': '데모',
    '電腦自動完成（分數歸零）': '자동 완성 (점수 초기화)',
    '過關': '통과',
    '失敗': '실패',
    '完美': '완벽',
    '新高分！': '새 최고 점수!',
    '完美無瑕！': '완벽해!',
    '連戰結束！': '연속 전투 종료!',
    '對局結束！': '게임 종료!',
    '將暫時切換語言來挑戰，完成後自動恢復': '잠시 언어를 전환하여 도전합니다. 완료 후 자동으로 복원됩니다',
    '與朋友一起挑戰九宮格模式！最快拼出經文的人獲勝。': '친구와 함께 성경비 모드에 도전하세요! 가장 빨리 구절을 완성한 사람이 승리합니다.',

    // Garden
    '棵植物': '그루',
    '的園地': '의 정원',
    '可用手指滑動來瀏覽園子': '손가락으로 정원을 탐색하세요',
    '該玩家尚未分享園地': '이 플레이어는 아직 정원을 공유하지 않았습니다',
    '這個玩家的園地還是空的！': '이 플레이어의 정원은 아직 비어 있습니다!',
    '無法載入': '로드 실패',
    '點擊查看此玩家的園地': '이 플레이어의 정원 보기',

    // History / Reciprocity
    '互惠點數紀錄': '상호 혜택 점수 기록',
    '推薦紀錄': '추천 기록',
    '專屬題庫遊玩紀錄': '전용 문제집 기록',
    '尚未有任何推薦紀錄。分享邀請碼邀請朋友獲得互惠點數！': '아직 추천 기록이 없습니다. 초대 코드를 공유하여 친구를 초대하세요!',
    '尚未有玩家遊玩你的專屬題庫。建立更多題庫來吸引大家挑戰！': '아직 플레이어가 전용 문제집을 플레이하지 않았습니다. 더 많은 문제집을 만들어 도전을 유치하세요!',
    '玩家': '플레이어',
    '突破了你的題庫': '문제집을 클리어했습니다',
    '點': '점',
    '推薦了玩家': '플레이어를 추천했습니다',
    '透過': '를 통해',
    '的推薦加入': '의 추천으로 가입했습니다',
    '加入了 VerseRain': 'VerseRain에 가입했습니다',

    // Leaderboard
    '今天': '오늘',
    '30天 (本月)': '30일 (이번 달)',
    '歷史': '전체',
    '點擊標記查看玩家成績，雙擊遊戲房間加入戰局！': '마커를 클릭하여 플레이어 점수 확인, 더블클릭으로 게임방 참가!',

    // Advanced features / menu
    '解鎖進階功能': '고급 기능 잠금 해제',
    '建立自訂經文組': '맞춤 구절 세트 만들기',
    '我的專屬題庫': '나의 전용 문제집',
    '操作詳解': '자세한 지침',
    '關於我們': '소개',
    '意見回饋': '피드백',
    '聯絡與建議': '연락 및 제안',
    '加入進階群組': '프리미엄 그룹 가입',
    'Verse Rain 讓背記經文變得生動有趣！': 'VerseRain은 성경 암송을 재미있고 생동감 있게 만들어줍니다!',
    'VerseRain 開發資訊': 'VerseRain 개발 정보',

    // Blind mode
    '打開視障經文雨': '시각 장애 모드 활성화',
    '關閉視障經文雨': '시각 장애 모드 비활성화',
    '為視覺障礙朋友設計的語音模式': '시각 장애인을 위한 음성 모드',

    // Auth
    '登入帳號': '계정 로그인',
    '忘記密碼？': '비밀번호를 잊으셨나요?',
    '還沒有帳號？': '계정이 없으신가요?',
    '立即註冊': '지금 가입하기',
    '在此登入': '여기서 로그인',
    '申請帳號': '계정 신청',
    '✨ Premium 認證': '✨ Premium 인증',
    '🔒 基本帳號': '🔒 기본 계정',
    '哈囉 ': '안녕 ',
    '！您的密碼如下：': '! 비밀번호는 다음과 같습니다:',
    '請複製密碼後貼到上方密碼欄位登入': '비밀번호를 복사하여 위의 비밀번호 칸에 붙여넣고 로그인하세요',
    '複製密碼': '비밀번호 복사',
    '找不到此信箱，請確認是否輸入正確': '이메일을 찾을 수 없습니다. 올바르게 입력했는지 확인해 주세요',
    '連線失敗 (Connection Error)': '연결 실패 (Connection Error)',
    '請確認房間代碼是否正確': '방 코드를 확인해 주세요',

    // Misc
    '✔️ 已準備': '✔️ 준비 완료',
    '已準備': '준비 완료',
    '準備！': '준비!',
    '返回目錄': '목차로 돌아가기',
    '選擇比賽經文組': '대결 구절 세트 선택',
    '目前選擇': '현재 선택',
    '沒有找到匹配的經文組。': '일치하는 구절 세트가 없습니다.',
    '準備儲存 (Local)': '저장 준비 (로컬)',
    '您尚未解鎖此項功能！': '이 기능은 아직 잠금 해제되지 않았습니다!',
    '查詢失敗': '조회 실패',
    '無法連線到伺服器': '서버에 연결할 수 없습니다',
    '次': '회',
    '在此登入': '여기서 로그인',

    // Invite / Referral section
    '邀請朋友一起玩': '친구 초대하기',
    '你的專屬推廣連結：當朋友們透過此連結直接進入加入 VerseRain，並完成他們的第一次背經遊戲，雙方都會自動獲得「推廣點數」獎勵，同時你也將累積推廣大使進度！': '나의 초대 링크: 친구가 이 링크를 통해 VerseRain에 가입하고 첫 번째 게임을 완료하면, 양쪽 모두 「추천 점수」 보상을 받으며 홍보 대사 진度도 쌓입니다!',
    '想要擁有你的個人推薦碼並賺取推廣點數嗎？': '개인 초대 코드를 받고 추천 점수를 적립하고 싶으신가요?',
    '複製': '복사',
    '📨 邀請朋友一起玩': '📨 친구 초대하기',

    // Difficulty options in dropdown
    '難度 0': '난이도 0',
    '難度 1': '난이도 1',
    '難度 2': '난이도 2',
    '難度 3': '난이도 3',

    // Garden growth stage legend
    '嫩芽 (第1次玩)': '새싹 (첫 번째 도전)',
    '幼苗 (練習中)': '어린 싹 (연습 중)',
    '小樹 (持續成長)': '작은 나무 (계속 성장)',
    '大樹 (通過!)': '큰 나무 (통과!)',
    '結果子 (創新高!)': '열매 맺음 (최고 기록!)',

    // Verse set listing
    '最受歡迎': '인기순',
    '最新': '최신순',
    '作者': '작성자',
    '點閱次數': '조회수',
    'Verserain 官方': 'Verserain 공식',
    '匿名玩家': '익명 플레이어',
    'QR 碼': 'QR 코드',
    '🌧️ VerseRain 經文雨 操作手冊': '🌧️ VerseRain 말씀비 설명서',
    '歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！': '<strong>VerseRain 말씀비</strong>에 오신 것을 환영합니다! 도전과 학습을 결합한 인터랙티브 성경 암송 플랫폼입니다.<br />여기서는 글로벌 구절 세트에 도전하고, 나만의 개인 문제집을 만들고, 상호 경제 글로벌 리더보드에 이름을 올릴 수 있습니다!',
    '🎯 一、如何開始遊玩？': '🎯 1. 어떻게 플레이하나요?',
    '只需簡單三步，您就能進入背經的挑戰中！': '단 세 가지 간단한 단계로 성경 암송 도전을 시작할 수 있습니다!',
    '1. 切換至「經文組」': '1. "구절 세트"로 전환',
    '首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。': '먼저 왼쪽 상단 네비게이션 바의 "구절 세트" 탭을 클릭하세요. 시스템과 플레이어가 만든 모든 공개 구절 세트가 표시됩니다.',
    '切換經文組': '구절 세트 전환',
    '2. 選擇想要挑戰的經文組': '2. 구절 세트 선택',
    '點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。': '목록에서 주제(예: 요한복음 핵심 구절)를 클릭하여 그 안의 구절 레벨을 펼칩니다.',
    '選擇經文組': '구절 세트 선택',
    '3. 開始遊戲': '3. 게임 시작',
    '點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！': '구절 세트 아래 구절 옆의 "리더보드/플레이 아이콘"을 클릭하세요. 3초 후 말씀비가 내리기 시작합니다!',
    '開始遊戲': '게임 시작',
    '🎬 實際遊玩流程示範（動畫）：': '🎬 실제 게임 플레이 시연 (애니메이션):',
    '這是一段實際進入遊戲的流程示範！': '이것은 게임 플레이의 실제 시연입니다!',
    '遊戲流程動畫': '게임 플레이 애니메이션',
    '👑 二、如何自建專屬「經文組」？（Premium 會員獨享）': '👑 2. 맞춤형 "구절 세트"를 어떻게 만드나요? (프리미엄 전용)',
    '如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！': '"상호주의 경제" 커뮤니티의 프리미엄 회원이시면, 주일학교나 소그룹을 위한 자신만의 맞춤형 성경 문제집을 자유롭게 만들 수 있습니다!',
    '點擊上方導航列的 <strong>「👑 我的題庫」</strong>。': '상단 네비게이션 바의 <strong>"👑 내 문제집"</strong>을 클릭하세요.',
    '在輸入框打下你想要的 <strong>新經文組名稱</strong>。': '입력란에 원하는 <strong>새 구절 세트 제목</strong>을 입력하세요.',
    '利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。': '강력한 <strong>매직 원클릭 가져오기 기능</strong>을 사용하세요: 구역에 성경 출처(예: <code>요한복음 3:16</code>)를 입력하고 옆의 별 모양 매직 버튼을 클릭하세요.',
    '系統將為您自動帶入完整的經文內容！': '시스템이 자동으로 전체 구절 내용을 가져옵니다!',
    '在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。': '모든 것이 올바른지 확인한 후 <strong>"게시(Publish)"</strong>를 클릭하세요.',
    '恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！': '축하합니다! 이 구절 세트는 글로벌 데이터베이스에 즉시 업로드되어 "구절 세트"에서 누구나 도전할 수 있게 됩니다!',
    '<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！': '<strong>💡 팁:</strong> 매직 원클릭 가져오기 기능은 정확한 중국어 성경 데이터베이스에 연결되어 있어 수동 타이핑 및 교정 시간을 크게 절약해 줍니다. "창세기 1:1"을 입력하여 1초 만에 원활하게 가져오는 것을 경험해 보세요!',
    '🏆 三、個人積分全球排行榜': '🏆 3. 개인 점수 글로벌 리더보드',
    '點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：': '<strong>"리더보드"</strong>를 클릭하면 메인 순위를 볼 수 있습니다:',
    '<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！': '<strong>개인 클리어 포인트 랭킹:</strong> 도전을 완료하여 포인트를 모으세요. 자신의 기록을 깨도 점수에 반영됩니다!',
    '<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。': '<strong>가장 인기 있는 구절 세트 순위:</strong> 구절 세트가 더 많이 플레이될수록 이 보드에서 영광이 더 높아집니다.',
    '想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！': '높은 순위를 원하시나요? 끊임없이 도전하거나 모두가 사랑하는 구절 세트를 만들어 보세요!',
    '🎤 四、全新語音模式 (Voice Mode)': '🎤 4. 새로운 음성 모드',
    '除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>': '블록을 클릭하는 것 외에도 이제 직접 <strong>음성으로 구절을 암송할 수 있습니다!</strong>',
    '<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！': '<strong>스마트 흐림 인식:</strong> 시스템은 강력한 모호한 음성 일치를 갖추고 있습니다. 부정확한 발음이나 억양에도 비슷한 소리가 통과됩니다!',
    '<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。': '<strong>도움말 힌트 시스템:</strong> 막히면 3초 후 시스템이 자동으로 부분 힌트를 주어 계속할 수 있도록 도와줍니다.',
    '<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！': '<strong>점수 보너스:</strong> 하나님의 말씀을 소리내어 선포하도록 장려하기 위해 음성 모드에서 <strong>"남은 시간 보너스" 가중치가 30% 증가합니다!</strong>',
    '⚔️ 五、多人即時連線對戰': '⚔️ 5. 멀티플레이어 실시간 대전',
    '背經文不再是一個人孤單的事！': '성경 암송은 더 이상 혼자 하는 일이 아닙니다!',
    '點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。': '<strong>"멀티플레이"</strong>를 클릭하여 비공개 방을 만들고 그룹 멤버나 가족을 초대하여 참여하세요.',
    '房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。': '호스트는 글로벌 구절 은행에서 <strong>"경쟁 구절"</strong>을 선택할 수 있습니다.',
    '所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！': '모두가 동시에 도전을 시작하고 게임이 끝난 후 실시간 순위표를 볼 수 있습니다. 주일학교 활동 및 소그룹 아이스 브레이킹에 적합합니다!',
    'Verse Rain 讓背記經文變得生動有趣！': 'VerseRain 말씀비는 성경 암송을 생생하고 재미있게 만듭니다!',
    '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。': '한 중국 교회에서 VerseRain 앱을 사용하여 성도들을 위한 「성경 암송 대회」를 개최했습니다. 가족과 소그룹의 모든 연령대가 참여했습니다. 그들은 4대의 프로젝터를 설치하여 4개 팀이 동시에 같은 구절 세트로 챌린지 모드에서 경쟁할 수 있었습니다.',
    '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。': '4살 남자아이와 3살 여동생이 VerseRain으로 중국어 「주기도문」을 암송할 수 있다는 것을 열성적으로 보여주었습니다. 그들은 미국에서 태어났지만 중국어를 읽고 이 게임을 플레이할 수 있습니다.',
    '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。': '성경 구절의 단어들이 하늘에서 떨어집니다. 플레이어는 올바른 순서로 구절을 클릭하여 점수를 얻습니다. 클릭 시 구절이 소리 내어 읽혀 시각과 청각 모두로 기억을 강화합니다.',
    '學習多種語言的聖經經文！': '여러 언어로 성경 구절을 배우세요!',
    '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。': '단어를 클릭하면 텍스트 음성 변환 기능으로 읽어줘 암송 기억을 깊게 합니다.',
    '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。': 'VerseRain을 통해 무한에 가까운 구절, 구절 세트, 다양한 성경 번역본을 지원합니다.',
    '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。': '어린이부터 어른까지 자신의 한계에 도전하기에 적합한 다양한 난이도를 제공합니다.',
    '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。': '챌린지 모드는 같은 구절 세트 내 여러 관련 구절의 기억을 강화하는 데 도움이 됩니다.',
    '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！': '온라인 리더보드는 성도, 청년부, 소그룹 구성원이 함께 참여하고 성장하도록 동기를 부여합니다!',
    '<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。': '<strong>새로운 음성 모드：</strong> 최첨단 모호한 음성 인식을 결합하여 음성으로 직접 암송할 수 있습니다! 발음이 표준이 아니더라도 스마트하게 레벨을 통과할 수 있습니다. 하나님의 말씀을 큰 소리로 선포하고 30%의 추가 점수 보너스를 받으세요.',
    '<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！': '<strong>멀티플레이어 실시간 대전：</strong> 비공개 방 만들기를 지원하여 가족이나 그룹 멤버가 각자의 전화기에서 동시에 동일한 구절에 도전하고 실시간 경쟁의 스릴을 즐길 수 있습니다!',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': '레벨을 올리려면 정원에 열매를 맺으세요! 당신이 ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': '에 도달하면 맞춤형 구절 세트 작성이 자동으로 잠금 해제됩니다!',
    '共識實踐者': '레벨 3',
      "經文列表": "구절 목록",
    "語音模式": "음성 모드",
    "多人即時連線對戰": "실시간 멀티플레이",
    "通關紀錄": "기록",
    "關閉效能模式": "성능 모드 끄기",
    "打開效能模式": "성능 모드 켜기",
    "關閉華麗特效以提升流暢度": "성능 향상을 위해 효과 끄기",
    "關閉 Debug": "디버그 끄기",
    "打開 Debug": "디버그 켜기",
    "顯示除錯資訊": "디버그 정보 표시",
    "朗讀語音設定": "음성 읽기 설정",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "선호하는 음성을 선택하세요. 홈의 '읽기' 및 게임 내 음성에 사용됩니다.",
    "系統預設語音": "시스템 기본 음성",
    "試聽": "미리듣기",
    "語音已更新！": "음성이 업데이트되었습니다!",
    "這是你選擇的語音試聽。": "선택한 음성의 미리듣기입니다.",
    "已記住你的語音偏好，下次回來會自動使用。": "음성 기본 설정이 저장되었으며 다음에 자동으로 사용됩니다.",
};




const myDict = {
    "我的園子": "ကျွန်ုပ်၏ဥယျာဉ်",
    "🌳 我的園子": "🌳 ကျွန်ုပ်၏ဥယျာဉ်",
    "多人連線": "ကစားသမားအများ",
    "🎮 多人連線": "🎮 ကစားသမားအများ",
    "排行榜": "အဆင့်သတ်မှတ်ချက်",
    "🏆 排行榜": "🏆 အဆင့်သတ်မှတ်ချက်",
    "搜尋": "ရှာဖွေရန်",
    "🔍 搜尋": "🔍 ရှာဖွေရန်",
    "地圖": "မြေပုံ",
    "🗺️ 地圖": "🗺️ မြေပုံ",
    "返回目錄": "နောက်သို့",
    "目前選擇": "လက်ရှိရွေးချယ်မှု",
    "九宮格": "၉ ကွက်",
    "四宮格": "၄ ကွက်",
    "經文雨": "ကျမ်းချက်မိုး",
    "單字干擾": "စကားလုံးအနှောင့်အယှက်",
    "無干擾": "အနှောင့်အယှက်မရှိ",
    "難度 0": "အခက်အခဲ ၀",
    "難度 1": "အခက်အခဲ ၁",
    "難度 2": "အခက်အခဲ ၂",
    "難度 3": "အခက်အခဲ ၃",
    "挑戰": "စတင်ကစားမည်",
    "隨機播放": "ကျပန်းဖွင့်မည်",
    "邀人PK": "ဖိတ်ခေါ်မည်",
    "經文出處(點擊觀看)": "ကျမ်းချက်အရင်းအမြစ်",
    "排行": "အဆင့်",
    "設定": "ဆက်တင်များ",
    "選擇比賽經文組": "ကျမ်းချက်ရွေးချယ်ရန်",
    "沒有找到匹配的經文組。": "ကိုက်ညီသောကျမ်းချက်မရှိပါ။",
    "準備！": "အဆင်သင့်!",
    "已準備": "အဆင်သင့်",
    "開始": "စတင်မည်",
    "加入對戰": "ပူးပေါင်းမည်",
    "建立對戰": "ဖန်တီးမည်",
    "你的名字:": "သင်၏နာမည်:",
    "登入 / 修改": "ဝင်ရောက် / ပြင်ဆင်",
    "登出": "ထွက်မည်",
    "經文組": "ကျမ်းချက်အစု",
    "隨機挑戰所選題數": "ကျပန်းစိန်ခေါ်မှု",
    "隨機播放所選數量的經文圖卡與語音": "ရွေးချယ်ထားသောကျမ်းပိုဒ်အရေအတွက်ကိုအသံဖြင့်ကျပန်းဖွင့်မည်",
    "邀請朋友一起玩": "သူငယ်ချင်းများကို ဖိတ်ခေါ်ရန်",
    "分享挑戰連結": "လင့်ခ်ကို မျှဝေရန်",
    "經典挑戰": "ဂန္ထဝင်စိန်ခေါ်မှု",
    "立刻挑戰": "ယခုစိန်ခေါ်မည်",
    "最受歡迎": "အထူးရေပန်းစားသော",
    "最新": "နောက်ဆုံးရ",
    "作者": "ရေးသားသူ",
    "點閱次數": "ကြည့်ရှုသူ",
    "Verserain 官方": "Verserain တရားဝင်",
    "匿名玩家": "အမည်မသိကစားသမား",
    "QR 碼": "QR ကုဒ်",
    "通關紀錄": "မှတ်တမ်း",
    "大廳": "ပင်မစာမျက်နှာ",
    "回到大廳": "ပင်မစာမျက်နှာသို့ ပြန်သွားရန်",
    "進階功能": "အဆင့်မြင့်လုပ်ဆောင်ချက်များ",
    "解鎖進階功能": "အဆင့်မြင့်လုပ်ဆောင်ချက်များ ဖွင့်ရန်",
    "身為 Lv.3 以上的實踐者，你現在可以前往「進階功能 ➔ 我的專屬題庫」自由創建與分享你專屬的經文組了！": "အဆင့် ၃ အထက်ကစားသမားအနေဖြင့် ယခုအခါ သင့်ကိုယ်ပိုင် ကျမ်းချက်များကို ဖန်တီးမျှဝေနိုင်ပါပြီ!",
    "申請帳號": "အကောင့်ဖွင့်ရန်",
    "登入帳號": "အကောင့်ဝင်ရန်",
    "登入": "အကောင့်ဝင်ရန်",
    "在此登入": "ဤနေရာတွင် အကောင့်ဝင်ရန်",
    "請複製密碼後貼到上方密碼欄位登入": "ကျေးဇူးပြု၍ စကားဝှက်ကိုကူးယူပြီး အပေါ်ရှိ စကားဝှက်အကွက်တွင် ထည့်သွင်းပါ",
    "返回登入": "အကောင့်ဝင်ရန်သို့ ပြန်သွားရန်",
    "驗證": "အတည်ပြုရန်",
    "建立新帳號 ": "အကောင့်အသစ်ဖွင့်ရန်",
    "一起玩!": "အတူတူကစားကြစို့!",
    "邀請朋友一起玩": "သူငယ်ချင်းများကို ဖိတ်ခေါ်ရန်",
    "📨 邀請朋友一起玩": "📨 သူငယ်ချင်းများကို ဖိတ်ခေါ်ရန်",
    "朗讀經文": "ကျမ်းချက်ဖတ်ပြရန်",
    "讀經": "ဖတ်ရှုရန်",
    "換一個": "ပြောင်းရန်",
    "與家人朋友分享房間碼來PK同樂！": "မိသားစု၊ သူငယ်ချင်းများနှင့် အခန်းကုဒ်ကို မျှဝေပြီး အတူတူကစားပါ!",
    "挑戰全球經文組，鍛鍊記憶力與專注力。": "ကမ္ဘာတစ်ဝှမ်းရှိ ကျမ်းချက်များကို စိန်ခေါ်ပြီး မှတ်ဉာဏ်နှင့် အာရုံစူးစိုက်မှုကို လေ့ကျင့်ပါ။",
    "檢視你已經學會並種下生命樹的經文。": "သင်လေ့လာပြီး စိုက်ပျိုးထားသော အသက်ပင်ကျမ်းချက်များကို ကြည့်ရှုပါ။",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "သင်နှစ်သက်ရာ အသံကို ရွေးချယ်ပါ။",
    "我的專屬題庫": "ကျွန်ုပ်၏ သီးသန့်အစုများ",
    "新增題庫": "အစုသစ်",
    "進階設定與學習": "အဆင့်မြင့် ဆက်တင်များ",
    "標題": "ခေါင်းစဉ်",
    "簡介": "ဖော်ပြချက်",
    "經文列表": "ကျမ်းချက်များ",
    "新增一節經文": "ကျမ်းချက်ထည့်ရန်",
    "儲存題庫": "သိမ်းဆည်းရန်",
    "取消": "ပယ်ဖျက်ရန်",
    "公開此題庫 (Publish to Global Verse Sets)": "အများပြည်သူသို့ မျှဝေရန်",
    "編輯題庫": "အစုကို ပြင်ဆင်ရန်",
    "建立新題庫": "အသစ် ဖန်တီးရန်",
    "測試遊玩": "စမ်းသပ်ရန်",
    "編輯": "ပြင်ဆင်ရန်",
    "刪除": "ဖျက်ရန်",
    "語音模式": "အသံစနစ်",
    "多人即時連線對戰": "တိုက်ရိုက်ကစားသမားအများ",
    "使用說明": "လက်စွဲစာအုပ်",
    "操作詳解": "အသေးစိတ်ညွှန်ကြားချက်များ",
    "關於我們": "အကြောင်း",
    "VerseRain 開發資訊": "အချက်အလက်များနှင့် ခရက်ဒစ်များ",
    "加入進階群組": "ပရီမီယံ အသိုင်းအဝိုင်းသို့ ဝင်ရောက်ရန်",
    "意見回饋": "တုံ့ပြန်ချက်",
    "聯絡與建議": "အကြံပြုချက်များ",
    "關閉視障經文雨": "အမြင်အာရုံချို့တဲ့သူများအတွက် စနစ်ကို ပိတ်ရန်",
    "打開視障經文雨": "အမြင်အာရုံချို့တဲ့သူများအတွက် စနစ်ကို ဖွင့်ရန်",
    "為視覺障礙朋友設計的語音模式": "အမြင်အာရုံချို့တဲ့သူများအတွက် အသံစနစ်",
    "關閉效能模式": "စွမ်းဆောင်ရည်စနစ်ကို ပိတ်ရန်",
    "打開效能模式": "စွမ်းဆောင်ရည်စနစ်ကို ဖွင့်ရန်",
    "關閉華麗特效以提升流暢度": "ပိုမိုကောင်းမွန်သော စွမ်းဆောင်ရည်အတွက် အထူးပြုလုပ်ချက်များကို ပိတ်ရန်",
    "關閉 Debug": "ဒီဘတ်ဂ် ပိတ်ရန်",
    "打開 Debug": "ဒီဘတ်ဂ် ဖွင့်ရန်",
    "顯示除錯資訊": "ဒီဘတ်ဂ် အချက်အလက်များကို ပြရန်",
    "朗讀語音設定": "အသံထွက်ဖတ်ခြင်း ဆက်တင်များ",
    "系統預設語音": "စနစ် မူလအသံ",
    "試聽": "နားထောင်ရန်",
    "語音已更新！": "အသံကို အပ်ဒိတ်လုပ်ပြီးပါပြီ!",
    "這是你選擇的語音試聽。": "၎င်းသည် သင်ရွေးချယ်ထားသော အသံ၏ နမူနာဖြစ်သည်။",
    "已記住你的語音偏好，下次回來會自動使用。": "သင့်အသံရွေးချယ်မှုကို သိမ်းဆည်းထားပြီး အလိုအလျောက် အသုံးပြုပါမည်။",
};

const esDict = {
    "我的園子": "Mi Jardín",
    "🌳 我的園子": "🌳 Mi Jardín",
    "多人連線": "Multijugador",
    "🎮 多人連線": "🎮 Multijugador",
    "排行榜": "Clasificación",
    "🏆 排行榜": "🏆 Clasificación",
    "搜尋": "Buscar",
    "🔍 搜尋": "🔍 Buscar",
    "地圖": "Mapa",
    "🗺️ 地圖": "🗺️ Mapa",
    "返回目錄": "Volver",
    "目前選擇": "Selección actual",
    "九宮格": "9-Cuadrículas",
    "四宮格": "4-Cuadrículas",
    "經文雨": "Lluvia de Versículos",
    "單字干擾": "Interferencia de Palabras",
    "無干擾": "Sin Interferencia",
    "難度 0": "Dificultad 0",
    "難度 1": "Dificultad 1",
    "難度 2": "Dificultad 2",
    "難度 3": "Dificultad 3",
    "挑戰": "Jugar",
    "隨機播放": "Reproducción aleatoria",
    "邀人PK": "Invitar",
    "經文出處(點擊觀看)": "Referencia (Click)",
    "排行": "Rango",
    "設定": "Ajustes",
    "選擇比賽經文組": "Seleccionar Conjunto",
    "沒有找到匹配的經文組。": "No se encontraron conjuntos coincidentes.",
    "準備！": "¡Listo!",
    "已準備": "Listo",
    "開始": "Empezar",
    "加入對戰": "Unirse a partida",
    "建立對戰": "Crear partida",
    "你的名字:": "Tu nombre:",
    "登入 / 修改": "Iniciar / Modificar",
    "登出": "Cerrar sesión",
    "經文組": "Conjunto de Versículos",
    "隨機挑戰所選題數": "Desafío aleatorio",
    "隨機播放所選數量的經文圖卡與語音": "Reproducción aleatoria de los versículos seleccionados con audio",
    "邀請朋友一起玩": "Invitar amigos",
    "分享挑戰連結": "Compartir enlace",
    "經典挑戰": "Desafío clásico",
    "立刻挑戰": "Desafiar ahora",
    "最受歡迎": "Más populares",
    "最新": "Más recientes",
    "作者": "Autor",
    "點閱次數": "Vistas",
    "Verserain 官方": "Oficial de Verserain",
    "匿名玩家": "Jugador anónimo",
    "QR 碼": "Código QR",
    '🌧️ VerseRain 經文雨 操作手冊': '🌧️ Manual de Usuario de VerseRain',
    '歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！': '¡Bienvenido a <strong>VerseRain</strong>! Una plataforma interactiva de memorización de las Escrituras que combina desafíos y aprendizaje.<br />¡Aquí puedes desafiar conjuntos de versículos globales, crear tu biblioteca personal y subir en la tabla de clasificación mundial de la Economía Mutualizada!',
    '🎯 一、如何開始遊玩？': '🎯 1. ¿Cómo Jugar?',
    '只需簡單三步，您就能進入背經的挑戰中！': '¡Solo tres sencillos pasos para comenzar tu desafío de memorización de las Escrituras!',
    '1. 切換至「經文組」': '1. Cambiar a "Conjuntos de Versículos"',
    '首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。': 'Primero, haz clic en la pestaña "Conjuntos de Versículos" en la barra de navegación superior izquierda. Esto mostrará todos los versículos públicos creados por el sistema y los jugadores.',
    '切換經文組': 'Cambiar Conjuntos de Versículos',
    '2. 選擇想要挑戰的經文組': '2. Seleccionar un Conjunto de Versículos',
    '點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。': 'Haz clic en un tema de la lista (por ejemplo, Versículos Centrales del Evangelio de Juan) para expandir los niveles de versículos dentro.',
    '選擇經文組': 'Seleccionar Conjunto de Versículos',
    '3. 開始遊戲': '3. Iniciar el Juego',
    '點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！': 'Haz clic en el icono de "Clasificación/Jugar" junto a cualquier nivel de versículo. ¡La lluvia de versículos comenzará a caer en 3 segundos!',
    '開始遊戲': 'Iniciar el Juego',
    '🎬 實際遊玩流程示範（動畫）：': '🎬 Demostración del Juego (Animación):',
    '這是一段實際進入遊戲的流程示範！': '¡Aquí tienes una demostración real del juego!',
    '遊戲流程動畫': 'Animación del Juego',
    '👑 二、如何自建專屬「經文組」？（Premium 會員獨享）': '👑 2. ¿Cómo crear "Conjuntos de Versículos" personalizados? (Solo Premium)',
    '如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！': '¡Si eres un Miembro Premium de la comunidad de "Economía Mutualizada", puedes crear libremente tus propias bibliotecas de Escrituras personalizadas para la escuela dominical o grupos celulares!',
    '點擊上方導航列的 <strong>「👑 我的題庫」</strong>。': 'Haz clic en <strong>"👑 Mis Conjuntos"</strong> en la barra de navegación superior.',
    '在輸入框打下你想要的 <strong>新經文組名稱</strong>。': 'Escribe el <strong>Nuevo Título del Conjunto de Versículos</strong> en el cuadro de entrada.',
    '利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。': 'Usa la poderosa <strong>Función Mágica de Captura con un Clic</strong>: Introduce la referencia bíblica en la sección (ej. <code>Juan 3:16</code>), y haz clic en el botón mágico de estrella junto a él.',
    '系統將為您自動帶入完整的經文內容！': '¡El sistema importará automáticamente el contenido completo del versículo para ti!',
    '在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。': 'Después de verificar que todo esté correcto, haz clic en <strong>"Publicar"</strong>.',
    '恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！': '¡Felicidades! ¡Este conjunto de versículos se subirá instantáneamente a la base de datos global y estará disponible para el desafío público en "Conjuntos de Versículos"!',
    '<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！': '<strong>💡 Consejo:</strong> La Función Mágica de Captura con un Clic se conecta a una precisa base de datos bíblica, ahorrando una gran cantidad de tiempo en tipeo manual y corrección. ¡Intenta introducir "Génesis 1:1" para experimentar una importación fluida en 1 segundo!',
    '🏆 三、個人積分全球排行榜': '🏆 3. Clasificación Mundial',
    '點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：': 'Haz clic en <strong>"Clasificación"</strong> para ver las tablas principales:',
    '<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！': '<strong>Clasificación Personal de Puntos:</strong> Acumula puntos completando desafíos. ¡Romper tu propio récord también cuenta!',
    '<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。': '<strong>Clasificación de Conjuntos de Versículos Más Populares:</strong> Cuanto más se juegue un conjunto de versículos, mayor será su gloria en esta tabla.',
    '想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！': '¿Quieres un buen puesto? ¡Sigue desafiando constantemente o crea un conjunto de versículos que a todos les encante!',
    '🎤 四、全新語音模式 (Voice Mode)': '🎤 4. Nuevo Modo de Voz',
    '除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>': 'Además de hacer clic en los bloques, ¡ahora puedes recitar versículos directamente <strong>usando tu voz!</strong>',
    '<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！': '<strong>Reconocimiento Inteligente Difuso:</strong> El sistema cuenta con un potente emparejamiento pinyin difuso. ¡Incluso con acentos o pronunciación imprecisa, los sonidos similares pasarán!',
    '<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。': '<strong>Sistema de Ayuda:</strong> Si te atascas, el sistema te proporcionará automáticamente una pista parcial después de 3 segundos para ayudarte a continuar.',
    '<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！': '<strong>Bonus de Puntuación:</strong> Para animar a proclamar en voz alta la palabra de Dios, ¡el peso de tu <strong>"Bono de Tiempo Restante" aumenta un 30%</strong> en el Modo de Voz!',
    '⚔️ 五、多人即時連線對戰': '⚔️ 5. Batalla Multijugador en Tiempo Real',
    '背經文不再是一個人孤單的事！': '¡Memorizar las Escrituras ya no es una tarea solitaria!',
    '點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。': 'Haz clic en <strong>"Multijugador"</strong> para crear una sala privada e invitar a los miembros de tu grupo o familia a unirse.',
    '房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。': 'El anfitrión puede seleccionar <strong>"Versículos de Competición"</strong> del banco global de versículos.',
    '所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！': 'Todos comienzan el desafío simultáneamente y pueden ver las tablas de clasificación en tiempo real una vez finalizado el juego. ¡Perfecto para actividades de la escuela dominical y dinámicas de grupo!',
    'Verse Rain 讓背記經文變得生動有趣！': '¡VerseRain hace que la memorización de las Escrituras sea divertida!',
    '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。': 'Una iglesia china utilizó la aplicación VerseRain para organizar un "Concurso de Memorización Bíblica" para su congregación. Participaron todas las edades en familias y pequeños grupos. Instalaron cuatro proyectores, permitiendo a cuatro equipos competir simultáneamente en el Modo Desafío usando los mismos conjuntos de versículos.',
    '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。': 'Un niño de cuatro años y su hermana de tres años mostraron con entusiasmo cómo podían recitar el "Padrenuestro" en chino jugando VerseRain. Nacidos en EE. UU., son capaces de leer chino y jugar este juego.',
    '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。': 'Palabras de versículos bíblicos caen del cielo, y obtienes puntos al hacer clic en el versículo en el orden correcto. El versículo se pronuncia en voz alta al hacer clic para reforzar tu memoria auditiva y la ortografía visual.',
    '學習多種語言的聖經經文！': '¡Aprende versículos bíblicos en múltiples idiomas!',
    '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。': 'Lectura verbal de Texto a Voz al hacer clic en las palabras para grabar la recitación del versículo en tu memoria.',
    '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。': 'A través de verserain, es compatible con un número virtualmente ilimitado de versículos, conjuntos de versículos y múltiples versiones de la Biblia.',
    '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。': 'Se ofrecen múltiples niveles de dificultad para ser jugados tanto por niños como por adultos.',
    '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。': 'El modo desafío ayuda a fortalecer la memoria de varios versículos relacionados en el mismo conjunto de versículos.',
    '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！': '¡Tabla de Clasificación en línea para motivar a la congregación, grupos de jóvenes y miembros de pequeños grupos a participar y mejorar juntos!',
    '<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。': '<strong>Nuevo Modo de Voz:</strong> Combinando el reconocimiento de pinyin difuso más avanzado, ¡puedes recitar directamente con tu voz! Incluso con una pronunciación no estándar, puedes pasar el nivel de forma inteligente. Proclama en voz alta la palabra de Dios y obtén un bono de puntuación adicional del 30%.',
    '<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！': '<strong>Batalla Multijugador en Tiempo Real:</strong> Admite la creación de salas privadas, permitiendo a la familia o miembros del grupo desafiar simultáneamente los mismos versículos en sus teléfonos, ¡disfrutando de la emoción de la competencia en tiempo real!',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': '¡Da frutos en tu jardín para subir de nivel! Al alcanzar el ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ', ¡desbloquearás automáticamente la creación de Conjuntos de Versículos Personalizados!',
    '共識實踐者': 'Nivel 3',
    "大廳": "Inicio",
    "我的專屬題庫": "Mis Conjuntos",
    "新增題庫": "Nuevo Conjunto",
    "進階設定與學習": "Ajustes Avanzados",
    "標題": "Título",
    "簡介": "Descripción",
    "經文列表": "Versículos",
    "新增一節經文": "Añadir Versículo",
    "儲存題庫": "Guardar",
    "取消": "Cancelar",
    "公開此題庫 (Publish to Global Verse Sets)": "Publicar Globalmente",
    "編輯題庫": "Editar Conjunto",
    "建立新題庫": "Crear Nuevo",
    "測試遊玩": "Probar",
    "編輯": "Editar",
    "刪除": "Eliminar",
    "語音模式": "Modo de Voz",
    "多人即時連線對戰": "Multijugador en Vivo",
    "通關紀錄": "Récords",
    "登入": "Iniciar sesión",
    "申請帳號": "Registrarse",
    "進階功能": "Avanzado",
    "使用說明": "Manual",
    "操作詳解": "Instrucciones detalladas",
    "關於我們": "Acerca de",
    "VerseRain 開發資訊": "Info y Créditos",
    "解鎖進階功能": "Desbloquear Premium",
    "加入進階群組": "Únete a la Comunidad Premium",
    "意見回饋": "Comentarios",
    "聯絡與建議": "Errores y Sugerencias",
    "關閉視障經文雨": "Desactivar Modo para Invidentes",
    "打開視障經文雨": "Activar Modo para Invidentes",
    "為視覺障礙朋友設計的語音模式": "Modo de voz (invidentes)",
    "關閉效能模式": "Desactivar Modo Rendimiento",
    "打開效能模式": "Activar Modo Rendimiento",
    "關閉華麗特效以提升流暢度": "Desactiva efectos para mejorar el rendimiento",
    "關閉 Debug": "Desactivar Depuración",
    "打開 Debug": "Activar Depuración",
    "顯示除錯資訊": "Mostrar información de depuración",
    "朗讀語音設定": "Ajustes de Voz",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "Elige tu voz preferida para el botón Leer y el audio del juego.",
    "系統預設語音": "Voz del sistema",
    "試聽": "Escuchar",
    "語音已更新！": "¡Voz actualizada!",
    "這是你選擇的語音試聽。": "Esta es una vista previa de tu voz seleccionada.",
    "已記住你的語音偏好，下次回來會自動使用。": "Tu preferencia de voz se ha guardado y se usará automáticamente.",
};

const trDict = {
    "我的園子": "Bahçem",
    "🌳 我的園子": "🌳 Bahçem",
    "多人連線": "Çok Oyunculu",
    "🎮 多人連線": "🎮 Çok Oyunculu",
    "排行榜": "Liderlik Tablosu",
    "🏆 排行榜": "🏆 Liderlik Tablosu",
    "搜尋": "Arama",
    "🔍 搜尋": "🔍 Arama",
    "地圖": "Harita",
    "🗺️ 地圖": "🗺️ Harita",
    "返回目錄": "Geri Dön",
    "目前選擇": "Mevcut Seçim",
    "九宮格": "9'lu Izgara",
    "四宮格": "4'lü Izgara",
    "經文雨": "Ayet Yağmuru",
    "單字干擾": "Kelime Karışıklığı",
    "無干擾": "Karışıklık Yok",
    "難度 0": "Zorluk 0",
    "難度 1": "Zorluk 1",
    "難度 2": "Zorluk 2",
    "難度 3": "Zorluk 3",
    "挑戰": "Oyna",
    "隨機播放": "Karışık Çal",
    "邀人PK": "Davet Et",
    "經文出處(點擊觀看)": "Referans (Tıkla)",
    "排行": "Sıra",
    "設定": "Ayarlar",
    "選擇比賽經文組": "Ayet Seti Seç",
    "沒有找到匹配的經文組。": "Eşleşen set bulunamadı.",
    "準備！": "Hazır!",
    "已準備": "Hazır",
    "開始": "Başla",
    "加入對戰": "Maça Katıl",
    "建立對戰": "Maç Oluştur",
    "你的名字:": "Adın:",
    "登入 / 修改": "Giriş / Değiştir",
    "登出": "Çıkış Yap",
    "經文組": "Ayet Seti",
    "隨機挑戰所選題數": "Rastgele Meydan Okuma",
    "隨機播放所選數量的經文圖卡與語音": "Seçili sayıdaki ayeti sesli olarak rastgele oynat",
    "邀請朋友一起玩": "Arkadaşlarını Davet Et",
    "分享挑戰連結": "Bağlantıyı Paylaş",
    "經典挑戰": "Klasik Meydan Okuma",
    "立刻挑戰": "Hemen Oyna",
    "最受歡迎": "En Popüler",
    "最新": "En Yeni",
    "作者": "Yazar",
    "點閱次數": "Görüntüleme",
    "Verserain 官方": "Verserain Resmi",
    "匿名玩家": "Anonim Oyuncu",
    "QR 碼": "QR Kod",
    '🌧️ VerseRain 經文雨 操作手冊': '🌧️ VerseRain Kullanım Kılavuzu',
    '歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！': '<strong>VerseRain</strong>\'e Hoş Geldiniz! Meydan okuma ve öğrenmeyi birleştiren interaktif bir kutsal metin ezberleme platformu.<br />Burada küresel ayet setlerine meydan okuyabilir, kendi kişisel kütüphanenizi oluşturabilir ve Karşılıklı Ekonominin Küresel Liderlik Tablosunda yükselebilirsiniz!',
    '🎯 一、如何開始遊玩？': '🎯 1. Nasıl Oynanır?',
    '只需簡單三步，您就能進入背經的挑戰中！': 'Kutsal metin ezberleme meydan okumanıza başlamak için sadece üç basit adım!',
    '1. 切換至「經文組」': '1. "Ayet Setleri" sekmesine geçin',
    '首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。': 'Önce, sol üst navigasyon çubuğundaki "Ayet Setleri" sekmesine tıklayın. Bu, sistem ve oyuncular tarafından oluşturulan tüm genel ayet setlerini görüntüleyecektir.',
    '切換經文組': 'Ayet Setlerini Değiştir',
    '2. 選擇想要挑戰的經文組': '2. Bir Ayet Seti Seçin',
    '點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。': 'İçindeki ayet seviyelerini genişletmek için listedeki bir konuya tıklayın (örneğin, Yuhanna İncili Temel Ayetleri).',
    '選擇經文組': 'Ayet Seti Seç',
    '3. 開始遊戲': '3. Oyuna Başla',
    '點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！': 'Ayet setinin altındaki herhangi bir ayet seviyesinin yanındaki "Liderlik Tablosu/Oynat simgesine" tıklayın. Ayet yağmuru 3 saniye içinde yağmaya başlayacak!',
    '開始遊戲': 'Oyuna Başla',
    '🎬 實際遊玩流程示範（動畫）：': '🎬 Oynanış Gösterimi (Animasyon):',
    '這是一段實際進入遊戲的流程示範！': 'İşte oyunun gerçek bir oynanış gösterimi!',
    '遊戲流程動畫': 'Oynanış Animasyonu',
    '👑 二、如何自建專屬「經文組」？（Premium 會員獨享）': '👑 2. Özel "Ayet Setleri" nasıl oluşturulur? (Sadece Premium)',
    '如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！': '"Karşılıklı Ekonomi" topluluğunun Premium Üyesiyseniz, pazar okulu veya hücre grupları için kendi özel kutsal metin kütüphanelerinizi özgürce oluşturabilirsiniz!',
    '點擊上方導航列的 <strong>「👑 我的題庫」</strong>。': 'Üst navigasyon çubuğundaki <strong>"👑 Özel Setlerim"</strong> seçeneğine tıklayın.',
    '在輸入框打下你想要的 <strong>新經文組名稱</strong>。': 'Giriş kutusuna istediğiniz <strong>Yeni Ayet Seti Başlığını</strong> yazın.',
    '利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。': 'Güçlü <strong>Sihirli Tek Tıkla Alma Özelliğini</strong> kullanın: Bölüme ayet referansını girin (örn. <code>Yuhanna 3:16</code>) ve yanındaki sihirli yıldız düğmesine tıklayın.',
    '系統將為您自動帶入完整的經文內容！': 'Sistem, ayet içeriğinin tamamını sizin için otomatik olarak içe aktaracaktır!',
    '在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。': 'Her şeyin doğru olduğunu doğruladıktan sonra <strong>"Yayınla"</strong> düğmesine tıklayın.',
    '恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！': 'Tebrikler! Bu ayet seti anında küresel veritabanına yüklenecek ve "Ayet Setleri"nde genel meydan okumaya hazır olacaktır!',
    '<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！': '<strong>💡 İpucu:</strong> Sihirli Tek Tıkla Alma, doğru bir İncil veritabanına bağlanarak büyük miktarda manuel yazma ve düzeltme okuması zamanı kazandırır. Sorunsuz 1 saniyelik içe aktarımı deneyimlemek için "Yaratılış 1:1" girmeyi deneyin!',
    '🏆 三、個人積分全球排行榜': '🏆 3. Küresel Liderlik Tablosu',
    '點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：': 'Ana üst sıralamaları görmek için <strong>"Liderlik Tablosu"</strong>na tıklayın:',
    '<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！': '<strong>Kişisel Puan Sıralaması:</strong> Meydan okumaları tamamlayarak puan toplayın. Kendi rekorunuzu kırmak da sayılır!',
    '<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。': '<strong>En Popüler Ayet Setleri Sıralaması:</strong> Bir ayet seti ne kadar çok oynanırsa, bu panodaki ünü o kadar yüksek olur.',
    '想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！': 'İyi bir sıra mı istiyorsunuz? Sürekli olarak meydan okumaya devam edin veya herkesin sevdiği bir ayet seti yaratın!',
    '🎤 四、全新語音模式 (Voice Mode)': '🎤 4. Yeni Ses Modu',
    '除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>': 'Bloklara tıklamanın yanı sıra, artık <strong>sesinizi kullanarak</strong> ayetleri doğrudan ezberden okuyabilirsiniz!',
    '<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！': '<strong>Akıllı Bulanık Tanıma:</strong> Sistem güçlü bir bulanık eşleştirme özelliğine sahiptir. Aksanlarla veya kesin olmayan telaffuzla bile, benzer sesler geçecektir!',
    '<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。': '<strong>Yardımcı İpucu Sistemi:</strong> Takılırsanız, devam etmenize yardımcı olmak için sistem 3 saniye sonra otomatik olarak kısmi bir ipucu sağlayacaktır.',
    '<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！': '<strong>Puan Bonusu:</strong> Tanrı\'nın sözünü yüksek sesle duyurmayı teşvik etmek için, Ses Modunda <strong>"Kalan Süre Bonusu" ağırlığınız %30 artırılır</strong>!',
    '⚔️ 五、多人即時連線對戰': '⚔️ 5. Çok Oyunculu Gerçek Zamanlı Savaş',
    '背經文不再是一個人孤單的事！': 'Kutsal metinleri ezberlemek artık yalnız yapılan bir iş değil!',
    '點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。': 'Özel bir oda oluşturmak ve grup üyelerinizi veya ailenizi katılmaya davet etmek için <strong>"Çok Oyunculu"</strong> seçeneğine tıklayın.',
    '房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。': 'Oda sahibi, küresel ayet bankasından <strong>"Yarışma Ayetleri"</strong>ni seçebilir.',
    '所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！': 'Herkes meydan okumaya aynı anda başlar ve oyun bittikten sonra gerçek zamanlı liderlik tablolarını görebilir. Pazar okulu etkinlikleri ve grup kaynaştırmaları için mükemmeldir!',
    'Verse Rain 讓背記經文變得生動有趣！': 'VerseRain kutsal metin ezberlemeyi eğlenceli hale getirir!',
    '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。': 'Bir Çin kilisesi, cemaati için bir "İncil Ezberleme Yarışması" düzenlemek üzere VerseRain uygulamasını kullandı. Ailelerden ve küçük gruplardan her yaştan insan katıldı. Dört takımın aynı ayet setlerini kullanarak Meydan Okuma Modunda aynı anda rekabet etmesine olanak tanıyan dört projektör kurdular.',
    '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。': 'Dört yaşındaki bir erkek çocuk ve üç yaşındaki kız kardeşi, VerseRain oynayarak "Rab\'bin Duası"nı Çince olarak nasıl ezbere okuyabildiklerini hevesle gösterdiler. ABD\'de doğmuş olmalarına rağmen Çince okuyabiliyor ve bu oyunu oynayabiliyorlar.',
    '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。': 'İncil ayetlerinin kelimeleri gökyüzünden düşer ve ayeti doğru sırayla tıklayarak puan kazanırsınız. Tıklandığında ayet yüksek sesle okunarak görsel ve işitsel olarak hafızanızı pekiştirir.',
    '學習多種語言的聖經經文！': 'Birden çok dilde İncil ayetlerini öğrenin!',
    '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。': 'Ayet ezberinizi zihninize kazımak için kelimelere tıkladığınızda Metinden Sese sesli okuma özelliği.',
    '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。': 'verserain aracılığıyla, neredeyse sınırsız sayıda ayeti, ayet setini ve birden fazla İncil versiyonunu destekler.',
    '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。': 'Çocuklardan yetişkinlere kadar oynanabilen birden fazla zorluk seviyesi sunulmaktadır.',
    '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。': 'Meydan okuma modu, aynı ayet setindeki birden fazla ilgili ayetin hafızasını güçlendirmeye yardımcı olur.',
    '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！': 'Cemaati, gençlik gruplarını ve küçük grup üyelerini birlikte katılmaya ve gelişmeye motive etmek için Çevrimiçi Liderlik Tablosu!',
    '<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。': '<strong>Yeni Ses Modu:</strong> En gelişmiş bulanık tanıma teknolojisi ile doğrudan sesinizle ezber okuyabilirsiniz! Standart olmayan telaffuzla bile seviyeyi akıllıca geçebilirsiniz. Tanrı\'nın sözünü yüksek sesle ilan edin ve ekstra %30 puan bonusu kazanın.',
    '<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！': '<strong>Çok Oyunculu Gerçek Zamanlı Savaş:</strong> Özel odalar oluşturmayı destekler; ailenin veya grup üyelerinin kendi telefonlarında aynı ayetlere aynı anda meydan okumasına izin vererek gerçek zamanlı rekabetin heyecanını yaşatır!',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': 'Seviye atlamak için bahçenizde meyve verin! ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' seviyesine ulaştığınızda, Özel Ayet Setleri otomatik olarak açılır!',
    '共識實踐者': 'Seviye 3',
    "大廳": "Ana Sayfa",
    "我的專屬題庫": "Özel Setlerim",
    "新增題庫": "Yeni Set",
    "進階設定與學習": "Gelişmiş Ayarlar",
    "標題": "Başlık",
    "簡介": "Açıklama",
    "經文列表": "Ayetler",
    "新增一節經文": "Ayet Ekle",
    "儲存題庫": "Kaydet",
    "取消": "İptal",
    "公開此題庫 (Publish to Global Verse Sets)": "Herkese Açık Yayınla",
    "編輯題庫": "Seti Düzenle",
    "建立新題庫": "Yeni Oluştur",
    "測試遊玩": "Test Et",
    "編輯": "Düzenle",
    "刪除": "Sil",
    "語音模式": "Ses Modu",
    "多人即時連線對戰": "Canlı Çok Oyunculu",
    "通關紀錄": "Kayıtlar",
    "登入": "Giriş Yap",
    "申請帳號": "Kayıt Ol",
    "進階功能": "Gelişmiş",
    "使用說明": "Kılavuz",
    "操作詳解": "Detaylı talimatlar",
    "關於我們": "Hakkında",
    "VerseRain 開發資訊": "Bilgi ve Krediler",
    "解鎖進階功能": "Premium Kilidini Aç",
    "加入進階群組": "Premium Topluluğa Katıl",
    "意見回饋": "Geri Bildirim",
    "聯絡與建議": "Hatalar ve Öneriler",
    "關閉視障經文雨": "Görme Engelli Modunu Kapat",
    "打開視障經文雨": "Görme Engelli Modunu Aç",
    "為視覺障礙朋友設計的語音模式": "Görme engelliler için ses",
    "關閉效能模式": "Performans Modunu Kapat",
    "打開效能模式": "Performans Modunu Aç",
    "關閉華麗特效以提升流暢度": "Daha iyi performans için efektleri kapat",
    "關閉 Debug": "Hata Ayıklamayı Kapat",
    "打開 Debug": "Hata Ayıklamayı Aç",
    "顯示除錯資訊": "Hata ayıklama bilgisini göster",
    "朗讀語音設定": "Ses Ayarları",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "Oku düğmesi ve oyun içi ses için tercih ettiğiniz sesi seçin.",
    "系統預設語音": "Sistem Varsayılan Sesi",
    "試聽": "Dinle",
    "語音已更新！": "Ses güncellendi!",
    "這是你選擇的語音試聽。": "Bu, seçtiğiniz sesin bir önizlemesidir.",
    "已記住你的語音偏好，下次回來會自動使用。": "Ses tercihiniz kaydedildi ve otomatik olarak kullanılacaktır.",
};

const deDict = {
    "我的園子": "Mein Garten",
    "🌳 我的園子": "🌳 Mein Garten",
    "多人連線": "Mehrspieler",
    "🎮 多人連線": "🎮 Mehrspieler",
    "排行榜": "Bestenliste",
    "🏆 排行榜": "🏆 Bestenliste",
    "搜尋": "Suche",
    "🔍 搜尋": "🔍 Suche",
    "地圖": "Karte",
    "🗺️ 地圖": "🗺️ Karte",
    "返回目錄": "Zurück",
    "目前選擇": "Aktuelle Auswahl",
    "九宮格": "9-Gitter",
    "四宮格": "4-Gitter",
    "經文雨": "Versregen",
    "單字干擾": "Wortstörung",
    "無干擾": "Ohne Störung",
    "難度 0": "Schwierigkeit 0",
    "難度 1": "Schwierigkeit 1",
    "難度 2": "Schwierigkeit 2",
    "難度 3": "Schwierigkeit 3",
    "挑戰": "Spielen",
    "隨機播放": "Zufällige Wiedergabe",
    "邀人PK": "Einladen",
    "經文出處(點擊觀看)": "Referenz (Klick)",
    "排行": "Rang",
    "設定": "Einstellungen",
    "選擇比賽經文組": "Set auswählen",
    "沒有找到匹配的經文組。": "Keine passenden Sets gefunden.",
    "準備！": "Bereit!",
    "已準備": "Bereit",
    "開始": "Start",
    "加入對戰": "Spiel beitreten",
    "建立對戰": "Spiel erstellen",
    "你的名字:": "Dein Name:",
    "登入 / 修改": "Anmelden / Ändern",
    "登出": "Abmelden",
    "經文組": "Vers-Set",
    "隨機挑戰所選題數": "Zufällige Herausforderung",
    "隨機播放所選數量的經文圖卡與語音": "Zufällige Wiedergabe der ausgewählten Anzahl von Versen mit Audio",
    "邀請朋友一起玩": "Freunde einladen",
    "分享挑戰連結": "Link teilen",
    "經典挑戰": "Klassische Herausforderung",
    "立刻挑戰": "Jetzt spielen",
    "最受歡迎": "Beliebteste",
    "最新": "Neueste",
    "作者": "Autor",
    "點閱次數": "Aufrufe",
    "Verserain 官方": "Verserain Offiziell",
    "匿名玩家": "Anonymer Spieler",
    "QR 碼": "QR-Code",
    '🌧️ VerseRain 經文雨 操作手冊': '🌧️ VerseRain Benutzerhandbuch',
    '歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！': 'Willkommen bei <strong>VerseRain</strong>! Einer interaktiven Plattform zum Auswendiglernen von Bibelversen, die Herausforderung und Lernen verbindet.<br />Hier können Sie globale Vers-Sets herausfordern, Ihre eigene persönliche Bibliothek erstellen und in der globalen Bestenliste der Mutualisierten Wirtschaft aufsteigen!',
    '🎯 一、如何開始遊玩？': '🎯 1. Wie spielt man?',
    '只需簡單三步，您就能進入背經的挑戰中！': 'Nur drei einfache Schritte, um Ihre Herausforderung zum Auswendiglernen von Bibelversen zu starten!',
    '1. 切換至「經文組」': '1. Wechseln Sie zu "Vers-Sets"',
    '首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。': 'Klicken Sie zunächst auf die Registerkarte "Vers-Sets" in der oberen linken Navigationsleiste. Dadurch werden alle öffentlichen Vers-Sets angezeigt, die vom System und den Spielern erstellt wurden.',
    '切換經文組': 'Vers-Sets wechseln',
    '2. 選擇想要挑戰的經文組': '2. Wählen Sie ein Vers-Set',
    '點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。': 'Klicken Sie auf ein Thema in der Liste (z. B. Johannesevangelium Kernverse), um die darin enthaltenen Verslevel zu erweitern.',
    '選擇經文組': 'Vers-Set auswählen',
    '3. 開始遊戲': '3. Spiel starten',
    '點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！': 'Klicken Sie auf das "Bestenliste/Spielen"-Symbol neben einem beliebigen Verslevel. Der Versregen beginnt in 3 Sekunden!',
    '開始遊戲': 'Spiel starten',
    '🎬 實際遊玩流程示範（動畫）：': '🎬 Gameplay-Demonstration (Animation):',
    '這是一段實際進入遊戲的流程示範！': 'Hier ist eine tatsächliche Demonstration des Gameplays!',
    '遊戲流程動畫': 'Gameplay-Animation',
    '👑 二、如何自建專屬「經文組」？（Premium 會員獨享）': '👑 2. Wie erstellt man benutzerdefinierte "Vers-Sets"? (Nur Premium)',
    '如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！': 'Wenn Sie ein Premium-Mitglied der "Mutualized Economics"-Community sind, können Sie frei Ihre eigenen benutzerdefinierten Bibel-Bibliotheken für die Sonntagsschule oder Zellgruppen erstellen!',
    '點擊上方導航列的 <strong>「👑 我的題庫」</strong>。': 'Klicken Sie in der oberen Navigationsleiste auf <strong>"👑 Meine Sets"</strong>.',
    '在輸入框打下你想要的 <strong>新經文組名稱</strong>。': 'Geben Sie den gewünschten <strong>Neuen Titel des Vers-Sets</strong> in das Eingabefeld ein.',
    '利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。': 'Nutzen Sie die leistungsstarke <strong>Magische Ein-Klick-Abruffunktion</strong>: Geben Sie die Bibelstelle im Abschnitt ein (z. B. <code>Johannes 3:16</code>) und klicken Sie auf die magische Sterntaste daneben.',
    '系統將為您自動帶入完整的經文內容！': 'Das System importiert automatisch den vollständigen Versinhalt für Sie!',
    '在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。': 'Nachdem Sie überprüft haben, ob alles korrekt ist, klicken Sie auf <strong>"Veröffentlichen"</strong>.',
    '恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！': 'Herzlichen Glückwunsch! Dieses Vers-Set wird sofort in die globale Datenbank hochgeladen und steht für öffentliche Herausforderungen in den "Vers-Sets" zur Verfügung!',
    '<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！': '<strong>💡 Tipp:</strong> Der magische Ein-Klick-Abruf ist mit einer genauen Bibeldatenbank verbunden, wodurch viel Zeit beim manuellen Tippen und Korrekturlesen gespart wird. Versuchen Sie, "Genesis 1:1" einzugeben, um einen reibungslosen Import in einer Sekunde zu erleben!',
    '🏆 三、個人積分全球排行榜': '🏆 3. Globale Bestenliste',
    '點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：': 'Klicken Sie auf <strong>"Bestenliste"</strong>, um die wichtigsten Ranglisten anzuzeigen:',
    '<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！': '<strong>Persönliches Punkte-Ranking:</strong> Sammeln Sie Punkte durch das Abschließen von Herausforderungen. Das Brechen Ihres eigenen Rekords zählt ebenfalls!',
    '<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。': '<strong>Ranking der beliebtesten Vers-Sets:</strong> Je öfter ein Vers-Set gespielt wird, desto höher ist sein Ruhm auf dieser Tafel.',
    '想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！': 'Möchten Sie einen guten Rang? Fordern Sie weiterhin ständig heraus oder erstellen Sie ein Vers-Set, das jeder liebt!',
    '🎤 四、全新語音模式 (Voice Mode)': '🎤 4. Neuer Sprachmodus',
    '除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>': 'Neben dem Klicken auf Blöcke können Sie Verse jetzt direkt <strong>mit Ihrer Stimme rezitieren!</strong>',
    '<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！': '<strong>Intelligente unscharfe Erkennung:</strong> Das System verfügt über eine leistungsstarke unscharfe Pinyin-Übereinstimmung. Selbst bei ungenauer Aussprache werden ähnliche Töne akzeptiert!',
    '<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。': '<strong>Hilfreiches Hinweissystem:</strong> Wenn Sie stecken bleiben, gibt Ihnen das System nach 3 Sekunden automatisch einen teilweisen Hinweis, damit Sie fortfahren können.',
    '<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！': '<strong>Punkte-Bonus:</strong> Um die laute Verkündigung von Gottes Wort zu fördern, wird Ihr <strong>"Verbleibender Zeitbonus"-Gewicht im Sprachmodus um 30 % erhöht!</strong>',
    '⚔️ 五、多人即時連線對戰': '⚔️ 5. Mehrspieler-Echtzeitkampf',
    '背經文不再是一個人孤單的事！': 'Das Auswendiglernen von Bibelversen ist keine einsame Aufgabe mehr!',
    '點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。': 'Klicken Sie auf <strong>"Mehrspieler"</strong>, um einen privaten Raum zu erstellen und Ihre Gruppenmitglieder oder Familie einzuladen.',
    '房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。': 'Der Gastgeber kann <strong>"Wettbewerbsverse"</strong> aus der globalen Vers-Datenbank auswählen.',
    '所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！': 'Jeder beginnt die Herausforderung gleichzeitig und kann nach Spielende Bestenlisten in Echtzeit sehen. Perfekt für Sonntagsschulaktivitäten und Gruppenspiele!',
    'Verse Rain 讓背記經文變得生動有趣！': 'VerseRain macht das Auswendiglernen von Bibelversen unterhaltsam!',
    '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。': 'Eine chinesische Kirche nutzte die VerseRain-App, um einen "Bibel-Auswendiglern-Wettbewerb" für ihre Gemeinde zu veranstalten. Alle Altersgruppen in Familien und Kleingruppen nahmen teil. Sie stellten vier Projektoren auf, sodass vier Teams im Challenge-Modus mit denselben Vers-Sets gleichzeitig antreten konnten.',
    '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。': 'Ein vierjähriger Junge und seine dreijährige Schwester zeigten eifrig, wie sie das "Vaterunser" auf Chinesisch aufsagen konnten, indem sie VerseRain spielten. Obwohl sie in den USA geboren wurden, können sie Chinesisch lesen und dieses Spiel spielen.',
    '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。': 'Worte aus Bibelversen fallen vom Himmel, und Sie punkten, indem Sie in der richtigen Reihenfolge auf den Vers klicken. Der Vers wird beim Anklicken laut vorgelesen, um Ihr Gedächtnis hörbar und die Rechtschreibung visuell zu stärken.',
    '學習多種語言的聖經經文！': 'Lernen Sie Bibelverse in mehreren Sprachen!',
    '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。': 'Text-to-Speech-Sprachausgabe beim Klicken auf die Wörter, um die Versrezitation in Ihrem Gedächtnis einzuprägen.',
    '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。': 'Durch VerseRain wird eine nahezu unbegrenzte Anzahl von Versen, Vers-Sets und verschiedenen Bibelversionen unterstützt.',
    '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。': 'Es werden mehrere Schwierigkeitsgrade angeboten, die von Kindern bis zu Erwachsenen gespielt werden können.',
    '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。': 'Der Herausforderungsmodus hilft, die Erinnerung an mehrere verwandte Verse im selben Vers-Set zu stärken.',
    '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！': 'Online-Bestenliste, um die Gemeinde, Jugendgruppen und Kleingruppenmitglieder zur gemeinsamen Teilnahme und Verbesserung zu motivieren!',
    '<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。': '<strong>Neuer Sprachmodus:</strong> In Kombination mit modernster unscharfer Pinyin-Erkennung können Sie direkt mit Ihrer Stimme rezitieren! Selbst bei nicht standardgemäßer Aussprache können Sie das Level auf intelligente Weise bestehen. Verkünden Sie Gottes Wort laut und erhalten Sie einen zusätzlichen Punktebonus von 30 %.',
    '<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！': '<strong>Mehrspieler-Echtzeitkampf:</strong> Unterstützt die Erstellung privater Räume, sodass Familien- oder Gruppenmitglieder gleichzeitig dieselben Verse auf ihren Telefonen herausfordern können und die Spannung des Echtzeitwettbewerbs genießen können!',
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': 'Tragen Sie Früchte in Ihrem Garten, um aufzusteigen! Wenn Sie ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' erreichen, wird das Erstellen von benutzerdefinierten Vers-Sets automatisch freigeschaltet!',
    '共識實踐者': 'Level 3',
    "大廳": "Startseite",
    "我的專屬題庫": "Meine Sets",
    "新增題庫": "Neues Set",
    "進階設定與學習": "Erweiterte Einstellungen",
    "標題": "Titel",
    "簡介": "Beschreibung",
    "經文列表": "Verse",
    "新增一節經文": "Vers Hinzufügen",
    "儲存題庫": "Speichern",
    "取消": "Abbrechen",
    "公開此題庫 (Publish to Global Verse Sets)": "Global Veröffentlichen",
    "編輯題庫": "Set Bearbeiten",
    "建立新題庫": "Neu Erstellen",
    "測試遊玩": "Testen",
    "編輯": "Bearbeiten",
    "刪除": "Löschen",
    "語音模式": "Sprachmodus",
    "多人即時連線對戰": "Live Mehrspieler",
    "通關紀錄": "Rekorde",
    "登入": "Anmelden",
    "申請帳號": "Registrieren",
    "進階功能": "Erweitert",
    "使用說明": "Handbuch",
    "操作詳解": "Detaillierte Anweisungen",
    "關於我們": "Über",
    "VerseRain 開發資訊": "Info & Credits",
    "解鎖進階功能": "Premium Freischalten",
    "加入進階群組": "Premium-Community Beitreten",
    "意見回饋": "Feedback",
    "聯絡與建議": "Fehler & Vorschläge",
    "關閉視障經文雨": "Blindenmodus Deaktivieren",
    "打開視障經文雨": "Blindenmodus Aktivieren",
    "為視覺障礙朋友設計的語音模式": "Sprachmodus (Sehbehinderte)",
    "關閉效能模式": "Leistungsmodus Deaktivieren",
    "打開效能模式": "Leistungsmodus Aktivieren",
    "關閉華麗特效以提升流暢度": "Effekte für bessere Leistung deaktivieren",
    "關閉 Debug": "Debug Deaktivieren",
    "打開 Debug": "Debug Aktivieren",
    "顯示除錯資訊": "Debug-Informationen anzeigen",
    "朗讀語音設定": "Spracheinstellungen",
    "選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。": "Wählen Sie Ihre bevorzugte Stimme für die Schaltfläche 'Lesen' und das Audio im Spiel.",
    "系統預設語音": "Systemstandardstimme",
    "試聽": "Anhören",
    "語音已更新！": "Stimme aktualisiert!",
    "這是你選擇的語音試聽。": "Dies ist eine Vorschau Ihrer ausgewählten Stimme.",
    "已記住你的語音偏好，下次回來會自動使用。": "Ihre Spracheinstellung wurde gespeichert und wird automatisch verwendet.",
};

  const t = (zh, en) => {
    if (zh === '活動') {
      if (uiLang === 'en') return 'Activity';
      if (uiLang === 'fa') return 'فعالیت';
      if (uiLang === 'he') return 'פעילות';
      if (uiLang === 'ja') return '活動';
      if (uiLang === 'ko') return '활동';
      if (uiLang === 'es') return 'Actividad';
      if (uiLang === 'tr') return 'Aktivite';
      if (uiLang === 'de') return 'Aktivität';
      if (uiLang === 'my') return 'လှုပ်ရှားမှု';
      return '活動';
    }
    if (uiLang === 'en') return en || zh;
    if (uiLang === 'fa') return faDict[zh] || en || zh;
    if (uiLang === 'he') return heDict[zh] || en || zh;
    if (uiLang === 'ja') return jaDict[zh] || zh;
    if (uiLang === 'ko') return koDict[zh] || zh;
    if (uiLang === 'es') return esDict[zh] || en || zh;
    if (uiLang === 'tr') return trDict[zh] || en || zh;
    if (uiLang === 'de') return deDict[zh] || en || zh;
    if (uiLang === 'my') return myDict[zh] || en || zh;
    if (uiLang !== 'zh' && uiLang !== 'cuv') return en || zh;
    return zh; // default: 'zh'
  };

  // Sync handleBlockClick to ref so Speech can fire it
  useEffect(() => {
    handleBlockClickRef.current = handleBlockClick;
  }, [handleBlockClick]);

  /* TEMPORARILY REMOVED SPEECH RECOGNITION 
  useEffect(() => {
    if (!isMicOn) {
      ...
    }
  }, [isMicOn, version]);
  */

  return (
    <>
      <div
        dir={uiLang === 'fa' || uiLang === 'he' ? 'rtl' : 'ltr'}
        style={{
          fontFamily:
            uiLang === 'fa' ? "'Vazirmatn', Tahoma, Arial, sans-serif" :
              uiLang === 'he' ? "'Noto Sans Hebrew', Tahoma, Arial, sans-serif" :
                undefined
        }}
        className={performanceMode ? 'performance-mode' : ''}
      >
        <div className={`bg-layer ${combo >= 3 ? 'golden-bg' : ''}`} />
        <div className={`rain-system ${combo >= 3 ? 'golden-rain' : ''}`}>
          <div className="rain-layer back" />
          <div className="rain-layer mid" />
          <div className="rain-layer front" />
        </div>

        {combo >= 3 && gameState === 'playing' && (
          <div className="particles-system">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  '--duration': `${4 + Math.random() * 6}s`,
                  '--drift': `${(Math.random() - 0.5) * 200}px`,
                  '--max-opacity': `${0.4 + Math.random() * 0.6}`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Global Mic Toggle & Subtitles - Temporarily Disabled */}
        {false && (
          <div style={{ position: 'fixed', bottom: '6.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem', zIndex: 100 }}>
            {liveTranscript && isMicOn && gameState === 'playing' && (
              <div className="hud-glass" style={{ padding: '8px 16px', fontSize: '1rem', color: '#93c5fd', maxWidth: '80vw', textAlign: 'right', wordBreak: 'break-word', border: '1px solid rgba(147, 197, 253, 0.4)', borderRadius: '12px', whiteSpace: 'pre-wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>麥克風聽見：</span>
                <span style={{ color: '#fff' }}>"{liveTranscript}"</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              {micStatusText && <div className="hud-glass" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#4ade80', animation: 'pulse 2s infinite' }}>{micStatusText}</div>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextMicState = !isMicOn;
                  setIsMicOn(nextMicState);
                  if (nextMicState) setIsMusicPlaying(false);
                }}
                className="hud-glass"
                title={t("語音控制開關", "Toggle Voice Control")}
                style={{ padding: '0.75rem', borderRadius: '50%', color: isMicOn ? '#4ade80' : '#ef4444', backgroundColor: isMicOn ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
              >
                {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
            </div>
          </div>
        )}

        {/* Global Music Toggle - Temporarily Disabled */}
        {false && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsMusicPlaying(!isMusicPlaying); }}
            className="hud-glass"
            style={{ position: 'fixed', bottom: '2rem', right: '1.5rem', padding: '0.75rem', borderRadius: '50%', color: isMusicPlaying ? '#4ade80' : '#cbd5e1', cursor: 'pointer', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isMusicPlaying ? <Music size={24} /> : <VolumeX size={24} />}
          </button>
        )}

        {gameState === 'menu' && (
          <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', backgroundColor: '#f4f6f8', zIndex: 10, fontFamily: 'Arial, sans-serif' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6', fontFamily: 'cursive', lineHeight: '1' }}>
                    verserain
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px', marginTop: '4px', marginLeft: '2px' }}>
                    v3.4.0
                  </div>
                </div>
                <select
                  value={version}
                  onChange={(e) => handleVersionChange(e.target.value)}
                  title="語言 / Language / זבאن / שפה"
                  style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <option value="cuv">中文</option>
                  <option value="kjv">English</option>
                  <option value="fa">فارسی</option>
                  <option value="he">עברית</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="es">Español</option>
                  <option value="tr">Türkçe</option>
                  <option value="de">Deutsch</option>
                  <option value="my">မြန်မာ</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {playerName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '6px', transition: 'background 0.2s' }}
                      onClick={() => setShowNameEditModal(true)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '0.95rem' }}>{playerName}</span>
                      <button style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Crown size={14} style={{ color: '#fbbf24' }} />
                      </button>
                    </div>
                    <button onClick={() => { setPlayerName(''); setIsPremium(false); setUserEmail(''); localStorage.removeItem('verserain_player_name'); localStorage.removeItem('verserain_is_premium'); localStorage.removeItem('verserain_player_email'); localStorage.removeItem('verseRain_gardenData'); setGardenData({}); }} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>{t("登出", "Logout")}</button>
                  </div>
                ) : (
                  <>
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal('login'); }} style={{ color: '#0056b3', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>{t("登入", "Login")}</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal('signup'); }} style={{ background: '#3b82f6', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>{t("申請帳號", "Sign Up")}</a>
                  </>
                )}
              </div>
            </div>


            {/* Navigation Bar */}
            <div style={{ display: 'flex', backgroundColor: '#e2e8f0', color: '#334155', padding: '0.8rem 1rem', overflowX: 'auto', borderBottom: '2px solid #cbd5e1', gap: '0.8rem', alignItems: 'center' }}>
              <div className="block-tile" onClick={() => setMainTab('lobby')} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.2rem', cursor: 'pointer', backgroundColor: mainTab === 'lobby' ? '#3b82f6' : 'white', color: mainTab === 'lobby' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                🏠 {t('大廳', 'Home')}
              </div>
              <div className="block-tile" onClick={() => setMainTab('garden')} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.2rem', cursor: 'pointer', backgroundColor: mainTab === 'garden' ? '#10b981' : 'white', color: mainTab === 'garden' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                🌳 {t('我的園子', 'My Garden')}
              </div>
              <div className="block-tile" onClick={() => setMainTab('multiplayer')} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.2rem', cursor: 'pointer', backgroundColor: mainTab === 'multiplayer' ? '#ec4899' : 'white', color: mainTab === 'multiplayer' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                🎮 {t('多人連線', 'Multiplayer')}
              </div>
              <div className="block-tile" onClick={() => { setMainTab('leaderboard'); fetchGlobalLeaderboard(); }} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.2rem', cursor: 'pointer', backgroundColor: mainTab === 'leaderboard' ? '#f59e0b' : 'white', color: mainTab === 'leaderboard' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                🏆 {t('排行榜', 'Ranks')}
              </div>
              <div className="block-tile" onClick={() => setMainTab('search')} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.2rem', cursor: 'pointer', backgroundColor: mainTab === 'search' ? '#8b5cf6' : 'white', color: mainTab === 'search' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                🔍 {t('搜尋', 'Search')}
              </div>
              <div className="block-tile" onClick={() => { setMainTab('map'); }} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.2rem', cursor: 'pointer', backgroundColor: mainTab === 'map' ? '#0ea5e9' : 'white', color: mainTab === 'map' ? 'white' : '#475569', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                🗺️ {t('地圖', 'Map')}
              </div>
              <div style={{ flex: 1, minWidth: '20px' }}></div>
              <div className="block-tile" onClick={() => setMainTab('advanced')} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1.2rem', cursor: 'pointer', backgroundColor: mainTab === 'advanced' ? '#475569' : 'white', color: mainTab === 'advanced' ? 'white' : '#64748b', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                ⚙️ {t('進階功能', 'Advanced')}
              </div>
            </div>

            {/* Main Content Area */}
            <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>

              {mainTab === 'lobby' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', marginTop: '1rem', paddingBottom: '3rem' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #ffffff, #f8fafc)', padding: '2rem', borderRadius: '20px', width: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative' }}>

                    <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', whiteSpace: 'nowrap' }}>
                      <CloudRain size={40} color="#3b82f6" style={{ flexShrink: 0 }} /> {t("VerseRain 經文雨", "VerseRain")}
                    </h1>
                    {randomRainVerse ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '650px', width: '100%' }}>
                          <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.8', margin: 0, fontStyle: 'italic', textAlign: 'center' }}>
                            「{randomRainVerse.text}」
                          </p>
                          <div style={{ textAlign: 'right', paddingRight: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                              — {randomRainVerse.reference}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              const lang = version === 'kjv' ? 'en-US' : version === 'ja' ? 'ja-JP' : version === 'ko' ? 'ko-KR' : version === 'fa' ? 'fa-IR' : version === 'he' ? 'he-IL' : version === 'es' ? 'es-ES' : version === 'tr' ? 'tr-TR' : version === 'de' ? 'de-DE' : version === 'my' ? 'my-MM' : 'zh-TW';
                              speakText(randomRainVerse.text, 0.85, lang);
                            }}
                            style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: 'white', border: 'none', padding: '0.45rem 1.2rem', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', boxShadow: '0 2px 6px rgba(59,130,246,0.3)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(59,130,246,0.3)'; }}
                            title={t('朗讀經文', 'Read aloud')}
                          >
                            🔊 {t('讀經', 'Read')}
                          </button>
                          <button
                            onClick={() => setRainVerseIndex(i => i + 1 + Math.floor(Math.random() * 5))}
                            style={{ background: 'white', color: '#475569', border: '1.5px solid #cbd5e1', padding: '0.45rem 1.2rem', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s' }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'white'; }}
                            title={t('換一句經文', 'Next verse')}
                          >
                            🔀 {t('換一個', 'Next')}
                          </button>
                          <button
                            onClick={() => {
                              if (!randomRainVerse) return;
                              setActiveVerse(randomRainVerse);
                              setSelectedVerseRefs([randomRainVerse.reference]);
                              setTimeout(() => {
                                setInitAutoStart({ trigger: true, isAuto: false, overrideVerse: randomRainVerse });
                              }, 100);
                            }}
                            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', border: 'none', padding: '0.45rem 1.2rem', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', boxShadow: '0 2px 6px rgba(239,68,68,0.3)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,0.4)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(239,68,68,0.3)'; }}
                            title={t('立刻挑戰這節經文', 'Challenge this verse now')}
                          >
                            ⚔️ {t('挑戰', 'Play')}
                          </button>
                        </div>


                      </div>
                    ) : (
                      <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: '1.8', margin: 0 }}>
                        {t("每天一句神的話，心意更新而變化", "One verse a day, keep the devil away")}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' }}>
                    {/* Play Solo */}
                    <div className="primary-button" onClick={() => setMainTab('versesets')} style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', borderRadius: '16px', padding: '2.5rem 2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', textAlign: 'center' }}>
                      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>👤</div>
                      <h2 style={{ fontSize: '2rem', margin: 0, marginBottom: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{t("經典挑戰", "Play Solo")}</h2>
                      <p style={{ fontSize: '1rem', margin: 0, opacity: 0.9 }}>{t("挑戰全球經文組，鍛鍊記憶力與專注力。", "Challenge global sets, hone memory & focus.")}</p>
                    </div>

                    {/* Host Party */}
                    <div className="primary-button" onClick={() => setMainTab('multiplayer')} style={{ background: 'linear-gradient(135deg, #f472b6, #ec4899)', borderRadius: '16px', padding: '2.5rem 2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', textAlign: 'center' }}>
                      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>👨‍👩‍👧‍👦</div>
                      <h2 style={{ fontSize: '2rem', margin: 0, marginBottom: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{t("一起玩!", "Host a Party")}</h2>
                      <p style={{ fontSize: '1rem', margin: 0, opacity: 0.9 }}>{t("與家人朋友分享房間碼來PK同樂！", "Share room code with family and friends!")}</p>
                    </div>

                    {/* My Garden */}
                    <div className="primary-button" onClick={() => setMainTab('garden')} style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', borderRadius: '16px', padding: '2.5rem 2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', textAlign: 'center' }}>
                      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🌳</div>
                      <h2 style={{ fontSize: '2rem', margin: 0, marginBottom: '0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{t("我的園子", "My Garden")}</h2>
                      <p style={{ fontSize: '1rem', margin: 0, opacity: 0.9 }}>{t("檢視你已經學會並種下生命樹的經文。", "View your living scripture trees.")}</p>
                    </div>
                  </div>
                </div>
              )}

              {mainTab === 'advanced' && (
                <div style={{ paddingBottom: '3rem' }}>
                  <h2 style={{ color: '#1e293b', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.8rem' }}>⚙️ {t("進階設定與學習", "Advanced Settings & Learning")}</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', width: '100%' }}>
                    {[
                      { id: 'blindMode', icon: isBlindMode ? '👁️‍🗨️' : '🦯', label: isBlindMode ? t('關閉視障經文雨', 'Disable Blind Mode') : t('打開視障經文雨', 'Enable Blind Mode'), desc: t('為視覺障礙朋友設計的語音模式', 'Voice mode for visually impaired') },
                      { id: 'performanceMode', icon: performanceMode ? '⚡' : '🔋', label: performanceMode ? t('關閉效能模式', 'Disable Performance Mode') : t('打開效能模式', 'Enable Performance Mode'), desc: t('關閉華麗特效以提升流暢度', 'Disable effects for better performance') },
                      { id: 'debugMode', icon: isDebugMode ? '🐞' : '🐛', label: isDebugMode ? t('關閉 Debug', 'Disable Debug') : t('打開 Debug', 'Enable Debug'), desc: t('顯示除錯資訊', 'Show debug info') },
                      { id: 'custom_verses', icon: '👑', label: t('我的專屬題庫', 'My Custom Sets'), desc: t('建立自訂經文組', 'Create custom sets') },
                      { id: 'manual', icon: '📖', label: t('使用說明', 'Manual'), desc: t('操作詳解', 'Detailed instructions') },
                      { id: 'about', icon: 'ℹ️', label: t('關於我們', 'About'), desc: t('VerseRain 開發資訊', 'Info & Credits') },
                      { id: 'donate', link: 'https://www.skool.com/mutualizedeconomy/classroom', icon: '🔓', label: t('解鎖進階功能', 'Unlock Premium'), desc: t('加入進階群組', 'Join Premium Community') },
                      { id: 'feedback', link: 'mailto:hungry4grace@gmail.com?cc=samhsiung@gmail.com,davidhwang1125@gmail.com,hsiungsam@gmail.com', icon: '✉️', label: t('意見回饋', 'Feedback'), desc: t('聯絡與建議', 'Bugs & Suggestions') }
                    ].map(item => (
                      <div key={item.id} className="block-tile" onClick={() => {
                        if (item.id === 'blindMode') {
                          const n = !isBlindMode;
                          setIsBlindMode(n);
                          localStorage.setItem('verseRain_blindMode', String(n));
                          return;
                        }
                        if (item.id === 'performanceMode') {
                          togglePerformanceMode();
                          return;
                        }
                        if (item.id === 'debugMode') {
                          const n = !isDebugMode;
                          setIsDebugMode(n);
                          localStorage.setItem('verseRain_debugMode', String(n));
                          return;
                        }
                        if (item.link) { window.open(item.link, '_blank'); return; }
                        setMainTab(item.id);
                        if (item.id === 'leaderboard') fetchGlobalLeaderboard();
                      }} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                        <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
                        <div>
                          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', marginBottom: '0.2rem' }}>{item.label}</h3>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Voice Picker */}
                  <div style={{ marginTop: '1.5rem', background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 0.8rem 0', color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔊 {t('朗讀語音設定', 'Text-to-Speech Voice')}
                    </h3>
                    <p style={{ margin: '0 0 0.8rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                      {t('選擇你喜歡的語音，首頁「讀經」及遊戲中的語音都會使用此設定。', 'Choose your preferred voice for the Read button and in-game speech.')}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <select
                        value={localStorage.getItem('verseRain_voiceName') || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            localStorage.setItem('verseRain_voiceName', e.target.value);
                          } else {
                            localStorage.removeItem('verseRain_voiceName');
                          }
                          // Force re-render
                          setToast(t('語音已更新！', 'Voice updated!'));
                        }}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', minWidth: '250px', maxWidth: '100%', color: '#1e293b', background: '#f8fafc' }}
                      >
                        <option value="">{t('系統預設語音', 'System Default Voice')}</option>
                        {availableVoices
                          .filter(v => {
                            const lang = version === 'kjv' ? 'en' : version === 'ja' ? 'ja' : version === 'ko' ? 'ko' : version === 'fa' ? 'fa' : version === 'he' ? 'he' : version === 'es' ? 'es' : version === 'tr' ? 'tr' : version === 'de' ? 'de' : version === 'my' ? 'my' : 'zh';
                            return v.lang.startsWith(lang);
                          })
                          .map(v => (
                            <option key={v.name} value={v.name}>{v.name} {v.localService ? '' : '☁️'}</option>
                          ))}
                      </select>
                      <button
                        onClick={() => {
                          const lang = version === 'kjv' ? 'en-US' : version === 'ja' ? 'ja-JP' : version === 'ko' ? 'ko-KR' : version === 'fa' ? 'fa-IR' : version === 'he' ? 'he-IL' : version === 'es' ? 'es-ES' : version === 'tr' ? 'tr-TR' : version === 'de' ? 'de-DE' : version === 'my' ? 'my-MM' : 'zh-TW';
                          speakText(t('這是你選擇的語音試聽。', 'This is a preview of your selected voice.'), 0.9, lang);
                        }}
                        style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: 'white', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}
                      >
                        🔊 {t('試聽', 'Preview')}
                      </button>
                    </div>
                    {localStorage.getItem('verseRain_voiceName') && (
                      <p style={{ margin: '0.6rem 0 0 0', color: '#16a34a', fontSize: '0.85rem', fontWeight: '500' }}>
                        ✅ {t('已記住你的語音偏好，下次回來會自動使用。', 'Your voice preference is saved and will be used automatically.')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {mainTab === 'custom_verses' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👑 {t("我的專屬題庫", "My Custom Sets")}</h2>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', color: hasPremiumAccess ? '#fbbf24' : '#64748b', fontWeight: 'bold' }}>
                      {isPremium ? t("✨ Premium 認證", "✨ Premium Active") : (skoolLevel.level >= 3 ? t(`🌟 Lv.${skoolLevel.level} 權限解鎖`, `🌟 Lv.${skoolLevel.level} Unlocked`) : t("🔒 基本帳號", "🔒 Basic Account"))}
                    </div>
                  </div>

                  {!hasPremiumAccess ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                      <h3 style={{ color: '#334155', marginBottom: '1rem' }}>{t("解鎖自訂經文組功能！", "Unlock Custom Verse Sets!")}</h3>
                      <p style={{ color: '#64748b', marginBottom: '1rem', maxWidth: '400px', margin: '0 auto 1rem', lineHeight: '1.6' }}>
                        {t("你目前還沒有權限建立專屬題庫。有兩種方式可以解鎖：", "You do not have access to create custom verse sets. There are two ways to unlock this:")}
                      </p>
                      <ul style={{ color: '#475569', textAlign: 'left', maxWidth: '400px', margin: '0 auto 2rem', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                        <li><strong>{t("方式一：", "Method 1: ")}</strong>{t("加入 Skool 成為 Premium 會員", "Subscribe to Skool Premium")}</li>
                        <li><strong>{t("方式二：", "Method 2: ")}</strong>{t("在 VerseRain 遊戲的「我的園子」中持續挑戰經文，獲得 20 顆果子，達到 ", "Earn 20 fruits in the game's 'My Garden' to reach ")} <strong style={{ color: '#8b5cf6' }}>Level 3 ({t("共識實踐者", "Consensus Practitioner")})</strong>！</li>
                      </ul>
                      <button type="button" onClick={() => window.open('https://www.skool.com/mutualizedeconomy', '_blank')} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(139, 92, 246, 0.25)' }}>
                        {t("了解並加入 Premium", "Learn About Premium")}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {editingCustomSet ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: '#3b82f6' }}>{editingCustomSet.id ? t("編輯題庫", "Edit Set") : t("新增題庫", "New Set")}</h3>
                            <button type="button" onClick={() => setEditingCustomSet(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>✕ {t("取消", "Cancel")}</button>
                          </div>



                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("標題", "Title")}</label>
                            <input type="text" value={editingCustomSet.title} onChange={e => setEditingCustomSet({ ...editingCustomSet, title: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} placeholder={t("例如：約翰福音核心經文", "e.g., Core Verses of John")} />
                          </div>

                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("簡介", "Description")}</label>
                            <div style={{ background: '#fff', color: '#0f172a', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'visible' }}>
                              <style>{`.ql-editor { min-height: 100px; }`}</style>
                              <ReactQuill
                                theme="snow"
                                value={editingCustomSet.description || ''}
                                onChange={content => setEditingCustomSet({ ...editingCustomSet, description: content })}
                                modules={quillModules}
                                placeholder={t("描述一下這個題庫的用途...", "Describe this set...")}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("經文列表", "Verses")}</label>

                            {editingCustomSet.verses.map((v, idx) => {
                              const autoFetchVerse = async (bookInfo, verseInput, verseIdx) => {
                                if (!bookInfo || !verseInput) return;
                                const sanitized = verseInput.replace(/[～~]/g, '-').replace(/[：]/g, ':').trim();
                                const chapMatch = sanitized.match(/^(\d+)/);
                                if (!chapMatch) return;
                                const chapter = parseInt(chapMatch[1]);
                                let startVerse = 1, endVerse = 999;
                                const verseMatch = sanitized.match(/:(\d+)(?:-(\d+))?/);
                                if (verseMatch) {
                                  startVerse = parseInt(verseMatch[1]);
                                  endVerse = verseMatch[2] ? parseInt(verseMatch[2]) : startVerse;
                                } else if (!sanitized.includes(':')) {
                                  startVerse = 1; endVerse = 999;
                                }
                                const bookAbbr = getBookAbbr(bookInfo, version);
                                const refStr = `${bookAbbr} ${sanitized}`;
                                setEditingCustomSet(prev => {
                                  const nv = [...prev.verses];
                                  nv[verseIdx] = { ...nv[verseIdx], reference: refStr, book: bookInfo.id, verseInput: sanitized };
                                  return { ...prev, verses: nv };
                                });
                                const db = loadedLangs[version]?.verses || [];
                                const sanitizeRef = (str) => str.toString().replace(/\s+/g, '').replace(/[–—~]/g, '-').replace(/[：]/g, ':').toLowerCase();
                                const searchRef = sanitizeRef(refStr);
                                let foundText = '';
                                for (const verse of db) {
                                  if (!verse.reference) continue;
                                  const dbRef = sanitizeRef(verse.reference);
                                  if (dbRef === searchRef) { foundText = verse.text; break; }
                                  const sNum = searchRef.match(/\d+.*$/);
                                  const dNum = dbRef.match(/\d+.*$/);
                                  if (sNum && dNum && sNum[0] === dNum[0]) {
                                    const dBk = dbRef.replace(dNum[0], '');
                                    const validNames = [...bookInfo.names, bookInfo.ja, bookInfo.ko].filter(Boolean).map(n => sanitizeRef(n));
                                    if (validNames.includes(dBk)) {
                                      foundText = verse.text;
                                      break;
                                    }
                                  }
                                }
                                if (foundText) {
                                  setEditingCustomSet(prev => {
                                    const nv = [...prev.verses]; nv[verseIdx] = { ...nv[verseIdx], text: foundText }; return { ...prev, verses: nv };
                                  });
                                  return;
                                }
                                try {
                                  const bollsVersion = version === 'kjv' ? 'KJV' : 'CUV';
                                  const res = await fetch(`https://bolls.life/get-text/${bollsVersion}/${bookInfo.id}/${chapter}/`);
                                  if (!res.ok) throw new Error("API error");
                                  const json = await res.json();
                                  const filtered = json.filter(vv => vv.verse >= startVerse && vv.verse <= endVerse);
                                  if (filtered.length === 0) throw new Error("No verses");
                                  const combined = version === 'cuv'
                                    ? filtered.map(vv => vv.text.replace(/<[^>]+>/g, '').replace(/\s+/g, '')).join('')
                                    : filtered.map(vv => vv.text.replace(/<[^>]+>/g, '').trim()).join(' ');
                                  setEditingCustomSet(prev => {
                                    const nv = [...prev.verses]; nv[verseIdx] = { ...nv[verseIdx], text: combined }; return { ...prev, verses: nv };
                                  });
                                } catch (e) { /* user can fill manually */ }
                              };

                              return (
                                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', alignItems: 'flex-start', position: 'relative' }}>
                                  <button type="button" onClick={() => setBookPickerIdx(bookPickerIdx === idx ? null : idx)}
                                    style={{ padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: v.book ? '#3b82f6' : '#f1f5f9', color: v.book ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: '50px', textAlign: 'center' }}>
                                    {v.book ? getBookAbbr(BIBLE_BOOKS.find(b => b.id === v.book), version) : '📖'}
                                  </button>

                                  {bookPickerIdx === idx && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#1e293b', borderRadius: '8px', padding: '0.8rem', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>📖 {t("選擇書卷", "Books")}</span>
                                        <button type="button" onClick={() => setBookPickerIdx(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>{t("取消", "Cancel")}</button>
                                      </div>
                                      <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.3rem' }}>{t("舊約", "Old Testament")}</div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginBottom: '0.5rem' }}>
                                        {BIBLE_BOOKS.filter(b => b.testament === 'OT').map(book => (
                                          <button key={book.id} type="button" onClick={() => {
                                            const newVerses = [...editingCustomSet.verses];
                                            newVerses[idx] = { ...newVerses[idx], book: book.id, reference: '' };
                                            setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                            setBookPickerIdx(null);
                                          }} style={{ padding: '0.35rem 0.5rem', borderRadius: '3px', border: 'none', background: v.book === book.id ? '#10b981' : 'rgba(255,255,255,0.08)', color: v.book === book.id ? '#fff' : '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '42px' }}>
                                            {getBookAbbr(book, version)}
                                          </button>
                                        ))}
                                      </div>
                                      <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.3rem' }}>{t("新約", "New Testament")}</div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                                        {BIBLE_BOOKS.filter(b => b.testament === 'NT').map(book => (
                                          <button key={book.id} type="button" onClick={() => {
                                            const newVerses = [...editingCustomSet.verses];
                                            newVerses[idx] = { ...newVerses[idx], book: book.id, reference: '' };
                                            setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                            setBookPickerIdx(null);
                                          }} style={{ padding: '0.35rem 0.5rem', borderRadius: '3px', border: 'none', background: v.book === book.id ? '#10b981' : 'rgba(255,255,255,0.08)', color: v.book === book.id ? '#fff' : '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '42px' }}>
                                            {getBookAbbr(book, version)}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <input type="text" value={v.verseInput !== undefined ? v.verseInput : (v.reference || '')} onChange={e => {
                                    const newVerses = [...editingCustomSet.verses];
                                    const bookInfo = v.book ? BIBLE_BOOKS.find(b => b.id === v.book) : null;
                                    const bookPrefix = bookInfo ? getBookAbbr(bookInfo, version) + ' ' : '';
                                    newVerses[idx] = { ...newVerses[idx], verseInput: e.target.value, reference: v.book ? bookPrefix + e.target.value : e.target.value };
                                    setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                  }} onKeyDown={async (e) => {
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                      if (e.key === 'Enter') e.preventDefault();
                                      const bookInfo = BIBLE_BOOKS.find(b => b.id === v.book);
                                      if (!bookInfo) return alert(t("請先選擇書卷", "Please select a book first"));
                                      await autoFetchVerse(bookInfo, v.verseInput || '', idx);
                                    }
                                  }} placeholder={t("章:節 (如 3:16)", "Ch:Vs (e.g. 3:16)")}
                                    style={{ width: '110px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />

                                  <textarea
                                    value={v.text}
                                    readOnly={!v.reference}
                                    onChange={e => {
                                      const newVerses = [...editingCustomSet.verses];
                                      newVerses[idx].text = e.target.value;
                                      setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                    }}
                                    placeholder={t("請先在前方選定書卷並輸入章節，按下 Enter 或 Tab 後即可解鎖此欄位", "Select book & chapter:verse, press Enter/Tab to unlock")}
                                    style={{
                                      flex: 1,
                                      padding: '0.5rem',
                                      borderRadius: '4px',
                                      border: '1px solid #cbd5e1',
                                      minHeight: '40px',
                                      resize: 'vertical',
                                      fontSize: '0.9rem',
                                      background: !v.reference ? '#e2e8f0' : '#ffffff',
                                      cursor: !v.reference ? 'not-allowed' : 'text',
                                      color: !v.reference ? '#94a3b8' : '#0f172a'
                                    }}
                                  />

                                  <button type="button" onClick={() => {
                                    const newVerses = editingCustomSet.verses.filter((_, i) => i !== idx);
                                    setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                  }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>✖</button>
                                </div>
                              );
                            })}

                            <button type="button" onClick={() => {
                              setEditingCustomSet({
                                ...editingCustomSet,
                                verses: [...editingCustomSet.verses, { book: null, verseInput: '', reference: '', text: '' }]
                              });
                            }} style={{ background: '#e2e8f0', color: '#475569', border: '1px dashed #94a3b8', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', width: '100%', marginTop: '0.5rem', fontWeight: 'bold' }}>
                              + {t("新增一節經文", "Add Verse")}
                            </button>
                          </div>

                          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="publishSet" checked={editingCustomSet.isPublished || false} onChange={e => setEditingCustomSet({ ...editingCustomSet, isPublished: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                            <label htmlFor="publishSet" style={{ fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>{t("公開此題庫 (Publish to Global Verse Sets)", "Publish to Global Verse Sets")}</label>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button type="button" onClick={() => {
                              if (!editingCustomSet.title) return alert(t("請填寫標題", "Please fill in title"));
                              if (editingCustomSet.verses.length === 0) return alert(t("請至少新增一節經文", "Please add at least one verse"));

                              const setObj = {
                                ...editingCustomSet,
                                language: version,
                                id: editingCustomSet.id || `custom-${Date.now()}`
                              };

                              let updatedSets;
                              if (editingCustomSet.id) {
                                if (customVerseSets.some(s => s.id === setObj.id)) {
                                  updatedSets = customVerseSets.map(s => s.id === setObj.id ? setObj : s);
                                } else {
                                  updatedSets = [setObj, ...customVerseSets];
                                }
                              } else {
                                updatedSets = [setObj, ...customVerseSets];
                              }

                              setCustomVerseSets(updatedSets);
                              localStorage.setItem('verseRain_custom_sets', JSON.stringify(updatedSets));

                              // Handle publishing sync
                              if (setObj.isPublished) {
                                const publishedObj = { ...setObj, authorName: playerName || "Anonymous" };
                                fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(publishedObj)
                                }).catch(e => console.error("Publish failed", e));

                                setPublishedVerseSets(prev => {
                                  const exists = prev.find(p => p.id === setObj.id);
                                  if (exists) return prev.map(p => p.id === setObj.id ? publishedObj : p);
                                  return [publishedObj, ...prev];
                                });
                              } else {
                                fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: setObj.id })
                                }).catch(e => console.error("Unpublish failed", e));

                                setPublishedVerseSets(prev => prev.filter(p => p.id !== setObj.id));
                              }

                              setEditingCustomSet(null);
                            }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
                              {t("儲存題庫", "Save Set")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <button type="button" onClick={() => {
                            setEditingCustomSet({ title: '', description: '', verses: [{ version: 'CUV', reference: '', text: '' }] });
                          }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', marginBottom: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>+</span> {t("建立新題庫", "Create New Set")}
                          </button>

                          {customVerseSets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                              {t("你還沒有建立任何專屬題庫。點擊上方按鈕開始！", "You haven't created any custom sets yet. Click the button above to start!")}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {customVerseSets.map(set => (
                                <div key={set.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.5rem', position: 'relative' }}>
                                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    <button type="button" onClick={() => {
                                      setSelectedSetId(set.id);
                                      setMainTab('versesets');
                                    }} style={{ background: '#10b981', border: '1px solid #059669', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: 'white' }}>{t("測試遊玩", "Play/Test")}</button>
                                    <button type="button" onClick={() => setEditingCustomSet({ ...set, verses: set.verses?.map(parseVerseRef) || [] })} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>{t("編輯", "Edit")}</button>
                                    <button type="button" onClick={() => {
                                      if (window.confirm(t("確定要刪除嗎？", "Are you sure you want to delete?"))) {
                                        const updated = customVerseSets.filter(s => s.id !== set.id);
                                        setCustomVerseSets(updated);
                                        localStorage.setItem('verseRain_custom_sets', JSON.stringify(updated));

                                        fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                                          method: "DELETE",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ id: set.id })
                                        }).catch(e => console.error(e));
                                        setPublishedVerseSets(prev => prev.filter(p => p.id !== set.id));
                                      }
                                    }} style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#ef4444' }}>{t("刪除", "Delete")}</button>
                                  </div>
                                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', paddingRight: '120px' }}>{set.title}</h3>
                                  <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: set.description }} />
                                  <div style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 'bold' }}>{set.verses?.length || 0} {t("節經文", "verses")}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mainTab === 'multiplayer' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', fontFamily: 'cursive', color: '#8b5cf6' }}>{t("多人即時對戰", "Live Multiplayer")}</h2>

                  {!playerName ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                      <h3 style={{ color: '#475569', margin: 0, fontSize: '1.5rem' }}>{t("請先告訴我們你的名字！", "First, what's your name?")}</h3>
                      <p style={{ color: '#94a3b8', margin: 0 }}>{t("選一個頭像，或直接輸入文字", "Pick an avatar, or just type your name")}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '350px' }}>
                        {['🦁', '🐶', '🐰', '🐱', '🐸', '🐼', '🦊', '🐵', '🦄', '🦖', '🐙', '🦋'].map(emj => (
                          <div key={emj} className="block-tile" onClick={() => {
                            const input = document.getElementById('guestNameInput');
                            if (!input.value.includes(emj)) input.value = emj + " " + input.value;
                          }} style={{ fontSize: '2rem', cursor: 'pointer', padding: '0.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>{emj}</div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '300px', marginTop: '1rem' }}>
                        <input id="guestNameInput" type="text" placeholder={t("你的暱稱", "Your nickname")} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 'bold', boxSizing: 'border-box' }} onKeyDown={(e) => {
                          if (e.key === 'Enter') document.getElementById('guestNameBtn')?.click();
                        }} />
                        <button id="guestNameBtn" onClick={() => {
                          const val = document.getElementById('guestNameInput').value.trim();
                          if (val) {
                            setPlayerName(val);
                            localStorage.setItem('verserain_player_name', val);
                          }
                        }} className="primary-button" style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}>{t("出發！", "Go!")}</button>
                      </div>
                    </div>
                  ) : !multiplayerRoomId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '-1rem' }}>{playerName.substring(0, 2)}</div>
                      <p style={{ color: '#64748b', fontSize: '1.1rem' }}>{t("與朋友一起挑戰九宮格模式！最快拼出經文的人獲勝。", "Challenge your friends in Square mode! The fastest to assemble the verse wins.")}</p>

                      <button
                        onClick={() => {
                          const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
                          let newRoom = '';
                          for (let i = 0; i < 4; i++) newRoom += chars.charAt(Math.floor(Math.random() * chars.length));
                          setMultiplayerRoomId(newRoom);
                        }}
                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', width: '100%', maxWidth: '300px' }}
                      >
                        {t("建立房間 (Host Game)", "Create Room")}
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '300px' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                        <span style={{ padding: '0 1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{t("或", "OR")}</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
                        <input
                          id="joinRoomInput"
                          type="text"
                          placeholder={t("輸入房間代碼", "Enter Room Code")}
                          maxLength={5}
                          style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', textTransform: 'uppercase', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}
                          onChange={(e) => e.target.value = e.target.value.replace(/\s+/g, '')}
                          onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('joinRoomBtn')?.click(); }}
                        />
                        <button
                          id="joinRoomBtn"
                          onClick={() => {
                            const code = document.getElementById('joinRoomInput')?.value.replace(/\s+/g, '').toUpperCase();
                            if (code && code.length > 0) {
                              const roomCode = code.substring(0, 4);
                              setJoinRoomError(null);
                              isGuestJoinRef.current = true;
                              setMultiplayerRoomId(roomCode);
                              // Start 5s timeout — if no STATE_UPDATE arrives, room likely doesn't exist
                              if (joinRoomTimeoutRef.current) clearTimeout(joinRoomTimeoutRef.current);
                              joinRoomTimeoutRef.current = setTimeout(() => {
                                if (isGuestJoinRef.current) {
                                  setJoinRoomError(roomCode);
                                  setMultiplayerRoomId(null);
                                  isGuestJoinRef.current = false;
                                }
                              }, 5000);
                            }
                          }}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {t("加入", "Join")}
                        </button>
                      </div>

                      {joinRoomError && (
                        <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '0.95rem' }}>
                              {t(`找不到房間「${joinRoomError}」`, `Room "${joinRoomError}" not found`)}
                            </div>
                            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '2px' }}>
                              {t('請確認房間代碼是否正確', 'Please check the room code and try again')}
                            </div>
                          </div>
                          <button onClick={() => setJoinRoomError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}>✕</button>
                        </div>
                      )}
                    </div>
                  ) : multiplayerState?.status === 'ready_check' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ padding: '1.5rem', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '2px dashed #d946ef', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#86198f' }}>{t("準備比賽！", "Get Ready!")}</h3>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: getRoomColor(multiplayerRoomId) || '#3b82f6', letterSpacing: '6px', marginBottom: '0.5rem', background: (getRoomColor(multiplayerRoomId) || '#3b82f6') + '18', borderRadius: '6px', padding: '0.3rem 1rem', display: 'inline-block', border: `2px solid ${getRoomColor(multiplayerRoomId) || '#3b82f6'}` }}>{multiplayerRoomId}</div>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.8rem 0' }}>{t("分享此代碼讓更多人加入", "Share this code to let others join")}</p>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?room=${multiplayerRoomId}${personalCode ? '&ref=' + encodeURIComponent(personalCode) : ''}`} size={100} />
                          </div>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{t("或掃描此 QR Code 快速加入", "or scan QR to join")}</p>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c026d3', marginBottom: '0.5rem' }}>{multiplayerState.verseRef}</div>
                        <div style={{ fontSize: '1rem', color: '#701a75', marginBottom: '1rem', fontStyle: 'italic', maxWidth: '300px', lineHeight: '1.4' }}>"{multiplayerState.verseText}"</div>
                        <p style={{ color: '#a21caf', fontSize: '0.9rem', margin: 0 }}>{t("雙方準備就緒後即將開始", "Match starts when both are ready")}</p>
                      </div>

                      {multiplayerState.host !== myClientId && !multiplayerState.players[myClientId]?.isReady && (
                        <div style={{ textAlign: 'center', marginTop: '1rem', color: '#3b82f6', fontWeight: 'bold', fontSize: '1.05rem', backgroundColor: '#eff6ff', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                          👉 {t("如果你準備好了，請按下「我準備好了」的鍵", "If you are ready, please press the 'I am ready' button")} 👈
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0 1.5rem 0', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            if (socketRef.current) socketRef.current.close();
                            setMultiplayerRoomId(null);
                            setMultiplayerState(null);
                          }}
                          style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.8rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {t("離開", "Leave")}
                        </button>

                        {multiplayerState.host === myClientId ? (
                          <button
                            onClick={() => {
                              if (socketRef.current) socketRef.current.send(JSON.stringify({ type: 'HOST_START_GAME' }));
                            }}
                            style={{ background: '#ec4899', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(236, 72, 153, 0.5)' }}
                          >
                            {t("比賽開始", "Start Game")}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (socketRef.current) socketRef.current.send(JSON.stringify({ type: 'PLAYER_READY' }));
                            }}
                            disabled={multiplayerState.players[myClientId]?.isReady}
                            style={{ background: multiplayerState.players[myClientId]?.isReady ? '#10b981' : '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: multiplayerState.players[myClientId]?.isReady ? 'default' : 'pointer', transition: 'all 0.2s', boxShadow: multiplayerState.players[myClientId]?.isReady ? 'none' : '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}
                          >
                            {multiplayerState.players[myClientId]?.isReady ? t("✔️ 已準備", "✔️ Ready") : t("我準備好了", "I am ready")}
                          </button>
                        )}
                      </div>

                      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}>
                        <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>{t("玩家狀態:", "Player Status:")}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {Object.values(multiplayerState.players).map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', backgroundColor: p.isReady ? '#dcfce7' : '#f1f5f9', borderRadius: '6px', border: p.isReady ? '1px solid #86efac' : '1px solid transparent' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: p.color, boxShadow: '0 0 0 2px white, 0 0 0 4px ' + p.color }}></div>
                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{p.name} {multiplayerState.host === p.id ? '(Host)' : ''}</span>
                              </div>
                              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: p.isReady ? '#15803d' : '#94a3b8' }}>
                                {p.isReady ? t("✔️ 已準備", "✔️ READY") : t("等待中...", "WAITING")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : showMultiplayerVersePicker && multiplayerState?.host === myClientId ? (
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '500px', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: '#334155' }}>
                          {pickerSelectedSet ? pickerSelectedSet.title : t("選擇比賽經文組", "Select Verse Group")}
                        </h3>
                        <button onClick={() => setShowMultiplayerVersePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <label style={{ fontWeight: 'bold', color: '#475569', minWidth: '80px' }}>{t("遊戲模式", "Game Mode")}:</label>
                          <select
                            value={multiplayerPlayMode}
                            onChange={(e) => setMultiplayerPlayMode(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', flex: 1, backgroundColor: '#fff', fontSize: '1rem', outline: 'none' }}
                          >
                            <option value="square_solo">{t("獨立九宮格 (Solo Square)", "Solo Square")}</option>
                            <option value="rain_solo">{t("雨滴瀑布 (VerseRain)", "VerseRain")}</option>
                            <option value="voice_solo">{t('語音模式 (Voice Mode)', 'Voice Mode')}</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <label style={{ fontWeight: 'bold', color: '#475569', minWidth: '80px' }}>{t("難度級別", "Difficulty")}:</label>
                          <select
                            value={multiplayerDistractionLevel}
                            onChange={(e) => setMultiplayerDistractionLevel(Number(e.target.value))}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', flex: 1, backgroundColor: '#fff', fontSize: '1rem', outline: 'none' }}
                          >
                            <option value={0}>{t("等級 0 (無干擾方塊，2x2)", "Level 0 (No fakes, 2x2)")}</option>
                            <option value={1}>{t("等級 1 (少量干擾，2x2)", "Level 1 (Few fakes, 2x2)")}</option>
                            <option value={2}>{t("等級 2 (中等干擾，3x3)", "Level 2 (Medium fakes, 3x3)")}</option>
                            <option value={3}>{t("等級 3 (極限干擾，3x3)", "Level 3 (Max fakes, 3x3)")}</option>
                          </select>
                        </div>
                      </div>

                      {/* ── Search Bar ── */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', pointerEvents: 'none' }}>🔍</span>
                          <input
                            id="mpVerseSearchInput"
                            type="text"
                            placeholder={t("搜尋經文（書卷、章節、內文…）", "Search verses (book, chapter, text…)")}
                            value={multiplayerSearchText}
                            onChange={(e) => { setMultiplayerSearchText(e.target.value); setPickerSelectedSet(null); }}
                            autoFocus
                            style={{ width: '100%', padding: '0.75rem 0.9rem 0.75rem 2.4rem', borderRadius: '8px', border: '2px solid #a78bfa', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 0 3px #ede9fe' }}
                          />
                          {multiplayerSearchText && (
                            <button onClick={() => setMultiplayerSearchText('')} style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', padding: '0' }}>✕</button>
                          )}
                        </div>
                      </div>

                      {/* ── Search Results ── */}
                      {multiplayerSearchText.trim().length > 0 ? (() => {
                        const q = multiplayerSearchText.trim().toLowerCase();
                        const verseResults = [];
                        const setResults = [];
                        for (const set of activeVerseSets) {
                          if ((set.title || '').toLowerCase().includes(q)) {
                            setResults.push(set);
                          }
                          for (const v of (set.verses || [])) {
                            if (
                              (v.reference || '').toLowerCase().includes(q) ||
                              (v.title || '').toLowerCase().includes(q) ||
                              (v.text || '').toLowerCase().includes(q)
                            ) {
                              if (!verseResults.some(r => r.reference === v.reference)) verseResults.push(v);
                            }
                          }
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                                {(setResults.length > 0 || verseResults.length > 0) ? `${t('找到', 'Found')} ${setResults.length > 0 ? setResults.length + ' ' + t('個經文組', 'sets') + (verseResults.length > 0 ? ' , ' : '') : ''}${verseResults.length > 0 ? verseResults.length + ' ' + t('節經文', 'verses') : ''}` : t('找不到符合的項目', 'No matches found')}
                              </span>
                              {multiplayerSelectedVerses.length > 0 && (
                                <button
                                  onClick={() => {
                                    setActiveVerse(multiplayerSelectedVerses[0]);
                                    setPlayMode(multiplayerPlayMode);
                                    setDistractionLevel(multiplayerDistractionLevel);
                                    setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: multiplayerSelectedVerses, verse: multiplayerSelectedVerses[0], playMode: multiplayerPlayMode });
                                    setShowMultiplayerVersePicker(false);
                                  }}
                                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                >
                                  ✓ {t('完成揀選', 'Finish')} ({multiplayerSelectedVerses.length})
                                </button>
                              )}
                            </div>
                            
                            {/* Matching Verse Sets */}
                            {setResults.length > 0 && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.7rem', marginBottom: '1rem' }}>
                                {setResults.map(set => (
                                  <button
                                    key={set.id}
                                    onClick={() => { setPickerSelectedSet(set); setMultiplayerSearchText(''); setShowPickerBrowser(true); }}
                                    style={{ padding: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#334155', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s', fontSize: '0.9rem' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#ede9fe'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                                  >
                                    {customVerseSets.some(c => c.id === set.id) ? '👑 ' : ''}{set.title}
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 'normal' }}>{set.verses?.length || 0} {t('節', 'verses')}</div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Matching Verses */}
                            {verseResults.length > 0 && (
                              <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.3rem' }}>
                                {verseResults.slice(0, 80).map(v => {
                                  const isSelected = multiplayerSelectedVerses.some(sv => sv.reference === v.reference);
                                  return (
                                    <div
                                      key={v.reference}
                                      onClick={() => {
                                        if (isSelected) {
                                          setMultiplayerSelectedVerses(prev => prev.filter(sv => sv.reference !== v.reference));
                                        } else {
                                          setMultiplayerSelectedVerses(prev => [...prev, v]);
                                        }
                                      }}
                                      style={{ padding: '0.8rem 1rem', border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`, borderRadius: '8px', background: isSelected ? '#ecfdf5' : '#fafafa', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem', transition: 'all 0.15s' }}
                                      onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.borderColor = isSelected ? '#10b981' : '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: '#7c3aed', fontSize: '1rem' }}>{v.reference}</span>
                                        {isSelected && <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</span>}
                                      </div>
                                      {v.title && <span style={{ fontSize: '0.85rem', color: '#475569' }}>{v.title}</span>}
                                      {v.text && <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.text}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        /* ── Browse by Set (collapsed by default) ── */
                        <div>
                          <button
                            onClick={() => setShowPickerBrowser(v => !v)}
                            style={{ width: '100%', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '0.75rem 1rem', cursor: 'pointer', color: '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.95rem' }}
                          >
                            <span>📚 {t('瀏覽經文組', 'Browse Verse Sets')}</span>
                            <span style={{ fontSize: '0.8rem' }}>{showPickerBrowser ? '▲' : '▼'}</span>
                          </button>
                          {showPickerBrowser && (
                            !pickerSelectedSet ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.7rem', maxHeight: '340px', overflowY: 'auto', marginTop: '0.75rem' }}>
                                {activeVerseSets.map(set => (
                                  <button
                                    key={set.id}
                                    onClick={() => setPickerSelectedSet(set)}
                                    style={{ padding: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#334155', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s', fontSize: '0.9rem' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#ede9fe'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                                  >
                                    {customVerseSets.some(c => c.id === set.id) ? '👑 ' : ''}{set.title}
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 'normal' }}>{set.verses?.length || 0} {t('節', 'verses')}</div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.3rem', marginTop: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                  <button onClick={() => { setPickerSelectedSet(null); setMultiplayerSelectedVerses([]); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0' }}>
                                    <span>←</span> {t('返回經文組', 'Back to Groups')}
                                  </button>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{t('隨機', 'Rand')} ({pickerSelectedSet.verses?.length || 0})</span>
                                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                                        <button onClick={() => setRandomPickCount(Math.max(1, (parseInt(randomPickCount) || 1) - 1))} style={{ width: '24px', height: '24px', border: 'none', background: '#e2e8f0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transform: 'none' }}>-</button>
                                        <input type="number" min="1" max={pickerSelectedSet.verses?.length || 1} value={randomPickCount || 1} onChange={(e) => setRandomPickCount(e.target.value === '' ? '' : Math.min(pickerSelectedSet.verses?.length || 1, Math.max(1, parseInt(e.target.value))))} style={{ width: '36px', height: '24px', padding: '0', border: 'none', background: 'white', outline: 'none', textAlign: 'center', fontSize: '0.9rem', color: '#334155', fontWeight: 'bold', margin: '0' }} />
                                        <button onClick={() => setRandomPickCount(Math.min(pickerSelectedSet.verses?.length || 1, (parseInt(randomPickCount) || 1) + 1))} style={{ width: '24px', height: '24px', border: 'none', background: '#e2e8f0', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transform: 'none' }}>+</button>
                                      </div>
                                      <button onClick={() => { if (!pickerSelectedSet?.verses) return; const sel = [...pickerSelectedSet.verses].sort(() => 0.5 - Math.random()).slice(0, randomPickCount); setActiveVerse(sel[0]); setPlayMode(multiplayerPlayMode); setDistractionLevel(multiplayerDistractionLevel); setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: sel, verse: sel[0], playMode: multiplayerPlayMode }); setShowMultiplayerVersePicker(false); }} style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}><Dices size={13} /> {t('開始', 'Start')}</button>
                                    </div>
                                    {multiplayerSelectedVerses.length > 0 && (
                                      <button onClick={() => { setActiveVerse(multiplayerSelectedVerses[0]); setPlayMode(multiplayerPlayMode); setDistractionLevel(multiplayerDistractionLevel); setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: multiplayerSelectedVerses, verse: multiplayerSelectedVerses[0], playMode: multiplayerPlayMode }); setShowMultiplayerVersePicker(false); }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        ✓ {t('完成揀選', 'Finish')} ({multiplayerSelectedVerses.length})
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {pickerSelectedSet.verses?.map(v => {
                                  const isSelected = multiplayerSelectedVerses.some(sv => sv.reference === v.reference);
                                  return (
                                    <div key={v.reference} onClick={() => { if (isSelected) { setMultiplayerSelectedVerses(prev => prev.filter(sv => sv.reference !== v.reference)); } else { setMultiplayerSelectedVerses(prev => [...prev, v]); } }} style={{ padding: '0.8rem 1rem', border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`, borderRadius: '8px', background: isSelected ? '#ecfdf5' : '#fafafa', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem', transition: 'all 0.15s' }} onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#a78bfa'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = isSelected ? '#10b981' : '#e2e8f0'; }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', color: '#7c3aed', fontSize: '1rem' }}>{v.reference}</span>
                                        {isSelected && <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>}
                                      </div>
                                      {v.title && <span style={{ fontSize: '0.85rem', color: '#475569' }}>{v.title}</span>}
                                      {v.text && <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.text}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', width: '100%', maxWidth: '400px' }}>
                        {(!multiplayerState?.host || multiplayerState.host === myClientId) ? (
                          <>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>{t("等待玩家...", "Waiting...")}</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getRoomColor(multiplayerRoomId) || '#3b82f6', letterSpacing: '6px', marginBottom: '0.8rem', background: (getRoomColor(multiplayerRoomId) || '#3b82f6') + '18', borderRadius: '8px', padding: '0.4rem 1.2rem', display: 'inline-block', border: `3px solid ${getRoomColor(multiplayerRoomId) || '#3b82f6'}`, boxShadow: `0 0 16px ${getRoomColor(multiplayerRoomId) || '#3b82f6'}44` }}>{multiplayerRoomId}</div>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>{t("請朋友輸入上方的代碼來加入您的遊戲", "Ask your friend to enter this code to join")}</p>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                              <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?room=${multiplayerRoomId}${personalCode ? '&ref=' + encodeURIComponent(personalCode) : ''}`} size={120} />
                              </div>
                              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>{t("或掃描上方 QR Code 快速加入", "or scan QR to join")}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#3b82f6' }}>{t("等待遊戲開始...", "Waiting for game...")}</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getRoomColor(multiplayerRoomId) || '#3b82f6', letterSpacing: '6px', marginBottom: '0.8rem', background: (getRoomColor(multiplayerRoomId) || '#3b82f6') + '18', borderRadius: '8px', padding: '0.4rem 1.2rem', display: 'inline-block', border: `3px solid ${getRoomColor(multiplayerRoomId) || '#3b82f6'}`, boxShadow: `0 0 16px ${getRoomColor(multiplayerRoomId) || '#3b82f6'}44` }}>{multiplayerRoomId}</div>
                            <p style={{ color: '#0ea5e9', fontSize: '1.05rem', margin: '1rem 0 0 0', fontWeight: 'bold', lineHeight: 1.5 }}>
                              {t("現在等候遊戲主人選好經文，", "Waiting for the host to")} <br /> {t("請稍後。。。", "select verses, please wait...")}
                            </p>
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => {
                            if (socketRef.current) socketRef.current.close();
                            setMultiplayerRoomId(null);
                            setMultiplayerState(null);
                          }}
                          style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '1.6rem 3rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.4rem' }}
                        >
                          {t("離開房間", "Leave Room")}
                        </button>

                        {multiplayerState?.host === myClientId && (
                          <button
                            onClick={() => {
                              setShowMultiplayerVersePicker(true);
                              setPickerSelectedSet(null);
                              setMultiplayerSearchText('');
                              setShowPickerBrowser(false);
                            }}
                            disabled={!multiplayerState || Object.keys(multiplayerState.players).length < 2}
                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: Object.keys(multiplayerState?.players || {}).length < 2 ? 'not-allowed' : 'pointer', opacity: Object.keys(multiplayerState?.players || {}).length < 2 ? 0.5 : 1 }}
                          >
                            {t("選擇比賽經文", "Select Verse")}
                          </button>
                        )}
                      </div>

                      {multiplayerState && multiplayerState.players && (
                        <div style={{ width: '100%', maxWidth: '400px', textAlign: 'left', marginTop: '1rem' }}>
                          <h4 style={{ color: '#475569', marginBottom: '0.5rem' }}>{t("已加入的玩家:", "Players Joined:")}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {Object.values(multiplayerState.players).map(p => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: p.color, boxShadow: '0 0 0 2px white, 0 0 0 4px ' + p.color }}></div>
                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{p.name} {multiplayerState.host === p.id ? '(Host)' : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

              {mainTab === 'versesets' && (
                <>

                  {/* The Verse Sets Table */}
                  <div style={{ backgroundColor: '#ffffff', overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {selectedSetId === null ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                          <select
                            value={versesetsSort}
                            onChange={(e) => { setVersesetsSort(e.target.value); setVersesetsPage(1); }}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#334155', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            <option value="popular">{t("最受歡迎", "Most Popular")}</option>
                            <option value="newest">{t("最新", "Newest")}</option>
                          </select>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                              <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', width: '50px' }}>📁</th>
                              <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("標題", "Title")}</th>
                              <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("作者", "Author")}</th>
                              <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>{t("點閱次數", "Views")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              let sortedSets = [...activeVerseSets];
                              if (versesetsSort === 'popular') {
                                sortedSets.sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0));
                              } else {
                                sortedSets.sort((a, b) => {
                                  const aIsCustom = String(a.id).startsWith('custom-');
                                  const bIsCustom = String(b.id).startsWith('custom-');
                                  // Custom sets come before official sets
                                  if (aIsCustom && !bIsCustom) return -1;
                                  if (!aIsCustom && bIsCustom) return 1;
                                  // Both custom: sort by timestamp (higher = newer = first)
                                  if (aIsCustom && bIsCustom) {
                                    const tsA = parseInt(String(a.id).replace('custom-', ''), 10) || 0;
                                    const tsB = parseInt(String(b.id).replace('custom-', ''), 10) || 0;
                                    return tsB - tsA;
                                  }
                                  // Both official: sort by reverse original order (newer ones appended at the end come first)
                                  const getBaseIndex = (set) => {
                                    // Base sets are at the beginning of activeVerseSets, in the order they appear in baseVerseSets
                                    const indexInBase = baseVerseSets.findIndex(b => b.id === set.id);
                                    return indexInBase !== -1 ? indexInBase : -1;
                                  };
                                  return getBaseIndex(b) - getBaseIndex(a);
                                });
                              }

                              const totalPages = Math.ceil(sortedSets.length / 10) || 1;
                              const currentSetList = sortedSets.slice((versesetsPage - 1) * 10, versesetsPage * 10);

                              return currentSetList.map((set, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => {
                                  setSelectedSetId(set.id);
                                  fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id }) }).catch(e => e);
                                  setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                                }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                                  <td style={{ padding: '1rem', textAlign: 'center', color: '#3b82f6', fontSize: '1.2rem' }}>{customVerseSets.some(c => c.id === set.id) ? '👑' : '📁'}</td>
                                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#1e293b', fontSize: '1.05rem' }}>
                                    <span>{set.title}</span>
                                    {isAdmin && !customVerseSets.some(c => c.id === set.id) && (
                                      <span style={{ marginLeft: '1rem', display: 'inline-flex', gap: '0.5rem' }}>
                                        <button onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCustomSet({ ...set, isPublished: true, verses: set.verses?.map(parseVerseRef) || [] });
                                          setMainTab('custom_verses');
                                        }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#475569' }}>Admin 編輯</button>
                                        <button onClick={(e) => {
                                          e.stopPropagation();
                                          if (window.confirm("Admin: 確定要從全域資料庫強制刪除這份經文組？")) {
                                            fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                                              method: "DELETE",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ id: set.id })
                                            }).catch(e => console.error(e));
                                            setPublishedVerseSets(prev => prev.filter(p => p.id !== set.id));
                                          }
                                        }} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Admin 刪除</button>
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '1rem', color: '#337ab7', fontSize: '0.9rem', fontWeight: 'bold' }}>{set.authorName && set.authorName !== "Anonymous" ? set.authorName : (String(set.id).startsWith("custom-") ? t('匿名玩家', 'Anonymous') : t('Verserain 官方', 'Official'))}</td>
                                  <td style={{ padding: '1rem', textAlign: 'right', color: '#64748b', fontWeight: 'bold' }}>{viewCounts[set.id] || 0}</td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>

                        {/* Pagination for Verse Sets */}
                        {Math.ceil(activeVerseSets.length / 10) > 1 && (
                          <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                            {Array.from({ length: Math.ceil(activeVerseSets.length / 10) }).map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setVersesetsPage(idx + 1)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '8px',
                                  border: versesetsPage === idx + 1 ? 'none' : '1px solid #cbd5e1',
                                  background: versesetsPage === idx + 1 ? '#3b82f6' : '#ffffff',
                                  color: versesetsPage === idx + 1 ? '#ffffff' : '#475569',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  minWidth: '40px'
                                }}
                              >
                                {idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                              onClick={() => setSelectedSetId(null)}
                              style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#ffffff'}
                            >
                              <Home size={14} /> {t("返回目錄", "Back to Menu")}
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t("目前選擇", "Current Set")}</span>
                              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>{currentSet?.title}</span>
                            </div>
                          </div>

                          {/* Top Level Action Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', borderRight: '1px solid #cbd5e1', paddingRight: '0.5rem', marginRight: '0.5rem' }}>
                              <select
                                onChange={(e) => setPlayMode(e.target.value)}
                                value={playMode}
                                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                <option value="square">{t('九宮格', 'Square')}</option>
                                <option value="rain">{t('經文雨', 'Verse Rain')}</option>
                                <option value="voice">{t('語音模式', 'Voice Mode')}</option>
                              </select>
                              <select
                                onChange={(e) => setDistractionLevel(Number(e.target.value))}
                                value={distractionLevel}
                                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                <option value={0}>{t("難度 0", "Level 0")}</option>
                                <option value={1}>{t("難度 1", "Level 1")}</option>
                                <option value={2}>{t("難度 2", "Level 2")}</option>
                                <option value={3}>{t("難度 3", "Level 3")}</option>
                              </select>
                            </div>

                            <button
                              onClick={() => {
                                const link = `${window.location.origin}${window.location.pathname}?viewSet=${encodeURIComponent(currentSet.id)}`;
                                setQrShareModal({ url: link, reference: currentSet.title });
                              }}
                              title={t("分享此經文組", "Share this verse set")}
                              style={{ backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s' }}
                              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            >
                              <Share2 size={16} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', background: 'transparent', borderRadius: '4px' }}>
                                <button
                                  onClick={() => setRandomPickCount(Math.max(1, (parseInt(randomPickCount) || 1) - 1))}
                                  style={{ width: '28px', height: '30px', border: 'none', background: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '1.2rem', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px', transform: 'none' }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={VERSES_DB.length}
                                  value={randomPickCount > VERSES_DB.length ? VERSES_DB.length : randomPickCount}
                                  onChange={(e) => setRandomPickCount(e.target.value === '' ? '' : Math.min(VERSES_DB.length, Math.max(1, parseInt(e.target.value))))}
                                  style={{ width: '40px', height: '30px', padding: '0', border: 'none', background: 'white', outline: 'none', textAlign: 'center', fontSize: '1rem', color: '#334155', fontWeight: 'bold', margin: '0' }}
                                  title={t("選擇隨機題數", "Number of random verses")}
                                />
                                <button
                                  onClick={() => setRandomPickCount(Math.min(VERSES_DB.length, (parseInt(randomPickCount) || 1) + 1))}
                                  style={{ width: '28px', height: '30px', border: 'none', background: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '1.2rem', borderTopRightRadius: '4px', borderBottomRightRadius: '4px', transform: 'none' }}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  initAudio();
                                  let queue = [...VERSES_DB];
                                  let actualCount = Math.min(VERSES_DB.length, Math.max(1, parseInt(randomPickCount) || 1));
                                  queue = queue.sort(() => 0.5 - Math.random()).slice(0, actualCount);
                                  setCampaignQueue(queue.slice(1));
                                  setCampaignResults([]);
                                  setActiveCampaignSetId(currentSet.id);
                                  setActiveCampaignSetTotal(queue.length);
                                  setActiveVerse(queue[0]);
                                  setTimeout(() => startGame(false, queue[0]), 200);
                                }}
                                title={t("隨機挑戰所選題數", "Randomly challenge selected number")}
                                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '0 0.8rem', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <Zap size={16} fill="white" /> {t("挑戰", "Challenge")}
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                initAudio();
                                let queue = [...VERSES_DB];
                                let actualCount = Math.min(VERSES_DB.length, Math.max(1, parseInt(randomPickCount) || 1));
                                queue = queue.sort(() => 0.5 - Math.random()).slice(0, actualCount);
                                setCampaignQueue(queue.slice(1));
                                setCampaignResults([]);
                                setActiveCampaignSetId(currentSet.id);
                                setActiveCampaignSetTotal(queue.length);
                                setActiveVerse(queue[0]);
                                setTimeout(() => startGame(true, queue[0]), 200);
                              }}
                              title={t("隨機播放所選數量的經文圖卡與語音", "Shuffle play selected number of verses with audio")}
                              style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', padding: '0 0.8rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Headphones size={16} fill="white" /> {t("隨機播放", "Shuffle Play")}
                            </button>

                            <button
                              onClick={() => {
                                initAudio();
                                const queue = [...currentSet.verses];
                                const selCount = parseInt(randomPickCount) || 1;
                                const sel = queue.sort(() => 0.5 - Math.random()).slice(0, selCount);
                                
                                setCampaignQueue(sel);
                                setActiveCampaignSetId(currentSet.id);
                                setActiveCampaignSetTotal(sel.length);
                                
                                const pm = playMode === 'square' ? 'square_solo' : playMode === 'rain' ? 'rain_solo' : 'voice_solo';
                                setMultiplayerPlayMode(pm);
                                setMultiplayerDistractionLevel(distractionLevel);
                                
                                pendingInvitePKRef.current = {
                                  queue: sel,
                                  pm: pm,
                                  dl: distractionLevel
                                };
                                
                                setMainTab('multiplayer');
                                const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
                                let newRoom = '';
                                for (let i = 0; i < 4; i++) newRoom += chars.charAt(Math.floor(Math.random() * chars.length));
                                setMultiplayerRoomId(newRoom);
                              }}
                              title={t("開房間邀請連線遊玩", "Invite players for the whole set")}
                              style={{ backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', padding: '0 0.8rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Users size={16} /> {t("邀人PK", "Invite")}
                            </button>

                            <button
                              onClick={() => {
                                setLeaderboardSetId(currentSet.id);
                                setShowSetLeaderboard(true);
                              }}
                              title={t("查看這個經文組的通關紀錄", "View clear records for this set")}
                              style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', padding: '0 0.8rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Trophy size={16} fill="white" /> {t("通關紀錄", "Records")}
                            </button>

                            {(playerName === currentSet?.authorName || playerName === 'hungry@G') && (
                              <button
                                onClick={() => {
                                  setEditingCustomSet({ ...currentSet, isPublished: true, verses: currentSet.verses?.map(parseVerseRef) || [] });
                                  setMainTab('custom_verses');
                                }}
                                title={t("編輯這個經文組", "Edit this verse set")}
                                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '0 0.8rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <Edit size={16} color="white" /> {t("編輯", "Edit")}
                              </button>
                            )}
                          </div>
                        </div>
                        {currentSet?.description && (
                          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#334155', fontSize: '1rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: currentSet.description }} className="ql-editor-content" />
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                              <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("經文出處 (點擊觀看)", "Reference (Click to View)")}</th>
                              <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '100px' }}>{t("排行", "Rank")}</th>
                              <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', width: '100px', textAlign: 'center' }}>{t("操作", "Action")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {VERSES_DB.map((v, i) => {
                              const vBest = parseInt(localStorage.getItem(`verseRainBestScore_${v.reference}`)) || 0;
                              const isSelected = selectedVerseRefs.includes(v.reference);

                              return (
                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isSelected ? '#eff6ff' : (i % 2 === 0 ? '#ffffff' : '#f8fafc'), transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => toggleSelection(v.reference)}>
                                  <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }} onClick={(e) => { e.stopPropagation(); setVerseViewModal(v); }}>
                                    <button style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold', fontSize: 'inherit', fontFamily: 'inherit' }}>
                                      {v.reference}
                                    </button>
                                  </td>
                                  <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                      style={{ background: 'transparent', border: '1px solid #fbbf24', color: '#d97706', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 'bold' }}
                                      onClick={() => {
                                        setLeaderboardModalVerse(v);
                                        setIsFetchingLeaderboard(true);
                                        fetch(`/api/get-scores?verseRef=${encodeURIComponent(v.reference)}`)
                                          .then(res => res.json())
                                          .then(data => setLeaderboardModalData(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
                                          .catch(() => setLeaderboardModalData({ alltime: [], monthly: [], daily: [] }))
                                          .finally(() => setIsFetchingLeaderboard(false));
                                      }}
                                    >
                                      <Trophy size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} /> {vBest > 0 ? vBest : t('排行榜', 'Rank')}
                                    </button>
                                  </td>
                                  <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', justifyContent: 'center' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          initAudio();
                                          setCampaignQueue(null);
                                          setCampaignResults([]);
                                          setActiveVerse(v);
                                          setTimeout(() => startGame(false, v), 50);
                                        }}
                                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                      >
                                        <Zap size={14} fill="white" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const link = `${window.location.origin}${window.location.pathname}?challenge=${encodeURIComponent(v.reference)}&m=${playMode}&dx=${distractionLevel}`;
                                          setQrShareModal({ url: link, reference: v.reference });
                                        }}
                                        title={t("分享挑戰連結", "Share challenge link")}
                                        style={{ backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s' }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                      >
                                        <Share2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>


                </>
              )}

              {mainTab === 'garden' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>🌳 {t("我的園子", "My Garden")}</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {t("每挑戰一節新經文，就會在空地上長出嫩芽。持續練習讓它長大！通過經文變成大樹，創新高則結出果子🍎", "Each new verse you challenge sprouts a seedling. Keep practicing to grow it! Clearing a verse makes it a full tree; new high scores bear fruit 🍎")}
                  </p>

                  {/* My Harvest Basket Header */}
                  <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', padding: '2rem', borderRadius: '16px', border: '1px solid #fde68a', marginBottom: '2rem', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '0.5rem', animation: 'bounce 2s infinite' }}>🧺</div>
                    <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#b45309', marginBottom: '0.5rem' }}>{t("我的收成", "My Harvest")}</h3>
                    <p style={{ margin: 0, color: '#92400e', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                      {t("過關斬將結出果子，提升你的互惠階級！", "Clear verses to bear fruit and level up!")}
                    </p>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', background: '#fff', padding: '1rem 2rem', borderRadius: '50px', border: '2px solid #fbbf24', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '2px solid #fcd34d', paddingRight: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {t("總果子數量", "Total Fruits")}
                          <button
                            onClick={() => setShowFruitInfo(true)}
                            title={t("查看果子來源說明", "How are fruits counted?")}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: '1', fontSize: '1rem', animation: 'pulse 2s infinite', display: 'flex', alignItems: 'center', color: '#94a3b8' }}
                          >ⓘ</button>
                        </span>
                        <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#d97706', lineHeight: '1' }}>{totalFruits} <span style={{ fontSize: '1.5rem' }}>🍎</span></span>
                      </div>
                      <button
                        onClick={() => setShowLevelInfo(true)}
                        onMouseEnter={e => Object.assign(e.currentTarget.style, { transform: 'scale(1.05)', backgroundColor: '#f8fafc' })}
                        onMouseLeave={e => Object.assign(e.currentTarget.style, { transform: 'scale(1)', backgroundColor: 'transparent' })}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '12px' }}
                      >
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {t("目前階級", "Current Level")} <span style={{ fontSize: '1rem', animation: 'pulse 2s infinite' }}>ℹ️</span>
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: skoolLevel.level >= 3 ? '#8b5cf6' : '#2563eb' }}>
                          Lv.{skoolLevel.level} {t(skoolLevel.title, skoolLevel.enTitle)}
                        </span>
                      </button>
                    </div>

                    {skoolLevel.next !== null && (
                      <div style={{ marginTop: '1.5rem', maxWidth: '400px', margin: '1.5rem auto 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#92400e', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                          <span>Lv.{skoolLevel.level}</span>
                          <span>Lv.{skoolLevel.level + 1} ({skoolLevel.next}🍎)</span>
                        </div>
                        <div style={{ width: '100%', height: '14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (totalFruits / skoolLevel.next) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', transition: 'width 1s ease-in-out' }} />
                        </div>
                      </div>
                    )}

                    {skoolLevel.level >= 3 && !isPremium && (() => {
                      const dismissed = localStorage.getItem('verseRain_customSetUnlockSeen');
                      return (
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', borderRadius: '12px', border: '1px solid #c4b5fd', animation: dismissed ? 'none' : 'flashSuccess 1s ease-in-out 3', position: 'relative' }}>
                          {!dismissed && (
                            <div style={{ position: 'absolute', top: '8px', right: '12px', cursor: 'pointer', fontSize: '1.2rem', color: '#7c3aed', opacity: 0.6 }}
                              onClick={(e) => { e.stopPropagation(); localStorage.setItem('verseRain_customSetUnlockSeen', 'true'); setToast(t('已知悉', 'Got it!')); }}
                              title={t('不再提醒', 'Dismiss')}
                            >✕</div>
                          )}
                          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                          <h4 style={{ margin: 0, color: '#5b21b6', fontSize: '1.3rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            {t("恭喜！你已解鎖專屬題庫功能！", "Congratulations! Custom Sets Unlocked!")}
                          </h4>
                          <p style={{ margin: 0, color: '#4c1d95', fontSize: '1rem', lineHeight: '1.5' }}>
                            {t("身為 Lv.3 以上的實踐者，你現在可以前往「進階功能 ➔ 我的專屬題庫」自由創建與分享你專屬的經文組了！", "As a Level 3+ player, you can now freely create custom verse sets from the Advanced settings menu!")}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Gamification Invite Block (Unlocked for Lv.2+, Teaser for Lv.1) */}
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                      <h4 style={{ margin: 0, color: skoolLevel.level >= 2 ? '#10b981' : '#94a3b8', fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📨</span> {t("邀請朋友一起玩", "Invite Friends to Play")}
                      </h4>

                      {skoolLevel.level >= 2 ? (
                        <>
                          <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: '1.5', marginBottom: '1.2rem' }}>
                            {t("你的專屬推廣連結：當朋友們透過此連結直接進入加入 VerseRain，並完成他們的第一次背經遊戲，雙方都會自動獲得「推廣點數」獎勵，同時你也將累積推廣大使進度！", "Your personal invite link: When friends load VerseRain via this link and complete their first game, both of you earn bonus points!")}
                          </p>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                            <input
                              readOnly
                              value={`${window.location.origin}?ref=${encodeURIComponent(personalCode)}`}
                              style={{ flex: 1, minWidth: '220px', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontSize: '0.95rem' }}
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}?ref=${encodeURIComponent(personalCode)}`);
                                setToast(t("邀請連結已複製！快發給好朋友吧！", "Invite link copied! Share it with friends!"));
                                setTimeout(() => setToast(null), 3500);
                              }}
                              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', minHeight: '44px' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                            >
                              {t("複製", "Copy")}
                            </button>
                            {typeof QRCodeSVG !== 'undefined' && (
                              <button
                                onClick={() => setQrShareModal({ url: `${window.location.origin}?ref=${encodeURIComponent(personalCode)}`, reference: 'VerseRain 遊戲邀請' })}
                                style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', minHeight: '44px' }}
                              >
                                {t("QR 碼", "QR Code")}
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.8rem' }}>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>
                            {t("想要擁有你的個人推薦碼並賺取推廣點數嗎？", "Want to get your personal invite code and earn referral points?")}
                          </p>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            <span>🔒</span>
                            <span style={{ color: '#475569', fontSize: '0.95rem' }}>
                              {t("再結出 ", "Bear ")} <strong>{2 - totalFruits}</strong> {t(" 個果子 🍎，達到 Lv.2 即可解鎖個人專屬連結！", " more fruits 🍎 to reach Lv.2 and unlock your invite link!")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const entries = Object.entries(gardenData);
                    const treeCount = entries.length;
                    const cellsPerField = 100;
                    const maxGridIndex = entries.reduce((max, [, data]) => Math.max(max, data.gridIndex), -1);
                    const fieldCount = Math.max(1, Math.ceil((maxGridIndex + 1) / cellsPerField));

                    // Build grid lookup: gridIndex -> { ref, stage, fruits }
                    const gridMap = {};
                    entries.forEach(([ref, data]) => {
                      gridMap[data.gridIndex] = { ref, ...data };
                    });

                    // Stage visuals
                    const applePositions = [
                      { top: '30%', left: '50%' }, // 1
                      { top: '45%', left: '30%' }, // 2
                      { top: '45%', left: '70%' }, // 3
                      { top: '25%', left: '35%' }, // 4
                      { top: '25%', left: '65%' }, // 5
                      { top: '55%', left: '50%' }, // 6
                      { top: '35%', left: '20%' }, // 7
                      { top: '35%', left: '80%' }, // 8
                      { top: '15%', left: '50%' }, // 9
                    ];

                    const stageEmoji = (stage, fruits) => {
                      if (stage <= 0) return '';
                      if (stage <= 3) return <img src="/assets/garden/tree-seedling.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))' }} alt="seedling" />;
                      if (stage <= 6) return <img src="/assets/garden/tree-sapling.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.2))' }} alt="sapling" />;
                      if (stage <= 9) return <img src="/assets/garden/tree-mature.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.3))' }} alt="mature tree" />;

                      if (fruits > 0) {
                        const displayApples = Math.min(fruits, 9);
                        return (
                          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'absolute', width: '150%', height: '150%', transform: 'translateY(-15%)' }}>
                              <img src="/assets/garden/tree-mature.png" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.3))' }} alt="mature tree" />
                              {Array.from({ length: displayApples }).map((_, idx) => (
                                <div key={idx} style={{
                                  position: 'absolute',
                                  top: applePositions[idx].top,
                                  left: applePositions[idx].left,
                                  fontSize: '14px',
                                  transform: 'translate(-50%, -50%)',
                                  filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))',
                                  zIndex: 2,
                                  pointerEvents: 'none',
                                }}>
                                  🍎
                                </div>
                              ))}
                            </div>
                            {fruits > 9 && (
                              <span style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '12px', fontWeight: 'bold', color: '#b91c1c', background: 'rgba(255,255,255,0.9)', borderRadius: '6px', padding: '1px 4px', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                +{fruits - 9}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return <img src="/assets/garden/tree-mature.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.3))' }} alt="mature tree" />;
                    };

                    const stageLabel = (stage) => {
                      if (stage === 1) return t('嫩芽', 'Seedling');
                      if (stage <= 3) return t('幼苗', 'Sprout');
                      if (stage <= 5) return t('小樹', 'Sapling');
                      if (stage <= 8) return t('成長中', 'Growing');
                      if (stage === 9) return t('快完成了', 'Almost there');
                      return t('大樹', 'Full Tree');
                    };

                    const stageBg = (stage) => {
                      if (stage === 0) return '#e8f5e9';
                      if (stage <= 3) return '#c8e6c9';
                      if (stage <= 6) return '#a5d6a7';
                      if (stage <= 9) return '#81c784';
                      return '#66bb6a';
                    };

                    return (
                      <div>
                        {/* Stats bar */}
                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#0f172a', fontWeight: '500' }}>
                            🌱 {t("種植", "Planted")}: <strong>{treeCount}</strong>
                          </div>
                          <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#4c1d95', fontWeight: '500' }}>
                            🌳 {t("大樹", "Full Trees")}: <strong>{entries.filter(([, d]) => d.stage >= 10).length}</strong>
                          </div>
                          <div style={{ padding: '0.5rem 1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', color: '#7f1d1d', fontWeight: '500' }}>
                            🍎 {t("果子", "Fruits")}: <strong>{entries.reduce((sum, [, d]) => sum + (d.fruits || 0), 0)}</strong>
                          </div>
                        </div>

                        {/* Mode & Level Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.8rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>⚙️ {t("挑戰設定", "Challenge Settings")}:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>{t("模式", "Mode")}</label>
                            <select
                              onChange={(e) => setPlayMode(e.target.value)}
                              value={playMode}
                              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              <option value="square">{t('九宮格', 'Square')}</option>
                              <option value="rain">{t('經文雨', 'Verse Rain')}</option>
                              <option value="voice">{t('語音模式', 'Voice Mode')}</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Tooltip text={t("等級越高，會有越多錯誤的干擾方塊混在裡面！", "Higher levels mix in more fake blocks!")}>
                              <label style={{ fontSize: '0.85rem', color: '#64748b', cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>{t("難度", "Level")} ⓘ</label>
                            </Tooltip>
                            <select
                              onChange={(e) => setDistractionLevel(Number(e.target.value))}
                              value={distractionLevel}
                              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              <option value={0}>{t("無干擾", "No Distraction")}</option>
                              <option value={1}>{t("單字干擾", "Level 1")}</option>
                              <option value={2}>{t("標點干擾", "Level 2")}</option>
                              <option value={3}>{t("難度 3", "Level 3")}</option>
                            </select>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t("點擊查看經文，雙擊開始挑戰！", "Click to view, double-click to challenge!")}</span>
                        </div>

                        {/* The Grid - Isometric */}
                        {(() => {
                          const hour = new Date().getHours();
                          let envBg = 'linear-gradient(to bottom, #bae6fd, #e0f2fe)'; // Day
                          if (hour >= 19 || hour < 5) envBg = 'linear-gradient(to bottom, #0f172a, #1e1b4b)'; // Night
                          else if (hour >= 17) envBg = 'linear-gradient(to bottom, #fca5a5, #fef08a)'; // Sunset
                          else if (hour >= 5 && hour < 8) envBg = 'linear-gradient(to bottom, #fce7f3, #fef08a)'; // Sunrise

                          return (
                            <div style={{
                              overflow: 'hidden',
                              width: '100%',
                              height: '60vh',
                              minHeight: '400px',
                              borderRadius: '12px',
                              border: '4px solid #334155',
                              background: envBg,
                              position: 'relative',
                              boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.1)'
                            }}>
                              <TransformWrapper initialScale={1} minScale={0.3} maxScale={4} centerOnInit={true} doubleClick={{ disabled: true }}>
                                {({ zoomIn, zoomOut, resetTransform }) => (
                                  <>
                                    <div style={{ position: 'absolute', bottom: '15px', right: '15px', zIndex: 10, display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.8)', padding: '5px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                      <button onClick={() => zoomIn()} style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                      <button onClick={() => zoomOut()} style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                      <button onClick={() => resetTransform()} style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</button>
                                    </div>
                                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px', maxWidth: '100%' }}>
                                        {Array.from({ length: fieldCount }).map((_, fieldIdx) => (
                                          <div key={fieldIdx} style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(10, 48px)`,
                                            gridTemplateRows: `repeat(10, 48px)`,
                                            gap: '2px',
                                            background: (hour >= 19 || hour < 5) ? 'rgba(30, 41, 59, 0.4)' : 'rgba(34, 197, 94, 0.3)',
                                            border: '2px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                          }}>
                                            {Array.from({ length: cellsPerField }).map((_, i) => {
                                              const globalIndex = fieldIdx * cellsPerField + i;
                                              const cell = gridMap[globalIndex];
                                              const isEmpty = !cell;

                                              return (
                                                <div
                                                  key={globalIndex}
                                                  onClick={() => {
                                                    if (cell) {
                                                      if (gardenClickTimer.current) { clearTimeout(gardenClickTimer.current); gardenClickTimer.current = null; return; }
                                                      gardenClickTimer.current = setTimeout(async () => {
                                                        gardenClickTimer.current = null;
                                                        const allCurrentVerses = [...safeActiveSets, ...customVerseSets].flatMap(s => s.verses);
                                                        let targetVerse = findVerseByRef(allCurrentVerses, cell.ref);
                                                        let detectedLang = version;
                                                        if (!targetVerse) {
                                                          setIsLangsLoading(true);
                                                          const langKeys = ['kjv', 'cuv', 'ko', 'ja', 'fa', 'he', 'es', 'tr', 'de', 'my'];
                                                          for (const lang of langKeys) {
                                                            if (lang === version) continue;
                                                            let data = loadedLangs[lang];
                                                            if (!data) {
                                                              data = await loadLanguageSets(lang);
                                                              setLoadedLangs(prev => ({ ...prev, [lang]: data }));
                                                            }
                                                            const found = findVerseByRef(data.verses, cell.ref);
                                                            if (found) { targetVerse = found; detectedLang = lang; break; }
                                                          }
                                                          setIsLangsLoading(false);
                                                        }
                                                        setSelectedGardenCell({
                                                          ref: cell.ref,
                                                          text: targetVerse?.text || '',
                                                          stage: cell.stage,
                                                          fruits: cell.fruits || 0,
                                                          setId: cell.setId,
                                                          verse: targetVerse,
                                                          detectedLang,
                                                        });
                                                        setTimeout(() => {
                                                          const popup = document.getElementById('garden-verse-popup');
                                                          if (popup) popup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                                        }, 100);
                                                      }, 300);
                                                    }
                                                  }}
                                                  onDoubleClick={async () => {
                                                    if (cell) {
                                                      if (gardenClickTimer.current) { clearTimeout(gardenClickTimer.current); gardenClickTimer.current = null; }
                                                      const allCurrentVerses = [...safeActiveSets, ...customVerseSets].flatMap(s => s.verses);
                                                      let targetVerse = findVerseByRef(allCurrentVerses, cell.ref);
                                                      let detectedLang = version;
                                                      if (!targetVerse) {
                                                        setIsLangsLoading(true);
                                                        const langKeys = ['kjv', 'cuv', 'ko', 'ja', 'fa', 'he', 'es', 'tr', 'de', 'my'];
                                                        for (const lang of langKeys) {
                                                          if (lang === version) continue;
                                                          let data = loadedLangs[lang];
                                                          if (!data) {
                                                            data = await loadLanguageSets(lang);
                                                            setLoadedLangs(prev => ({ ...prev, [lang]: data }));
                                                          }
                                                          const found = findVerseByRef(data.verses, cell.ref);
                                                          if (found) { targetVerse = found; detectedLang = lang; break; }
                                                        }
                                                        setIsLangsLoading(false);
                                                      }
                                                      if (targetVerse) {
                                                        setSelectedGardenCell(null);
                                                        if (detectedLang !== version) {
                                                          versionBeforeChallenge.current = version;
                                                          setVersion(detectedLang);
                                                        }
                                                        setActiveVerse(targetVerse);
                                                        setSelectedVerseRefs([targetVerse.reference]);
                                                        if (cell.setId) setSelectedSetId(cell.setId);
                                                        setTimeout(() => startGame(false, targetVerse), 50);
                                                      }
                                                    }
                                                  }}
                                                  title={cell ? `${cell.ref} — ${stageLabel(cell.stage)}${cell.fruits ? ` 🍎×${cell.fruits}` : ''}` : t('空地', 'Empty')}
                                                  style={{
                                                    width: '48px', height: '48px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: cell ? '20px' : '10px',
                                                    background: cell ? stageBg(cell.stage) : '#5d4037',
                                                    border: cell ? '1px solid rgba(0,0,0,0.1)' : 'none',
                                                    cursor: cell ? 'pointer' : 'default', transition: 'transform 0.1s, filter 0.2s', userSelect: 'none'
                                                  }}
                                                  onMouseOver={e => { if (cell) { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.08)'; } }}
                                                  onMouseOut={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
                                                >
                                                  {cell ? stageEmoji(cell.stage, cell.fruits || 0) : ''}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ))}
                                      </div>
                                    </TransformComponent>
                                  </>
                                )}
                              </TransformWrapper>
                            </div>
                          );
                        })()}
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>📱 {t("可用手指滑動來瀏覽園子", "Swipe to pan around the garden")}</p>

                        {/* Verse Info Popup Modal */}
                        {selectedGardenCell && (
                          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedGardenCell(null)}>
                            <div id="garden-verse-popup" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: '15px', border: '3px solid #86efac', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', animation: 'flashSuccess 0.3s ease-out' }}>
                              <button onClick={() => setSelectedGardenCell(null)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem', fontWeight: 'bold' }}>✕</button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                                <div style={{ width: '60px', height: '60px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ width: '100%', height: '100%', position: 'absolute', bottom: '0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                    {stageEmoji(selectedGardenCell.stage, selectedGardenCell.fruits)}
                                  </div>
                                </div>
                                <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '1.2rem' }}>{selectedGardenCell.ref}</span>
                                <span style={{ fontSize: '0.85rem', color: '#166534', background: '#b2f5ea', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{stageLabel(selectedGardenCell.stage)}</span>
                                {selectedGardenCell.detectedLang && selectedGardenCell.detectedLang !== version && (
                                  <span style={{ fontSize: '0.75rem', color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                    {selectedGardenCell.detectedLang === 'kjv' ? 'KJV 🇬🇧' : selectedGardenCell.detectedLang === 'ko' ? '한국어 🇰🇷' : selectedGardenCell.detectedLang === 'ja' ? '日本語 🇯🇵' : selectedGardenCell.detectedLang === 'fa' ? 'فارسی 🇮🇷' : selectedGardenCell.detectedLang === 'he' ? 'עברית 🇮🇱' : '中文 🇹🇼'}
                                  </span>
                                )}
                              </div>
                              <p style={{ color: '#334155', lineHeight: '1.6', fontSize: '1rem', margin: '1rem 0 0.8rem', fontStyle: 'italic', maxHeight: '30vh', overflowY: 'auto' }}>
                                "{selectedGardenCell.text || t('(經文內容未找到)', '(Verse text not found)')}"
                              </p>
                              {selectedGardenCell.detectedLang && selectedGardenCell.detectedLang !== version && (
                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 1rem', textAlign: 'center' }}>
                                  💡 {t('將暫時切換語言來挑戰，完成後自動恢復', 'Will temporarily switch language for this challenge, then restore')}
                                </p>
                              )}
                              <button onClick={() => {
                                if (selectedGardenCell.verse) {
                                  if (selectedGardenCell.detectedLang && selectedGardenCell.detectedLang !== version) {
                                    versionBeforeChallenge.current = version;
                                    setVersion(selectedGardenCell.detectedLang);
                                  }
                                  setActiveVerse(selectedGardenCell.verse);
                                  setSelectedVerseRefs([selectedGardenCell.verse.reference]);
                                  if (selectedGardenCell.setId) setSelectedSetId(selectedGardenCell.setId);
                                  setSelectedGardenCell(null);
                                  setTimeout(() => startGame(false, selectedGardenCell.verse), 50);
                                }
                              }} style={{ width: '100%', justifyContent: 'center', background: '#22c55e', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: selectedGardenCell.verse ? 'pointer' : 'not-allowed', opacity: selectedGardenCell.verse ? 1 : 0.5, boxShadow: '0 4px 12px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Play size={20} /> {t('挑戰這節經文', 'Challenge this verse')}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Legend */}
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.9rem', color: '#475569', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src="/assets/garden/tree-seedling.png" style={{ height: '28px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} alt="seedling" /> {t("幼苗 (練習中)", "Sprout (practicing)")}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src="/assets/garden/tree-sapling.png" style={{ height: '32px', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))' }} alt="sapling" /> {t("小樹 (持續成長)", "Sapling (growing)")}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src="/assets/garden/tree-mature.png" style={{ height: '36px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} alt="mature tree" /> {t("大樹 (通過!)", "Full tree (cleared!)")}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🍎 {t("結果子 (創新高!)", "Fruit (new record!)")}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <ActivityHeatmap t={t} />

                  {/* Reciprocity History */}
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📜 {t('互惠點數紀錄', 'Reciprocity History')}
                      </h3>
                      <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>
                        {t('推薦果子', 'Referral Fruits')} <span style={{ color: '#ea580c' }}>{referralOnlyPoints} 🍎</span> <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span> {t('題庫被玩', 'Custom Sets Played')} <span style={{ color: '#ea580c' }}>{creatorOnlyPoints} 🍎</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                      {/* Referrals */}
                      <div>
                        <h4 style={{ color: '#0369a1', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          👫 {t('推薦紀錄', 'Referrals')}
                        </h4>
                        {referralHistory && referralHistory.length > 0 ? (() => {
                          // Group: same player + same type → sum amounts, keep latest timestamp
                          const grouped = [];
                          const keyMap = {};
                          referralHistory.forEach(h => {
                            const key = `${h.type}::${h.player}`;
                            if (keyMap[key] !== undefined) {
                              grouped[keyMap[key]].amount += h.amount;
                              if (h.timestamp > grouped[keyMap[key]].timestamp) grouped[keyMap[key]].timestamp = h.timestamp;
                              grouped[keyMap[key]].count = (grouped[keyMap[key]].count || 1) + 1;
                            } else {
                              keyMap[key] = grouped.length;
                              grouped.push({ ...h, count: 1 });
                            }
                          });
                          const totalPages = Math.ceil(grouped.length / HISTORY_PAGE_SIZE);
                          const page = Math.min(referralHistoryPage, totalPages);
                          const sliced = grouped.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
                          return (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sliced.map((h, i) => (
                                  <div key={i} style={{ background: '#fff', padding: '10px 15px', borderRadius: '8px', borderLeft: h.type === 'referred' ? '4px solid #10b981' : '4px solid #3b82f6', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.9rem', color: '#475569' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>{new Date(h.timestamp).toLocaleString()} {h.count > 1 && <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 'bold', marginLeft: '4px' }}>×{h.count}</span>}</div>
                                    {h.type === 'referred' ? (
                                      <span>{t('推薦了玩家', 'Referred player')} <strong style={{ color: '#0f766e' }}>{h.player}</strong> {t('加入了 VerseRain', 'to VerseRain')} <span style={{ color: '#10b981', fontWeight: 'bold' }}>(+{h.amount} {t('點', 'pts')})</span></span>
                                    ) : (
                                      <span>{t('透過', 'Joined via')} <strong style={{ color: '#1d4ed8' }}>{h.player}</strong> {t('的推薦加入', "'s referral")} <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>(+{h.amount} {t('點', 'pts')})</span></span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                                  <button onClick={() => setReferralHistoryPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#94a3b8' : '#334155', cursor: page <= 1 ? 'default' : 'pointer', fontWeight: 'bold' }}>‹</button>
                                  {Array.from({ length: totalPages }, (_, idx) => (
                                    <button key={idx} onClick={() => setReferralHistoryPage(idx + 1)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: page === idx + 1 ? '#0369a1' : '#f1f5f9', color: page === idx + 1 ? '#fff' : '#334155', cursor: 'pointer', fontWeight: 'bold' }}>{idx + 1}</button>
                                  ))}
                                  <button onClick={() => setReferralHistoryPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#94a3b8' : '#334155', cursor: page >= totalPages ? 'default' : 'pointer', fontWeight: 'bold' }}>›</button>
                                </div>
                              )}
                            </>
                          );
                        })() : (
                          <div style={{ padding: '1.5rem', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
                            {t('尚未有任何推薦紀錄。分享邀請碼邀請朋友獲得互惠點數！', 'No referral history yet. Share your invite code to get reciprocity points!')}
                          </div>
                        )}
                      </div>

                      {/* Custom set plays */}
                      <div>
                        <h4 style={{ color: '#b45309', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          💡 {t('專屬題庫遊玩紀錄', 'Custom Set Plays')}
                        </h4>
                        {creatorHistory && creatorHistory.length > 0 ? (() => {
                          // Group: same player + same verseSetName → sum amounts, keep latest timestamp
                          const grouped = [];
                          const keyMap = {};
                          creatorHistory.forEach(h => {
                            const key = `${h.player}::${h.verseSetName}`;
                            if (keyMap[key] !== undefined) {
                              grouped[keyMap[key]].amount += h.amount;
                              if (h.timestamp > grouped[keyMap[key]].timestamp) grouped[keyMap[key]].timestamp = h.timestamp;
                              grouped[keyMap[key]].count = (grouped[keyMap[key]].count || 1) + 1;
                            } else {
                              keyMap[key] = grouped.length;
                              grouped.push({ ...h, count: 1 });
                            }
                          });
                          const totalPages = Math.ceil(grouped.length / HISTORY_PAGE_SIZE);
                          const page = Math.min(creatorHistoryPage, totalPages);
                          const sliced = grouped.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
                          return (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sliced.map((h, i) => (
                                  <div key={i} style={{ background: '#fff', padding: '10px 15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.9rem', color: '#475569' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>{new Date(h.timestamp).toLocaleString()} {h.count > 1 && <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 'bold', marginLeft: '4px' }}>×{h.count} 次</span>}</div>
                                    <span>{t('玩家', 'Player')} <strong style={{ color: '#0f766e' }}>{h.player}</strong> {t('突破了你的題庫', 'cleared your set')} 「<strong style={{ color: '#b45309' }}>{h.verseSetName}</strong>」 <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>(+{h.amount} {t('點', 'pts')})</span></span>
                                  </div>
                                ))}
                              </div>
                              {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                                  <button onClick={() => setCreatorHistoryPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#94a3b8' : '#334155', cursor: page <= 1 ? 'default' : 'pointer', fontWeight: 'bold' }}>‹</button>
                                  {Array.from({ length: totalPages }, (_, idx) => (
                                    <button key={idx} onClick={() => setCreatorHistoryPage(idx + 1)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: page === idx + 1 ? '#b45309' : '#f1f5f9', color: page === idx + 1 ? '#fff' : '#334155', cursor: 'pointer', fontWeight: 'bold' }}>{idx + 1}</button>
                                  ))}
                                  <button onClick={() => setCreatorHistoryPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#94a3b8' : '#334155', cursor: page >= totalPages ? 'default' : 'pointer', fontWeight: 'bold' }}>›</button>
                                </div>
                              )}
                            </>
                          );
                        })() : (
                          <div style={{ padding: '1.5rem', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
                            {t('尚未有玩家遊玩你的專屬題庫。建立更多題庫來吸引大家挑戰！', 'No custom set plays yet. Create more sets for others to play!')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {mainTab === 'leaderboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                  {/* 1. 排行榜切換按鈕 */}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button onClick={() => { setGlobalLeaderboardTab('daily'); setPageGlobalLeaderboard(1); setPagePopularVerses(1); }} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'daily' ? '#10b981' : '#e2e8f0', color: globalLeaderboardTab === 'daily' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'daily' ? '0 4px 6px -1px rgba(16, 185, 129, 0.4)' : 'none' }}>{t("本日排行", "Daily")}</button>
                    <button onClick={() => { setGlobalLeaderboardTab('monthly'); setPageGlobalLeaderboard(1); setPagePopularVerses(1); }} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'monthly' ? '#8b5cf6' : '#e2e8f0', color: globalLeaderboardTab === 'monthly' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'monthly' ? '0 4px 6px -1px rgba(139, 92, 246, 0.4)' : 'none' }}>{t("本月排行", "Monthly")}</button>
                    <button onClick={() => { setGlobalLeaderboardTab('alltime'); setPageGlobalLeaderboard(1); setPagePopularVerses(1); }} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'alltime' ? '#3b82f6' : '#e2e8f0', color: globalLeaderboardTab === 'alltime' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'alltime' ? '0 4px 6px -1px rgba(59, 130, 246, 0.4)' : 'none' }}>{t("歷史總榜", "All Time")}</button>
                  </div>

                  {/* 2. 個人總積分排行榜 - reads from globalLeaderboardData (Redis) */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Trophy color="#2563eb" /> {t("個人總積分排行榜", "Player Total Score Leaderboard")}
                      <button
                        onClick={() => setShowLevelInfo(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                        title={t("階層說明", "Level Info")}
                      >
                        <Info size={18} />
                      </button>
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                          <th style={{ padding: '0.8rem 1rem', width: '50px' }}>🏆</th>
                          <th style={{ padding: '0.8rem 1rem' }}>{t("玩家名稱", "Player Name")}</th>
                          <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("總積分", "Total Score")}</th>
                          <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("完成次數", "Clears")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const entries = globalLeaderboardData[globalLeaderboardTab] || [];
                          if (isFetchingGlobalLeaderboard) {
                            return <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>⏳ {t("載入中...", "Loading...")}</td></tr>;
                          }
                          if (entries.length === 0) {
                            return <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>{t("目前尚無紀錄", "No records yet")}</td></tr>;
                          }
                          const alltimeClears = {};
                          (globalLeaderboardData.alltime || []).forEach(({ name, clears }) => {
                            if (!name) return;
                            alltimeClears[name] = clears || 0;
                          });

                          return entries
                            .slice((pageGlobalLeaderboard - 1) * 10, pageGlobalLeaderboard * 10)
                            .map(({ name, total, clears }, relativeIdx) => {
                              const idx = (pageGlobalLeaderboard - 1) * 10 + relativeIdx;
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                                  <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>
                                    {name} {name === playerName && <Crown size={14} style={{ color: '#fbbf24', marginLeft: '5px' }} />}
                                    <button
                                      onClick={async () => {
                                        setViewingPlayerGarden({ playerName: name, gardenData: null, loading: true });
                                        try {
                                          const [gardenRes, pointsRes] = await Promise.all([
                                            fetch(`https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/garden?player=${encodeURIComponent(name)}`),
                                            fetch(`/api/get-creator-points?author=${encodeURIComponent(name)}`).catch(() => null)
                                          ]);
                                          const data = await gardenRes.json();
                                          let creatorPts = 0;
                                          let refPts = 0;
                                          if (pointsRes && pointsRes.ok) {
                                            try {
                                              const ptsData = await pointsRes.json();
                                              creatorPts = ptsData.points || 0;
                                              refPts = ptsData.referralPoints || 0;
                                            } catch (e) {}
                                          }
                                          if (data.success) {
                                            setViewingPlayerGarden({ playerName: name, gardenData: data.gardenData, creatorPoints: creatorPts, referralPoints: refPts, loading: false });
                                          } else {
                                            setViewingPlayerGarden({ playerName: name, gardenData: {}, creatorPoints: creatorPts, referralPoints: refPts, loading: false, error: t('該玩家尚未分享園地', 'This player has not shared their garden yet') });
                                          }
                                        } catch {
                                          setViewingPlayerGarden({ playerName: name, gardenData: {}, loading: false, error: t('無法載入', 'Failed to load') });
                                        }
                                      }}
                                      style={{ marginLeft: '8px', fontSize: '0.8rem', backgroundColor: '#f1f5f9', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid #bfdbfe', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                                      onMouseOver={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                      onMouseOut={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                      title={t('點擊查看此玩家的園地', "Click to view this player's garden")}
                                    >
                                      {(() => {
                                        // Only use true fruits when globalFruitsMap has been loaded
                                        const hasGardenData = globalFruitsMap && Object.keys(globalFruitsMap).length > 0;
                                        if (hasGardenData) {
                                          const gardenFruits = globalFruitsMap[name] || 0;
                                          const bonus = globalLeaderboardData && globalLeaderboardData.bonusFruitsMap && globalLeaderboardData.bonusFruitsMap[name];
                                          const creatorFruits = (bonus && bonus.creatorPoints) || 0;
                                          const lvl = getSkoolLevel(gardenFruits + creatorFruits);
                                          return `🌱 Lv.${lvl.level} ${t(lvl.title, lvl.enTitle)}`;
                                        }
                                        // Fallback: garden data not loaded yet, use clears
                                        const lvl = getSkoolLevel(alltimeClears[name] || clears);
                                        return `🌱 Lv.${lvl.level} ${t(lvl.title, lvl.enTitle)}`;
                                      })()}
                                    </button>

                                  </td>
                                  <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6' }}>{(total || 0).toLocaleString()}</td>
                                  <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{clears || 0}</td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                    {(() => {
                      const totalEntries = (globalLeaderboardData[globalLeaderboardTab] || []).length;
                      const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
                      if (totalPages > 1) {
                        return (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                            <button onClick={() => setPageGlobalLeaderboard(p => Math.max(1, p - 1))} disabled={pageGlobalLeaderboard === 1} style={{ background: pageGlobalLeaderboard === 1 ? '#f1f5f9' : '#e2e8f0', color: pageGlobalLeaderboard === 1 ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pageGlobalLeaderboard === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("上一頁", "Prev")}</button>
                            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 'bold' }}>{pageGlobalLeaderboard} / {totalPages}</span>
                            <button onClick={() => setPageGlobalLeaderboard(p => Math.min(totalPages, p + 1))} disabled={pageGlobalLeaderboard === totalPages} style={{ background: pageGlobalLeaderboard === totalPages ? '#f1f5f9' : '#e2e8f0', color: pageGlobalLeaderboard === totalPages ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pageGlobalLeaderboard === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("下一頁", "Next")}</button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* 4. 最受歡迎經文組 */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#f59e0b" /> {t("最受歡迎經文組", "Most Popular Verse Sets")}</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                          <th style={{ padding: '0.8rem 1rem', width: '50px' }}>🏆</th>
                          <th style={{ padding: '0.8rem 1rem' }}>{t("標題", "Title")}</th>
                          <th style={{ padding: '0.8rem 1rem' }}>{t("作者", "Author")}</th>
                          <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("點閱次數", "Views")}</th>
                          <th style={{ padding: '0.8rem 1rem', width: '60px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const sortedSets = [...activeVerseSets]
                            .sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0));
                          const paginatedSets = sortedSets.slice((pagePopularSets - 1) * 10, pagePopularSets * 10);
                          return paginatedSets.map((set, relativeIdx) => {
                            const idx = (pagePopularSets - 1) * 10 + relativeIdx;
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => {
                                setMainTab('versesets');
                                setSelectedSetId(set.id);
                                fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id }) }).catch(e => e);
                                setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                              }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                                <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>{set.title}</td>
                                <td style={{ padding: '0.8rem 1rem', color: '#3b82f6' }}>{set.authorName && set.authorName !== "Anonymous" ? set.authorName : (String(set.id).startsWith("custom-") ? t('匿名玩家', 'Anonymous') : t('Verserain 官方', 'Official'))}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{viewCounts[set.id] || 0}</td>
                                <td style={{ padding: '0.8rem 0' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMainTab('versesets');
                                      setSelectedSetId(set.id);
                                      fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id }) }).catch(e => e);
                                      setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                                    }}
                                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Play size={12} fill="white" /> {t("挑戰", "Play")}
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    {(() => {
                      const totalEntries = activeVerseSets.length;
                      const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
                      if (totalPages > 1) {
                        return (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                            <button onClick={() => setPagePopularSets(p => Math.max(1, p - 1))} disabled={pagePopularSets === 1} style={{ background: pagePopularSets === 1 ? '#f1f5f9' : '#e2e8f0', color: pagePopularSets === 1 ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularSets === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("上一頁", "Prev")}</button>
                            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 'bold' }}>{pagePopularSets} / {totalPages}</span>
                            <button onClick={() => setPagePopularSets(p => Math.min(totalPages, p + 1))} disabled={pagePopularSets === totalPages} style={{ background: pagePopularSets === totalPages ? '#f1f5f9' : '#e2e8f0', color: pagePopularSets === totalPages ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularSets === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("下一頁", "Next")}</button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* 3. 最受歡迎經文排行榜 */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#10b981" /> {t("最受歡迎經文排行榜", "Most Popular Verses")}</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                          <th style={{ padding: '0.8rem 1rem', width: '50px' }}>🏆</th>
                          <th style={{ padding: '0.8rem 1rem' }}>{t("經文出處", "Reference")}</th>
                          <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("遊玩次數", "Plays")}</th>
                          <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("完成次數", "Completes")}</th>
                          <th style={{ padding: '0.8rem 1rem', width: '60px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const allVerses = Object.entries((globalVerseStats[globalLeaderboardTab] || {}))
                            .sort((a, b) => b[1].plays - a[1].plays || b[1].completes - a[1].completes);
                          const paginatedVerses = allVerses.slice((pagePopularVerses - 1) * 10, pagePopularVerses * 10);

                          if (allVerses.length === 0) {
                            return <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>{t("目前尚無經文紀錄", "No records yet")}</td></tr>;
                          }

                          return paginatedVerses.map(([ref, stats], relativeIdx) => {
                            const idx = (pagePopularVerses - 1) * 10 + relativeIdx;
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                                <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>{ref}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{stats.plays}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{stats.completes}</td>
                                <td style={{ padding: '0.8rem 0' }}>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      // Search current set first, then ALL language pools (fixes iPhone 'verse not found')
                                      let targetVerse = findVerseByRef(VERSES_DB, ref);
                                      let detectedLang = null;
                                      if (!targetVerse) {
                                        const allCurrentVerses = safeActiveSets.flatMap(s => s.verses);
                                        targetVerse = findVerseByRef(allCurrentVerses, ref);
                                      }
                                      if (!targetVerse) {
                                        setIsLangsLoading(true);
                                        const langKeys = ['kjv', 'cuv', 'ko', 'ja'];
                                        for (const lang of langKeys) {
                                          if (lang === version) continue;
                                          let data = loadedLangs[lang];
                                          if (!data) {
                                            data = await loadLanguageSets(lang);
                                            setLoadedLangs(prev => ({ ...prev, [lang]: data }));
                                          }
                                          const found = findVerseByRef(data.verses, ref);
                                          if (found) { targetVerse = found; detectedLang = lang; break; }
                                        }
                                        setIsLangsLoading(false);
                                      }
                                      if (targetVerse) {
                                        if (detectedLang) {
                                          versionBeforeChallenge.current = version;
                                          setVersion(detectedLang);
                                        }
                                        setActiveVerse(targetVerse);
                                        setTimeout(() => startGame(false, targetVerse), 200);
                                      } else {
                                        setToast(t('本機找不到此經文', 'Verse not found locally'));
                                      }
                                    }}
                                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Play size={12} fill="white" /> {t("挑戰", "Play")}
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    {(() => {
                      const totalEntries = Object.keys((globalVerseStats[globalLeaderboardTab] || {})).length;
                      const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
                      if (totalPages > 1) {
                        return (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                            <button onClick={() => setPagePopularVerses(p => Math.max(1, p - 1))} disabled={pagePopularVerses === 1} style={{ background: pagePopularVerses === 1 ? '#f1f5f9' : '#e2e8f0', color: pagePopularVerses === 1 ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularVerses === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("上一頁", "Prev")}</button>
                            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 'bold' }}>{pagePopularVerses} / {totalPages}</span>
                            <button onClick={() => setPagePopularVerses(p => Math.min(totalPages, p + 1))} disabled={pagePopularVerses === totalPages} style={{ background: pagePopularVerses === totalPages ? '#f1f5f9' : '#e2e8f0', color: pagePopularVerses === totalPages ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularVerses === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("下一頁", "Next")}</button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>


                </div>
              )}
              {mainTab === 'search' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Search color="#0369a1" /> {t("搜尋經文", "Search Verses")}</h2>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("輸入關鍵字，例如「利未記」或「醫治」...", "Enter keyword...")}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', marginBottom: '2rem', boxSizing: 'border-box' }}
                  />

                  {(() => {
                    if (!searchQuery.trim()) return <div style={{ color: '#64748b' }}>{t("請輸入關鍵字開始搜尋。", "Please enter a keyword to search.")}</div>;
                    const query = searchQuery.trim().toLowerCase();

                    // Search in sets
                    const matchingSets = activeVerseSets.filter(s =>
                      s && s.title && (
                        s.title.toLowerCase().includes(query) ||
                        (s.description && s.description.replace(/<[^>]+>/g, '').toLowerCase().includes(query))
                      )
                    );
                    // Search in individual verses
                    const matchingVerses = activeVerseSets.flatMap(s =>
                      (s && s.verses) ? s.verses.map(v => ({ ...v, setId: s.id, setName: s.title })) : []
                    ).filter(v =>
                      v && (
                        (v.reference && v.reference.toLowerCase().includes(query)) ||
                        (v.title && v.title.toLowerCase().includes(query)) ||
                        (v.text && v.text.toLowerCase().includes(query))
                      )
                    );

                    return (
                      <div>
                        {matchingSets.length > 0 && (
                          <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>{t("經文組資料夾", "Verse Sets")} ({matchingSets.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                              {(() => {
                                const totalPages = Math.ceil(matchingSets.length / 10);
                                const paginatedSets = matchingSets.slice((searchSetsPage - 1) * 10, searchSetsPage * 10);
                                return paginatedSets.map(set => (
                                  <div key={set.id} onClick={() => { setSelectedSetId(set.id); setMainTab('versesets'); }} style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
                                    <div style={{ fontSize: '2rem' }}>📁</div>
                                    <div>
                                      <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{set.title}</div>
                                      <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem', maxHeight: '4.5em', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: set.description }} />
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>

                            {/* Search Sets Pagination */}
                            {Math.ceil(matchingSets.length / 10) > 1 && (
                              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                {Array.from({ length: Math.ceil(matchingSets.length / 10) }).map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSearchSetsPage(idx + 1)}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      borderRadius: '8px',
                                      border: searchSetsPage === idx + 1 ? 'none' : '1px solid #cbd5e1',
                                      background: searchSetsPage === idx + 1 ? '#8b5cf6' : '#ffffff',
                                      color: searchSetsPage === idx + 1 ? '#ffffff' : '#475569',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      minWidth: '40px'
                                    }}
                                  >
                                    {idx + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {matchingVerses.length > 0 && (
                          <div>
                            <h3 style={{ color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{t("單獨經文", "Individual Verses")} ({matchingVerses.length})</h3>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                                    <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1' }}>{t("所屬經文組", "From Set")}</th>
                                    <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1' }}>{t("經文出處", "Reference")}</th>
                                    <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1' }}>{t("內容片段", "Preview")}</th>
                                    <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1', textAlign: 'right' }}>{t("直接遊玩", "Play")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const totalPages = Math.ceil(matchingVerses.length / 10);
                                    const paginatedVerses = matchingVerses.slice((searchVersesPage - 1) * 10, searchVersesPage * 10);
                                    return paginatedVerses.map((v, i) => (
                                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.1s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '0.8rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>{v.setName}</td>
                                        <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#0369a1', fontSize: '0.95rem' }}>
                                          <button onClick={(e) => { e.stopPropagation(); setVerseViewModal(v); }} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', padding: 0, textAlign: 'left' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                                            {v.reference}
                                          </button>
                                        </td>
                                        <td style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.9rem' }}>{v.text.substring(0, 35)}...</td>
                                        <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                                          <button
                                            onClick={() => {
                                              initAudio();
                                              setCampaignQueue(null);
                                              setCampaignResults([]);
                                              setActiveVerse(v);
                                              setTimeout(() => startGame(false, v), 50);
                                            }}
                                            title={t("遊玩這篇經文", "Play this verse")}
                                            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                          >
                                            <Play size={16} fill="white" />
                                          </button>
                                        </td>
                                      </tr>
                                    ));
                                  })()}
                                </tbody>
                              </table>
                            </div>

                            {/* Search Verses Pagination */}
                            {Math.ceil(matchingVerses.length / 10) > 1 && (
                              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                {Array.from({ length: Math.ceil(matchingVerses.length / 10) }).map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSearchVersesPage(idx + 1)}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      borderRadius: '8px',
                                      border: searchVersesPage === idx + 1 ? 'none' : '1px solid #cbd5e1',
                                      background: searchVersesPage === idx + 1 ? '#8b5cf6' : '#ffffff',
                                      color: searchVersesPage === idx + 1 ? '#ffffff' : '#475569',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      minWidth: '40px'
                                    }}
                                  >
                                    {idx + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {matchingSets.length === 0 && matchingVerses.length === 0 && (
                          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '1rem' }}>
                            {t("很抱歉，沒有找到符合條件的經文或群組。", "Sorry, no matching verses or sets found.")}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {mainTab === 'map' && (() => {
                // Lazy-load Leaflet only when map tab is opened
                return (
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.5rem' }}>🗺️</span>
                      <div>
                        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem' }}>{t('全球玩家地圖', 'Global Player Map')}</h2>
                        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>{t('點擊標記查看玩家成績，雙擊遊戲房間加入戰局！', 'Click a marker to see scores, double click a room to join!')}</p>
                      </div>
                    </div>
                    <WorldMap t={t} playerName={playerName} onJoinRoom={(roomId) => {
                      setMainTab('multiplayer');
                      setJoinRoomError(null);
                      isGuestJoinRef.current = true;
                      setMultiplayerRoomId(roomId);
                      if (joinRoomTimeoutRef.current) clearTimeout(joinRoomTimeoutRef.current);
                      joinRoomTimeoutRef.current = setTimeout(() => {
                        if (isGuestJoinRef.current) {
                          setJoinRoomError(roomId);
                          setMultiplayerRoomId(null);
                          isGuestJoinRef.current = false;
                        }
                      }, 5000);
                    }} />
                  </div>
                );
              })()}

                            {mainTab === 'manual' && (
                <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#1e293b', lineHeight: '1.8' }}>
                  <>
                    <h1 style={{ color: '#3b82f6', marginBottom: '1.5rem', textAlign: 'center' }}>{t("🌧️ VerseRain 經文雨 操作手冊", "🌧️ VerseRain User Manual")}</h1>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '3rem' }}>
                      <span dangerouslySetInnerHTML={{ __html: t("歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！", "Welcome to <strong>VerseRain</strong>! An interactive scripture memorization platform combining challenge and learning.<br />Here you can challenge global verse sets, create your own personal library, and climb the Global Leaderboard of the Mutualized Economics!") }} />
                    </p>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>{t("🎯 一、如何開始遊玩？", "🎯 1. How to Play?")}</h2>
                    <p>{t("只需簡單三步，您就能進入背經的挑戰中！", "Just three simple steps to start your scripture memorization challenge!")}</p>

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>{t("1. 切換至「經文組」", "1. Switch to \"Verse Sets\"")}</h3>
                    <p>{t("首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。", "First, click the \"Verse Sets\" tab in the top left navigation bar. This will display all public verse sets created by the system and players.")}</p>
                    <img src="/manual/step1.png" alt={t("切換經文組", "Switch Verse Sets")} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>{t("2. 選擇想要挑戰的經文組", "2. Select a Verse Set")}</h3>
                    <p>{t("點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。", "Click on a topic in the list (e.g., Gospel of John Core Verses) to expand the verse levels within it.")}</p>
                    <img src="/manual/step2.png" alt={t("選擇經文組", "Select Verse Set")} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>{t("3. 開始遊戲", "3. Start Game")}</h3>
                    <p>{t("點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！", "Click the \"Leaderboard/Play icon\" next to any verse level under the verse set. The verse rain will start falling in 3 seconds!")}</p>
                    <img src="/manual/step3.png" alt={t("開始遊戲", "Start Game")} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>{t("🎬 實際遊玩流程示範（動畫）：", "🎬 Gameplay Demonstration (Animation):")}</h3>
                    <p>{t("這是一段實際進入遊戲的流程示範！", "Here is an actual demonstration of the gameplay!")}</p>
                    <img src="/manual/play.webp" alt={t("遊戲流程動畫", "Gameplay Animation")} style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '3rem' }} />

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>{t("👑 二、如何自建專屬「經文組」？（Premium 會員獨享）", "👑 2. How to create custom \"Verse Sets\"? (Premium Only)")}</h2>
                    <p>{t("如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！", "If you are a Premium Member of the \"Mutualized Economics\" community, you can freely create your own customized scripture libraries for Sunday school or cell groups!")}</p>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><span dangerouslySetInnerHTML={{ __html: t("點擊上方導航列的 <strong>「👑 我的題庫」</strong>。", "Click <strong>\"👑 Custom Sets\"</strong> in the top navigation bar.") }} /></li>
                      <li><span dangerouslySetInnerHTML={{ __html: t("在輸入框打下你想要的 <strong>新經文組名稱</strong>。", "Type your desired <strong>New Verse Set Title</strong> in the input box.") }} /></li>
                      <li><span dangerouslySetInnerHTML={{ __html: t("利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。", "Use the powerful <strong>Magic One-Click Fetch Feature</strong>: Enter the scripture reference in the section (e.g., <code>John 3:16</code>), and click the magic star button next to it.") }} /></li>
                      <li>{t("系統將為您自動帶入完整的經文內容！", "The system will automatically import the complete verse content for you!")}</li>
                      <li><span dangerouslySetInnerHTML={{ __html: t("在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。", "After verifying everything is correct, click <strong>\"Publish\"</strong>.") }} /></li>
                      <li>{t("恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！", "Congratulations! This verse set will be instantly uploaded to the global database, available for public challenge in \"Verse Sets\"!")}</li>
                    </ol>
                    <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '1rem', borderRadius: '4px', marginBottom: '3rem' }}>
                      <span dangerouslySetInnerHTML={{ __html: t("<strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！", "<strong>💡 Tip:</strong> The Magic One-Click Fetch connects to an accurate Bible database, saving a significant amount of manual typing and proofreading time. Try entering \"Genesis 1:1\" to experience the smooth 1-second import!") }} />
                    </div>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>{t("🏆 三、個人積分全球排行榜", "🏆 3. Global Leaderboard")}</h2>
                    <p><span dangerouslySetInnerHTML={{ __html: t("點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：", "Click <strong>\"Leaderboard\"</strong> to view the main top rankings:") }} /></p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><span dangerouslySetInnerHTML={{ __html: t("<strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！", "<strong>Personal Clear Points Ranking:</strong> Accumulate points by completing challenges. Beating your own record also counts!") }} /></li>
                      <li><span dangerouslySetInnerHTML={{ __html: t("<strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。", "<strong>Most Popular Verse Sets Ranking:</strong> The more a verse set is played, the higher its glory on this board.") }} /></li>
                    </ul>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>{t("想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！", "Want a good rank? Keep challenging constantly, or create a verse set that everyone loves!")}</p>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>{t("🎤 四、全新語音模式 (Voice Mode)", "🎤 4. New Voice Mode")}</h2>
                    <p><span dangerouslySetInnerHTML={{ __html: t("除了點擊方塊，您現在可以直接<strong>用「唸」的來背經文！</strong>", "Besides clicking blocks, you can now recite verses directly <strong>using your voice!</strong>") }} /></p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><span dangerouslySetInnerHTML={{ __html: t("<strong>智慧模糊辨識：</strong> 系統內建強大的中文拼音模糊比對。就算有台灣國語、捲舌平舌音不分，只要發音相近就能過關！", "<strong>Smart Fuzzy Recognition:</strong> The system features powerful fuzzy pinyin matching. Even with accents or imprecise pronunciation, similar sounds will pass!") }} /></li>
                      <li><span dangerouslySetInnerHTML={{ __html: t("<strong>貼心提示系統：</strong> 如果卡詞了，系統會在 3 秒後自動給予局部提示，幫助您順利接下去。", "<strong>Helpful Hint System:</strong> If you get stuck, the system will automatically provide a partial hint after 3 seconds to help you continue.") }} /></li>
                      <li><span dangerouslySetInnerHTML={{ __html: t("<strong>分數加成獎勵：</strong> 為了鼓勵大家開口宣告神的話語，在語音模式中，您的<strong>「剩餘時間加成」權重會大幅提升 30%</strong>！", "<strong>Score Bonus:</strong> To encourage proclaiming God's word out loud, your <strong>\"Remaining Time Bonus\" weight is increased by 30%</strong> in Voice Mode!") }} /></li>
                    </ul>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>{t("⚔️ 五、多人即時連線對戰", "⚔️ 5. Multiplayer Real-time Battle")}</h2>
                    <p>{t("背經文不再是一個人孤單的事！", "Memorizing scripture is no longer a solitary task!")}</p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><span dangerouslySetInnerHTML={{ __html: t("點擊 <strong>「多人連線」</strong> 創建專屬房間，邀請小組成員或家人一起加入。", "Click <strong>\"Multiplayer\"</strong> to create a private room and invite your group members or family to join.") }} /></li>
                      <li><span dangerouslySetInnerHTML={{ __html: t("房主可以從全域題庫中挑選 <strong>「比賽經文」</strong>。", "The host can select <strong>\"Competition Verses\"</strong> from the global verse bank.") }} /></li>
                      <li>{t("所有人同時開始挑戰，並能在遊戲結束後看到即時的成績排行榜，非常適合主日學活動與小組破冰！", "Everyone starts the challenge simultaneously and can see real-time leaderboards after the game ends. Perfect for Sunday school activities and group icebreakers!")}</li>
                    </ul>
                  </>
                </div>
              )}

              {mainTab === 'about' && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#334155', lineHeight: '1.6' }}>
                  <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontFamily: 'cursive', color: '#3b82f6' }}>
                    {t('Verse Rain 讓背記經文變得生動有趣！', 'VerseRain makes scripture memorization fun!')}
                  </h2>

                  <p style={{ marginBottom: '1rem' }}>
                    {t('一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。', 'A Chinese church used the VerseRain app to host a "Bible Memorization Contest" for its congregation. All ages in families and small groups participated. They set up four projectors, allowing four teams to compete simultaneously in Challenge Mode using the same verse sets.')}
                  </p>
                  <iframe width="560" height="315" src="//www.youtube.com/embed/2tFxeesKISk" frameBorder="0" allowFullScreen=""></iframe>

                  <p style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                    {t('一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。', 'A four-year-old boy and his three-year-old sister eagerly showed off how they could recite the "Lord\'s Prayer" in Chinese by playing VerseRain. Born in the US, they are able to read Chinese and play this game.')}
                  </p>
                  <iframe width="560" height="315" src="//www.youtube.com/embed/Tty82Gn1gvQ" frameBorder="0" allowFullScreen=""></iframe>

                  <p style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                    {t('聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。', 'Words of bible verses fall from the sky, and you score points by clicking the verse in the correct order. The verse is spoken out loud when clicked to reinforce your memory audibly and spelling visually.')}
                  </p>

                  <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li>{t('學習多種語言的聖經經文！', 'Learn bible verses in multiple languages!')}</li>
                    <li>{t('點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。', 'Text to Speech verbal reading as you click the words to impress your memory on verse recitation.')}</li>
                    <li>{t('透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。', 'Through verserain, it supports virtually unlimited number of verses, verse sets, and multiple bible versions.')}</li>
                    <li>{t('提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。', 'Multiple difficulty levels offered to be played by kids to adults.')}</li>
                    <li>{t('挑戰模式有助於加強記憶同一個經文組中的多段相關經文。', 'Challenge mode helps to strengthen the memory of multiple related verses in the same verse set.')}</li>
                    <li>{t('線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！', 'Online Leaderboard to motivate congregation, youth fellowships and small group members to participate and improve together!')}</li>
                    <li><span dangerouslySetInnerHTML={{ __html: t("<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 30% 分數加成。", "<strong>New Voice Mode:</strong> Combining state-of-the-art fuzzy pinyin recognition, you can recite directly with your voice! Even with non-standard pronunciation, you can intelligently pass the level. Proclaim God's word loudly and gain an extra 30% score bonus.") }} /></li>
                    <li><span dangerouslySetInnerHTML={{ __html: t("<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！", "<strong>Multiplayer Real-time Battle:</strong> Support creating private rooms, allowing family or group members to simultaneously challenge the same verses on their phones, enjoying the thrill of real-time competition!") }} /></li>
                  </ul>

                </div>
              )}

            </div>
          </div>
        )}

        {gameState === 'playing' && (isBlindMode || playMode?.startsWith('voice')) && (
          <BlindModeGame
            key={activeVerse?.reference}
            activeVerse={activeVerse}
            activePhrases={activePhrases}
            currentSeqIndex={currentSeqIndex}
            onWordMatch={(block) => {
              setScore(s => s + 100 + (combo * 50));
              setCombo(c => c + 1);
              const nextSeq = currentSeqIndex + 1;
              setCurrentSeqIndex(nextSeq);
              currentSeqRef.current = nextSeq;
            }}
            onWordMiss={() => {
              setCombo(0);
              setHealth(h => {
                const newHealth = Math.max(0, h - 1);
                healthRef.current = newHealth;
                return newHealth;
              });
              const nextSeq = currentSeqIndex + 1;
              setCurrentSeqIndex(nextSeq);
              currentSeqRef.current = nextSeq;
            }}
            onFail={() => {
              setGameState('menu');
            }}
            health={health}
            timeLeft={timeLeft}
            score={score}
            combo={combo}
            speakText={speakText}
            formatVerseReferenceForSpeech={formatVerseReferenceForSpeech}
            formatVerseReferenceForDisplay={formatVerseReferenceForDisplay}
            isDebugMode={isDebugMode}
            playMode={playMode}
            playDing={() => {
              if (!window.__sharedDingCtx) {
                window.__sharedDingCtx = new (window.AudioContext || window.webkitAudioContext)();
              }
              const actx = window.__sharedDingCtx;
              if (actx.state === 'suspended') actx.resume();
              const osc = actx.createOscillator();
              const gn = actx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(1000, actx.currentTime);
              gn.gain.setValueAtTime(0, actx.currentTime);
              gn.gain.linearRampToValueAtTime(0.25, actx.currentTime + 0.02);
              gn.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 1.0);
              osc.connect(gn); gn.connect(actx.destination);
              osc.start(); osc.stop(actx.currentTime + 1.0);
            }}
            version={version}
            t={t}
          />
        )}

        {gameState === 'playing' && !isBlindMode && !playMode?.startsWith('voice') && (
          <div
            key={`${playMode}-${activeVerse.reference}-${distractionLevel}`}
            onClick={handleGlobalClick}
            style={{ position: 'absolute', width: '100vw', height: '100dvh', top: 0, left: 0, overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.5rem 1rem', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', zIndex: 10 }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="hud-glass"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (timerRef.current) clearInterval(timerRef.current);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setGameState('menu');
                  }}
                  style={{ padding: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}
                >
                  <XCircle size={22} />
                </button>
                {!isAutoPlay && !multiplayerRoomId && (
                  <button
                    className="hud-glass"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Stop the countdown timer
                      if (timerRef.current) clearInterval(timerRef.current);
                      // Cancel any ongoing speech
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      // Reset score for this round
                      setScore(0);
                      setCombo(0);
                      // Activate autoplay from current position
                      setIsAutoPlay(true);
                      isAutoPlayRef.current = true;
                    }}
                    title={t('電腦自動完成（分數歸零）', 'Auto-complete (score resets to 0)')}
                    style={{ padding: '0.5rem 0.8rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#4ade80', fontWeight: 'bold', fontSize: '0.85rem' }}
                  >
                    <Play size={16} fill="#4ade80" />
                    <span style={{ fontSize: '0.8rem' }}>{t('示範', 'Play')}</span>
                  </button>
                )}
                {!isAutoPlay && (
                  <div className="hud-glass" style={{ padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#93c5fd' }}>{activeVerse.reference}</span>
                  </div>
                )}
              </div>

              {!isAutoPlay && !multiplayerRoomId && (
                <div className="hud-glass" style={{ padding: '0.3rem 0.8rem', display: 'flex', gap: '0.8rem', alignItems: 'center', height: '100%', minHeight: '36px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f87171' }}>
                    {[...Array(3)].map((_, i) => (
                      <Heart key={i} size={16} fill={i < health ? '#f87171' : 'transparent'} strokeWidth={i < health ? 0 : 2} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '1rem', fontWeight: 'bold', color: '#fbbf24' }}>
                    <Zap size={16} fill="#fbbf24" strokeWidth={0} /> {combo}x
                  </div>
                </div>
              )}

              {!isAutoPlay && !multiplayerRoomId && (
                <div className="hud-glass" style={{ padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', minHeight: '36px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ color: '#fbbf24', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '-2px' }}>
                      <Crown size={10} /> {bestScore}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
                      {String(score).padStart(6, '0')}
                    </div>
                  </div>
                  <div style={{ padding: '0.2rem 0.6rem', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>T</div>
                    <div style={{ fontSize: '0.95rem', color: timeLeft <= 1000 ? '#f87171' : '#cbd5e1', fontFamily: 'monospace' }}>
                      {String(Math.floor(timeLeft / 100)).padStart(2, '0')}.{String(timeLeft % 100).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              )}

              {/* Multiplayer HUD */}
              {!isAutoPlay && multiplayerRoomId && multiplayerState && multiplayerState.players && (
                <>
                  <div className="hud-glass" style={{ padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', minHeight: '36px', border: '1px solid rgba(59, 130, 246, 0.5)' }}>
                    <div style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '-0.3rem' }}>{t("我", "Me")}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', color: '#f87171' }}>
                      {[...Array(3)].map((_, i) => (
                        <Heart key={i} size={14} fill={i < health ? '#f87171' : 'transparent'} strokeWidth={i < health ? 0 : 2} />
                      ))}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
                      {String(score).padStart(6, '0')}
                    </div>
                  </div>

                </>
              )}
            </div>

            {!isAutoPlay && (() => {
              const HUD_PAGE_SIZE = 6;
              const startIdx = Math.floor(currentSeqIndex / HUD_PAGE_SIZE) * HUD_PAGE_SIZE;
              const currentPhrasesWindow = activePhrases.slice(startIdx, currentSeqIndex);

              return (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div className="hud-glass" style={{ padding: '0.5rem 5vw', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '16px 16px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
                    <div style={{ fontSize: 'clamp(1rem, 4vw, 1.4rem)', lineHeight: '1.8', color: '#cbd5e1', wordBreak: 'break-word', alignContent: 'flex-start' }}>
                      {currentPhrasesWindow.map((phrase, localIdx) => (
                        <span key={startIdx + localIdx} style={{ color: '#fbbf24', fontWeight: 'bold' }}>{phrase} </span>
                      ))}
                      {currentSeqIndex < activePhrases.length && (
                        <span id="stack-cursor" style={{ display: 'inline-block', color: '#94a3b8', fontWeight: 'bold', padding: '0 0.4rem', border: '2px dashed rgba(251, 191, 36, 0.4)', borderRadius: '6px', margin: '0 0.2rem', background: 'rgba(251, 191, 36, 0.05)', transition: 'all 0.3s' }}>
                          Next: {activePhrases[currentSeqIndex].replace(/[^\s\.,\?!;:，。？！；：]/g, '〇')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {isAutoPlay ? (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem 5vw 2rem' }}>
                <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', maxWidth: '1000px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
                  <h2 style={{ fontSize: 'clamp(1.2rem, 3vh, 2rem)', color: speakingTitle ? '#fbbf24' : '#93c5fd', transition: 'color 0.3s', marginBottom: '1rem', fontWeight: 'bold' }}>{activeVerse.reference}</h2>
                  <div style={{
                    fontSize: (() => {
                      const lengthWeight = version === 'kjv' ? activeVerse.text.length / 2.5 : activeVerse.text.length;
                      if (lengthWeight > 120) return 'clamp(1rem, min(4.5vw, 3vh), 1.5rem)';
                      if (lengthWeight > 70) return 'clamp(1.2rem, min(5vw, 3.5vh), 2rem)';
                      return 'clamp(1.5rem, min(6vw, 4vh), 3rem)';
                    })(),
                    color: '#fff', lineHeight: '1.6', fontWeight: 'bold'
                  }}>
                    {activePhrases.map((phrase, idx) => {
                      let color = '#cbd5e1';
                      if (idx < currentSeqIndex) color = '#93c5fd';
                      if (idx === currentSeqIndex && !speakingTitle) color = '#fbbf24';
                      return <span key={idx} style={{ color, transition: 'color 0.3s' }}>{phrase}{" "}</span>;
                    })}
                  </div>
                </div>
              </div>
            ) : playMode.startsWith('square') ? (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: playMode.startsWith('square') ? 'clamp(80px, 25vh, 200px)' : 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 'clamp(3.5rem, 12vh, 5.5rem)', paddingBottom: '1rem', overflowY: 'auto', pointerEvents: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${distractionLevel <= 1 ? 2 : 3}, minmax(0, 1fr))`, gap: 'clamp(0.4rem, 2vh, 0.75rem)', width: '95%', maxWidth: distractionLevel <= 1 ? '600px' : '900px', pointerEvents: 'auto', margin: 'auto 0' }}>
                  {blocks.map(block => {
                    let appliedClasses = 'falling-block-inner';
                    if (block.error) appliedClasses += ' error-shake';
                    if (block.correct && (!block.claimedBy || block.claimedBy === myClientId)) appliedClasses += ' success-flash';

                    let blockStyle = { cursor: 'pointer', padding: 'clamp(0.4rem, 2vh, 1.5rem)', fontSize: 'clamp(0.9rem, 2.5vw, 1.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'clamp(2.5rem, 12vh, 100px)', wordBreak: 'break-word', hyphens: 'auto', textAlign: 'center', visibility: block.hidden ? 'hidden' : 'visible' };

                    if (block.claimedBy) {
                      // Block instantly disappears physically so the flying clone can animate
                      blockStyle.visibility = 'hidden';
                    }

                    return (
                      <div key={block.id} data-id={block.id} className={appliedClasses} onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }} style={blockStyle}>
                        {!block.hidden && block.text}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ position: 'absolute', width: '100vw', height: '100dvh', top: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {blocks.map((block) => {
                  let appliedClasses = 'falling-block-inner';
                  if (block.error) appliedClasses += ' error-shake';
                  if (block.correct) appliedClasses += ' success-flash';

                  return (
                    <div
                      key={block.id}
                      className="falling-wrapper"
                      data-id={block.id}
                      style={{
                        position: 'absolute',
                        top: '-30px',
                        left: `${Math.min(block.xPos, 75)}%`,
                        animation: `fall ${block.duration}s linear forwards`,
                        animationPlayState: 'running',
                        zIndex: block.seqIndex === currentSeqIndex ? 50 : 10
                      }}
                      onAnimationEnd={(e) => handleAnimationEnd(e, block.id)}
                    >
                      <div
                        className={appliedClasses}
                        onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }}
                        style={{
                          pointerEvents: 'auto',
                          cursor: 'pointer',
                          minWidth: 'clamp(100px, 20vw, 240px)',
                          minHeight: 'clamp(2.5rem, 12vh, 100px)',
                          fontSize: 'clamp(0.9rem, 2.5vw, 1.5rem)',
                          padding: 'clamp(0.4rem, 2vh, 1.5rem) clamp(0.6rem, 2.5vw, 1.5rem)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          wordBreak: 'break-word',
                          hyphens: 'auto',
                          textAlign: 'center',
                        }}
                      >
                        {block.text}
                      </div>
                    </div>
                  );
                })}
              </div>

            )}



            {/* Flying Blocks Animation Layer */}
            {gameState === 'playing' && multiplayerRoomId && flyingBlocks.map(fb => (
              <div
                key={fb.id}
                className="falling-block-inner flying-block-anim"
                style={{
                  '--startX': fb.startX,
                  '--startY': fb.startY,
                  '--endX': fb.endX,
                  '--endY': fb.endY,
                  width: fb.width,
                  height: fb.height,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(0.9rem, 2.5vw, 1.5rem)',
                  backgroundColor: fb.color,
                  borderColor: fb.color,
                  boxShadow: `0 0 20px ${fb.color}`,
                  color: '#fff',
                  wordBreak: 'break-word', hyphens: 'auto', textAlign: 'center'
                }}
              >
                {fb.text}
              </div>
            ))}

            {multiplayerRoomId && health <= 0 && multiplayerState?.playMode !== 'square_solo' && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', animation: 'flashSuccess 0.5s ease-out' }}>
                <div style={{ color: '#ef4444', marginBottom: '1rem' }}><XCircle size={64} /></div>
                <h2 style={{ color: '#fca5a5', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textShadow: '0 2px 10px rgba(239,68,68,0.5)' }}>{t("您已出局！", "You're Out!")}</h2>
                <div style={{ fontSize: '1.2rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', maxWidth: '80%' }}>
                  {t("防線已經崩潰。請等待隊友完成...", "Defenses breached. Please wait for your teammates...")}
                  {multiplayerState?.campaignQueue && multiplayerState.campaignQueue.length > 1 ? (
                    <div style={{ marginTop: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                      {t("下一局加油，還有", "Cheer up for next round! You have")} {multiplayerState.campaignQueue.length - 1} {t("次的機會", "more rounds.")}
                    </div>
                  ) : multiplayerState?.campaignQueue && multiplayerState.campaignQueue.length === 1 ? (
                    <div style={{ marginTop: '1rem', color: '#fbbf24', fontWeight: 'bold' }}>
                      {t("這是最後一關了！為隊友祈禱吧！", "This is the final round! Pray for your teammates!")}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'waiting_for_others' && multiplayerState && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', flexDirection: 'column' }}>
            <div className="hud-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', padding: '3rem 2rem', width: '100%', maxWidth: '600px', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', color: '#10b981', fontWeight: 'bold', margin: 0 }}>{t("你完成了所有經文！", "You finished all verses!")}</h2>
              <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0, animation: 'bounce 2s infinite' }}>{t("等待其他玩家完成...", "Waiting for others to finish...")}</p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                {Object.values(multiplayerState.players || {}).filter(p => p.connected).map(p => {
                  const totalVerses = localCampaignListRef.current.length || 1;
                  const versesCompleted = p.isFinished ? totalVerses : (p.versesCompleted || 0);
                  const totalScore = multiplayerState.campaignResults?.reduce((acc, round) => acc + Math.max(0, round.scores?.[p.id] || 0), 0) || 0;
                  const isMe = p.id === myClientId;
                  return (
                    <div key={p.id} style={{ background: isMe ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isMe ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '0.8rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: isMe ? '#10b981' : '#e2e8f0', fontSize: '1rem' }}>{p.name}{isMe ? ` ${t("(你)", "(You)")}` : ''}</span>
                        <span style={{ color: p.isFinished ? '#10b981' : '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>{p.isFinished ? `✅ ${t("完成！", "Done!")}` : `${versesCompleted} / ${totalVerses}`}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: '1rem' }}>{totalScore} pts</span>
                        <span style={{ display: 'flex', gap: '2px' }}>
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Heart key={i} size={14} color={i < (p.health || 0) ? '#ef4444' : '#475569'} fill={i < (p.health || 0) ? '#ef4444' : 'none'} />
                          ))}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${(versesCompleted / totalVerses) * 100}%`, height: '100%', background: p.isFinished ? '#10b981' : '#3b82f6', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    if (socketRef.current) {
                      socketRef.current.close();
                      socketRef.current = null;
                    }
                    multiplayerSoloActiveRef.current = false;
                    setGameState('menu');
                    setMultiplayerRoomId(null);
                    setMultiplayerState(null);
                  }}
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.7rem 2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
                >
                  {t("離開遊戲", "Leave Game")}
                </button>

                {multiplayerState?.host === myClientId && (
                  <button
                    onClick={() => {
                      if (socketRef.current) socketRef.current.send(JSON.stringify({ type: 'FORCE_END_GAME' }));
                    }}
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.7rem 2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.5)' }}
                  >
                    {t("比賽結束", "End Match Now")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {gameState === 'multiplayer_results' && multiplayerState && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', flexDirection: 'column' }}>
            <div className="hud-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', padding: '3rem 2rem', width: '100%', maxWidth: '800px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}><Trophy size={40} color="#fbbf24" fill="#fbbf24" /> {multiplayerState.campaignResults?.length > 1 ? t("連戰結束！", "Marathon Completed!") : t("對局結束！", "Game Over!")}</h2>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: '1.5rem 0', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>

                <h3 style={{ margin: 0, textAlign: 'left', color: '#94a3b8', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{t("總排名", "Final Standings")}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Object.values(multiplayerState.players)
                    .map(p => {
                      const totalScore = multiplayerState.campaignResults?.reduce((acc, round) => acc + Math.max(0, round.scores[p.id] || 0), 0) || p.score;
                      return { ...p, totalScore };
                    })
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((p, idx) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', backgroundColor: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : '#64748b' }}>#{idx + 1}</div>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: p.color, boxShadow: '0 0 0 2px rgba(255,255,255,0.2)' }}></div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0' }}>{p.name} {p.id === myClientId ? '(You)' : ''}</div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6', fontFamily: 'monospace' }}>{p.totalScore}</div>
                      </div>
                    ))}
                </div>

                {multiplayerState.campaignResults?.length > 1 && (
                  <>
                    <h3 style={{ margin: '1rem 0 0 0', textAlign: 'left', color: '#94a3b8', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{t("回合紀錄", "Round History")}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {multiplayerState.campaignResults.map((round, rIdx) => (
                        <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '1rem' }}>
                          <div style={{ color: '#93c5fd', fontWeight: 'bold', textAlign: 'left', marginBottom: '0.5rem' }}>{t("回合", "Round")} {rIdx + 1}: {round.verseRef}</div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {Object.keys(round.scores)
                              .sort((a, b) => round.scores[b] - round.scores[a])
                              .map((pid, rank) => {
                                const player = multiplayerState.players[pid];
                                if (!player) return null;
                                return (
                                  <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', background: rank === 0 ? 'rgba(16, 185, 129, 0.2)' : 'transparent', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                    {rank === 0 && <span style={{ color: '#10b981' }}>★</span>}
                                    {player.name}: <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{Math.max(0, round.scores[pid])}</span>
                                  </div>
                                )
                              })
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: 'auto' }}>
                <button
                  onClick={() => {
                    multiplayerSoloActiveRef.current = false;
                    setGameState('menu');
                    setMultiplayerRoomId(null);
                    if (socketRef.current) socketRef.current.close();
                  }}
                  style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {t("離開對戰", "Leave Match")}
                </button>

                {multiplayerState?.host === myClientId && (
                  <button
                    onClick={() => {
                      multiplayerSoloActiveRef.current = false;
                      socketRef.current.send(JSON.stringify({ type: 'RESTART_GAME' }));
                      setGameState('menu');
                    }}
                    style={{ flex: 1, padding: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    {t("回到大廳", "Return to Lobby")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {gameState === 'intermission' && multiplayerState && (() => {
          const isSoloMP = multiplayerRoomId && multiplayerState.playMode?.endsWith('_solo');
          const nextVerseData = isSoloMP ? localNextVerse : multiplayerState.campaignQueue?.[0];
          const remaining = isSoloMP
            ? localCampaignListRef.current.length - localVerseIndexRef.current
            : multiplayerState.campaignQueue?.length;
          return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', flexDirection: 'column' }}>
              <div className="hud-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', padding: '4rem 2rem', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                <h2 style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '1.5rem', fontWeight: 'bold' }}>{t("太棒了！準備下一回合", "Great job! Get ready...")}</h2>
                <p style={{ color: '#cbd5e1', fontSize: '1.5rem', marginBottom: '2.5rem' }}>
                  {t("還剩", "Remaining:")} <strong style={{ color: '#fff' }}>{remaining}</strong> {t("節經文", "verses")}
                </p>
                <p style={{ color: '#93c5fd', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  {t("接下來：", "Next Up:")} {nextVerseData?.reference}
                </p>
                {nextVerseData?.text && (
                  <div style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '150px', overflowY: 'auto' }}>
                    {nextVerseData.text}
                  </div>
                )}
                <div style={{ fontSize: '6rem', fontWeight: 'bold', color: '#fbbf24', animation: 'bounce 1s infinite' }}>
                  {intermissionCountdown}
                </div>
              </div>
            </div>
          );
        })()}

        {gameState === 'gameover' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', zIndex: 20, position: 'relative' }}>
            {isFailed ? (
              <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '900px', border: '1px solid #f87171', maxHeight: '95dvh', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: 'clamp(1.2rem, 3vh, 1.8rem)', color: '#f87171', marginBottom: 'clamp(0.5rem, 2vh, 1rem)' }}>{t("再接再厲！", "Try Again!")}</h2>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: 'clamp(1rem, 3vw, 2.5rem)', borderRadius: '16px', marginBottom: 'clamp(1rem, 3vh, 2.5rem)', overflowY: 'auto', flex: 1 }}>
                  <p style={{ fontSize: 'clamp(1.2rem, 3.5vh, 2.2rem)', color: '#fff', fontWeight: 'bold', marginBottom: 'clamp(0.5rem, 2vh, 1.5rem)', textTransform: 'uppercase', letterSpacing: '2px' }}>{activeVerse.reference}</p>
                  <div style={{ fontSize: 'clamp(1.2rem, 3.5vh, 2.2rem)', color: '#fff', lineHeight: '1.6', fontWeight: 'bold' }}>
                    {activePhrases.map((phrase, idx) => (
                      <span key={idx} style={{ color: idx % 2 === 0 ? '#93c5fd' : '#cbd5e1' }}>{phrase}{" "}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => startGame()}
                    className="play-btn"
                    style={{
                      flex: '1 1 200px', maxWidth: '400px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1.2rem)',
                      fontSize: 'clamp(1.1rem, 2.5vh, 1.3rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                      boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', flexShrink: 0
                    }}
                  >
                    <RotateCcw size={24} /> {t("再玩一次", "Play Again")}
                  </button>
                  {campaignQueue !== null ? (
                    campaignQueue.length > 0 ? (
                      <button
                        onClick={() => {
                          setActiveVerse(campaignQueue[0]);
                          setCampaignQueue(campaignQueue.slice(1));
                          setTimeout(() => startGame(false, campaignQueue[0]), 50);
                        }}
                        className="play-btn"
                        style={{
                          flex: '1 1 200px', maxWidth: '400px', background: '#64748b', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1.2rem)',
                          fontSize: 'clamp(1.1rem, 2.5vh, 1.3rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }}
                      >
                        {t("跳過", "Skip")}
                      </button>
                    ) : (
                      <button
                        onClick={() => setGameState('campaign-results')}
                        className="play-btn"
                        style={{
                          flex: '1 1 200px', maxWidth: '400px', background: '#8b5cf6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1.2rem)',
                          fontSize: 'clamp(1.1rem, 2.5vh, 1.3rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }}
                      >
                        {t("查看成績", "View Results")}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setGameState('menu')}
                      className="play-btn"
                      style={{
                        flex: '1 1 200px', maxWidth: '400px', background: '#475569', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1.2rem)',
                        fontSize: 'clamp(1.1rem, 2.5vh, 1.3rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s'
                      }}
                    >
                      <Home size={20} /> {t("跳過", "Give Up")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '800px', maxHeight: '95dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', animation: isNewHighScore || isFlawless ? 'flashSuccess 1s ease-out' : 'none' }}>

                <div style={{ flexShrink: 0 }}>
                  {isNewHighScore ? (
                    <Crown size={48} color="#fbbf24" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)', animation: 'bounce 1s infinite' }} />
                  ) : isFlawless ? (
                    <Star size={48} color="#34d399" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)' }} />
                  ) : (
                    <Trophy size={48} color="#fbbf24" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)' }} />
                  )}

                  <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', marginBottom: '0.5rem', color: '#fff' }}>
                    {isNewHighScore ? t("新高分！", "New High Score!") : isFlawless ? t("完美無瑕！", "Flawless!") : ""}
                  </h2>

                  {isFlawless && !isNewHighScore && (
                    <div style={{ color: '#34d399', fontSize: 'clamp(1rem, 2vh, 1.2rem)', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', fontWeight: 'bold' }}>
                      {t("完美的順序！", "Perfect Sequence!")}
                    </div>
                  )}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 'clamp(1rem, 3vw, 2rem)', borderRadius: '16px', margin: 'clamp(0.5rem, 2vh, 2rem) 0', overflowY: 'auto', flex: 1 }}>
                  <p style={{ fontSize: 'clamp(1.1rem, 3vh, 2rem)', color: '#fff', fontWeight: 'bold', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', textTransform: 'uppercase', letterSpacing: '1px' }}>{activeVerse.reference}</p>
                  <div style={{ fontSize: 'clamp(1.1rem, 3vh, 2rem)', color: '#fff', lineHeight: '1.5', fontWeight: 'bold' }}>
                    {activePhrases.map((phrase, idx) => (
                      <span key={idx} style={{ color: idx % 2 === 0 ? '#93c5fd' : '#cbd5e1' }}>{phrase}{" "}</span>
                    ))}
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 'clamp(0.9rem, 2vh, 1.1rem)', color: '#93c5fd', marginBottom: 'clamp(0.2rem, 1vh, 0.5rem)', fontWeight: 'bold' }}>
                    {t("通關基礎分", "Base Score")}: {pureBaseScore}
                  </div>
                  {timeBonus > 0 && (
                    <div style={{ fontSize: 'clamp(0.9rem, 2vh, 1.1rem)', color: '#34d399', marginBottom: 'clamp(0.2rem, 1vh, 0.5rem)', fontWeight: 'bold' }}>
                      {t("時間加成", "Time Bonus")}: {(timeLeft / 100).toFixed(2)}s × {playMode === 'blind' ? '65' : '50'} = +{timeBonus}
                      {playMode === 'blind' && (
                        <div style={{ fontSize: 'clamp(0.75rem, 1.5vh, 0.85rem)', color: '#fbbf24', marginTop: '0.2rem' }}>
                          ({t("語音模式專屬：時間權重增加 30%", "Voice Mode Bonus: Time weight increased by 30%")})
                        </div>
                      )}
                    </div>
                  )}
                  {distractionLevel > 0 && !isFailed && (
                    <div style={{ fontSize: 'clamp(0.9rem, 2vh, 1.1rem)', color: '#f59e0b', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', fontWeight: 'bold' }}>
                      {t("難度加成", "Difficulty Multiplier")}: × {(1 + distractionLevel * 0.1).toFixed(1)} {t(`(難度 ${distractionLevel})`, `(Lv ${distractionLevel})`)}
                    </div>
                  )}
                  <div style={{ fontSize: 'clamp(1rem, 2.5vh, 1.25rem)', color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    {t("最終得分", "Final Score")}: <strong style={{ color: isNewHighScore ? '#fbbf24' : '#fff', fontSize: 'clamp(2rem, 5vh, 2.5rem)', display: 'block', marginTop: '0.2rem' }}>{score}</strong>
                  </div>

                  {/* Home and Play Again buttons placed HERE — always visible above the leaderboard */}
                  {campaignQueue === null && (
                    <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px', margin: 'clamp(0.6rem, 2vh, 1rem) auto' }}>
                      <button
                        onClick={() => { setGameState('menu'); setCampaignQueue(null); }}
                        className="play-btn"
                        style={{
                          flex: 1,
                          background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                          padding: 'clamp(0.6rem, 1.5vh, 0.9rem)',
                          fontSize: 'clamp(0.9rem, 2vh, 1.05rem)', fontWeight: 'bold',
                          borderRadius: '12px', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.4rem', transition: 'all 0.2s'
                        }}
                      >
                        <Home size={18} /> {t("回到主頁", "Home")}
                      </button>
                      <button
                        onClick={() => startGame()}
                        className="play-btn"
                        style={{
                          flex: 1,
                          background: '#3b82f6', color: 'white', border: 'none',
                          padding: 'clamp(0.6rem, 1.5vh, 0.9rem)',
                          fontSize: 'clamp(0.9rem, 2vh, 1.05rem)', fontWeight: 'bold',
                          borderRadius: '12px', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.4rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s'
                        }}
                      >
                        <RotateCcw size={18} /> {t("再玩一次", "Play Again")}
                      </button>
                    </div>
                  )}

                  {campaignQueue !== null ? (
                    campaignQueue.length > 0 ? (
                      <button
                        onClick={() => {
                          setActiveVerse(campaignQueue[0]);
                          setCampaignQueue(campaignQueue.slice(1));
                          setTimeout(() => startGame(false, campaignQueue[0]), 50);
                        }}
                        className="play-btn"
                        style={{
                          width: '100%', maxWidth: '300px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1rem)',
                          fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto 1rem auto'
                        }}
                      >
                        {t("下一回合", "Next Round")}
                      </button>
                    ) : (
                      <button
                        onClick={() => setGameState('campaign-results')}
                        className="play-btn"
                        style={{
                          width: '100%', maxWidth: '300px', background: '#8b5cf6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1rem)',
                          fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto 1rem auto'
                        }}
                      >
                        {t("查看最終成績", "View Final Results")}
                      </button>
                    )
                  ) : null}

                  {!isAutoPlayRef.current && (
                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1rem', marginTop: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#fbbf24', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Trophy size={18} /> {t("全域英雄榜", "Global Leaderboard")}
                      </h3>

                      {!playerName ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                          <p style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0', textAlign: 'center' }}>{t("想要將神聖高分刻在群組榜單上嗎？", "Want to carve your high score on the leaderboard?")}</p>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['🦁', '🐶', '🐰', '🦊', '🐼'].map(emj => (
                              <div key={emj} onClick={() => {
                                const input = document.getElementById('playerNameInput');
                                if (!input.value.includes(emj)) input.value = emj + " " + input.value;
                              }} style={{ fontSize: '1.5rem', cursor: 'pointer', padding: '0.3rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', transition: 'background 0.2s' }}>{emj}</div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <input
                              type="text"
                              placeholder={t("你的雷雨暱稱", "Your Nickname")}
                              id="playerNameInput"
                              style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', outline: 'none', fontSize: '1rem' }}
                            />
                            <button
                              className="primary-button"
                              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                              onClick={() => {
                                const name = document.getElementById('playerNameInput').value.trim();
                                if (!name) return;
                                setPlayerName(name);
                                localStorage.setItem('verserain_player_name', name);
                                setIsSubmittingScore(true);
                                const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;
                                fetch('/api/submit-score', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: name, score: score, verseRef: activeVerse.reference, mode: actualModeName })
                                }).then(() => fetch(`/api/get-scores?verseRef=${encodeURIComponent(activeVerse.reference)}`))
                                  .then(res => res.json())
                                  .then(data => setLeaderboard(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
                                  .catch(e => console.log(e))
                                  .finally(() => setIsSubmittingScore(false));
                              }}
                            >
                              {t("送出", "Submit")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.9rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
                            {[{ id: 'daily', label: t('今天', 'Today') }, { id: 'monthly', label: t('30天 (本月)', '30 days (Month)') }, { id: 'alltime', label: t('歷史', 'All-Time') }].map(tab => (
                              <button
                                key={tab.id}
                                onClick={() => setLeaderboardTab(tab.id)}
                                style={{ flex: 1, padding: '0.4rem 0', background: leaderboardTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', borderBottom: leaderboardTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent', color: leaderboardTab === tab.id ? '#60a5fa' : '#94a3b8', fontWeight: leaderboardTab === tab.id ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          <div style={{ maxHeight: '130px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                            {isSubmittingScore ? (
                              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>{t("上傳分數中...", "Submitting...")}</div>
                            ) : leaderboard && Array.isArray(leaderboard[leaderboardTab]) && leaderboard[leaderboardTab].length > 0 ? (
                              leaderboard[leaderboardTab].map((entry, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <span style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#e2e8f0' : i === 2 ? '#b45309' : '#94a3b8', fontWeight: i < 3 ? 'bold' : 'normal', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ width: '16px', textAlign: 'right' }}>{i + 1}.</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <span>{entry.name}</span>
                                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: entry.mode === 'square' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{entry.mode || 'rain'}</span>
                                    </span>
                                  </span>
                                  <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{entry.score}</span>
                                </div>
                              ))
                            ) : (
                              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>{t("尚無排行紀錄，您是第一位！", "No records yet. Be the first!")}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'campaign-results' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', width: '100vw', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'calc(env(safe-area-inset-top) + 2rem) 1rem 4rem' }}>
            <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '800px', display: 'flex', flexDirection: 'column', animation: 'flashSuccess 1s ease-out' }}>
              <Trophy size={48} color="#fbbf24" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: 'clamp(2rem, 4vh, 2.5rem)', color: '#fff', marginBottom: '1.5rem' }}>{t("所有關卡完成！", "All Rounds Conquered!")}</h2>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', overflowY: 'auto', maxHeight: '50vh', marginBottom: '2rem' }}>
                {campaignResults.map((result, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: i < campaignResults.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: '1.1rem' }}>{result.verse.reference}</div>
                      <div style={{ color: result.health > 0 ? (result.flawless ? '#34d399' : '#93c5fd') : '#f87171', fontSize: '0.9rem' }}>
                        {result.health > 0 ? (result.flawless ? t('完美', 'Perfect') : t('過關', 'Cleared')) : t('錯失', 'Missed')}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.health > 0 ? '#fbbf24' : '#64748b' }}>{result.score}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '1.5rem', color: '#cbd5e1', marginBottom: '2rem' }}>
                {t("總計得分", "Total Score")}: <strong style={{ color: '#fbbf24', fontSize: '3rem', display: 'block', marginTop: '0.5rem' }}>{campaignResults.reduce((sum, r) => sum + r.score, 0)}</strong>
              </div>

              <button
                onClick={() => {
                  setGameState('menu');
                  setCampaignQueue(null);
                }}
                className="play-btn"
                style={{
                  background: '#3b82f6', color: 'white', border: 'none', padding: '1rem',
                  fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', margin: '0 auto', maxWidth: '300px', width: '100%'
                }}
              >{t("回到主頁", "Back to Home")}</button>
            </div>
          </div>
        )}
        {leaderboardModalVerse && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(5px)' }} onClick={() => setLeaderboardModalVerse(null)}>
            <div className="hud-glass" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', color: '#93c5fd', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={20} /> {t("英雄榜", "Leaderboard")}</h2>
                  <div style={{ color: '#cbd5e1' }}>{leaderboardModalVerse.reference}</div>
                </div>
                <button onClick={() => setLeaderboardModalVerse(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}><XCircle size={24} /></button>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                {[{ id: 'daily', label: t('今天', 'Today') }, { id: 'monthly', label: t('30天 (本月)', '30 days (Month)') }, { id: 'alltime', label: t('歷史', 'All-Time') }].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setLeaderboardModalTab(tab.id)}
                    style={{ flex: 1, padding: '1rem 0', background: leaderboardModalTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', borderBottom: leaderboardModalTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent', color: leaderboardModalTab === tab.id ? '#60a5fa' : '#94a3b8', fontWeight: leaderboardModalTab === tab.id ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, minHeight: '300px' }}>
                {isFetchingLeaderboard ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', margin: '2rem 0' }}>{t("載入排行榜中...", "Loading Leaderboard...")}</div>
                ) : leaderboardModalData && Array.isArray(leaderboardModalData[leaderboardModalTab]) && leaderboardModalData[leaderboardModalTab].length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {leaderboardModalData[leaderboardModalTab].map((entry, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '24px', textAlign: 'center', color: i === 0 ? '#fbbf24' : i === 1 ? '#e2e8f0' : i === 2 ? '#b45309' : '#94a3b8' }}>{i + 1}</span>
                          <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: i < 3 ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{entry.name}</span>
                            <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: entry.mode === 'square' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#93c5fd' }}>{entry.mode || 'rain'}</span>
                          </span>
                        </div>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1.1rem' }}>{entry.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center', margin: '2rem 0' }}>{t("尚無排行紀錄，趕緊成為第一位吧！", "No records yet. Be the first!")}</div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Login Account Modal */}
        {showLoginModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {showLoginModal === 'signup' ? t("註冊新帳號", "Sign Up") : (showLoginModal === 'verify' ? t("輸入驗證碼", "Enter Code") : t("登入帳號", "Log In"))}
                </h2>
                <button
                  onClick={() => setShowLoginModal(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <XCircle size={24} />
                </button>
              </div>



              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {showLoginModal === 'verify' ? (
                  <>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center' }}>
                      {t("驗證碼已寄至 ", "Code sent to ")} <strong style={{ color: '#1e293b' }}>{verifyEmail}</strong>
                    </div>
                    <input
                      id="modalCodeInput"
                      type="text"
                      placeholder={t("6位數驗證碼", "6-digit Code")}
                      maxLength={6}
                      style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '1.2rem', outline: 'none', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </>
                ) : (
                  <>
                    <input
                      id="modalEmailInput"
                      type="email"
                      placeholder={t("電子郵件", "Email Address")}
                      style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '0.95rem', outline: 'none' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />

                    <input
                      id="modalPasswordInput"
                      type="password"
                      placeholder={t("密碼", "Password")}
                      style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '0.95rem', outline: 'none' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />

                    {showLoginModal === 'signup' && (
                      <input
                        id="modalPlayerNameInput"
                        type="text"
                        maxLength={20}
                        defaultValue={playerName}
                        placeholder={t("顯示暱稱", "Display Name")}
                        style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '0.95rem', outline: 'none' }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                      />
                    )}
                  </>
                )}
              </div>

              {authError && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', marginTop: '-0.5rem', fontWeight: 'bold' }}>{authError}</div>}

              {recoveredPassword && (
                <div style={{ background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#065f46', marginBottom: '0.4rem', fontWeight: 'bold' }}>哈囉 {recoveredPassword.name}！您的密碼如下：</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 'bold', color: '#047857', letterSpacing: '2px', background: '#d1fae5', padding: '0.5rem 1rem', borderRadius: '6px', marginBottom: '0.6rem', userSelect: 'all' }}>
                    {recoveredPassword.password}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>請複製密碼後貼到上方密碼欄位登入</div>
                  <button onClick={() => { navigator.clipboard.writeText(recoveredPassword.password); }} style={{ marginTop: '0.5rem', background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>📋 複製密碼</button>
                </div>
              )}

              <button
                disabled={authLoading}
                onClick={async () => {
                  if (showLoginModal === 'verify') {
                    const codeInput = document.getElementById('modalCodeInput');
                    const code = codeInput ? codeInput.value.trim() : '';
                    if (!code) { setAuthError("請輸入驗證碼 (Verification code required)"); return; }

                    setAuthLoading(true);
                    setAuthError("");
                    try {
                      const res = await fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/verify-email", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: verifyEmail, code })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert(t("驗證成功！請重新登入。", "Verification successful! Please log in."));
                        setShowLoginModal('login');
                      } else {
                        setAuthError(data.error || "驗證失敗 (Verification Error)");
                      }
                    } catch (err) {
                      setAuthError("連線失敗 (Connection Error)");
                    } finally {
                      setAuthLoading(false);
                    }
                    return;
                  }

                  const emailInput = document.getElementById('modalEmailInput');
                  const passInput = document.getElementById('modalPasswordInput');
                  const nameInput = document.getElementById('modalPlayerNameInput');

                  const email = emailInput ? emailInput.value.trim() : '';
                  const password = passInput ? passInput.value.trim() : '';
                  const nameStr = nameInput ? nameInput.value.trim() : '';

                  if (!email || !password) {
                    setAuthError("請輸入 Email 與 密碼 (Email & Password required)");
                    return;
                  }

                  setAuthLoading(true);
                  setAuthError("");

                  try {
                    const endpoint = showLoginModal === 'signup' ? '/register' : '/login';
                    const payload = { email, password, nickname: nameStr };

                    // Hit PartyKit Backend
                    const host = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db" + endpoint;
                    const response = await fetch(host, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                      if (showLoginModal === 'signup') {
                        // Registration: server sends verification email
                        setVerifyEmail(email);
                        setShowLoginModal('verify');
                        alert(t(
                          "註冊成功！請至您的信箱查看驗證碼。",
                          "Registration successful! Please check your email for the verification code."
                        ));
                      } else {
                        // Login: server returns the full user object
                        const prevEmail = localStorage.getItem('verserain_player_email');
                        if (prevEmail && prevEmail !== data.user.email) {
                          localStorage.removeItem('verseRain_gardenData');
                          setGardenData({});
                        }
                        const isPrem = data.user.isPremium || PREMIUM_EMAILS.includes((data.user.email || '').toLowerCase());
                        setPlayerName(data.user.name || email.split('@')[0]);
                        setUserEmail(data.user.email);
                        setIsPremium(isPrem);
                        localStorage.setItem('verserain_player_name', data.user.name || email.split('@')[0]);
                        localStorage.setItem('verserain_player_email', data.user.email);
                        localStorage.setItem('verserain_is_premium', isPrem ? 'true' : 'false');
                        setShowLoginModal(null);
                      }
                    } else {
                      if (data.requiresVerification) {
                        setVerifyEmail(email);
                        setShowLoginModal('verify');
                        alert(t("請先驗證您的電子郵件", "Please verify your email first"));
                      }
                      setAuthError(data.error || "連線失敗 (Connection Error)");
                    }
                  } catch (err) {
                    setAuthError("無法連線到伺服器 (Server unreachable)");
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                style={{ background: authLoading ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: authLoading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginTop: '0.5rem' }}
                onMouseOver={(e) => { if (!authLoading) e.target.style.background = '#2563eb' }}
                onMouseOut={(e) => { if (!authLoading) e.target.style.background = '#3b82f6' }}
              >
                {authLoading ? "..." : (showLoginModal === 'verify' ? t("驗證", "Verify") : (showLoginModal === 'signup' ? t("建立新帳號 ", "Create Account") : t("登入", "Log In")))}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
                {showLoginModal === 'verify' ? (
                  <span onClick={() => setShowLoginModal('login')} style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>{t("返回登入", "Back to Login")}</span>
                ) : showLoginModal === 'signup' ? (
                  <>
                    {t("已經有帳號？", "Already have an account? ")}
                    <span onClick={() => setShowLoginModal('login')} style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>{t("在此登入", "Log in here")}</span>
                  </>
                ) : (
                  <>
                    {t("還沒有帳號？", "Don't have an account? ")}
                    <span onClick={() => setShowLoginModal('signup')} style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>{t("立即註冊", "Sign up")}</span>
                    <div style={{ marginTop: '0.8rem' }}>
                      <span onClick={async () => {
                        const emailInput = document.getElementById('modalEmailInput');
                        const email = emailInput ? emailInput.value.trim() : '';
                        if (!email) return alert(t("請先在上方的信箱欄位輸入您的信箱！", "Please enter your email first!"));

                        setAuthLoading(true);
                        setAuthError("");
                        try {
                          const res = await fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/forgot-password", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email })
                          });
                          const data = await res.json();
                          if (data.success) {
                            // Server sent the password to the user's email
                            setAuthError("");
                            setRecoveredPassword(null);
                            alert(t(
                              "密碼已發送至您的信箱，請查看。",
                              "Your password has been sent to your email. Please check your inbox."
                            ));
                          } else {
                            setAuthError(data.error || t("查詢失敗", "Failed to retrieve password"));
                            setRecoveredPassword(null);
                          }
                        } catch (err) {
                          setAuthError(t("無法連線到伺服器", "Server unreachable"));
                          setRecoveredPassword(null);
                        } finally {
                          setAuthLoading(false);
                        }
                      }} style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>{t("忘記密碼？", "Forgot Password?")}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR Code Share Modal */}
        {qrShareModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) setQrShareModal(null); }}>
            <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '20px', padding: 'clamp(1.5rem, 4vw, 3rem)', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(59,130,246,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', border: '1px solid rgba(59,130,246,0.3)', animation: 'flashSuccess 0.4s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Share2 size={20} color="#60a5fa" /> {t("掃描 QR 碼來挑戰！", "Scan to Challenge!")}
                </h3>
                <button onClick={() => setQrShareModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}><XCircle size={24} /></button>
              </div>

              <div style={{ color: '#fbbf24', fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 'bold', textAlign: 'center' }}>
                📖 {qrShareModal.reference}
              </div>

              <canvas
                ref={(canvas) => {
                  if (canvas && qrShareModal) {
                    QRCode.toCanvas(canvas, qrShareModal.url, {
                      width: Math.min(280, window.innerWidth - 120),
                      margin: 2,
                      color: { dark: '#1e293b', light: '#ffffff' }
                    });
                  }
                }}
                style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', background: '#fff', padding: '12px' }}
              />

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
                {t("讓大家掃描這個 QR 碼，一起來挑戰這段經文！", "Have everyone scan this QR code to challenge this verse together!")}
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(qrShareModal.url);
                      setToast(t("挑戰連結已複製到剪貼簿！", "Challenge link copied!"));
                      setTimeout(() => setToast(null), 3000);
                    } catch (err) {
                      alert(qrShareModal.url);
                    }
                  }}
                  style={{ flex: 1, padding: '0.75rem', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.25)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
                >
                  {t("📋 複製連結", "📋 Copy Link")}
                </button>
                <button
                  onClick={() => setQrShareModal(null)}
                  style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  {t("關閉", "Close")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Verse View Modal */}
        {verseViewModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) { setVerseViewModal(null); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #e2e8f0', maxHeight: '85vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.6rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#3b82f6' }}>{verseViewModal.reference}</span>
                  <button
                    onClick={() => {
                      const vLang = version === 'kjv' ? 'en-US' : (version === 'ko' ? 'ko-KR' : (version === 'ja' ? 'ja-JP' : (version === 'he' ? 'he-IL' : (version === 'fa' ? 'fa-IR' : 'zh-TW'))));
                      speakText(verseViewModal.text, 1.0, vLang);
                    }}
                    title={t("朗讀經文", "Read aloud")}
                    style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Headphones size={20} />
                  </button>
                </h2>
                <button
                  onClick={() => {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setVerseViewModal(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  <XCircle size={26} />
                </button>
              </div>

              <div style={{ color: '#475569', fontSize: '1.2rem', lineHeight: '1.8', overflowY: 'auto', paddingRight: '1rem', fontWeight: '500', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {verseViewModal.text}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', gap: '1rem' }}>
                <button
                  onClick={() => {
                    setVerseViewModal(null);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  }}
                  style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  {t("關閉", "Close")}
                </button>
                <button
                  onClick={() => {
                    setVerseViewModal(null);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    initAudio();
                    setCampaignQueue(null);
                    setCampaignResults([]);
                    setActiveVerse(verseViewModal);
                    setTimeout(() => startGame(false, verseViewModal), 50);
                  }}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#2563eb'}
                  onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                >
                  <Play size={16} fill="white" /> {t("立刻挑戰", "Play Now")}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Name Edit Modal */}
        {showNameEditModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {t("修改個人資料", "Edit Profile")}
                </h2>
                <button
                  onClick={() => setShowNameEditModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 'bold' }}>{t("目前暱稱", "Display Name")}</label>
                  <input
                    id="nameEditInput"
                    type="text"
                    maxLength={20}
                    placeholder={t("輸入名稱...", "Enter name...")}
                    defaultValue={playerName && !playerName.startsWith("Google P") ? playerName : ""}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {userEmail && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 'bold' }}>{t("目前密碼 (必填)", "Current Password (Required)")}</label>
                      <input
                        id="profileOldPassword"
                        type="password"
                        placeholder={t("輸入目前密碼驗證身分", "Enter current password...")}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 'bold' }}>{t("新密碼 (選填)", "New Password (Optional)")}</label>
                      <input
                        id="profileNewPassword"
                        type="password"
                        placeholder={t("若不修改請留空", "Leave empty to keep unchanged")}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                id="saveNameBtn"
                onClick={async (e) => {
                  const btn = e.target;
                  const originalText = btn.innerText;
                  const inputName = document.getElementById('nameEditInput');
                  const newName = inputName ? inputName.value.trim() : "";

                  if (!userEmail) {
                    // Guest user, only update local name
                    if (newName) {
                      setPlayerName(newName);
                      localStorage.setItem('verserain_player_name', newName);
                      setToast(t("設定成功！觀迎遊玩，", "Name set! Welcome, ") + newName);
                      setTimeout(() => setToast(null), 3000);
                    }
                    setShowNameEditModal(false);
                    return;
                  }

                  const oldPasswordInput = document.getElementById('profileOldPassword');
                  const newPasswordInput = document.getElementById('profileNewPassword');
                  const oldPassword = oldPasswordInput ? oldPasswordInput.value : "";
                  const newPassword = newPasswordInput ? newPasswordInput.value : "";

                  if (!oldPassword) {
                    return alert(t("請輸入您目前的密碼以確認身分！", "Please enter your current password to confirm!"));
                  }
                  if (!newName) {
                    return alert(t("暱稱不能為空！", "Display name cannot be empty!"));
                  }

                  btn.innerText = "...";
                  btn.disabled = true;

                  try {
                    const res = await fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/update-profile", {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: userEmail,
                        password: oldPassword,
                        newName: newName,
                        newPassword: newPassword || undefined
                      })
                    });
                    const data = await res.json();

                    if (data.success) {
                      setPlayerName(data.user.name);
                      localStorage.setItem('verserain_player_name', data.user.name);
                      setToast(t("個人資料修改成功！", "Profile updated successfully!"));
                      setTimeout(() => setToast(null), 3000);
                      setShowNameEditModal(false);
                    } else {
                      alert(data.error || "Update failed");
                    }
                  } catch (err) {
                    alert("Failed to connect to server.");
                  } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                  }
                }}
                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', marginTop: '1rem' }}
              >
                {t("確認儲存", "Save Changes")}
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification Overlay */}
        {toast && (
          <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1e293b', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '50px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInUp 0.3s ease-out', fontWeight: 'bold' }}>
            <Star size={18} fill="#fbbf24" stroke="#fbbf24" />
            {toast}
          </div>
        )}


        {/* Fruit Info Modal */}
        {showFruitInfo && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowFruitInfo(false)}>
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
                <h3 style={{ margin: 0, color: '#b45309', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🍎 {t("果子數量怎麼算？", "How are fruits counted?")}
                </h3>
                <button onClick={() => setShowFruitInfo(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, color: '#475569', lineHeight: '1.7', fontSize: '0.97rem' }}>
                  {t("你的總果子數量由兩部分組成：", "Your total fruit count has two components:")}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#f0fdf4', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🌳</span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '0.2rem' }}>
                        {t("遊戲果子", "Game Fruits")} — <span style={{ color: '#d97706' }}>{localFruits} 🍎</span>
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {t("每次挑戰一節已「過關」的經文並創下個人最高分，這棵樹就會結出一顆果子。果子數量就是你在「我的園子」裡所有樹上果子的總和。", "Each time you beat your personal best on a verse you've already cleared, that tree bears a fruit. This total counts all fruits across every tree in your garden.")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#eff6ff', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🤝</span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.2rem' }}>
                        {t("推廣點數", "Referral Points")} — <span style={{ color: '#d97706' }}>{creatorPoints} 🍎</span>
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {t("當你分享的邀請連結帶來新玩家，或你創作了廣受歡迎的自訂題庫，系統會自動為你累積推廣點數。", "When your invite link brings in new players, or your custom verse sets are widely used, the system automatically adds referral points to your total.")}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: '#92400e', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    🍎 {t("遊戲果子", "Game")} {localFruits} + 🤝 {t("推廣點數", "Referral")} {creatorPoints}
                  </span>
                  <span style={{ color: '#b45309', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    = {totalFruits} 🍎
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Level Info Modal */}
        {showLevelInfo && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowLevelInfo(false)}>
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🏅 {t("互惠階級說明", "Level System")}
                </h3>
                <button onClick={() => setShowLevelInfo(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                <p style={{ color: '#475569', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  {t("在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ", "Bear fruits in your garden to level up! Reaching ")}
                  <strong style={{ color: '#8b5cf6' }}>Lv.3 {t("共識實踐者", "Level 3")}</strong>
                  {t(" 時，將自動解鎖「專屬題庫」的建立權限喔！", " automatically unlocks Custom Verse Sets!")}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {SKOOL_LEVELS.map(levelObj => {
                    const isCurrent = skoolLevel.level === levelObj.level;
                    const isUnlocked = skoolLevel.level >= levelObj.level;

                    return (
                      <div key={levelObj.level} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1rem 1.5rem', borderRadius: '12px',
                        background: isCurrent ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : (isUnlocked ? '#f8fafc' : '#ffffff'),
                        border: `2px solid ${isCurrent ? '#22c55e' : (isUnlocked ? '#e2e8f0' : '#f1f5f9')}`,
                        transition: 'transform 0.2s', transform: isCurrent ? 'scale(1.02)' : 'none',
                        boxShadow: isCurrent ? '0 4px 12px rgba(34, 197, 94, 0.15)' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isCurrent ? '#22c55e' : (isUnlocked ? '#64748b' : '#cbd5e1'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                            {levelObj.level}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', color: isCurrent ? '#15803d' : (isUnlocked ? '#334155' : '#94a3b8'), fontSize: '1.1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                              {t(levelObj.title, levelObj.enTitle)}

                              {levelCounts !== null && levelCounts._total > 0 && (
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '12px', fontWeight: 'bold', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                  👥 {levelCounts[levelObj.level] || 0} {t("人", "players")} ({levelCounts._total > 0 ? Math.round(((levelCounts[levelObj.level] || 0) / levelCounts._total) * 100) : 0}%)
                                </span>
                              )}

                              {isCurrent && <span style={{ fontSize: '0.9rem', color: '#059669', marginLeft: '8px' }}>👈 {t("目前階級", "You are here")}</span>}
                            </div>
                            {levelObj.level === 3 && (
                              <div style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 'bold', marginTop: '4px' }}>
                                🔓 {t("解鎖建立專屬題庫", "Unlocks Custom Sets")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: isUnlocked ? '#d97706' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.2rem' }}>🍎</span> {levelObj.points}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <button onClick={() => setShowLevelInfo(false)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                  {t("關閉", "Close")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Garden Viewer Modal */}
        {viewingPlayerGarden && (() => {
          const vgData = viewingPlayerGarden.gardenData || {};
          const vgEntries = Object.entries(vgData);
          const vgTreeCount = vgEntries.length;
          const vgGameFruits = vgEntries.reduce((sum, [, d]) => sum + (d.fruits || 0), 0);
          const vgCreatorFruits = viewingPlayerGarden.creatorPoints || 0;
          const vgReferralFruits = viewingPlayerGarden.referralPoints || 0;
          const vgTotalFruits = vgGameFruits + vgCreatorFruits + vgReferralFruits;
          const vgCellsPerField = 100;
          const vgMaxGridIndex = vgEntries.reduce((max, [, data]) => Math.max(max, data.gridIndex), -1);
          const vgFieldCount = Math.max(1, Math.ceil((vgMaxGridIndex + 1) / vgCellsPerField));
          const vgGridMap = {};
          vgEntries.forEach(([ref, data]) => { vgGridMap[data.gridIndex] = { ref, ...data }; });

          const applePositions = [
            { top: '30%', left: '50%' }, // 1
            { top: '45%', left: '30%' }, // 2
            { top: '45%', left: '70%' }, // 3
            { top: '25%', left: '35%' }, // 4
            { top: '25%', left: '65%' }, // 5
            { top: '55%', left: '50%' }, // 6
            { top: '35%', left: '20%' }, // 7
            { top: '35%', left: '80%' }, // 8
            { top: '15%', left: '50%' }, // 9
          ];

          const stageEmoji = (stage, fruits) => {
            if (stage <= 0) return '';
            if (stage <= 3) return <img src="/assets/garden/tree-seedling.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))' }} alt="seedling" />;
            if (stage <= 6) return <img src="/assets/garden/tree-sapling.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.2))' }} alt="sapling" />;
            if (stage <= 9) return <img src="/assets/garden/tree-mature.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.3))' }} alt="mature tree" />;

            if (fruits > 0) {
              const displayApples = Math.min(fruits, 9);
              return (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', width: '150%', height: '150%', transform: 'translateY(-15%)' }}>
                    <img src="/assets/garden/tree-mature.png" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.3))' }} alt="mature tree" />
                    {Array.from({ length: displayApples }).map((_, idx) => (
                      <div key={idx} style={{
                        position: 'absolute',
                        top: applePositions[idx].top,
                        left: applePositions[idx].left,
                        fontSize: '14px',
                        transform: 'translate(-50%, -50%)',
                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))',
                        zIndex: 2,
                        pointerEvents: 'none',
                      }}>
                        🍎
                      </div>
                    ))}
                  </div>
                  {fruits > 9 && (
                    <span style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '12px', fontWeight: 'bold', color: '#b91c1c', background: 'rgba(255,255,255,0.9)', borderRadius: '6px', padding: '1px 4px', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      +{fruits - 9}
                    </span>
                  )}
                </div>
              );
            }
            return <img src="/assets/garden/tree-mature.png" style={{ width: '150%', height: '150%', objectFit: 'contain', transform: 'translateY(-15%)', filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.3))' }} alt="mature tree" />;
          };
          const stageBg = (stage) => {
            if (stage <= 0) return '#e8f5e9';
            if (stage <= 3) return '#c8e6c9';
            if (stage <= 6) return '#a5d6a7';
            if (stage <= 9) return '#81c784';
            return '#66bb6a';
          };

          return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => { setViewingPlayerGarden(null); setGuestGardenCell(null); }}>
              <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '1.2rem 1.5rem', background: 'linear-gradient(135deg, #065f46, #047857)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      🌿 {viewingPlayerGarden.playerName} {t('的園地', "'s Garden")}
                    </h3>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        {vgTreeCount} {t('棵植物', 'plants')} · {t('點擊查看，雙擊挑戰！', 'Click to view, double-click to challenge!')}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span>🍎 {t('總果子', 'Total Fruits')}: <strong>{vgTotalFruits}</strong></span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          ( {t('經文', 'Verses')} {vgGameFruits} | {t('推薦', 'Referral')} {vgReferralFruits} | {t('經文組分享', 'Sets Shared')} {vgCreatorFruits} )
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setViewingPlayerGarden(null); setGuestGardenCell(null); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem' }}>
                  {viewingPlayerGarden.loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '1.1rem' }}>⏳ {t('載入中...', 'Loading...')}</div>
                  ) : viewingPlayerGarden.error ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#f43f5e', fontSize: '1rem' }}>😕 {viewingPlayerGarden.error}</div>
                  ) : vgTreeCount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '1rem' }}>🌾 {t('這個玩家的園地還是空的！', 'This player\'s garden is empty!')}</div>
                  ) : (
                    <>
                      {/* Challenge Settings */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.8rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>⚙️ {t('挑戰設定', 'Challenge Settings')}:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>{t('模式', 'Mode')}</label>
                          <select value={guestChallengeMode} onChange={e => setGuestChallengeMode(e.target.value)} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                            <option value="square">{t('九宮格', 'Square')}</option>
                            <option value="rain">{t('經文雨', 'Verse Rain')}</option>
                            <option value="voice">{t('語音模式', 'Voice Mode')}</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>{t('難度', 'Difficulty')}</label>
                          <select value={guestChallengeLevel} onChange={e => setGuestChallengeLevel(Number(e.target.value))} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                            <option value={0}>{t('無干擾', 'No Distraction')}</option>
                            <option value={1}>{t('單字干擾', 'Level 1')}</option>
                            <option value={2}>{t('標點干擾', 'Level 2')}</option>
                            <option value={3}>{t("難度 3", "Level 3")}</option>
                          </select>
                        </div>
                      </div>

                      {/* Garden Grid - Isometric */}
                      {(() => {
                        const hour = new Date().getHours();
                        let envBg = 'linear-gradient(to bottom, #bae6fd, #e0f2fe)'; // Day
                        if (hour >= 19 || hour < 5) envBg = 'linear-gradient(to bottom, #0f172a, #1e1b4b)'; // Night
                        else if (hour >= 17) envBg = 'linear-gradient(to bottom, #fca5a5, #fef08a)'; // Sunset
                        else if (hour >= 5 && hour < 8) envBg = 'linear-gradient(to bottom, #fce7f3, #fef08a)'; // Sunrise

                        return (
                          <div style={{
                            overflow: 'hidden',
                            width: '100%',
                            height: '50vh',
                            minHeight: '350px',
                            borderRadius: '12px',
                            border: '4px solid #334155',
                            background: envBg,
                            position: 'relative',
                            boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.1)'
                          }}>
                            <TransformWrapper initialScale={1} minScale={0.3} maxScale={4} centerOnInit={true} doubleClick={{ disabled: true }}>
                              {({ zoomIn, zoomOut, resetTransform }) => (
                                <>
                                  <div style={{ position: 'absolute', bottom: '15px', right: '15px', zIndex: 10, display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.8)', padding: '5px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                    <button onClick={() => zoomIn()} style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                    <button onClick={() => zoomOut()} style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                    <button onClick={() => resetTransform()} style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</button>
                                  </div>
                                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px', maxWidth: '100%' }}>
                                      {Array.from({ length: vgFieldCount }).map((_, fieldIdx) => (
                                        <div key={fieldIdx} style={{
                                          display: 'grid',
                                          gridTemplateColumns: `repeat(10, 48px)`,
                                          gridTemplateRows: `repeat(10, 48px)`,
                                          gap: '2px',
                                          background: (hour >= 19 || hour < 5) ? 'rgba(30, 41, 59, 0.4)' : 'rgba(34, 197, 94, 0.3)',
                                          border: '2px solid rgba(255,255,255,0.2)',
                                          borderRadius: '8px',
                                        }}>
                                          {Array.from({ length: vgCellsPerField }).map((_, i) => {
                                            const globalIndex = fieldIdx * vgCellsPerField + i;
                                            const cell = vgGridMap[globalIndex];
                                            const isEmpty = !cell;
                                            return (
                                              <div key={globalIndex}
                                                onClick={() => {
                                                  if (!cell) return;
                                                  if (guestGardenClickTimer.current) { clearTimeout(guestGardenClickTimer.current); guestGardenClickTimer.current = null; return; }
                                                  guestGardenClickTimer.current = setTimeout(async () => {
                                                    guestGardenClickTimer.current = null;
                                                    const allVerses = [...safeActiveSets, ...customVerseSets].flatMap(s => s.verses);
                                                    let targetVerse = findVerseByRef(allVerses, cell.ref);
                                                    if (!targetVerse) {
                                                      setIsLangsLoading(true);
                                                      const langKeys = ['kjv', 'cuv', 'ko', 'ja'];
                                                      for (const lang of langKeys) {
                                                        let data = loadedLangs[lang];
                                                        if (!data) {
                                                          data = await loadLanguageSets(lang);
                                                          setLoadedLangs(prev => ({ ...prev, [lang]: data }));
                                                        }
                                                        const found = findVerseByRef(data.verses, cell.ref);
                                                        if (found) { targetVerse = found; break; }
                                                      }
                                                      setIsLangsLoading(false);
                                                    }
                                                    setGuestGardenCell({ ref: cell.ref, text: targetVerse?.text || '', stage: cell.stage, fruits: cell.fruits || 0 });
                                                  }, 250);
                                                }}
                                                onDoubleClick={async () => {
                                                  if (!cell) return;
                                                  if (guestGardenClickTimer.current) { clearTimeout(guestGardenClickTimer.current); guestGardenClickTimer.current = null; }
                                                  const allVerses = [...safeActiveSets, ...customVerseSets].flatMap(s => s.verses);
                                                  let targetVerse = findVerseByRef(allVerses, cell.ref);
                                                  let detectedLang = version;
                                                  if (!targetVerse) {
                                                    setIsLangsLoading(true);
                                                    const langKeys = ['kjv', 'cuv', 'ko', 'ja'];
                                                    for (const lang of langKeys) {
                                                      let data = loadedLangs[lang];
                                                      if (!data) {
                                                        data = await loadLanguageSets(lang);
                                                        setLoadedLangs(prev => ({ ...prev, [lang]: data }));
                                                      }
                                                      const found = findVerseByRef(data.verses, cell.ref);
                                                      if (found) { targetVerse = found; detectedLang = lang; break; }
                                                    }
                                                    setIsLangsLoading(false);
                                                  }
                                                  if (targetVerse) {
                                                    setGuestGardenCell(null);
                                                    setViewingPlayerGarden(null);
                                                    if (detectedLang !== version) { versionBeforeChallenge.current = version; setVersion(detectedLang); }
                                                    setPlayMode(guestChallengeMode);
                                                    setDistractionLevel(guestChallengeLevel);
                                                    setActiveVerse(targetVerse);
                                                    setSelectedVerseRefs([targetVerse.reference]);
                                                    setTimeout(() => startGame(false, targetVerse), 50);
                                                  }
                                                }}
                                                style={{
                                                  width: '48px', height: '48px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                  fontSize: cell ? '20px' : '10px',
                                                  background: cell ? stageBg(cell.stage) : '#5d4037',
                                                  border: cell ? '1px solid rgba(0,0,0,0.1)' : 'none',
                                                  cursor: cell ? 'pointer' : 'default', transition: 'transform 0.1s, filter 0.2s', userSelect: 'none'
                                                }}
                                                onMouseOver={e => { if (cell) { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.08)'; } }}
                                                onMouseOut={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
                                              >
                                                {cell ? stageEmoji(cell.stage, cell.fruits || 0) : ''}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ))}
                                    </div>
                                  </TransformComponent>
                                </>
                              )}
                            </TransformWrapper>
                          </div>
                        );
                      })()}

                      {/* Verse preview on single click */}
                      {guestGardenCell && (
                        <div style={{ marginTop: '1rem', padding: '1rem 1.5rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #86efac', position: 'relative' }}>
                          <button onClick={() => setGuestGardenCell(null)} style={{ position: 'absolute', top: '8px', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                          <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '6px' }}>{guestGardenCell.ref}</div>
                          <div style={{ color: '#1e293b', lineHeight: '1.8', fontSize: '1rem' }}>{guestGardenCell.text || t('（在此裝置上未找到經文文字，但仍可雙擊挑戰）', '(Text not found on this device, but you can still double-click to challenge)')}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>💡 {t('雙擊格子開始挑戰！', 'Double-click the cell to start challenging!')}</div>
                        </div>
                      )}
                      <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>📱 {t('可用手指滑動來瀏覽園子', 'Swipe to browse the garden')}</div>
                      <div style={{ marginTop: '1.5rem' }}>
                        <ActivityHeatmap t={t} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {showSetLeaderboard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <button onClick={() => { setShowSetLeaderboard(false); setLeaderboardPage(0); setLeaderboardSetId(null); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#f59e0b" /> {t("經文組通關紀錄", "Verse Set Records")}</h2>
            
            {isLoadingLeaderboard ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('載入中...', 'Loading...')}</div>
            ) : leaderboardData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('目前還沒有通關紀錄', 'No records found yet')}</div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("排行", "Rank")}</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("玩家", "Player")}</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("總分", "Total Score")}</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("通過經文數", "Passed")}</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("模式", "Mode")}</th>
                      <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("日期", "Date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((record, index) => {
                      const formatModeName = (modeString) => {
                        if (!modeString || modeString.includes('未知')) return t('未知', 'Unknown');
                        let result = modeString;
                        result = result.replace(/square_solo/i, t('九宮格', 'Square'));
                        result = result.replace(/VerseRain/i, t('經文雨', 'VerseRain'));
                        result = result.replace(/rain/i, t('經文雨', 'VerseRain'));
                        result = result.replace(/VoiceMode/i, t('語音模式', 'Voice Mode'));
                        result = result.replace(/-dx(\d+)/i, (match, p1) => ` ${t('難度', 'Difficulty')} ${p1}`);
                        return result;
                      };
                      return (
                      <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#64748b' }}>#{leaderboardPage * 10 + index + 1}</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: '#334155' }}>{record.name}</td>
                        <td style={{ padding: '1rem', color: '#f59e0b', fontWeight: 'bold' }}>{record.score}</td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>{record.passedCount} / {record.totalCount}</td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>{formatModeName(record.mode)}</td>
                        <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>{record.date ? new Date(record.date).toLocaleDateString() : ''}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                  <button 
                    disabled={leaderboardPage === 0}
                    onClick={() => setLeaderboardPage(p => p - 1)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: leaderboardPage === 0 ? '#f1f5f9' : '#ffffff', color: leaderboardPage === 0 ? '#94a3b8' : '#334155', cursor: leaderboardPage === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    {t("上一頁", "Prev")}
                  </button>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{t("第", "Page")} {leaderboardPage + 1} {t("頁", " ")} / {t("共", "Total")} {Math.ceil(leaderboardTotal / 10)} {t("頁", "Pages")}</span>
                  <button 
                    disabled={(leaderboardPage + 1) * 10 >= leaderboardTotal}
                    onClick={() => setLeaderboardPage(p => p + 1)}
                    style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: (leaderboardPage + 1) * 10 >= leaderboardTotal ? '#f1f5f9' : '#ffffff', color: (leaderboardPage + 1) * 10 >= leaderboardTotal ? '#94a3b8' : '#334155', cursor: (leaderboardPage + 1) * 10 >= leaderboardTotal ? 'not-allowed' : 'pointer' }}
                  >
                    {t("下一頁", "Next")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      </div>{/* end RTL/font wrapper */}
    </>
  );
}