import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Heart, Zap, Trophy, Crown, Star, Home, XCircle, Headphones, Music, VolumeX, Search, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import './index.css';

let audioCtx = null;

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
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;

      let resolved = false;
      const safeResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      utterance.onend = safeResolve;
      utterance.onerror = safeResolve;

      // Safety fallback in case Web Speech API hangs
      setTimeout(safeResolve, 2500);

      window.speechSynthesis.speak(utterance);
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
import { getRandomFakePhrase } from './fakeLogic';

export default function App() {
  const VERSES_CUV = React.useMemo(() => VERSE_SETS_CUV.flatMap(s => s.verses), []);
  const VERSES_KJV = React.useMemo(() => VERSE_SETS_KJV.flatMap(s => s.verses), []);

  const [version, setVersion] = useState('cuv');
  const [playMode, setPlayMode] = useState('square');
  const [distractionLevel, setDistractionLevel] = useState(0);
  const [selectedSetId, setSelectedSetId] = useState(null);

  const activeVerseSets = version === 'cuv' ? VERSE_SETS_CUV : VERSE_SETS_KJV;
  const currentSet = selectedSetId ? activeVerseSets.find(s => s.id === selectedSetId) : null;
  const VERSES_DB = currentSet ? currentSet.verses : activeVerseSets[0].verses;

  const [activeVerse, setActiveVerse] = useState(VERSES_DB[0]);
  const [selectedVerseRefs, setSelectedVerseRefs] = useState([VERSES_DB[0].reference]);

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
    const targetDB = newVer === 'cuv' ? VERSES_CUV : VERSES_KJV;
    setActiveVerse(targetDB[0]);
    setSelectedVerseRefs([targetDB[0].reference]);
    setCampaignQueue(null);
  };

  useEffect(() => {
    const parseUrlArgs = async () => {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      const vParam = params.get('v');
      const textParam = params.get('text');

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

        const isEnglish = /^[a-zA-Z\s.,:;'"]+$/.test(cleanText.substring(0, 50));
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
    const isEnglish = /^[a-zA-Z\s.,:;'"]+$/.test(activeVerse.text.substring(0, 50));
    // Remove \s from the non-English regex so Chinese doesn't fragment on spaces
    const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[,，。；：「」、;:\.\?!！？『』《》]/;
    return activeVerse.text.split(regex).map(p => p.trim()).filter(Boolean);
  }, [activeVerse]);

  const activePhrasesRef = useRef([]);
  useEffect(() => { activePhrasesRef.current = activePhrases; }, [activePhrases]);

  const [gameState, setGameState] = useState('menu');
  const gameStateRef = useRef('menu');
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

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
  const [campaignResults, setCampaignResults] = useState([]);

  const [lightningActive, setLightningActive] = useState(null);
  const [lightningKey, setLightningKey] = useState(0);

  const triggerLightning = React.useCallback((type) => {
    setLightningActive(type);
    setLightningKey(k => k + 1);
  }, []);

  useEffect(() => {
    let timeoutId;
    const scheduleLightning = () => {
      const randTime = Math.random() * 8000 + 4000;
      timeoutId = setTimeout(() => {
        // Occasional visual lightning with no audio
        if (Math.random() > 0.4) {
          triggerLightning('light');
        }
        scheduleLightning();
      }, randTime);
    };

    if (gameState === 'playing') {
      scheduleLightning();
    } else {
      setLightningActive(null);
    }
    return () => clearTimeout(timeoutId);
  }, [gameState, triggerLightning]);

  // Leaderboard specific state
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('verserain_player_name') || "");
  const [leaderboard, setLeaderboard] = useState({ alltime: [], monthly: [], daily: [] });
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('alltime');

  // Menu Leaderboard Modal
  const [leaderboardModalVerse, setLeaderboardModalVerse] = useState(null);
  const [leaderboardModalData, setLeaderboardModalData] = useState({ alltime: [], monthly: [], daily: [] });
  const [leaderboardModalTab, setLeaderboardModalTab] = useState('alltime'); // 'daily', 'monthly', 'alltime'
  const [isFetchingLeaderboard, setIsFetchingLeaderboard] = useState(false);
  const [mainTab, setMainTab] = useState('versesets');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalLeaderboardData, setGlobalLeaderboardData] = useState({ alltime: [], monthly: [], daily: [] });
  const [isFetchingGlobalLeaderboard, setIsFetchingGlobalLeaderboard] = useState(false);
  const [globalLeaderboardTab, setGlobalLeaderboardTab] = useState('alltime');
  const [globalLeaderboardPage, setGlobalLeaderboardPage] = useState(1);

  const fetchGlobalLeaderboard = () => {
    setIsFetchingGlobalLeaderboard(true);
    fetch(`/api/get-all-scores`)
      .then(res => res.json())
      .then(data => setGlobalLeaderboardData(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
      .catch(() => setGlobalLeaderboardData({ alltime: [], monthly: [], daily: [] }))
      .finally(() => setIsFetchingGlobalLeaderboard(false));
  };
  const [showLoginModal, setShowLoginModal] = useState(null);
  const [verseViewModal, setVerseViewModal] = useState(null);

  // Process Challenge URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeRef = params.get('challenge');
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
      } else if (spawnFake && playMode !== 'square') {
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
      startGame(initAutoStart.isAuto);
      setInitAutoStart(null);
    }
  }, [initAutoStart]);

  const initSquareBlocks = () => {
    const phrases = activePhrasesRef.current;

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
    setBlocks(newBlocks);
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
      if (playMode === 'square') {
        initSquareBlocks();
      } else {
        setTimeout(spawnNextBlock, 100);
        setTimeout(spawnNextBlock, 900);
        setTimeout(spawnNextBlock, 1700);
        setTimeout(spawnNextBlock, 2500);
        setTimeout(spawnNextBlock, 3300);
      }
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

      if (!cancelAutoPlay && gameStateRef.current === 'playing') {
        setSpeakingTitle(true);
        speechRef.current = speakText(formatRef(activeVerse.reference), 1.0, TTS_LANG);
        await speechRef.current;
        setSpeakingTitle(false);
        await new Promise(r => setTimeout(r, 400));
      }

      for (let i = 0; i < activePhrasesRef.current.length; i++) {
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

    if (isAutoPlay && gameState === 'playing' && currentSeqIndex === 0) {
      runAutoPlayLoop();
    }
    return () => { cancelAutoPlay = true; };
  }, [isAutoPlay, gameState, version, activeVerse.reference]);

  const triggerFireworks = () => {
    const duration = 4 * 1000;
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
          if (campaignQueue !== null && campaignQueue.length > 0) {
            setActiveVerse(campaignQueue[0]);
            setCampaignQueue(campaignQueue.slice(1));
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

    const hs = isSuccess && finalCalculatedScore > bestScore && finalCalculatedScore > 0;

    setIsFlawless(f);
    setIsNewHighScore(hs);
    setIsFailed(failed);

    if (isSuccess && !isAutoPlayRef.current) {
      // Load current leaderboard initially
      fetch(`/api/get-scores?verseRef=${encodeURIComponent(activeVerse.reference)}`)
        .then(res => res.json())
        .then(data => setLeaderboard(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
        .catch(err => console.log("Leaderboard not ready or fetch failed"));

      // If user is already identified, auto-submit their score behind the scenes
      if (playerName && finalCalculatedScore > 0) {
        setIsSubmittingScore(true);
        const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;

        setIsSubmittingScore(true);
        fetch('/api/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playerName, score: finalCalculatedScore, verseRef: activeVerse.reference, mode: actualModeName })
        }).then(() => {
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
    if (currentSeqIndex >= activePhrases.length && gameState === 'playing') {
      endGame();
    }
  }, [currentSeqIndex, gameState]);

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
    if (block.correct || block.error) return;

    if (block.seqIndex === currentSeqIndex) {
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
        if (playMode === 'square') {
          const maxGridSize = distractionLevel <= 1 ? 4 : 9;
          const fakesCount = distractionLevel > 0 ? distractionLevel : 0;
          const nextSpawnIndex = block.seqIndex + (maxGridSize - fakesCount);
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

              if (distractionLevel >= 2) {
                // Scramble the whole grid on every correct click to significantly increase challenge
                playShuffleSound();
                updated.sort(() => Math.random() - 0.5);
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
          endGame();
          return 0;
        }
        return newHealth;
      });

      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, error: true } : b));
      setTimeout(() => {
        setBlocks(prev => {
          let updated = prev;
          if (playMode === 'square' && block.seqIndex === -1) {
            // Return prev mapped to hidden so we preserve grid length
            updated = prev.map(b => b.id === block.id ? { ...b, error: false, hidden: true, isFake: false } : b);
          } else {
            updated = prev.map(b => b.id === block.id ? { ...b, error: false } : b);
          }

          if (playMode === 'square' && distractionLevel >= 2) {
            // Scramble the whole grid on every mistake too, making recovery harder
            playShuffleSound();
            updated = [...updated].sort(() => Math.random() - 0.5);
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

  const t = (zh, en) => version === 'kjv' ? en : zh;

  return (
    <>
      <div className="bg-layer" />
      <div className="rain-system">
        <div className="rain-layer back" />
        <div className="rain-layer mid" />
        <div className="rain-layer front" />
      </div>
      {lightningActive && (
        <div key={lightningKey} className={`lightning-flash ${lightningActive === 'heavy' ? 'heavy' : 'active'}`} />
      )}

      {/* Global Music Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsMusicPlaying(!isMusicPlaying); }}
        className="hud-glass"
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', padding: '0.75rem', borderRadius: '50%', color: isMusicPlaying ? '#4ade80' : '#cbd5e1', cursor: 'pointer', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isMusicPlaying ? <Music size={24} /> : <VolumeX size={24} />}
      </button>

      {gameState === 'menu' && (
        <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', backgroundColor: '#f4f6f8', zIndex: 10, fontFamily: 'Arial, sans-serif' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6', fontFamily: 'cursive' }}>
              verserain
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {playerName ? (
                <>
                  <span style={{ color: '#475569', fontWeight: 'bold', fontSize: '0.95rem' }}>{t("歡迎, ", "Welcome, ")}{playerName}</span>
                  <button onClick={() => { setPlayerName(''); localStorage.removeItem('verserain_player_name'); }} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>{t("登出", "Logout")}</button>
                </>
              ) : (
                <>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal('login'); }} style={{ color: '#0056b3', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>{t("登入", "Login")}</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal('signup'); }} style={{ background: '#3b82f6', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>{t("申請帳號", "Sign Up")}</a>
                </>
              )}
            </div>
          </div>

          {/* Navigation Bar */}
          <div style={{ display: 'flex', backgroundColor: '#334155', color: 'white', padding: '0 1rem', overflowX: 'auto', borderBottom: '2px solid #1e293b' }}>
            {[
              { id: 'versesets', label: t('經文組', 'Verse Sets') },
              { id: 'leaderboard', label: t('排行榜', 'Leaderboard') },
              { id: 'search', label: t('搜尋', 'Search') },
              { id: 'about', label: t('有關', 'About') },
              { id: 'donate', label: t('加入「互惠經濟」', 'Join Mutualized Economy'), link: 'https://www.skool.com/mutualizedeconomy' }
            ].map((item, idx) => (
              <div key={idx} onClick={() => {
                if (item.link) {
                  window.open(item.link, '_blank');
                  return;
                }
                setMainTab(item.id);
                if (item.id === 'versesets') setSelectedSetId(null);
                if (item.id === 'leaderboard') fetchGlobalLeaderboard();
              }} style={{ padding: '0.8rem 1.5rem', cursor: 'pointer', backgroundColor: (!item.link && mainTab === item.id) ? '#3b82f6' : 'transparent', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'background 0.2s', fontSize: '0.95rem' }} onMouseOver={(e) => { if (item.link || mainTab !== item.id) e.target.style.backgroundColor = '#475569'; }} onMouseOut={(e) => { if (item.link || mainTab !== item.id) e.target.style.backgroundColor = 'transparent'; }}>
                {item.label}
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>

            {mainTab === 'versesets' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleVersionChange('cuv')}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: version === 'cuv' ? '#3b82f6' : '#fff', color: version === 'cuv' ? '#fff' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    中文
                  </button>
                  <button
                    onClick={() => handleVersionChange('kjv')}
                    style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: version === 'kjv' ? '#3b82f6' : '#fff', color: version === 'kjv' ? '#fff' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    English
                  </button>
                </div>
                {/* The Verse Sets Table */}
                <div style={{ backgroundColor: '#ffffff', overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {selectedSetId === null ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                          <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', width: '50px' }}>📁</th>
                          <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("經文組名稱", "Verse Set Name")}</th>
                          <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("說明", "Description")}</th>
                          <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>{t("經文數量", "Count")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeVerseSets.map((set, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => setSelectedSetId(set.id)} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                            <td style={{ padding: '1rem', textAlign: 'center', color: '#3b82f6', fontSize: '1.2rem' }}>📁</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold', color: '#1e293b', fontSize: '1.05rem' }}>{set.title}</td>
                            <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>{set.description || ""}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: '#337ab7', fontWeight: 'bold' }}>{set.verses.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
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
                                      style={{ padding: '0.1rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#334155', backgroundColor: '#fff', width: '100px' }}
                                    >
                                      <option value="square">Verse Square</option>
                                      <option value="rain">Verse Rain</option>
                                    </select>
                                    <select
                                      onChange={(e) => setDistractionLevel(Number(e.target.value))}
                                      value={distractionLevel}
                                      style={{ padding: '0.1rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#334155', backgroundColor: '#fff', width: '100px' }}
                                    >
                                      <option value={0}>Lv 0</option>
                                      <option value={1}>Lv 1</option>
                                      <option value={2}>Lv 2</option>
                                      <option value={3}>Lv 3</option>
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
                                      <Play size={16} fill="white" />
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const link = `${window.location.origin}${window.location.pathname}?challenge=${encodeURIComponent(v.reference)}`;
                                        try {
                                          await navigator.clipboard.writeText(link);
                                          alert(t("挑戰連結已複製到剪貼簿！", "Challenge link copied to clipboard!"));
                                        } catch (err) {
                                          alert(t("無法複製連結，請手動全選複製：", "Could not copy link, please copy this directly: ") + link);
                                        }
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

                {/* Auto Play Floating Bar */}
                {selectedVerseRefs.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <span style={{ color: '#0369a1', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {t(`已選擇 ${selectedVerseRefs.length} 個經文組`, `Selected ${selectedVerseRefs.length} verse sets`)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          initAudio();
                          const queue = VERSES_DB.filter(v => selectedVerseRefs.includes(v.reference));
                          if (queue.length === 0) {
                            if (activeVerse && activeVerse.text) {
                              setCampaignQueue(null);
                              setCampaignResults([]);
                              setTimeout(() => startGame(false), 50);
                            }
                            return;
                          }

                          if (queue.length === 1) {
                            setActiveVerse(queue[0]);
                            setCampaignQueue(null);
                            setCampaignResults([]);
                            setTimeout(() => startGame(false), 50);
                          } else {
                            const shuffled = [...queue].sort(() => Math.random() - 0.5);
                            setCampaignQueue(shuffled.slice(1));
                            setCampaignResults([]);
                            setActiveVerse(shuffled[0]);
                            setTimeout(() => startGame(false), 50);
                          }
                        }}
                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      >
                        {t("選取範圍開始", "Play Selected Range")}
                      </button>
                      <button
                        onClick={() => {
                          initAudio();
                          const queue = VERSES_DB.filter(v => selectedVerseRefs.includes(v.reference));
                          if (queue.length === 0) {
                            if (activeVerse && activeVerse.text) {
                              setCampaignQueue(null);
                              setCampaignResults([]);
                              setTimeout(() => startGame(true), 50);
                            }
                            return;
                          }
                          const sortedQueue = [...queue];
                          setCampaignQueue(sortedQueue.slice(1));
                          setCampaignResults([]);
                          setActiveVerse(sortedQueue[0]);
                          setTimeout(() => startGame(true), 50);
                        }}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                      >
                        {t("連續自動播放", "Auto Play Selected")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {mainTab === 'leaderboard' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#d97706" /> {t("全球 VerseRain 排行榜", "Global Leaderboard")}</h2>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button onClick={() => { setGlobalLeaderboardTab('alltime'); setGlobalLeaderboardPage(1); }} style={{ padding: '0.5rem 1rem', border: 'none', background: globalLeaderboardTab === 'alltime' ? '#3b82f6' : '#e2e8f0', color: globalLeaderboardTab === 'alltime' ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t("歷史總榜", "All Time")}</button>
                  <button onClick={() => { setGlobalLeaderboardTab('monthly'); setGlobalLeaderboardPage(1); }} style={{ padding: '0.5rem 1rem', border: 'none', background: globalLeaderboardTab === 'monthly' ? '#8b5cf6' : '#e2e8f0', color: globalLeaderboardTab === 'monthly' ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t("本月排行", "Monthly")}</button>
                  <button onClick={() => { setGlobalLeaderboardTab('daily'); setGlobalLeaderboardPage(1); }} style={{ padding: '0.5rem 1rem', border: 'none', background: globalLeaderboardTab === 'daily' ? '#10b981' : '#e2e8f0', color: globalLeaderboardTab === 'daily' ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t("本日排行", "Daily")}</button>
                </div>

                {isFetchingGlobalLeaderboard ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>{t("載入中...", "Loading...")}</div>
                ) : (() => {
                  const rawData = globalLeaderboardData[globalLeaderboardTab] || [];
                  if (rawData.length === 0) {
                    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>{t("目前還沒有紀錄", "No records yet")}</div>;
                  }

                  const bestPerVerse = {};
                    rawData.forEach(entry => {
                      if (!bestPerVerse[entry.verseRef] || entry.score > bestPerVerse[entry.verseRef].score) {
                        bestPerVerse[entry.verseRef] = entry;
                      }
                    });
                    const uniqueEntries = Object.values(bestPerVerse).sort((a, b) => a.verseRef.localeCompare(b.verseRef));
                    const ITEMS_PER_PAGE = 10;
                    const totalPages = Math.ceil(uniqueEntries.length / ITEMS_PER_PAGE);
                    const startIndex = (globalLeaderboardPage - 1) * ITEMS_PER_PAGE;
                    const pagedEntries = uniqueEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                    return (
                      <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                              <th style={{ padding: '0.8rem 1rem' }}>{t("經文出處", "Verse Reference")}</th>
                            <th style={{ padding: '0.8rem 1rem' }}>{t("玩家", "Player")}</th>
                            <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("最高分數", "Best Score")}</th>
                            <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>{t("模式/難度", "Mode/Lv")}</th>
                            <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>{t("查看排行榜", "Leaderboard")}</th>
                            <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>{t("直接挑戰", "Challenge")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedEntries.map((entry, idx) => {
                            const parseMode = (modeStr) => {
                              let modeType = modeStr || 'rain';
                              let difficulty = 0;
                              if (modeStr && modeStr.includes('-dx')) {
                                const parts = modeStr.split('-dx');
                                modeType = parts[0];
                                difficulty = parseInt(parts[1], 10) || 0;
                              }
                              return { modeType, difficulty };
                            };
                            const { modeType, difficulty } = parseMode(entry.mode);

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.8rem 1rem' }}>
                                  <button onClick={() => {
                                    const fullVerse = VERSES_CUV.find(v => v.reference === entry.verseRef) || VERSES_KJV.find(v => v.reference === entry.verseRef);
                                    if (fullVerse) {
                                      setVerseViewModal(fullVerse);
                                    } else {
                                      fetch(`https://bible-api.com/${encodeURIComponent(entry.verseRef)}?translation=kjv`)
                                        .then(res => res.json())
                                        .then(data => setVerseViewModal({ reference: data.reference, title: "Bible", text: data.text.trim() }))
                                        .catch(() => alert("Could not fetch verse preview"));
                                    }
                                  }} style={{ background: 'transparent', border: 'none', color: '#0369a1', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', padding: 0, textAlign: 'left' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                                    {entry.verseRef}
                                  </button>
                                </td>
                                <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>{entry.name}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '1.2rem', color: '#3b82f6' }}>{entry.score}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontSize: '0.85rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                     {modeType === 'square' ? <span style={{ background: '#fef3c7', color: '#d97706', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Square</span> : <span style={{ background: '#dbeafe', color: '#2563eb', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Rain</span>}
                                     <span style={{ color: '#64748b', fontWeight: 'bold' }}>Lv {difficulty}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                                  <button 
                                    onClick={() => {
                                      const fullVerse = activeVerseSets.flatMap(vs => vs.verses).find(v => v.reference === entry.verseRef) || { reference: entry.verseRef, title: "Custom" };
                                      setLeaderboardModalVerse(fullVerse);
                                      setIsFetchingLeaderboard(true);
                                      fetch(`/api/get-scores?verseRef=${encodeURIComponent(entry.verseRef)}`)
                                        .then(res => res.json())
                                        .then(data => setLeaderboardModalData(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
                                        .catch(() => setLeaderboardModalData({ alltime: [], monthly: [], daily: [] }))
                                        .finally(() => setIsFetchingLeaderboard(false));
                                    }}
                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', color: '#475569' }}
                                    onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                                    onMouseOut={(e) => e.target.style.background = '#f8fafc'}
                                  >
                                    🏆
                                  </button>
                                </td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      initAudio();
                                      
                                      // Search across all possible sets
                                      let targetVerse = VERSES_CUV.find(v => v.reference === entry.verseRef);
                                      let targetVersion = 'cuv';
                                      
                                      if (!targetVerse) {
                                        targetVerse = VERSES_KJV.find(v => v.reference === entry.verseRef);
                                        targetVersion = 'kjv';
                                      }

                                      // If still not found, it might be a custom record or from a different dataset
                                      if (!targetVerse && entry.verseRef) {
                                        try {
                                          const res = await fetch(`https://bible-api.com/${encodeURIComponent(entry.verseRef)}?translation=kjv`);
                                          if (res.ok) {
                                            const data = await res.json();
                                            targetVerse = {
                                              reference: data.reference,
                                              title: "Custom Selection",
                                              text: data.text.replace(/\n/g, ' ').trim()
                                            };
                                            targetVersion = 'kjv';
                                          }
                                        } catch (err) { console.error("Fetch failed", err); }
                                      }

                                      if (targetVerse && targetVerse.text) {
                                        // Clear everything first to prevent mode mixing
                                        setBlocks([]);
                                        setGameState('menu'); 
                                        
                                        if (version !== targetVersion) setVersion(targetVersion);
                                        setPlayMode(modeType);
                                        setDistractionLevel(difficulty);
                                        setActiveVerse(targetVerse);
                                        
                                        // Use the automatic start mechanism to ensure state convergence
                                        setInitAutoStart({ trigger: true, isAuto: false });
                                      } else {
                                        alert(t("找不到該經文內容，無法挑戰。", "Verse content not found, cannot challenge."));
                                      }
                                    }}
                                    style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                                    onMouseOver={(e) => e.target.style.background = '#d97706'}
                                    onMouseOut={(e) => e.target.style.background = '#f59e0b'}
                                  >
                                    {t("挑戰", "Challenge")}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>

                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                            <button
                              key={pageNum}
                              onClick={() => setGlobalLeaderboardPage(pageNum)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                border: '1px solid #cbd5e1',
                                background: globalLeaderboardPage === pageNum ? '#3b82f6' : '#ffffff',
                                color: globalLeaderboardPage === pageNum ? 'white' : '#334155',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }}
                            >
                              {pageNum}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                      (s.description && s.description.toLowerCase().includes(query))
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
                            {matchingSets.map(set => (
                              <div key={set.id} onClick={() => { setSelectedSetId(set.id); setMainTab('versesets'); }} style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
                                <div style={{ fontSize: '2rem' }}>📁</div>
                                <div>
                                  <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{set.title}</div>
                                  <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem' }}>{set.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
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
                                {matchingVerses.map((v, i) => (
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
                                ))}
                              </tbody>
                            </table>
                          </div>
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

            {mainTab === 'about' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#334155', lineHeight: '1.6' }}>
                <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontFamily: 'cursive', color: '#3b82f6' }}>Verse Rain 讓背記經文變得生動有趣！</h2>

                <p style={{ marginBottom: '1rem' }}>
                  一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。
                </p>
                <iframe width="560" height="315" src="//www.youtube.com/embed/2tFxeesKISk" frameborder="0" allowfullscreen=""></iframe>

                <p style={{ marginBottom: '1.5rem' }}>
                  一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。
                </p>
                <iframe width="560" height="315" src="//www.youtube.com/embed/Tty82Gn1gvQ" frameborder="0" allowfullscreen=""></iframe>

                <p style={{ marginBottom: '1.5rem' }}>
                  聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。
                </p>

                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li>學習多種語言的聖經經文！</li>
                  <li>點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。</li>
                  <li>透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。</li>
                  <li>提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。</li>
                  <li>挑戰模式有助於加強記憶同一個經文組中的多段相關經文。</li>
                  <li>線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！</li>
                </ul>

              </div>
            )}

          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div
          key={`${playMode}-${activeVerse.reference}-${distractionLevel}`}
          onClick={handleGlobalClick}
          style={{ position: 'absolute', width: '100vw', height: '100vh', top: 0, left: 0, overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, padding: 'clamp(0.5rem, 2vw, 1.5rem)', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start', zIndex: 10 }}>
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
                <XCircle size={28} />
              </button>
              {!isAutoPlay && (
                <div className="hud-glass" style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#93c5fd' }}>{activeVerse.reference}</span>
                </div>
              )}
            </div>

            {!isAutoPlay && (
              <div className="hud-glass" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#f87171' }}>
                  {[...Array(3)].map((_, i) => (
                    <Heart key={i} size={20} fill={i < health ? '#f87171' : 'transparent'} strokeWidth={i < health ? 0 : 2} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '1.2rem', fontWeight: 'bold', color: '#fbbf24' }}>
                  <Zap size={20} fill="#fbbf24" strokeWidth={0} /> {combo}x
                </div>
              </div>
            )}

            {!isAutoPlay && (
              <div className="hud-glass" style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '120px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-10px', left: '10px', color: '#fbbf24', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Crown size={12} /> {t("最高分", "Best")} {bestScore}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace', marginBottom: '0.2rem' }}>
                  {String(score).padStart(6, '0')}
                </div>
                <div style={{ padding: '0.25rem 0.75rem', background: 'rgba(0,0,0,0.5)', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>TIME</div>
                  <div style={{ fontSize: '1rem', color: timeLeft <= 1000 ? '#f87171' : '#cbd5e1', fontFamily: 'monospace' }}>
                    00:{String(Math.floor(timeLeft / 100)).padStart(2, '0')}.{String(timeLeft % 100).padStart(2, '0')}
                  </div>
                </div>
              </div>
            )}
          </div>

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
          ) : playMode === 'square' ? (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0 0 0', pointerEvents: 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${distractionLevel <= 1 ? 2 : 3}, minmax(0, 1fr))`, gap: '0.75rem', width: '95%', maxWidth: distractionLevel <= 1 ? '600px' : '900px', pointerEvents: 'auto' }}>
                {blocks.map(block => {
                  let appliedClasses = 'falling-block-inner';
                  if (block.error) appliedClasses += ' error-shake';
                  if (block.correct) appliedClasses += ' success-flash';
                  return (
                    <div key={block.id} className={appliedClasses} onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }} style={{ cursor: 'pointer', padding: 'clamp(0.5rem, 2vw, 1.5rem)', fontSize: 'clamp(0.9rem, 2.5vw, 1.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px', wordBreak: 'break-word', hyphens: 'auto', textAlign: 'center', visibility: block.hidden ? 'hidden' : 'visible' }}>
                      {!block.hidden && block.text}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', width: '100vw', height: '100vh', top: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' }}>
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
                    <div className={appliedClasses}>
                      {block.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
              <button
                onClick={() => startGame()}
                className="play-btn"
                style={{
                  width: '100%', maxWidth: '400px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1.2rem)',
                  fontSize: 'clamp(1.1rem, 2.5vh, 1.3rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto', flexShrink: 0
                }}
              >
                <RotateCcw size={24} /> {t("再玩一次", "Play Again")}
              </button>
            </div>
          ) : (
            <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '800px', maxHeight: '95dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', animation: isNewHighScore || isFlawless ? 'flashSuccess 1s ease-out' : 'none' }}>

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
                <div style={{ fontSize: 'clamp(1rem, 2.5vh, 1.25rem)', color: '#cbd5e1', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  {t("最終得分", "Final Score")}: <strong style={{ color: isNewHighScore ? '#fbbf24' : '#fff', fontSize: 'clamp(2rem, 5vh, 2.5rem)', display: 'block', marginTop: '0.2rem' }}>{score}</strong>
                </div>

                {!isAutoPlayRef.current && (
                  <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1rem', marginTop: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#fbbf24', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Trophy size={18} /> {t("全域英雄榜", "Global Leaderboard")}
                    </h3>

                    {!playerName ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>{t("想要將神聖高分刻在群組榜單上嗎？", "Want to carve your sacred high score on the universal leaderboard?")}</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            placeholder={t("您的 Skool 暱稱", "Your Nickname")}
                            id="playerNameInput"
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', outline: 'none' }}
                          />
                          <button
                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
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
                ) : (
                  <button
                    onClick={() => setGameState('menu')}
                    className="play-btn"
                    style={{
                      width: '100%', maxWidth: '300px', background: '#3b82f6', color: 'white', border: 'none', padding: 'clamp(0.8rem, 2vh, 1rem)',
                      fontSize: 'clamp(1.1rem, 2.5vh, 1.2rem)', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', margin: '0 auto'
                    }}
                  >
                    <Home size={20} /> {t("回到主頁", "Home")}
                  </button>
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
              onClick={() => setGameState('menu')}
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

            <button
              onClick={() => {
                const name = "Google P" + Math.floor(Math.random() * 999);
                setPlayerName(name);
                localStorage.setItem('verserain_player_name', name);
                setShowLoginModal(null);
              }}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.8rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background 0.2s', color: '#475569' }}
              onMouseOver={(e) => e.target.style.background = '#f8fafc'}
              onMouseOut={(e) => e.target.style.background = '#ffffff'}
            >
              <svg viewBox="0 0 48 48" width="20" height="20">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              {t("使用 Google 繼續", "Continue with Google")}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ padding: '0 1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>{t("或", "OR")}</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
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

            <button
              onClick={() => {
                const emailInput = document.getElementById('modalEmailInput');
                const email = emailInput ? emailInput.value.trim() : '';

                // Retrieve mock DB
                let mockDB = {};
                try {
                  mockDB = JSON.parse(localStorage.getItem('verserain_mock_user_db')) || {};
                } catch (e) { }

                let nameToSet = playerName || "";

                if (showLoginModal === 'signup') {
                  const nameInput = document.getElementById('modalPlayerNameInput');
                  if (nameInput && nameInput.value.trim().length > 0) {
                    nameToSet = nameInput.value.trim();
                  } else if (email) {
                    nameToSet = email.split('@')[0];
                  }
                  // Save to mock DB
                  if (email && nameToSet) {
                    mockDB[email] = nameToSet;
                    localStorage.setItem('verserain_mock_user_db', JSON.stringify(mockDB));
                  }
                } else {
                  if (email && mockDB[email]) {
                    // Found registered display name for this email!
                    nameToSet = mockDB[email];
                  } else if (email) {
                    nameToSet = email.split('@')[0];
                  }
                }

                if (!nameToSet) nameToSet = "Player" + Math.floor(Math.random() * 9999);

                setPlayerName(nameToSet);
                localStorage.setItem('verserain_player_name', nameToSet);
                setShowLoginModal(null);
              }}
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', marginTop: '0.5rem' }}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              {showLoginModal === 'signup' ? t("建立新帳號", "Create Account") : t("登入", "Log In")}
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
                </>
              )}
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

    </>
  );
}
