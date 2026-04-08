import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Heart, Zap, Trophy, Crown, Star, Home, XCircle, Headphones, Music, VolumeX } from 'lucide-react';
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

import { VERSES_DB as VERSES_CUV } from './verses';
import { VERSES_DB_KJV as VERSES_KJV } from './verses_kjv';
import { getRandomFakePhrase } from './fakeLogic';

export default function App() {
  const [version, setVersion] = useState('cuv');
  const [playMode, setPlayMode] = useState('rain');
  const [distractionLevel, setDistractionLevel] = useState(0);
  const VERSES_DB = version === 'cuv' ? VERSES_CUV : VERSES_KJV;

  const [activeVerse, setActiveVerse] = useState(VERSES_DB[0]);
  const [selectedVerseRefs, setSelectedVerseRefs] = useState([VERSES_DB[0].reference]);
  
  const [initAutoStart, setInitAutoStart] = useState(null);

  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const bgmAudioRef = useRef(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    if (!bgmAudioRef.current) {
        bgmAudioRef.current = new Audio('/bgm.mp3');
        bgmAudioRef.current.loop = true;
        bgmAudioRef.current.volume = 0.4;
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
    const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[\s,，。；：「」、;:\.\?!！？『』《》]/;
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
        if (anim.animationName === 'fall') {
            anim.playbackRate = rate;
        }
      });
    });
  }, [combo, blocks]);

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
      const spawnFake = distractionLevel > 0 && Math.random() < (distractionLevel * 0.20); // 20%, 40%, 60% chance

      if (spawnFake && playMode !== 'square') {
          isFake = true;
          seqToSpawn = -1;
      } else if (candidates.includes(targetSeq)) {
          seqToSpawn = targetSeq; 
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
    const initialCount = Math.min(9, phrases.length);
    const initialIndices = Array.from({ length: initialCount }, (_, i) => i);
    initialIndices.sort(() => Math.random() - 0.5);

    const newBlocks = initialIndices.map((pIndex) => ({
      id: Math.random().toString(36).substr(2, 9),
      text: phrases[pIndex],
      seqIndex: pIndex,
      isSquare: true,
      error: false,
      correct: false,
      hidden: false
    }));
    
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
        const calculatedTimeBonus = Math.floor(Math.max(0, timeLeft) * 0.5);
        setTimeBonus(calculatedTimeBonus);
        finalCalculatedScore += calculatedTimeBonus;
        setScore(finalCalculatedScore);
        scoreRef.current = finalCalculatedScore;
    } else {
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
        const actualModeName = playMode === 'rain' && distractionLevel > 0 ? `rain-dx${distractionLevel}` : playMode;
        
        setIsSubmittingScore(true);
        fetch('/api/submit-score', {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
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
      const voiceRate = isAutoPlayRef.current ? 1.0 : Math.min(Math.pow(1.05, combo), 2.2);

      setScore(s => s + 100 + (combo * 50));
      setCombo(c => c + 1);
      
      const nextSeq = currentSeqIndex + 1;
      const TTS_LANG = version === 'kjv' ? 'en-US' : 'zh-TW';
      
      if (nextSeq === activePhrases.length - 1 && playMode !== 'square') {
        // Only one final block remaining - auto-complete it to save a click
        // Concatenate both pieces together to say it completely
        const finalVoiceRate = isAutoPlayRef.current ? 1.0 : Math.min(Math.pow(1.05, combo + 1), 2.2);
        const combinedText = block.text + (version === 'kjv' ? ". " : "，") + activePhrases[nextSeq];
        speechRef.current = speakText(combinedText, finalVoiceRate, TTS_LANG);

        setScore(s => s + 100 + ((combo + 1) * 50));
        setCombo(c => c + 1);
        setCurrentSeqIndex(activePhrases.length);
        currentSeqRef.current = activePhrases.length;
      } else {
        speechRef.current = speakText(block.text, voiceRate, TTS_LANG);
        setCurrentSeqIndex(nextSeq);
        currentSeqRef.current = nextSeq; // Update instantly before useEffect triggers
      }
      
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, correct: true } : b));
      
      if (gameState === 'playing') {
         if (playMode === 'square') {
             const nextSpawnIndex = block.seqIndex + 9;
             setTimeout(() => {
                setBlocks(prev => prev.map(b => {
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
                }));
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
        setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, error: false } : b));
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
          style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '0.75rem', borderRadius: '50%', color: isMusicPlaying ? '#4ade80' : '#cbd5e1', cursor: 'pointer', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
          {isMusicPlaying ? <Music size={24} /> : <VolumeX size={24} />}
      </button>

      {gameState === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100dvh', width: '100vw', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'calc(env(safe-area-inset-top) + 2rem) 1rem 4rem' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: '1.5rem', marginTop: '2rem', background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
            VerseRain
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '2rem', textAlign: 'center', maxWidth: '600px' }}>
            {t("在下方選擇一段經文。依照順序接住落下的詞句！", "Select a verse below. Catch the falling phrases in order!")}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => handleVersionChange('cuv')} 
                  style={{
                    background: version === 'cuv' ? '#3b82f6' : 'transparent',
                    color: version === 'cuv' ? 'white' : '#94a3b8',
                    border: version === 'cuv' ? 'none' : '1px solid #475569',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                >
                  {t("和合本", "CUV")}
                </button>
                <button 
                  onClick={() => handleVersionChange('kjv')} 
                  style={{
                    background: version === 'kjv' ? '#3b82f6' : 'transparent',
                    color: version === 'kjv' ? 'white' : '#94a3b8',
                    border: version === 'kjv' ? 'none' : '1px solid #475569',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                >
                  KJV
                </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setPlayMode('rain')} 
                  style={{
                    background: playMode === 'rain' ? '#10b981' : 'transparent',
                    color: playMode === 'rain' ? 'white' : '#94a3b8',
                    border: playMode === 'rain' ? 'none' : '1px solid #475569',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                >
                  Verse Rain
                </button>
                <button 
                  onClick={() => setPlayMode('square')} 
                  style={{
                    background: playMode === 'square' ? '#10b981' : 'transparent',
                    color: playMode === 'square' ? 'white' : '#94a3b8',
                    border: playMode === 'square' ? 'none' : '1px solid #475569',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                >
                  Verse Square
                </button>
            </div>
            
            {playMode === 'rain' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', marginTop: '1rem', width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                  <div style={{ color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                    <Zap size={18} color={distractionLevel > 0 ? '#f59e0b' : '#94a3b8'} /> 
                    {t("流星雨干擾模式", "Meteor Distraction")}: {distractionLevel === 0 ? t("關閉", "Off") : `Lv ${distractionLevel}`}
                  </div>
                  <input 
                    type="range" 
                    min="0" max="3" 
                    value={distractionLevel}
                    onChange={(e) => setDistractionLevel(Number(e.target.value))}
                    style={{ width: '250px', cursor: 'pointer', accentColor: '#10b981' }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', maxWidth: '300px' }}>
                    {distractionLevel > 0 ? t("會有假方塊從天上掉下來干擾你的判斷！千萬別點到它們。", "Fake blocks will fall from the sky to test your memory! Don't click them.") : ""}
                  </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '600px', justifyContent: 'center', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
            <button 
              onClick={() => {
                if (selectedVerseRefs.length === 0) return;
                initAudio();
                const queue = VERSES_DB.filter(v => selectedVerseRefs.includes(v.reference));
                const sortedQueue = [...queue];
                setCampaignQueue(sortedQueue.slice(1));
                setCampaignResults([]);
                setActiveVerse(sortedQueue[0]);
                setTimeout(() => startGame(true), 50);
              }}
              className="play-btn"
              style={{
                background: selectedVerseRefs.length === 0 ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '1rem 2rem', flex: '1 1 200px',
                fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '9999px', cursor: selectedVerseRefs.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: selectedVerseRefs.length === 0 ? 'none' : '0 0 20px rgba(16, 185, 129, 0.5)', transition: 'all 0.2s', justifyContent: 'center'
              }}
            >
              <Headphones fill="white" size={20} /> {t("自動播放", "Auto Play")}
            </button>
            <button 
              onClick={() => {
                if (selectedVerseRefs.length === 0) return;
                initAudio();
                const queue = VERSES_DB.filter(v => selectedVerseRefs.includes(v.reference));
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
              className="play-btn"
              style={{
                background: selectedVerseRefs.length === 0 ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', padding: '1rem 2rem', flex: '1 1 200px',
                fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '9999px', cursor: selectedVerseRefs.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: selectedVerseRefs.length === 0 ? 'none' : '0 0 20px rgba(59, 130, 246, 0.5)', transition: 'all 0.2s', justifyContent: 'center'
              }}
            >
              <Play fill="white" size={20} /> {t("開始遊戲", "Play")}
            </button>
            <button 
              onClick={() => {
                  initAudio();
                  const shuffled = [...VERSES_DB].sort(() => Math.random() - 0.5);
                  setCampaignQueue(shuffled.slice(1));
                  setCampaignResults([]);
                  setActiveVerse(shuffled[0]);
                  setTimeout(() => startGame(false), 50);
              }}
              className="play-btn"
              style={{
                background: '#8b5cf6', color: 'white', border: 'none', padding: '1rem 2rem', flex: '1 1 200px',
                fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '9999px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)', transition: 'all 0.2s', justifyContent: 'center'
              }}
            >
              <Star fill="white" size={20} /> {t("全部連播", "Play All")}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', width: '100%', maxWidth: '900px', marginBottom: '2rem' }}>
            {VERSES_DB.map((v, i) => {
               const vBest = parseInt(localStorage.getItem(`verseRainBestScore_${v.reference}`)) || 0;
               const isSelected = selectedVerseRefs.includes(v.reference);
               return (
                  <div 
                     key={i} 
                     className="hud-glass verse-card" 
                     onClick={() => toggleSelection(v.reference)}
                     style={{ cursor: 'pointer', padding: '1.5rem', transition: 'all 0.2s', border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)', transform: isSelected ? 'scale(1.02)' : 'scale(1)', textAlign: 'left', display: 'flex', flexDirection: 'column', position: 'relative' }}
                  >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h3 style={{ color: '#93c5fd', marginBottom: '0.2rem', fontSize: '1.2rem', paddingRight: '10px' }}>{v.reference}</h3>
                          <button
                             onClick={(e) => {
                                 e.stopPropagation();
                                 initAudio();
                                 setCampaignQueue(null);
                                 setCampaignResults([]);
                                 setActiveVerse(v);
                                 setTimeout(() => startGame(false), 50);
                             }}
                             style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'background 0.2s', zIndex: 2 }}
                             onMouseOver={(e) => e.target.style.background = '#2563eb'}
                             onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                          >
                             <Play size={12} fill="white" /> {t("挑戰", "Play")}
                          </button>
                      </div>
                      <div style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 'bold' }}>{v.title}</div>
                      <p style={{ color: '#cbd5e1', fontSize: '0.9rem', flex: 1, maxHeight: '100px', overflowY: 'auto', paddingRight: '0.5rem', lineHeight: '1.5' }}>{v.text}</p>
                      <button 
                          style={{
                              marginTop: '1rem', background: 'transparent', border: '1px solid rgba(251, 191, 36, 0.4)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 'bold', padding: '0.5rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s', width: 'fit-content'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)'; e.currentTarget.style.borderColor = '#fbbf24'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)'; }}
                          onClick={(e) => {
                              e.stopPropagation();
                              setLeaderboardModalVerse(v);
                              setIsFetchingLeaderboard(true);
                              fetch(`/api/get-scores?verseRef=${encodeURIComponent(v.reference)}`)
                                .then(res => res.json())
                                .then(data => {
                                   setLeaderboardModalData(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] });
                                })
                                .catch(() => setLeaderboardModalData({ alltime: [], monthly: [], daily: [] }))
                                .finally(() => setIsFetchingLeaderboard(false));
                          }}
                      >
                         <Trophy size={14}/> {vBest > 0 ? t(`最高分: ${vBest} / 排行榜`, `Best: ${vBest} / Leaderboard`) : t(`查看排行榜`, `Leaderboard`)}
                      </button>
                  </div>
               )
            })}
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div 
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', width: '95%', maxWidth: '900px', pointerEvents: 'auto' }}>
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
                {timeBonus > 0 && (
                  <div style={{ fontSize: 'clamp(0.9rem, 2vh, 1.1rem)', color: '#34d399', marginBottom: 'clamp(0.2rem, 1vh, 0.5rem)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {t("時間加成", "Time Bonus")}: {(timeLeft / 100).toFixed(2)}s × 50 = +{timeBonus}
                  </div>
                )}
                <div style={{ fontSize: 'clamp(1rem, 2.5vh, 1.25rem)', color: '#cbd5e1', marginBottom: 'clamp(0.5rem, 2vh, 1rem)' }}>
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
                               const actualModeName = playMode === 'rain' && distractionLevel > 0 ? `rain-dx${distractionLevel}` : playMode;
                               fetch('/api/submit-score', {
                                  method: 'POST',
                                  headers: {'Content-Type': 'application/json'},
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
                            {[ {id: 'daily', label: t('今天', 'Today')}, {id: 'monthly', label: t('30天 (本月)', '30 days (Month)')}, {id: 'alltime', label: t('歷史', 'All-Time')} ].map(tab => (
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
                      <h2 style={{ fontSize: '1.5rem', color: '#93c5fd', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={20}/> {t("英雄榜", "Leaderboard")}</h2>
                      <div style={{ color: '#cbd5e1' }}>{leaderboardModalVerse.reference}</div>
                  </div>
                  <button onClick={() => setLeaderboardModalVerse(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}><XCircle size={24} /></button>
               </div>
               
               <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                   {[ {id: 'daily', label: t('今天', 'Today')}, {id: 'monthly', label: t('30天 (本月)', '30 days (Month)')}, {id: 'alltime', label: t('歷史', 'All-Time')} ].map(tab => (
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
    </>
  );
}
