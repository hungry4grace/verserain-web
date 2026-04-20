import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Heart, Zap, Trophy, Crown, Star, Home, XCircle, Headphones, Music, VolumeX, Search, Share2, Dices, Mic, MicOff, Users, CloudRain } from 'lucide-react';
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

export const SKOOL_LEVELS = [
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

export function getSkoolLevel(points) {
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

export function getRoomColor(roomId) {
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

import { VERSE_SETS as VERSE_SETS_CUV } from './verses';
import { VERSE_SETS_KJV } from './verses_kjv';
import { VERSE_SETS_JA } from './verses_ja';
import { VERSE_SETS_KO } from './verses_ko';
import {
  VERSE_SETS_PROVERBS_ZH,
  VERSE_SETS_PROVERBS_KJV,
  VERSE_SETS_PROVERBS_KO,
  VERSE_SETS_PROVERBS_JA,
} from './verses_proverbs';
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

export default function App() {
  const VERSES_CUV = React.useMemo(() => VERSE_SETS_CUV.flatMap(s => s.verses), []);
  const VERSES_KJV = React.useMemo(() => VERSE_SETS_KJV.flatMap(s => s.verses), []);
  const VERSES_JA = React.useMemo(() => VERSE_SETS_JA.flatMap(s => s.verses), []);
  const VERSES_KO = React.useMemo(() => VERSE_SETS_KO.flatMap(s => s.verses), []);

  const [version, setVersion] = useState('cuv');
  const [playMode, setPlayMode] = useState('square_solo');
  const [distractionLevel, setDistractionLevel] = useState(0);
  const [selectedSetId, setSelectedSetId] = useState(null);

  const [isPremium, setIsPremium] = useState(() => {
    const storedPremium = localStorage.getItem('verserain_is_premium') === 'true';
    const storedEmail = localStorage.getItem('verserain_player_email') || "";
    return storedPremium || PREMIUM_EMAILS.includes(storedEmail.toLowerCase());
  });
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('verserain_player_email') || "");
  const isAdmin = ['samhsiung@gmail.com', 'davidhwang1125@gmail.com', 'hsiungsam@gmail.com', 'hungry4grace@gmail.com'].includes(userEmail.toLowerCase());
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('verserain_player_name') || "");
  const playerNameRef = useRef(playerName);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
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

  useEffect(() => {
    if (playerName) {
      fetch(`/api/get-creator-points?author=${encodeURIComponent(playerName)}`)
        .then(r => r.json())
        .then(d => { if (d.points) setCreatorPoints(d.points); })
        .catch(e => console.error(e));
    }
  }, [playerName]);

  const localFruits = React.useMemo(() => Object.values(gardenData || {}).reduce((sum, curr) => sum + (curr.fruits || 0), 0), [gardenData]);
  const totalFruits = localFruits + creatorPoints;
  const skoolLevel = React.useMemo(() => getSkoolLevel(totalFruits), [totalFruits]);
  const hasPremiumAccess = isPremium || skoolLevel.level >= 3;
  const [selectedGardenCell, setSelectedGardenCell] = useState(null); // { ref, text, stage, fruits, detectedLang }
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [levelCounts, setLevelCounts] = useState(null);

  useEffect(() => {
    if (showLevelInfo) {
      fetch('/api/get-creator-points?stats=true')
        .then(res => res.json())
        .then(data => {
          if (data.allScores) {
            const counts = {};
            // Tally up the server-side global players
            data.allScores.forEach(score => {
              const lvl = getSkoolLevel(score).level;
              counts[lvl] = (counts[lvl] || 0) + 1;
            });
            
            // Fix locally: Ensure the current user is at least represented in their own level
            // Since localFruits aren't always fully synced to the server instantly,
            // we guarantee the user sees themself in the count.
            const myLvl = skoolLevel.level;
            // Only add +1 if it seems we aren't already grouped in the server score (heuristically, to avoid over-counting, but ensuring at least 1)
            counts[myLvl] = Math.max(counts[myLvl] || 0, 1);
            
            setLevelCounts(counts);
          }
        })
        .catch(err => console.error("Could not fetch level stats", err));
    }
  }, [showLevelInfo, skoolLevel.level]);
  const gardenClickTimer = useRef(null);
  const versionBeforeChallenge = useRef(null); // saved version to restore after cross-lang challenge
  const updateGarden = React.useCallback((ref, type, setId, amount = 1) => {
    setGardenData(prev => {
      const updated = { ...prev };
      if (!updated[ref]) {
        // Assign next available grid slot
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

  const baseVerseSets = version === 'cuv'
    ? [...VERSE_SETS_CUV, ...VERSE_SETS_PROVERBS_ZH]
    : version === 'kjv'
      ? [...VERSE_SETS_KJV, ...VERSE_SETS_PROVERBS_KJV]
      : version === 'ja'
        ? [...VERSE_SETS_JA, ...VERSE_SETS_PROVERBS_JA]
        : version === 'ko'
          ? [...VERSE_SETS_KO, ...VERSE_SETS_PROVERBS_KO]
          : [];

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

  const safeActiveSets = activeVerseSets.length > 0 ? activeVerseSets : [{
    id: "dummy",
    title: version === 'ja' ? '経文セットが見つかりません' : (version === 'ko' ? '성경 구절 세트를 찾을 수 없습니다' : (version === 'kjv' ? 'No Verse Sets Found' : '尚未發現經文組')),
    authorName: "System",
    verses: [{ reference: "N/A", text: version === 'ja' ? '現在この言語には経文セットがありません。👑 マイ問題集から作成してください。' : (version === 'ko' ? '현재 이 언어에 대한 구절 세트가 없습니다. 👑 내 문제집에서 만드십시오.' : (version === 'kjv' ? 'There are no verse sets for this language yet. Create one in 👑 Custom Sets.' : '目前此語言沒有經文組。請去 👑 我的題庫 中建立！')) }]
  }];

  const currentSet = selectedSetId ? (safeActiveSets.find(s => s.id === selectedSetId) || customVerseSets.find(s => s.id === selectedSetId)) : null;
  const VERSES_DB = currentSet ? currentSet.verses : safeActiveSets[0].verses;

  const [activeVerse, setActiveVerse] = useState(VERSES_DB[0] || { reference: "N/A", text: "" });
  const [selectedVerseRefs, setSelectedVerseRefs] = useState([VERSES_DB[0]?.reference || "N/A"]);

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

  const handleVersionChange = (newVer) => {
    setVersion(newVer);
    let targetVerses = [];
    if (newVer === 'cuv') targetVerses = VERSES_CUV;
    else if (newVer === 'kjv') targetVerses = VERSES_KJV;

    if (targetVerses.length === 0) {
      targetVerses = [{ reference: "N/A", text: newVer === 'ja' ? '経文が見つかりません。' : (newVer === 'ko' ? '성경 구절을 찾을 수 없습니다.' : (newVer === 'kjv' ? 'No verses found.' : '目前的分類下沒有經文。')) }];
    }
    setActiveVerse(targetVerses[0]);
    setSelectedVerseRefs([targetVerses[0].reference]);
    setCampaignQueue(null);
  };

  useEffect(() => {
    const parseUrlArgs = async () => {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
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
        if (cleanM === 'verse square') {
          setPlayMode('square');
        } else if (cleanM === 'auto-played' || cleanM === 'auto-play') {
          shouldAutoPlay = true;
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
          let foundCuv = VERSES_CUV.find(v => v.reference.toLowerCase().includes(r.toLowerCase()));
          if (foundCuv) {
            loadedVerses.push(foundCuv);
            if (!overrideVersion) overrideVersion = 'cuv';
            continue;
          }
          let foundKjv = VERSES_KJV.find(v => v.reference.toLowerCase().includes(r.toLowerCase()));
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


  const activePhrases = React.useMemo(() => {
    const isEnglish = /^[a-zA-Z\s.,:;'"''\u2018\u2019\u201c\u201d?!()\-]+$/.test(activeVerse.text.substring(0, 50));
    // Remove \s from the non-English regex so Chinese doesn't fragment on spaces
    const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[,，。；：「」、;:\.\?!！？『』《》\s]/;
    return activeVerse.text.split(regex).map(p => p.trim()).filter(Boolean);
  }, [activeVerse]);

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
  const campaignQueueRef = useRef(null);
  useEffect(() => { campaignQueueRef.current = campaignQueue; }, [campaignQueue]);
  const localCampaignListRef = useRef([]); // full ordered verse list for square_solo mp
  const localVerseIndexRef = useRef(0);    // which verse this player is currently on
  const multiplayerSoloActiveRef = useRef(false); // true once any *_solo game is initialized; prevents re-init on every broadcast
  const [localNextVerse, setLocalNextVerse] = useState(null); // verse shown during intermission countdown
  const [campaignResults, setCampaignResults] = useState([]);
  const [isBlindMode, setIsBlindMode] = useState(() => localStorage.getItem('verseRain_blindMode') === 'true');

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
  const [globalLeaderboardPage, setGlobalLeaderboardPage] = useState(1);

  const fetchGlobalLeaderboard = () => {
    setIsFetchingGlobalLeaderboard(true);
    Promise.all([
      fetch('/api/get-all-scores').then(res => res.ok ? res.json() : {}).catch(() => ({})),
      fetch('/api/get-top-verses').then(res => res.ok ? res.json() : {}).catch(() => ({}))
    ])
      .then(([scoresData, versesData]) => {
        setGlobalLeaderboardData(scoresData && Array.isArray(scoresData.alltime) ? scoresData : { alltime: Array.isArray(scoresData) ? scoresData : [], monthly: [], daily: [] });
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
        setTimeLeft(6000);
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
        const isEnglish = /^[a-zA-Z\s.,:;'"''‘’“”?!()\-]+$/.test(nextVerse.text.substring(0, 50));
        const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[,，。；：「」、;:\.\?!！？『』《》\s]/;
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
            setTimeLeft(6000);
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
    const roomParam = params.get('room');

    if (roomParam) {
      setMainTab('multiplayer');
      setMultiplayerRoomId(roomParam.toUpperCase().trim());
      // Small timeout to allow state applied before url replace
      setTimeout(() => window.history.replaceState({}, document.title, window.location.pathname), 100);
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
            const queue = [...foundSet.verses];
            setCampaignQueue(queue.slice(1));
            setCampaignResults([]);
            setActiveVerse(queue[0]);
            setTimeout(() => startGame(false, queue), 50);
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
        text: isFake ? getRandomFakePhrase(version) : phrases[seqToSpawn],
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
        } else if (initAutoStart.playMode === 'rain_solo') {
          if (socketRef.current) {
            const verse = initAutoStart.verse || activeVerse;
            const isEnglish = /^[a-zA-Z\s.,:;'"''‘’“”?!()\-]+$/.test(verse.text.substring(0, 50));
            const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[,，。；：「」、;:\.\?!！？『』《》\s]/;
            const phrases = verse.text.split(regex).map(p => p.trim()).filter(Boolean);

            socketRef.current.send(JSON.stringify({
              type: 'INIT_GAME',
              blocks: [],
              verseRef: verse.reference,
              verseText: verse.text,
              playMode: 'rain_solo',
              distractionLevel: multiplayerDistractionLevel,
              phrases: phrases,
              campaignQueue: initAutoStart.campaignQueue
            }));
          }
        }
      } else {
        startGame(initAutoStart.isAuto);
      }
      setInitAutoStart(null);
    }
  }, [initAutoStart]);

  const initSquareBlocks = (isMultiplayerReadyCheck = false, campaignQueue = null, overrideVerse = null) => {
    const verse = overrideVerse || activeVerse;
    let phrases;
    if (overrideVerse) {
      const isEnglish = /^[a-zA-Z\s.,:;'"''‘’“”?!()\-]+$/.test(verse.text.substring(0, 50));
      const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[,，。；：「」、;:\.\?!！？『』《》\s]/;
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
          text: getRandomFakePhrase(version),
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

  const startGame = (isAuto = false) => {
    initAudio();
    setGameState('playing');
    setIsAutoPlay(isAuto);
    setScore(0);
    setCombo(0);
    setHealth(3);
    setTimeLeft(6000);
    setCurrentSeqIndex(0);
    currentSeqRef.current = 0;
    setBlocks([]);
    setIsFlawless(false);
    setIsNewHighScore(false);
    setIsFailed(false);
    setTimeBonus(0);

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
        initSquareBlocks();
      } else {
        setTimeout(spawnNextBlock, 100);
        setTimeout(spawnNextBlock, 900);
        setTimeout(spawnNextBlock, 1700);
        setTimeout(spawnNextBlock, 2500);
        setTimeout(spawnNextBlock, 3300);
      }
    }

    if (activeVerse && !isAuto) {
      logEvent('versePlayed', { ref: activeVerse.reference, setId: selectedSetId });
    }
  };

  useEffect(() => {
    let cancelAutoPlay = false;

    const runAutoPlayLoop = async () => {
      if (!isAutoPlay || gameState !== 'playing') return;

      const TTS_LANG = version === 'kjv' ? 'en-US' : 'zh-TW';

      const formatRef = (ref) => {
        const match = ref.match(/(.+?)\s*(\d+)\s*:\s*([\d,\s\-–]+)/);
        if (!match) return ref;
        const book = match[1].trim();
        const chapter = match[2];
        const versesStr = match[3].replace(/-/g, version === 'kjv' ? ' to ' : '到 ').replace(/–/g, version === 'kjv' ? ' to ' : '到 ').trim();
        if (version === 'kjv') {
          const isPlural = versesStr.includes('to') || versesStr.includes(',');
          return `${book} chapter ${chapter}, verse${isPlural ? 's' : ''} ${versesStr}`;
        } else {
          return `${book} ${chapter}章 ${versesStr}節`;
        }
      };

      // Start from current position (supports mid-game activation)
      const startFrom = currentSeqRef.current;

      // Only announce title when starting from the beginning
      if (startFrom === 0 && !cancelAutoPlay && gameStateRef.current === 'playing') {
        setSpeakingTitle(true);
        speechRef.current = speakText(formatRef(activeVerse.reference), 1.0, TTS_LANG);
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
            startGame(true);
          } else {
            setGameState('menu');
          }
        }
      }, 2000);
      return;
    }

    setGameState('gameover');
    setBlocks([]); // clear arena

    const failed = !isSuccess;

    const f = isSuccess && healthRef.current === 3;

    let finalCalculatedScore = scoreRef.current;

    if (isSuccess) {
      setPureBaseScore(finalCalculatedScore);
      const calculatedTimeBonus = Math.floor(Math.max(0, timeLeft) * 0.5);
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
          
          if (selectedSetId) {
            const foundSet = [...customVerseSets, ...publishedVerseSets, ...baseVerseSets].find(s => s.id === selectedSetId);
            if (foundSet && foundSet.authorName && foundSet.authorName !== "Anonymous" && foundSet.authorName !== "Verserain 官方") {
                authorToReward = foundSet.authorName; // If playing someone else's custom set, reward the creator
            }
          }

          fetch("/api/submit-creator-point", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author: authorToReward, amount: vCount })
          }).catch(e => e);

          // Phase 1 Gamification: Reward Inviter & Invitee
          const inviter = localStorage.getItem('verserain_inviter');
          const claimed = localStorage.getItem('verserain_invite_claimed');
          if (inviter && inviter !== playerName && !claimed) {
            // Reward the inviter (+5 points)
            fetch("/api/submit-creator-point", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ author: inviter, amount: 5 })
            }).catch(e => e);
            
            // Reward the new player (+3 points bonus)
            fetch("/api/submit-creator-point", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ author: playerName, amount: 3 })
            }).catch(e => e);
            
            localStorage.setItem('verserain_invite_claimed', 'true');
            setToast(`🎉 成功透過 ${inviter} 的邀請首關！雙方各獲推廣果實獎勵！`);
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
        return [...prev, { verse: activeVerse, score: isSuccess ? finalCalculatedScore : 0, flawless: f }];
      }
      return prev;
    });
  };

  useEffect(() => {
    if (currentSeqIndex >= activePhrases.length && activePhrases.length > 0 && gameState === 'playing') {
      if (multiplayerRoomId) {
        if (multiplayerState?.playMode?.endsWith('_solo')) {
          // Report this verse's score to server (server accumulates campaign results)
          if (socketRef.current) {
            socketRef.current.send(JSON.stringify({
              type: 'PLAYER_FINISHED_VERSE',
              verseRef: activeVerse.reference,
              score: scoreRef.current,
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
        endGame();
      }
    }
  }, [currentSeqIndex, gameState, activePhrases.length, multiplayerRoomId, multiplayerState?.playMode]);

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

    // Flush speech recognition buffer on ANY block click (manual or voice) to prepare for next block
    setLiveTranscript("");
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }

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
      const TTS_LANG = version === 'kjv' ? 'en-US' : 'zh-TW';

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
                  text: getRandomFakePhrase(version),
                  seqIndex: -1,
                  isSquare: true, error: false, correct: false, hidden: false, isFake: true
                };
                const hiddenIdx = updated.findIndex(b => b.hidden);
                if (hiddenIdx !== -1) {
                  updated[hiddenIdx] = newFake;
                }
              }

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
    '檢視你已經學會並種下生命樹的經文。': 'あなたが学び、生命の樹として植えた経文をご覧ください。'
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
    '在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！當達到 ': '동산에서 묘목을 계속 돌보고 열매를 맺으면 호혜 계급이 올라갑니다! 다음 레벨에 달성하면: ',
    ' 時，將自動解鎖「專屬題庫」的建立權限喔！': ' 에 도달하면, 「개인 문제집」 작성 권한이 자동으로 해제됩니다!',
    '解鎖建立專屬題庫': '개인 문제집 생성 해제',
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
    '檢視你已經學會並種下生命樹的經文。': '당신이 배우고 생명나무로 심은 구절을 확인하세요.'
  };

  const t = (zh, en) => {
    if (version === 'kjv') return en || zh;
    if (version === 'ja') return jaDict[zh] || zh;
    if (version === 'ko') return koDict[zh] || zh;
    return zh;
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
      <div className="bg-layer" />
      <div className="rain-system">
        <div className="rain-layer back" />
        <div className="rain-layer mid" />
        <div className="rain-layer front" />
      </div>

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
                  v2.5.0
                </div>
              </div>
              <select
                value={version}
                onChange={(e) => handleVersionChange(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                <option value="cuv">中文</option>
                <option value="kjv">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
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
                  <button onClick={() => { setPlayerName(''); setIsPremium(false); setUserEmail(''); localStorage.removeItem('verserain_player_name'); localStorage.removeItem('verserain_is_premium'); localStorage.removeItem('verserain_player_email'); }} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>{t("登出", "Logout")}</button>
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
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #ffffff, #f8fafc)', padding: '2rem', borderRadius: '20px', width: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <h1 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <CloudRain size={40} color="#3b82f6" /> {t("歡迎來到 VerseRain", "Welcome to VerseRain")}
                  </h1>
                  <p style={{ fontSize: '1.2rem', color: '#64748b' }}>{t("澆灌心田，結出生命果子", "Water your heart, bear fruits of life")}</p>
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
                    { id: 'custom_verses', icon: '👑', label: t('我的專屬題庫', 'My Custom Sets'), desc: t('建立自訂經文組', 'Create custom sets') },
                    { id: 'manual', icon: '📖', label: t('使用說明', 'Manual'), desc: t('操作詳解', 'Detailed instructions') },
                    { id: 'about', icon: 'ℹ️', label: t('關於我們', 'About'), desc: t('VerseRain 開發資訊', 'Info & Credits') },
                    { id: 'donate', link: 'https://www.skool.com/mutualizedeconomy/classroom', icon: '🔓', label: t('解鎖進階功能', 'Unlock Premium'), desc: t('加入進階群組', 'Join Premium Community') },
                    { id: 'feedback', link: 'mailto:hungry4grace@gmail.com', icon: '✉️', label: t('意見回饋', 'Feedback'), desc: t('聯絡與建議', 'Bugs & Suggestions') }
                  ].map(item => (
                    <div key={item.id} className="block-tile" onClick={() => {
                      if (item.id === 'blindMode') {
                          const n = !isBlindMode;
                          setIsBlindMode(n);
                          localStorage.setItem('verseRain_blindMode', String(n));
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
                              const db = version === 'cuv' ? VERSES_CUV : (version === 'kjv' ? VERSES_KJV : (version === 'ja' ? VERSES_JA : VERSES_KO));
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
                                  const sBk = searchRef.replace(sNum[0], '');
                                  const dBk = dbRef.replace(dNum[0], '');
                                  let mi = 0;
                                  for (let i = 0; i < dBk.length && mi < sBk.length; i++) { if (dBk[i] === sBk[mi]) mi++; }
                                  if (mi === sBk.length && mi > 0) { foundText = verse.text; break; }
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

                                <input type="text" value={v.verseInput || ''} onChange={e => {
                                  const newVerses = [...editingCustomSet.verses];
                                  newVerses[idx] = { ...newVerses[idx], verseInput: e.target.value };
                                  setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                }} onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const bookInfo = BIBLE_BOOKS.find(b => b.id === v.book);
                                    if (!bookInfo) return alert(t("請先選擇書卷", "Please select a book first"));
                                    await autoFetchVerse(bookInfo, v.verseInput || '', idx);
                                  }
                                }} placeholder={t("章:節 (如 3:16)", "Ch:Vs (e.g. 3:16)")}
                                  style={{ width: '110px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />

                                <textarea value={v.text} onChange={e => {
                                  const newVerses = [...editingCustomSet.verses];
                                  newVerses[idx].text = e.target.value;
                                  setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                }} placeholder={t("經文內容 (按 Enter 自動擷取)", "Verse text (press Enter to auto-fetch)")} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', minHeight: '40px', resize: 'vertical', fontSize: '0.9rem' }} />

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
                                  <button type="button" onClick={() => setEditingCustomSet(set)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>{t("編輯", "Edit")}</button>
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
                                <div style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 'bold' }}>{set.verses.length} {t("節經文", "verses")}</div>
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
                          <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?room=${multiplayerRoomId}`} size={100} />
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

                    {!pickerSelectedSet ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.8rem', maxHeight: '400px', overflowY: 'auto' }}>
                        {activeVerseSets.map(set => (
                          <button
                            key={set.id}
                            onClick={() => setPickerSelectedSet(set)}
                            style={{ padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#334155', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s' }}
                          >
                            {customVerseSets.some(c => c.id === set.id) ? '👑 ' : ''}{set.title}
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 'normal' }}>{set.verses?.length || 0} {t("節", "verses")}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <button onClick={() => { setPickerSelectedSet(null); setMultiplayerSelectedVerses([]); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textAlign: 'left', padding: '0.5rem 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>←</span> {t("返回經文組", "Back to Groups")}
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{t("隨機挑選", "Random Pick")} (共 {pickerSelectedSet.verses?.length || 0})</span>
                              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                                <button
                                  onClick={() => setRandomPickCount(Math.max(1, (parseInt(randomPickCount) || 1) - 1))}
                                  style={{ width: '28px', height: '28px', border: 'none', background: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '1.2rem', transform: 'none' }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={pickerSelectedSet.verses?.length || 1}
                                  value={randomPickCount || 1}
                                  onChange={(e) => setRandomPickCount(e.target.value === '' ? '' : Math.min(pickerSelectedSet.verses?.length || 1, Math.max(1, parseInt(e.target.value))))}
                                  style={{ width: '40px', height: '28px', padding: '0', border: 'none', background: 'white', outline: 'none', textAlign: 'center', fontSize: '1rem', color: '#334155', fontWeight: 'bold', margin: '0' }}
                                />
                                <button
                                  onClick={() => setRandomPickCount(Math.min(pickerSelectedSet.verses?.length || 1, (parseInt(randomPickCount) || 1) + 1))}
                                  style={{ width: '28px', height: '28px', border: 'none', background: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '1.2rem', transform: 'none' }}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  if (!pickerSelectedSet || !pickerSelectedSet.verses) return;
                                  const shuffled = [...pickerSelectedSet.verses].sort(() => 0.5 - Math.random());
                                  const selected = shuffled.slice(0, randomPickCount);
                                  setActiveVerse(selected[0]);
                                  setPlayMode(multiplayerPlayMode);
                                  setDistractionLevel(multiplayerDistractionLevel);
                                  setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: selected, verse: selected[0], playMode: multiplayerPlayMode });
                                  setShowMultiplayerVersePicker(false);
                                }}
                                style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}
                              >
                                <Dices size={14} /> {t("開始", "Start")}
                              </button>
                            </div>

                            {multiplayerSelectedVerses.length > 0 && (
                              <button
                                onClick={() => {
                                  setActiveVerse(multiplayerSelectedVerses[0]);
                                  setPlayMode(multiplayerPlayMode);
                                  setDistractionLevel(multiplayerDistractionLevel);
                                  setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: multiplayerSelectedVerses, verse: multiplayerSelectedVerses[0], playMode: multiplayerPlayMode });
                                  setShowMultiplayerVersePicker(false);
                                }}
                                style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                              >
                                {t("完成揀選", "Finish")} ({multiplayerSelectedVerses.length})
                              </button>
                            )}
                          </div>
                        </div>
                        {pickerSelectedSet.verses?.map(v => {
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
                              style={{ padding: '1rem', border: `2px solid ${isSelected ? '#10b981' : '#cbd5e1'}`, borderRadius: '6px', background: isSelected ? '#ecfdf5' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.3rem', transition: 'all 0.2s', position: 'relative' }}
                              onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '1.1rem' }}>{v.reference}</span>
                                {isSelected && <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>}
                              </div>
                              <span style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.2rem' }}>{v.title}</span>
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.text}</span>
                            </div>
                          )
                        })}
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
                              <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?room=${multiplayerRoomId}`} size={120} />
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

                    {multiplayerState && multiplayerState.players && (
                      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'left' }}>
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

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => {
                          if (socketRef.current) socketRef.current.close();
                          setMultiplayerRoomId(null);
                          setMultiplayerState(null);
                        }}
                        style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.8rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {t("離開房間", "Leave Room")}
                      </button>

                      {multiplayerState?.host === myClientId && (
                        <button
                          onClick={() => {
                            setShowMultiplayerVersePicker(true);
                            setPickerSelectedSet(null);
                          }}
                          disabled={!multiplayerState || Object.keys(multiplayerState.players).length < 2}
                          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: Object.keys(multiplayerState?.players || {}).length < 2 ? 'not-allowed' : 'pointer', opacity: Object.keys(multiplayerState?.players || {}).length < 2 ? 0.5 : 1 }}
                        >
                          {t("選擇比賽經文", "Select Verse")}
                        </button>
                      )}
                    </div>
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
                              sortedSets.sort((a,b) => (viewCounts[b.id]||0) - (viewCounts[a.id]||0));
                           } else {
                              sortedSets.sort((a,b) => {
                                 // sort by id desc (assuming id has timestamp or similar, or just place newest custom sets first)
                                 return String(b.id).localeCompare(String(a.id));
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
                                    setEditingCustomSet({ ...set, isPublished: true });
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
                            <td style={{ padding: '1rem', color: '#337ab7', fontSize: '0.9rem', fontWeight: 'bold' }}>{set.authorName && set.authorName !== "Anonymous" ? set.authorName : (String(set.id).startsWith("custom-") ? "匿名玩家" : "Verserain 官方")}</td>
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
                              <option value="square">九宮格</option>
                              <option value="rain">經文雨</option>
                            </select>
                            <select
                              onChange={(e) => setDistractionLevel(Number(e.target.value))}
                              value={distractionLevel}
                              style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              <option value={0}>難度 0</option>
                              <option value={1}>難度 1</option>
                              <option value={2}>難度 2</option>
                              <option value={3}>難度 3</option>
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              const link = `${window.location.origin}${window.location.pathname}?set=${encodeURIComponent(currentSet.id)}`;
                              setQrShareModal({ url: link, reference: currentSet.title });
                            }}
                            title={t("分享整組經文連結", "Share the set link")}
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
                                setActiveVerse(queue[0]);
                                setTimeout(() => startGame(false, queue), 50);
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
                              const queue = [...VERSES_DB];
                              setCampaignQueue(queue.slice(1));
                              setCampaignResults([]);
                              setActiveVerse(queue[0]);
                              setTimeout(() => startGame(true, queue), 50);
                            }}
                            title={t("自動播放全部經文圖卡與語音", "Auto-play all verses with audio")}
                            style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', padding: '0 0.8rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <Headphones size={16} fill="white" /> {t("播放全部", "Play All")}
                          </button>

                          <button
                            onClick={() => {
                              initAudio();
                              const queue = [...VERSES_DB];
                              setCampaignQueue(queue.slice(1));
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
                            <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'right', minWidth: '120px' }}>{t("設定", "Settings")}</th>
                            <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', width: '80px', textAlign: 'center' }}>{t("操作", "Action")}</th>
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
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                    <select
                                      onChange={(e) => setPlayMode(e.target.value)}
                                      value={playMode}
                                      style={{ padding: '0.1rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#334155', backgroundColor: '#fff', width: '80px' }}
                                    >
                                      <option value="square">九宮格</option>
                                      <option value="rain">經文雨</option>
                                    </select>
                                    <select
                                      onChange={(e) => setDistractionLevel(Number(e.target.value))}
                                      value={distractionLevel}
                                      style={{ padding: '0.1rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#334155', backgroundColor: '#fff', width: '80px' }}
                                    >
                                      <option value={0}>難度 0</option>
                                      <option value={1}>難度 1</option>
                                      <option value={2}>難度 2</option>
                                      <option value={3}>難度 3</option>
                                    </select>
                                  </div>
                                </td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        initAudio();
                                        setCampaignQueue(null);
                                        setCampaignResults([]);
                                        setActiveVerse(v);
                                        setTimeout(() => startGame(false), 50);
                                      }}
                                      style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', margin: '0 auto' }}
                                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                      <Zap size={16} fill="white" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const link = `${window.location.origin}${window.location.pathname}?challenge=${encodeURIComponent(v.reference)}`;
                                        setQrShareModal({ url: link, reference: v.reference });
                                      }}
                                      title={t("分享挑戰連結", "Share challenge link")}
                                      style={{ backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s', margin: '0 auto' }}
                                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                      <Share2 size={16} />
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
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold' }}>{t("總果子數量", "Total Fruits")}</span>
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

                  {skoolLevel.level >= 3 && !isPremium && (
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', borderRadius: '12px', border: '1px solid #c4b5fd', animation: 'flashSuccess 2s infinite' }}>
                       <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                       <h4 style={{ margin: 0, color: '#5b21b6', fontSize: '1.3rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          {t("恭喜！你已解鎖專屬題庫功能！", "Congratulations! Custom Sets Unlocked!")}
                       </h4>
                       <p style={{ margin: 0, color: '#4c1d95', fontSize: '1rem', lineHeight: '1.5' }}>
                          {t("身為 Lv.3 以上的實踐者，你現在可以前往「進階功能 ➔ 我的專屬題庫」自由創建與分享你專屬的經文組了！", "As a Level 3+ player, you can now freely create custom verse sets from the Advanced settings menu!")}
                       </p>
                    </div>
                  )}

                  {skoolLevel.level >= 2 && (
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                       <h4 style={{ margin: 0, color: '#10b981', fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.5rem' }}>📨</span> {t("邀請朋友一起玩", "Invite Friends to Play")}
                       </h4>
                       <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: '1.5', marginBottom: '1.2rem' }}>
                          {t("你的專屬推廣連結：當朋友們透過此連結直接進入加入 VerseRain，並完成他們的第一次背經遊戲，雙方都會自動獲得 🍎 果實獎勵，同時你也將獲得推廣大使進度！", "Your personal invite link: When friends load VerseRain via this link and complete their first game, both of you earn bonus fruits!")}
                       </p>
                       <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                          <input 
                            readOnly 
                            value={`${window.location.origin}?ref=${encodeURIComponent(playerName)}`} 
                            style={{ flex: 1, minWidth: '220px', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155', fontSize: '0.95rem' }}
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}?ref=${encodeURIComponent(playerName)}`);
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
                               onClick={() => setQrShareModal({ url: `${window.location.origin}?ref=${encodeURIComponent(playerName)}`, reference: 'VerseRain 遊戲邀請' })}
                               style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', minHeight: '44px' }}
                            >
                               QR Code
                            </button>
                          )}
                       </div>
                    </div>
                  )}
                </div>

                {(() => {
                  const entries = Object.entries(gardenData);
                  const treeCount = entries.length;
                  const gridSize = Math.max(10, Math.ceil(Math.sqrt(Math.max(treeCount, 1) * 1.5 / 100) * 10) * 10 > 100 ? Math.ceil(Math.sqrt(treeCount * 1.5)) : 10);
                  const totalCells = gridSize * gridSize;

                  // Build grid lookup: gridIndex -> { ref, stage, fruits }
                  const gridMap = {};
                  entries.forEach(([ref, data]) => {
                    if (data.gridIndex < totalCells) {
                      gridMap[data.gridIndex] = { ref, ...data };
                    }
                  });

                  // Stage visuals
                  const stageEmoji = (stage, fruits) => {
                    if (stage <= 0) return '';
                    if (stage === 1) return '🌱';
                    if (stage === 2) return '☘️';
                    if (stage === 3) return '🌿';
                    if (stage === 4) return '🪴';
                    if (stage <= 6) return '🌲';
                    if (stage <= 8) return '🌳';
                    if (stage === 9) return '🌳';
                    // stage 10 = completed
                    if (fruits > 0) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.1' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#b91c1c' }}>🍎{fruits > 1 ? `x${fruits}` : ''}</span>
                          <span style={{ fontSize: '20px' }}>🌳</span>
                        </div>
                      );
                    }
                    return '🌳✨';
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
                            <option value="square">九宮格</option>
                            <option value="rain">經文雨</option>
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
                            <option value={3}>難度 3</option>
                          </select>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t("點擊查看經文，雙擊開始挑戰！", "Click to view, double-click to challenge!")}</span>
                      </div>

                      {/* The Grid - scrollable/pannable container for mobile */}
                      <div style={{
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-x pan-y',
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        borderRadius: '8px',
                        border: '3px solid #4e342e',
                        background: '#5d4037',
                        position: 'relative',
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${gridSize}, 48px)`,
                          gap: '2px',
                          padding: '4px',
                          width: 'fit-content',
                          minWidth: `${gridSize * 50}px`,
                        }}>
                          {Array.from({ length: totalCells }).map((_, i) => {
                            const cell = gridMap[i];
                            const isEmpty = !cell;

                            return (
                              <div
                                key={i}
                                onClick={() => {
                                  if (cell) {
                                    if (gardenClickTimer.current) { clearTimeout(gardenClickTimer.current); gardenClickTimer.current = null; return; }
                                    gardenClickTimer.current = setTimeout(() => {
                                      gardenClickTimer.current = null;
                                      const allCurrentVerses = [...safeActiveSets, ...customVerseSets].flatMap(s => s.verses);
                                      let targetVerse = findVerseByRef(allCurrentVerses, cell.ref);
                                      let detectedLang = version;
                                      if (!targetVerse) {
                                        const langPools = [
                                          { lang: 'kjv', verses: [...VERSE_SETS_KJV, ...VERSE_SETS_PROVERBS_KJV].flatMap(s => s.verses) },
                                          { lang: 'cuv', verses: [...VERSE_SETS_CUV, ...VERSE_SETS_PROVERBS_ZH].flatMap(s => s.verses) },
                                          { lang: 'ko', verses: [...VERSE_SETS_KO, ...VERSE_SETS_PROVERBS_KO].flatMap(s => s.verses) },
                                          { lang: 'ja', verses: [...VERSE_SETS_JA, ...VERSE_SETS_PROVERBS_JA].flatMap(s => s.verses) },
                                        ];
                                        for (const pool of langPools) {
                                          if (pool.lang === version) continue;
                                          const found = findVerseByRef(pool.verses, cell.ref);
                                          if (found) { targetVerse = found; detectedLang = pool.lang; break; }
                                        }
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
                                onDoubleClick={() => {
                                  if (cell) {
                                    if (gardenClickTimer.current) { clearTimeout(gardenClickTimer.current); gardenClickTimer.current = null; }
                                    const allCurrentVerses = [...safeActiveSets, ...customVerseSets].flatMap(s => s.verses);
                                    let targetVerse = findVerseByRef(allCurrentVerses, cell.ref);
                                    let detectedLang = version;
                                    if (!targetVerse) {
                                      const langPools = [
                                        { lang: 'kjv', verses: [...VERSE_SETS_KJV, ...VERSE_SETS_PROVERBS_KJV].flatMap(s => s.verses) },
                                        { lang: 'cuv', verses: [...VERSE_SETS_CUV, ...VERSE_SETS_PROVERBS_ZH].flatMap(s => s.verses) },
                                        { lang: 'ko', verses: [...VERSE_SETS_KO, ...VERSE_SETS_PROVERBS_KO].flatMap(s => s.verses) },
                                        { lang: 'ja', verses: [...VERSE_SETS_JA, ...VERSE_SETS_PROVERBS_JA].flatMap(s => s.verses) },
                                      ];
                                      for (const pool of langPools) {
                                        if (pool.lang === version) continue;
                                        const found = findVerseByRef(pool.verses, cell.ref);
                                        if (found) { targetVerse = found; detectedLang = pool.lang; break; }
                                      }
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
                                      setTimeout(() => startGame(), 50);
                                    }
                                  }
                                }}
                                title={cell ? `${cell.ref} — ${stageLabel(cell.stage)}${cell.fruits ? ` 🍎×${cell.fruits}` : ''}` : t('空地', 'Empty')}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isEmpty ? '#a5d6a7' : stageBg(cell.stage),
                                  borderRadius: '3px',
                                  cursor: cell ? 'pointer' : 'default',
                                  fontSize: '20px',
                                  transition: 'all 0.2s',
                                  position: 'relative',
                                  border: cell && cell.stage >= 10 ? '1px solid #2e7d32' : '1px solid rgba(0,0,0,0.05)',
                                  boxShadow: cell && cell.stage >= 10 ? 'inset 0 0 4px rgba(46,125,50,0.3)' : 'none',
                                }}
                                onMouseEnter={e => { if (cell) e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.zIndex = '10'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                              >
                                {cell ? stageEmoji(cell.stage, cell.fruits) : ''}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>📱 {t("可用手指滑動來瀏覽園子", "Swipe to pan around the garden")}</p>

                      {/* Verse Info Popup Modal */}
                      {selectedGardenCell && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedGardenCell(null)}>
                          <div id="garden-verse-popup" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: '15px', border: '3px solid #86efac', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', animation: 'flashSuccess 0.3s ease-out' }}>
                            <button onClick={() => setSelectedGardenCell(null)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem', fontWeight: 'bold' }}>✕</button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '1.8rem' }}>{stageEmoji(selectedGardenCell.stage, selectedGardenCell.fruits)}</span>
                              <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '1.2rem' }}>{selectedGardenCell.ref}</span>
                              <span style={{ fontSize: '0.85rem', color: '#166534', background: '#b2f5ea', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{stageLabel(selectedGardenCell.stage)}</span>
                              {selectedGardenCell.detectedLang && selectedGardenCell.detectedLang !== version && (
                                <span style={{ fontSize: '0.75rem', color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                  {selectedGardenCell.detectedLang === 'kjv' ? 'KJV 🇬🇧' : selectedGardenCell.detectedLang === 'ko' ? '한국어 🇰🇷' : selectedGardenCell.detectedLang === 'ja' ? '日本語 🇯🇵' : '中文 🇹🇼'}
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
                                setTimeout(() => startGame(), 50);
                              }
                            }} style={{ width: '100%', justifyContent: 'center', background: '#22c55e', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: selectedGardenCell.verse ? 'pointer' : 'not-allowed', opacity: selectedGardenCell.verse ? 1 : 0.5, boxShadow: '0 4px 12px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Play size={20} /> {t('挑戰這節經文', 'Challenge this verse')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Legend */}
                      <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                        <span>🌱 {t("嫩芽 (第1次玩)", "Seedling (1st play)")}</span>
                        <span>☘️🌿 {t("幼苗 (練習中)", "Sprout (practicing)")}</span>
                        <span>🪴🌲 {t("小樹 (持續成長)", "Sapling (growing)")}</span>
                        <span>🌳✨ {t("大樹 (通過!)", "Full tree (cleared!)")}</span>
                        <span>🍎🌳 {t("結果子 (創新高!)", "Fruit (new record!)")}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {mainTab === 'leaderboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* 1. 排行榜切換按鈕 */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button onClick={() => setGlobalLeaderboardTab('daily')} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'daily' ? '#10b981' : '#e2e8f0', color: globalLeaderboardTab === 'daily' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'daily' ? '0 4px 6px -1px rgba(16, 185, 129, 0.4)' : 'none' }}>{t("本日排行", "Daily")}</button>
                  <button onClick={() => setGlobalLeaderboardTab('monthly')} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'monthly' ? '#8b5cf6' : '#e2e8f0', color: globalLeaderboardTab === 'monthly' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'monthly' ? '0 4px 6px -1px rgba(139, 92, 246, 0.4)' : 'none' }}>{t("本月排行", "Monthly")}</button>
                  <button onClick={() => setGlobalLeaderboardTab('alltime')} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'alltime' ? '#3b82f6' : '#e2e8f0', color: globalLeaderboardTab === 'alltime' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'alltime' ? '0 4px 6px -1px rgba(59, 130, 246, 0.4)' : 'none' }}>{t("歷史總榜", "All Time")}</button>
                </div>

                {/* 2. 個人總積分排行榜 - reads from globalLeaderboardData (Redis) */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#2563eb" /> {t("個人總積分排行榜", "Player Total Score Leaderboard")}</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                        <th style={{ padding: '0.8rem 1rem', width: '50px' }}>🏆</th>
                        <th style={{ padding: '0.8rem 1rem' }}>{t("玩家名稱", "Player Name")}</th>
                        <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("最高分", "Best Score")}</th>
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
                        const playerMap = {};
                        entries.forEach(({ name, score }) => {
                          if (!name) return;
                          if (!playerMap[name]) playerMap[name] = { best: 0, clears: 0 };
                          playerMap[name].best = Math.max(playerMap[name].best, score);
                          playerMap[name].clears += 1;
                        });

                        const alltimeClears = {};
                        (globalLeaderboardData.alltime || []).forEach(({ name }) => {
                           if (!name) return;
                           alltimeClears[name] = (alltimeClears[name] || 0) + 1;
                        });

                        return Object.entries(playerMap)
                          .sort((a, b) => b[1].best - a[1].best || b[1].clears - a[1].clears)
                          .slice(0, 10)
                          .map(([name, stats], idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                              <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>
                                {name} {name === playerName && <Crown size={14} style={{ color: '#fbbf24', marginLeft: '5px' }} />}
                                <span style={{ marginLeft: '8px', fontSize: '0.8rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Lv.{getSkoolLevel(alltimeClears[name] || stats.clears).level} {t(getSkoolLevel(alltimeClears[name] || stats.clears).title, getSkoolLevel(alltimeClears[name] || stats.clears).enTitle)}</span>
                              </td>
                              <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6' }}>{stats.best.toLocaleString()}</td>
                              <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{stats.clears}</td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
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
                          .sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0))
                          .slice(0, 10);
                        return sortedSets.map((set, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => {
                            setMainTab('versesets');
                            setSelectedSetId(set.id);
                            fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id }) }).catch(e => e);
                            setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                          }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>{set.title}</td>
                            <td style={{ padding: '0.8rem 1rem', color: '#3b82f6' }}>{set.authorName && set.authorName !== "Anonymous" ? set.authorName : (String(set.id).startsWith("custom-") ? "匿名玩家" : "Verserain 官方")}</td>
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
                        ));
                      })()}
                    </tbody>
                  </table>
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
                      {Object.entries((globalVerseStats[globalLeaderboardTab] || {}))
                        .sort((a, b) => b[1].plays - a[1].plays || b[1].completes - a[1].completes)
                        .slice(0, 10)
                        .map(([ref, stats], idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>{ref}</td>
                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{stats.plays}</td>
                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{stats.completes}</td>
                            <td style={{ padding: '0.8rem 0' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Search current set first, then ALL language pools (fixes iPhone 'verse not found')
                                  let targetVerse = findVerseByRef(VERSES_DB, ref);
                                  let detectedLang = null;
                                  if (!targetVerse) {
                                    const allCurrentVerses = safeActiveSets.flatMap(s => s.verses);
                                    targetVerse = findVerseByRef(allCurrentVerses, ref);
                                  }
                                  if (!targetVerse) {
                                    const langPools = [
                                      { lang: 'kjv', verses: [...VERSE_SETS_KJV, ...VERSE_SETS_PROVERBS_KJV].flatMap(s => s.verses) },
                                      { lang: 'cuv', verses: [...VERSE_SETS_CUV, ...VERSE_SETS_PROVERBS_ZH].flatMap(s => s.verses) },
                                      { lang: 'ko', verses: [...VERSE_SETS_KO, ...VERSE_SETS_PROVERBS_KO].flatMap(s => s.verses) },
                                      { lang: 'ja', verses: [...VERSE_SETS_JA, ...VERSE_SETS_PROVERBS_JA].flatMap(s => s.verses) },
                                    ];
                                    for (const pool of langPools) {
                                      if (pool.lang === version) continue;
                                      const found = findVerseByRef(pool.verses, ref);
                                      if (found) { targetVerse = found; detectedLang = pool.lang; break; }
                                    }
                                  }
                                  if (targetVerse) {
                                    if (detectedLang) {
                                      versionBeforeChallenge.current = version;
                                      setVersion(detectedLang);
                                    }
                                    setActiveVerse(targetVerse);
                                    setTimeout(() => startGame(), 50);
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
                        ))}
                      {Object.keys((globalVerseStats[globalLeaderboardTab] || {})).length === 0 && (
                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>{t("目前尚無經文紀錄", "No records yet")}</td></tr>
                      )}
                    </tbody>
                  </table>
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
                                            setTimeout(() => startGame(false), 50);
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
                {version === 'ko' ? (
                  <>
                    <h1 style={{ color: '#3b82f6', marginBottom: '1.5rem', textAlign: 'center' }}>🌧️ VerseRain 말씀비 사용 설명서</h1>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '3rem' }}><strong>VerseRain 말씀비</strong>에 오신 것을 환영합니다! 도전과 학습을 결합한 인터랙티브 성경 암송 플랫폼입니다.<br />여기서는 글로벌 구절 세트에 도전하고, 나만의 개인 문제집을 만들고, 상호 경제 글로벌 리더보드에 이름을 올릴 수 있습니다!</p>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🎯 1. 어떻게 플레이하나요?</h2>
                    <p>단 세 가지 간단한 단계로 성경 암송 도전을 시작할 수 있습니다!</p>

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>1. 「구절 세트」로 전환하기</h3>
                    <p>먼저 왼쪽 상단 탐색 바의 「구절 세트」 탭을 클릭합니다. 시스템과 플레이어가 만든 모든 공개 구절 세트가 표시됩니다.</p>
                    <img src="/manual/step1.png" alt="구절 세트 전환" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>2. 도전할 구절 세트 선택하기</h3>
                    <p>목록에서 주제(예: 요한복음 핵심 구절)를 클릭하여 포함된 구절 레벨을 펼칩니다.</p>
                    <img src="/manual/step2.png" alt="구절 세트 선택" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>3. 게임 시작하기</h3>
                    <p>구절 세트 내 구절 옆의 「리더보드/플레이 아이콘」을 클릭하면 3초 후에 말씀비가 쏟아집니다!</p>
                    <img src="/manual/step3.png" alt="게임 시작" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>🎬 실제 게임플레이 시연 (애니메이션):</h3>
                    <p>실제 게임플레이 데모입니다!</p>
                    <img src="/manual/play.webp" alt="게임플레이 애니메이션" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '3rem' }} />

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>👑 2. 나만의 「구절 세트」를 만드는 방법은? (프리미엄 전용)</h2>
                    <p>「상호 경제」 커뮤니티의 프리미엄 회원이라면, 주일학교나 소그룹을 위한 나만의 성경 문제집을 자유롭게 만들 수 있습니다!</p>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li>상단 탐색 바에서 <strong>「👑 내 문제집」</strong>을 클릭합니다.</li>
                      <li>입력란에 원하는 <strong>새 구절 세트 제목</strong>을 입력합니다.</li>
                      <li>강력한 <strong>마법 원클릭 가져오기 기능</strong>을 사용합니다: 섹션에 구절 출처(예: <code>요한복음 3:16</code>)를 입력하고 옆의 마법 별 버튼을 클릭합니다.</li>
                      <li>시스템이 완전한 구절 내용을 자동으로 가져옵니다!</li>
                      <li>모든 것이 맞는지 확인한 후 왼쪽 상단의 <strong>「게시 (Publish)」</strong>를 클릭합니다.</li>
                      <li>축하합니다! 이 구절 세트는 즉시 글로벌 데이터베이스에 업로드되어 「구절 세트」에서 공개 도전이 가능해집니다!</li>
                    </ol>
                    <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '1rem', borderRadius: '4px', marginBottom: '3rem' }}>
                      <strong>💡 팁:</strong> 마법 원클릭 가져오기는 정확한 성경 데이터베이스에 연결되어 있어 수동 입력과 교정 시간을 크게 절약합니다. 「창세기 1:1」을 입력하여 1초 수입의 부드러움을 경험해보세요!
                    </div>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🏆 3. 개인 점수 글로벌 리더보드</h2>
                    <p><strong>「리더보드」</strong>를 클릭하면 메인 순위가 표시됩니다:</p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><strong>개인 클리어 포인트 랭킹:</strong> 도전을 완료하면 포인트가 쌓이며, 자신의 기록을 경신해도 카운트됩니다!</li>
                      <li><strong>가장 인기 있는 구절 세트 랭킹:</strong> 더 많이 플레이된 구절 세트일수록 이 보드에서 최고의 영예를 얻습니다.</li>
                    </ul>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>좋은 순위를 원하시나요? 꾸준히 도전하거나 모두가 즐길 수 있는 구절 세트를 만들어보세요!</p>
                  </>
                ) : version === 'ja' ? (
                  <>
                    <h1 style={{ color: '#3b82f6', marginBottom: '1.5rem', textAlign: 'center' }}>🌧️ VerseRain 経文の雨 ユーザーマニュアル</h1>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '3rem' }}><strong>VerseRain 経文の雨</strong>へようこそ！これは挑戦と学習を組み合わせたインタラクティブな暗唱プラットフォームです。<br />ここでは、グローバルな経文セットに挑戦し、独自の個人的な問題集を作成し、互恵経済のグローバルリーダーボードに自分の名前を載せることができます！</p>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🎯 1. 遊び方は？</h2>
                    <p>たった3つの簡単なステップで、経文暗唱の挑戦を始められます！</p>

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>1. 「経文セット」に切り替える</h3>
                    <p>まず、左上隅のナビゲーションバーにある「経文セット」タブをクリックします。ここには、システムとプレイヤーによって作成されたすべての公開経文が表示されます。</p>
                    <img src="/manual/step1.png" alt="経文セットの切り替え" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>2. 挑戦したい経文セットを選ぶ</h3>
                    <p>リストからトピック（例：ヨハネの福音書 核心経文）をクリックして、それに含まれる経文レベルを展開します。</p>
                    <img src="/manual/step2.png" alt="経文セットの選択" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>3. ゲームを開始する</h3>
                    <p>経文セット内の任意の経文の横にある「リーダーボード/プレイアイコン」をクリックすると、3秒後に経文の雨が降り注ぎます！</p>
                    <img src="/manual/step3.png" alt="ゲーム開始" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>🎬 実際のゲームプレイドラフト（アニメーション）：</h3>
                    <p>これは実際のゲームプレイのデモンストレーションです！</p>
                    <img src="/manual/play.webp" alt="ゲームプレイアニメーション" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '3rem' }} />

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>👑 2. 専用の「経文セット」を自作するには？（プレミアム会員専用）</h2>
                    <p>「互恵経済」コミュニティのプレミアム会員であれば、日曜学校や小グループ向けの独自の経文問題集を自由に作成できます！</p>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li>上部のナビゲーションバーにある <strong>「👑 マイ問題集」</strong> をクリックします。</li>
                      <li>入力ボックスに作成したい <strong>新しい経文セットのタイトル</strong> を入力します。</li>
                      <li>強力な <strong>魔法のワンクリック取得機能</strong> を使用します: セクションに経文の出典（例: <code>ヨハネ 3:16</code>）を入力し、横にある星の魔法ボタンをクリックします。</li>
                      <li>システムが完全な経文コンテンツを自動的にインポートします！</li>
                      <li>すべてが正しいことを確認した後、左上隅の <strong>「公開する (Publish)」</strong> をクリックします。</li>
                      <li>おめでとうございます！この経文セットは瞬時にグローバルデータベースにアップロードされ、「経文セット」で挑戦できるようになります！</li>
                    </ol>
                    <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '1rem', borderRadius: '4px', marginBottom: '3rem' }}>
                      <strong>💡 ヒント：</strong> 魔法のワンクリック取得機能は、正確な中国語聖書データベースに接続されているため、手動での入力と校正の時間を大幅に節約できます。「創世記 1:1」と入力して、その1秒でのインポートの滑らかさを体験してみてください！
                    </div>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🏆 3. 個人のスコアグローバルリーダーボード</h2>
                    <p><strong>「リーダーボード」</strong> をクリックすると、メインボードが表示されます：</p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><strong>個人のクリアポイントランキング：</strong> チャレンジをクリアする限りポイントが貯まり、自己ベストを更新してもカウントされます！</li>
                      <li><strong>最も人気のある経文セットのランキング：</strong> 多くプレイされた経文セットほど、このボードで最高の栄誉を獲得します。</li>
                    </ul>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>高順位を獲得したいですか？それなら根気よく挑戦し続けるか、誰もが楽しめる経文セットを作成しましょう！</p>
                  </>
                ) : version === 'kjv' ? (
                  <>
                    <h1 style={{ color: '#3b82f6', marginBottom: '1.5rem', textAlign: 'center' }}>🌧️ VerseRain User Manual</h1>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '3rem' }}>Welcome to <strong>VerseRain</strong>! An interactive scripture memorization platform combining challenge and learning.<br />Here you can challenge global verse sets, create your own personal library, and climb the Global Leaderboard of the Mutualized Economics!</p>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🎯 1. How to Play?</h2>
                    <p>Just three simple steps to start your scripture memorization challenge!</p>

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>1. Switch to "Verse Sets"</h3>
                    <p>First, click the "Verse Sets" tab in the top left navigation bar. This will display all public verse sets created by the system and players.</p>
                    <img src="/manual/step1.png" alt="Switch Verse Sets" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>2. Select a Verse Set</h3>
                    <p>Click on a topic in the list (e.g., Gospel of John Core Verses) to expand the verse levels within it.</p>
                    <img src="/manual/step2.png" alt="Select Verse Set" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>3. Start Game</h3>
                    <p>Click the "Leaderboard/Play icon" next to any verse level under the verse set. The verse rain will start falling in 3 seconds!</p>
                    <img src="/manual/step3.png" alt="Start Game" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>🎬 Gameplay Demonstration (Animation):</h3>
                    <p>Here is an actual demonstration of the gameplay!</p>
                    <img src="/manual/play.webp" alt="Gameplay Animation" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '3rem' }} />

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>👑 2. How to create custom "Verse Sets"? (Premium Only)</h2>
                    <p>If you are a Premium Member of the "Mutualized Economics" community, you can freely create your own customized scripture libraries for Sunday school or cell groups!</p>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li>Click <strong>"👑 Custom Sets"</strong> in the top navigation bar.</li>
                      <li>Type your desired <strong>New Verse Set Title</strong> in the input box.</li>
                      <li>Use the powerful <strong>Magic One-Click Fetch Feature</strong>: Enter the scripture reference in the section (e.g., <code>John 3:16</code>), and click the magic star button next to it.</li>
                      <li>The system will automatically import the complete verse content for you!</li>
                      <li>After verifying everything is correct, click <strong>"Publish"</strong>.</li>
                      <li>Congratulations! This verse set will be instantly uploaded to the global database, available for public challenge in "Verse Sets"!</li>
                    </ol>
                    <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '1rem', borderRadius: '4px', marginBottom: '3rem' }}>
                      <strong>💡 Tip:</strong> The Magic One-Click Fetch connects to an accurate Bible database, saving a significant amount of manual typing and proofreading time. Try entering "Genesis 1:1" to experience the smooth 1-second import!
                    </div>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🏆 3. Global Leaderboard</h2>
                    <p>Click <strong>"Leaderboard"</strong> to view the main top rankings:</p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><strong>Personal Clear Points Ranking:</strong> Accumulate points by completing challenges. Beating your own record also counts!</li>
                      <li><strong>Most Popular Verse Sets Ranking:</strong> The more a verse set is played, the higher its glory on this board.</li>
                    </ul>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>Want a good rank? Keep challenging constantly, or create a verse set that everyone loves!</p>
                  </>
                ) : (
                  <>
                    <h1 style={{ color: '#3b82f6', marginBottom: '1.5rem', textAlign: 'center' }}>🌧️ VerseRain 經文雨 操作手冊</h1>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '3rem' }}>歡迎進入 <strong>VerseRain 經文雨</strong>！這是一個結合挑戰與學習的互動背經平台。<br />在這裡您可以挑戰全球經文組、建立個人專屬的題庫，同時登上互惠經濟的全球排行榜！</p>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🎯 一、如何開始遊玩？</h2>
                    <p>只需簡單三步，您就能進入背經的挑戰中！</p>

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>1. 切換至「經文組」</h3>
                    <p>首先點擊左上角導航列的「經文組」頁籤。這會顯示系統與玩家建立的所有公開經文。</p>
                    <img src="/manual/step1.png" alt="切換經文組" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>2. 選擇想要挑戰的經文組</h3>
                    <p>點選列表中的主題（例如：約翰福音 核心經文），展開內含的經文關卡。</p>
                    <img src="/manual/step2.png" alt="選擇經文組" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>3. 開始遊戲</h3>
                    <p>點選該經文組底下的任何一節關卡旁邊的「排行榜/遊玩圖示」，三秒鐘後，滿天掉落的經文雨就會傾盆而下！</p>
                    <img src="/manual/step3.png" alt="開始遊戲" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }} />

                    <h3 style={{ marginTop: '1.5rem', color: '#0f172a' }}>🎬 實際遊玩流程示範（動畫）：</h3>
                    <p>這是一段實際進入遊戲的流程示範！</p>
                    <img src="/manual/play.webp" alt="遊戲流程動畫" style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '3rem' }} />

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>👑 二、如何自建專屬「經文組」？（Premium 會員獨享）</h2>
                    <p>如果您是「互惠經濟」社群的尊榮會員，就可以盡情打造自己的主日學或小組背經專屬題庫！</p>
                    <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li>點擊上方導航列的 <strong>「👑 我的題庫」</strong>。</li>
                      <li>在輸入框打下你想要的 <strong>新經文組名稱</strong>。</li>
                      <li>利用強大的 <strong>魔法一鍵抓取功能</strong>：在區塊中輸入經文章節出處（如：<code>約 3:16</code>），點擊旁邊的魔法星號按鈕。</li>
                      <li>系統將為您自動帶入完整的經文內容！</li>
                      <li>在左上角確認一切無誤後，點擊 <strong>「發佈 (Publish)」</strong>。</li>
                      <li>恭喜！這份經文組就會瞬間上傳到全球資料庫，供大眾在「經文組」挑戰了！</li>
                    </ol>
                    <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '1rem', borderRadius: '4px', marginBottom: '3rem' }}>
                      <strong>💡 提示：</strong> 魔法一鍵抓取功能串接了精準的華語聖經資料庫，能夠大幅省去手動打字、校稿的時間。您可以直接嘗試輸入「創世紀 1:1」，感受一秒匯入的流暢度！
                    </div>

                    <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '2rem' }}>🏆 三、個人積分全球排行榜</h2>
                    <p>點選 <strong>「排行榜」</strong>，您將會看到三大首頁看板：</p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '2rem' }}>
                      <li><strong>個人過關積點排行：</strong> 只要完成挑戰就能累積積分，破自己的紀錄也算分！</li>
                      <li><strong>最受歡迎的經文組排名：</strong> 被玩越多次的經文組，將會在此看板上獲得頂級榮耀。</li>
                    </ul>
                    <p style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>想獲得好名次？那就持之以恆地回來挑戰，或是創建讓大家愛不釋手的經文組合吧！</p>
                  </>
                )}
              </div>
            )}

            {mainTab === 'about' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#334155', lineHeight: '1.6' }}>
                <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontFamily: 'cursive', color: '#3b82f6' }}>
                  {version === 'ko' ? 'VerseRain 말씀비는 성경 암송을 생생하고 재미있게 만듭니다!' : t('Verse Rain 讓背記經文變得生動有趣！', 'VerseRain makes scripture memorization fun!')}
                </h2>

                <p style={{ marginBottom: '1rem' }}>
                  {version === 'ko'
                    ? '한 중국 교회에서 VerseRain 앱을 사용하여 성도들을 위한 「성경 암송 대회」를 개최했습니다. 가족과 소그룹의 모든 연령대가 참여했습니다. 그들은 4대의 프로젝터를 설치하여 4개 팀이 동시에 같은 구절 세트로 챌린지 모드에서 경쟁할 수 있었습니다.'
                    : version === 'ja'
                      ? 'ある中国の教会では、VerseRainアプリを使って会衆向けに「聖書暗唱コンテスト」を開催しました。家族や小グループのすべての年齢層が参加できました。彼らは4台のプロジェクターを設置し、4つのチームが同時に同じ経文セットのチャレンジモードで競い合えるようにしました。'
                      : version === 'kjv'
                        ? 'A Chinese church used the VerseRain app to host a "Bible Memorization Contest" for its congregation. All ages in families and small groups participated. They set up four projectors, allowing four teams to compete simultaneously in Challenge Mode using the same verse sets.'
                        : '一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。'}
                </p>
                <iframe width="560" height="315" src="//www.youtube.com/embed/2tFxeesKISk" frameBorder="0" allowFullScreen=""></iframe>

                <p style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                  {version === 'ko'
                    ? '4살 남자아이와 3살 여동생이 VerseRain으로 중국어 「주기도문」을 암송할 수 있다는 것을 열성적으로 보여주었습니다. 그들은 미국에서 태어났지만 중국어를 읽고 이 게임을 플레이할 수 있습니다.'
                    : version === 'ja'
                      ? '4歳の男の子と3歳の妹が、VerseRainで中国語の「主の祈り」を暗唱できることを熱心に披露してくれました。彼らはアメリカで生まれましたが、中国語を読み、このゲームを遊ぶことができます。'
                      : version === 'kjv'
                        ? 'A four-year-old boy and his three-year-old sister eagerly showed off how they could recite the "Lord\'s Prayer" in Chinese by playing VerseRain. Born in the US, they are able to read Chinese and play this game.'
                        : '一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。'}
                </p>
                <iframe width="560" height="315" src="//www.youtube.com/embed/Tty82Gn1gvQ" frameBorder="0" allowFullScreen=""></iframe>

                <p style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                  {version === 'ko'
                    ? '성경 구절의 단어들이 하늘에서 떨어집니다. 플레이어는 올바른 순서로 구절을 클릭하여 점수를 얻습니다. 클릭 시 구절이 소리 내어 읽혀 시각과 청각 모두로 기억을 강화합니다.'
                    : version === 'ja'
                      ? '聖書の経文の単語が空から降ってきます。プレイヤーは正しい順序で経文をクリックしてスコアを獲得します。経文がクリックされると音声で読み上げられ、視覚と聴覚の両方から記憶を強化します。'
                      : version === 'kjv'
                        ? 'Words of bible verses fall from the sky, and you score points by clicking the verse in the correct order. The verse is spoken out loud when clicked to reinforce your memory audibly and spelling visually.'
                        : '聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。'}
                </p>

                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li>{version === 'ko' ? '여러 언어로 성경 구절을 배우세요!' : (version === 'ja' ? '多言語で聖書の経文を学びましょう！' : (version === 'kjv' ? 'Learn bible verses in multiple languages!' : '學習多種語言的聖經經文！'))}</li>
                  <li>{version === 'ko' ? '단어를 클릭하면 텍스트 음성 변환 기능으로 읽어줘 암송 기억을 깊게 합니다.' : (version === 'ja' ? '単語をクリックするとテキスト読み上げ機能で朗読され、暗唱の印象を深めます。' : (version === 'kjv' ? 'Text to Speech verbal reading as you click the words to impress your memory on verse recitation.' : '點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。'))}</li>
                  <li>{version === 'ko' ? 'VerseRain을 통해 무한에 가까운 구절, 구절 세트, 다양한 성경 번역본을 지원합니다.' : (version === 'ja' ? 'VerseRainを通じ、無限に近い経文、経文セット、様々な聖書翻訳をサポートします。' : (version === 'kjv' ? 'Through verserain, it supports virtually unlimited number of verses, verse sets, and multiple bible versions.' : '透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。'))}</li>
                  <li>{version === 'ko' ? '어린이부터 어른까지 자신의 한계에 도전하기에 적합한 다양한 난이도를 제공합니다.' : (version === 'ja' ? '複数の難易度が用意されており、子供から大人まで自分の限界に挑戦するのに最適です。' : (version === 'kjv' ? 'Multiple difficulty levels offered to be played by kids to adults.' : '提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。'))}</li>
                  <li>{version === 'ko' ? '챌린지 모드는 같은 구절 세트 내 여러 관련 구절의 기억을 강화하는 데 도움이 됩니다.' : (version === 'ja' ? 'チャレンジモードは、同じ経文セット内の関連する複数の経文の記憶を強化するのに役立ちます。' : (version === 'kjv' ? 'Challenge mode helps to strengthen the memory of multiple related verses in the same verse set.' : '挑戰模式有助於加強記憶同一個經文組中的多段相關經文。'))}</li>
                  <li>{version === 'ko' ? '온라인 리더보드는 성도, 청년부, 소그룹 구성원이 함께 참여하고 성장하도록 동기를 부여합니다!' : (version === 'ja' ? 'オンラインリーダーボードは、会衆、青年フェローシップ、小グループのメンバーが一緒に参加して改善するよう動機付けます！' : (version === 'kjv' ? 'Online Leaderboard to motivate congregation, youth fellowships and small group members to participate and improve together!' : '線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！'))}</li>
                </ul>

              </div>
            )}

          </div>
        </div>
      )}

      {gameState === 'playing' && isBlindMode && (
         <BlindModeGame 
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
            onFail={() => {
                 setGameState('menu');
            }}
            speakText={speakText}
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
               gn.gain.linearRampToValueAtTime(0.5, actx.currentTime + 0.02);
               gn.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 1.0);
               osc.connect(gn); gn.connect(actx.destination);
               osc.start(); osc.stop(actx.currentTime + 1.0);
            }}
            version={version}
            t={t}
         />
      )}

      {gameState === 'playing' && !isBlindMode && (
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
                      left: `${block.xPos}%`,
                      animation: `fall ${block.duration}s linear forwards`,
                      animationPlayState: 'running',
                      zIndex: block.seqIndex === currentSeqIndex ? 50 : 10
                    }}
                    onAnimationEnd={(e) => handleAnimationEnd(e, block.id)}
                  >
                    <div className={appliedClasses} onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
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
                        setTimeout(startGame, 50);
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
                    {t("時間加成", "Time Bonus")}: {(timeLeft / 100).toFixed(2)}s × 50 = +{timeBonus}
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

                {/* Home button placed HERE — always visible above the leaderboard */}
                {campaignQueue === null && (
                  <button
                    onClick={() => { setGameState('menu'); setCampaignQueue(null); }}
                    className="play-btn"
                    style={{
                      width: '100%', maxWidth: '300px', margin: 'clamp(0.6rem, 2vh, 1rem) auto',
                      background: '#3b82f6', color: 'white', border: 'none',
                      padding: 'clamp(0.6rem, 1.5vh, 0.9rem)',
                      fontSize: 'clamp(1rem, 2vh, 1.1rem)', fontWeight: 'bold',
                      borderRadius: '12px', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: '0.5rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
                    }}
                  >
                    <Home size={18} /> {t("回到主頁", "Home")}
                  </button>
                )}

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

                {campaignQueue !== null ? (
                  campaignQueue.length > 0 ? (
                    <button
                      onClick={() => {
                        setActiveVerse(campaignQueue[0]);
                        setCampaignQueue(campaignQueue.slice(1));
                        setTimeout(startGame, 50);
                      }}
                      className="play-btn"
                      style={{
                        width: '100%', maxWidth: '300px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1rem)',
                        fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto'
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
                        fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto'
                      }}
                    >
                      {t("查看最終成績", "View Final Results")}
                    </button>
                  )
                ) : null /* Home button already shown above the leaderboard */}
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
                    <div style={{ color: result.score > 0 ? '#34d399' : '#f87171', fontSize: '0.9rem' }}>{result.score > 0 ? (result.flawless ? t('完美', 'Perfect') : t('過關', 'Cleared')) : t('失敗', 'Failed')}</div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.score > 0 ? '#fbbf24' : '#64748b' }}>{result.score}</div>
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
                {showLoginModal === 'signup' ? t("註冊新帳號", "Sign Up") : t("登入帳號", "Log In")}
              </h2>
              <button
                onClick={() => setShowLoginModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <XCircle size={24} />
              </button>
            </div>



            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            </div>

            {authError && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', marginTop: '-0.5rem', fontWeight: 'bold' }}>{authError}</div>}

            <button
              disabled={authLoading}
              onClick={async () => {
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
                    const isPrem = data.user.isPremium || PREMIUM_EMAILS.includes((data.user.email || '').toLowerCase());
                    setPlayerName(data.user.name || email.split('@')[0]);
                    setUserEmail(data.user.email);
                    setIsPremium(isPrem);
                    localStorage.setItem('verserain_player_name', data.user.name || email.split('@')[0]);
                    localStorage.setItem('verserain_player_email', data.user.email);
                    localStorage.setItem('verserain_is_premium', isPrem ? 'true' : 'false');
                    setShowLoginModal(null);
                  } else {
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
              {authLoading ? "..." : (showLoginModal === 'signup' ? t("建立新帳號 ", "Create Account") : t("登入", "Log In"))}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
              {showLoginModal === 'signup' ? (
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
                          alert(t("密碼已寄出！請檢查您的信箱（包含垃圾郵件匣）。", "Password sent! Please check your email inbox (including spam)."));
                        } else {
                          setAuthError(data.error || "寄送失敗 (Failed to send)");
                        }
                      } catch (err) {
                        setAuthError("無法連線到伺服器 (Server unreachable)");
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
                    speakText(verseViewModal.text);
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
                  setTimeout(() => startGame(false), 50);
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
                            
                            {levelCounts !== null && (
                              <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '12px', fontWeight: 'bold', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                👥 {levelCounts[levelObj.level] || 0} {t("人", "players")}
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

    </>
  );
}
