import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Heart, Zap, Trophy, Crown, Star, Home, XCircle, Headphones, Music, VolumeX, Search, Share2, Dices, Mic, MicOff, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import usePartySocket from 'partysocket/react';
import PartySocket from 'partysocket';
import QRCode from 'qrcode';
import './index.css';
import { BIBLE_BOOKS } from './bibleDictionary';

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
  const [playMode, setPlayMode] = useState('square_solo');
  const [distractionLevel, setDistractionLevel] = useState(0);
  const [selectedSetId, setSelectedSetId] = useState(null);

  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('verserain_is_premium') === 'true');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('verserain_player_email') || "");
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

  const baseVerseSets = version === 'cuv' ? VERSE_SETS_CUV : VERSE_SETS_KJV;
  const activeVerseSets = [...customVerseSets, ...baseVerseSets];
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
    const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[,，。；：「」、;:\.\?!！？『』《》\s]/;
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
    // Lightning visually disabled to reduce distraction
    return;
  }, []);  // Leaderboard specific state
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
  const [globalLeaderboardTab, setGlobalLeaderboardTab] = useState('daily');
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
  const [toast, setToast] = useState(null);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [qrShareModal, setQrShareModal] = useState(null); // { url, reference }
  const [multiplayerRoomId, setMultiplayerRoomId] = useState(null);
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

  const [multiplayerState, setMultiplayerState] = useState(null);
  const [myClientId, setMyClientId] = useState(null);
  const [intermissionCountdown, setIntermissionCountdown] = useState(0);

  useEffect(() => {
    if (gameState === 'intermission' && intermissionCountdown > 0) {
      const timer = setTimeout(() => {
        setIntermissionCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'intermission' && intermissionCountdown === 0) {
      if (multiplayerState?.host === myClientId && multiplayerState.campaignQueue && multiplayerState.campaignQueue.length > 0) {
          const nextVerse = multiplayerState.campaignQueue[0];
          const isEnglish = /^[a-zA-Z\s.,:;'"]+$/.test(nextVerse.text.substring(0, 50));
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
  }, [gameState, intermissionCountdown, multiplayerState, myClientId]);

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
          
          if (msg.state.status === 'playing' && gameStateRef.current !== 'playing') {
             setBlocks(msg.state.blocks);
             setGameState('playing');
             setHealth(3);
             setCombo(0);
             setScore(0);
             setTimeLeft(6000); 
             setCurrentSeqIndex(0);
             currentSeqRef.current = 0;
             // Set a placeholder activeVerse so HUD works
              const fakeVerse = { reference: msg.state.verseRef, title: "Multiplayer", text: msg.state.verseText || msg.state.blocks.filter(b=>!b.isFake).map(b=>b.text).join('') };
              setActiveVerse(fakeVerse);
              setPlayMode(msg.state.playMode || 'square');
              if (msg.state.distractionLevel !== undefined) {
                 setDistractionLevel(msg.state.distractionLevel);
              }
              
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 10);
           } else if (msg.state.status === 'playing' && gameStateRef.current === 'playing') {
              // Vital logic: Apply the refreshed block array from the referee!
              if (msg.state.playMode !== 'square_solo') {
                 setBlocks(msg.state.blocks);
              }
           }
           if (msg.state.status === 'intermission' && gameStateRef.current !== 'intermission') {
               setGameState('intermission');
               setIntermissionCountdown(5);
               if (timerRef.current) clearInterval(timerRef.current);
           }
           if (msg.state.status === 'finished' && gameStateRef.current !== 'multiplayer_results') {
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
      } catch (err) {}
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [multiplayerRoomId, playerName, triggerLightning]);


  // Process Challenge URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeRef = params.get('challenge');
    const setRef = params.get('set');

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
         initSquareBlocks(true, initAutoStart.campaignQueue, initAutoStart.verse);
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
      const isEnglish = /^[a-zA-Z\s.,:;'"]+$/.test(verse.text.substring(0, 50));
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

    const hs = isSuccess && healthRef.current > 0 && finalCalculatedScore > bestScore && finalCalculatedScore > 0;

    setIsFlawless(f);
    setIsNewHighScore(hs);
    setIsFailed(failed || healthRef.current <= 0); // Consider it visually failed if health <= 0, but verse completes

    if (isSuccess && !isAutoPlayRef.current) {
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
      if (multiplayerRoomId) {
         if (multiplayerState?.playMode === 'square_solo') {
            socketRef.current.send(JSON.stringify({ type: 'PLAYER_FINISHED_ROUND' }));
         }
         return; // In shared multiplayer, server dictates end. In solo, we just emitted that we are finished and now wait.
      } else {
         endGame();
      }
    }
  }, [currentSeqIndex, gameState, activePhrases.length, multiplayerRoomId, multiplayerState?.playMode]);

  // Sync individual progress for solo multiplayer mode
  useEffect(() => {
    if (multiplayerRoomId && gameState === 'playing' && multiplayerState?.playMode === 'square_solo' && socketRef.current) {
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
       try { recognitionRef.current.stop(); } catch(e) {}
    }

    if (multiplayerRoomId && socketRef.current && gameState === 'playing') {
       if (multiplayerState?.playMode !== 'square_solo') {
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

          if (playMode.startsWith('square') && distractionLevel >= 2) {
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

  // Sync handleBlockClick to ref so Speech can fire it
  useEffect(() => {
    handleBlockClickRef.current = handleBlockClick;
  }, [handleBlockClick]);

  useEffect(() => {
    if (!isMicOn) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setMicStatusText("");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("您的瀏覽器不支援語音辨識 (建議使用 Chrome/Safari)。");
      setIsMicOn(false);
      return;
    }

    let recognition;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = version === 'kjv' ? 'en-US' : 'zh-TW';
    } catch(e) {
      console.warn("Speech init failed", e);
      return;
    }

    let lastMatchedIndex = -1;

    recognition.onstart = () => {
      setMicStatusText("🎤");
    };

    recognition.onresult = (event) => {
      if (statusRef.current !== 'playing') return;

      let currentTranscript = "";
      let hasFinal = false;
      // Gather all available active chunks; we aggressively flush below to prevent trailing garbage
      for (let i = 0; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
        if (event.results[i].isFinal) hasFinal = true;
      }
      
      const isChinese = version !== 'kjv';
      setLiveTranscript(currentTranscript);

      let normalizedTranscript = "";
      if (isChinese) {
        // Deep string clear: strip absolutely everything except alphanumeric and chinese chars
        normalizedTranscript = currentTranscript.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
      } else {
        // Keep spaces for english but lowercase and strip punctuation
        normalizedTranscript = currentTranscript.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase();
      }

      const currIdx = currentSeqIndexRef.current;
      const expectedPhrase = phrasesRef.current[currIdx];
      
      if (!expectedPhrase) return;

      const checkPhraseMatch = (transcript, phrase, isStrict = false) => {
         if (isChinese) {
            const cleanPhrase = phrase.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
            if (isStrict) {
               // Strict mode for wrong blocks: require a larger chunk (up to 5 chars) to prevent false random lightning
               const requiredLen = Math.min(cleanPhrase.length, 5);
               return transcript.includes(cleanPhrase.substring(0, requiredLen));
            }
            if (cleanPhrase.length <= 2) return transcript.includes(cleanPhrase);
            for (let i = 0; i <= cleanPhrase.length - 2; i++) {
               if (transcript.includes(cleanPhrase.substring(i, i + 2))) return true;
            }
         } else {
            const cleanPhrase = phrase.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase();
            const words = cleanPhrase.split(/\s+/).filter(Boolean);
            if (isStrict) {
               const requiredWords = words.slice(0, Math.min(words.length, 3)).join(' ');
               return transcript.includes(requiredWords);
            }
            if (words.length <= 2) return transcript.includes(cleanPhrase);
            for (let i = 0; i <= words.length - 2; i++) {
               if (transcript.includes(words[i] + ' ' + words[i+1])) return true;
            }
         }
         return false;
      };

      if (currIdx !== lastMatchedIndex) {
        let matchedRight = false;
        let matchedWrong = false;

        // Priority 1: Check correct match
        if (checkPhraseMatch(normalizedTranscript, expectedPhrase)) {
          matchedRight = true;
          const targetBlock = blocksRef.current.find(b => b.seqIndex === currIdx && !b.error && !b.hidden);
          if (targetBlock && handleBlockClickRef.current) {
             lastMatchedIndex = currIdx;
             handleBlockClickRef.current(targetBlock);
          }
        }

        // Priority 2: Penalize reading visible wrong blocks
        if (!matchedRight) {
           const visibleBlocks = blocksRef.current.filter(b => !b.error && !b.hidden);
           for (const block of visibleBlocks) {
              if (block.seqIndex !== currIdx && block.seqIndex !== -99) {
                 const phraseText = block.isFake ? block.text : phrasesRef.current[block.seqIndex];
                 // Very careful with wrong block detection: use isStrict = true
                 if (phraseText && checkPhraseMatch(normalizedTranscript, phraseText, true)) {
                    matchedWrong = true;
                    if (handleBlockClickRef.current) {
                       handleBlockClickRef.current(block);
                       break;
                    }
                 }
              }
           }
        }

        // Garbage flush: If the user paused (hasFinal) and we didn't hit anything, clear the buffer silently
        if (!matchedRight && !matchedWrong && hasFinal) {
           setLiveTranscript("");
           if (recognitionRef.current) recognitionRef.current.stop();
        }
      }
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
         setIsMicOn(false);
         alert(t("需要麥克風權限才能使用語音功能！", "Microphone permission is required!"));
      }
    };

    recognition.onend = () => {
      if (isMicOnRef.current) {
         try { recognition.start(); } catch(e) {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Speech start err", e);
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [isMicOn, version]);

  return (
    <>
      <div className="bg-layer" />
      <div className="rain-system">
        <div className="rain-layer back" />
        <div className="rain-layer mid" />
        <div className="rain-layer front" />
      </div>

      {/* Global Mic Toggle & Subtitles */}
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

      {/* Global Music Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setIsMusicPlaying(!isMusicPlaying); }}
        className="hud-glass"
        style={{ position: 'fixed', bottom: '2rem', right: '1.5rem', padding: '0.75rem', borderRadius: '50%', color: isMusicPlaying ? '#4ade80' : '#cbd5e1', cursor: 'pointer', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
          <div style={{ display: 'flex', backgroundColor: '#334155', color: 'white', padding: '0 1rem', overflowX: 'auto', borderBottom: '2px solid #1e293b' }}>
            {[
              { id: 'versesets', label: t('經文組', 'Verse Sets') },
              { id: 'custom_verses', label: t('👑 我的題庫', '👑 Custom Sets') },
              { id: 'multiplayer', label: t('多人連線', 'Multiplayer') },
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

            {mainTab === 'custom_verses' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👑 {t("我的專屬題庫", "My Custom Sets")}</h2>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', color: isPremium ? '#fbbf24' : '#64748b', fontWeight: 'bold' }}>
                        {isPremium ? t("✨ Premium 認證", "✨ Premium Active") : t("🔒 基本帳號", "🔒 Basic Account")}
                    </div>
                </div>

                {!isPremium ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                        <h3 style={{ color: '#334155', marginBottom: '1rem' }}>{t("解鎖自訂經文組功能！", "Unlock Custom Verse Sets!")}</h3>
                        <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
                            {t("升級為 Skool MutualizedEconomy Premium 會員，無限建立你的專屬考題與默想清單，還能在多人連線模式中用你的題目考驗朋友！", "Upgrade to Skool MutualizedEconomy Premium to create unlimited custom verse sets and challenge your friends in multiplayer!")}
                        </p>
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
                                    <input type="text" value={editingCustomSet.title} onChange={e => setEditingCustomSet({...editingCustomSet, title: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} placeholder={t("例如：約翰福音核心經文", "e.g., Core Verses of John")} />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("簡介", "Description")}</label>
                                    <textarea value={editingCustomSet.description} onChange={e => setEditingCustomSet({...editingCustomSet, description: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '80px', resize: 'vertical' }} placeholder={t("描述一下這個題庫的用途...", "Describe this set...")} />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("經文列表", "Verses")}</label>
                                    
                                    {editingCustomSet.verses.map((v, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                                            <select value={v.version || 'CUV'} onChange={e => {
                                                const newVerses = [...editingCustomSet.verses];
                                                newVerses[idx].version = e.target.value;
                                                setEditingCustomSet({...editingCustomSet, verses: newVerses});
                                            }} style={{ padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
                                                <option value="CUV">CUV</option>
                                                <option value="KJV">KJV</option>
                                            </select>
                                            <input type="text" value={v.reference} onChange={e => {
                                                const newVerses = [...editingCustomSet.verses];
                                                newVerses[idx].reference = e.target.value;
                                                setEditingCustomSet({...editingCustomSet, verses: newVerses});
                                            }} placeholder={t("出處(如:約 3:16)", "Ref")} style={{ width: '120px', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                            
                                            <button type="button" onClick={async (e) => {
                                                const btn = e.currentTarget;
                                                const originalIcon = btn.innerText;
                                                
                                                if (!v.reference) return alert(t("請先輸入出處", "Please enter reference first"));
                                                btn.innerText = "⌛";
                                                try {
                                                    const version = (v.version || 'CUV');
                                                    const db = version === 'CUV' ? VERSES_CUV : VERSES_KJV;
                                                    // Normalize spacing, cases, and dashes (-, –, —, ~) for robust searching e.g., "約 3:16" == "約3:16"
                                                    const sanitizeRef = (str) => str.toString().replace(/\s+/g, '').replace(/[–—~]/g, '-').replace(/[：]/g, ':').toLowerCase();
                                                    const searchRef = sanitizeRef(v.reference);
                                                    let foundLocal = false;
                                                    let foundText = "";
                                                    
                                                    for (const verse of db) {
                                                        if (!verse.reference) continue;
                                                        const dbRef = sanitizeRef(verse.reference);
                                                        if (dbRef === searchRef) {
                                                            foundLocal = true;
                                                            foundText = verse.text;
                                                            break;
                                                        }
                                                        
                                                        const searchNumMatch = searchRef.match(/\d+.*$/);
                                                        const dbNumMatch = dbRef.match(/\d+.*$/);
                                                        
                                                        if (searchNumMatch && dbNumMatch) {
                                                            const searchNumPart = searchNumMatch[0];
                                                            const dbNumPart = dbNumMatch[0];
                                                            
                                                            // Number parts must match exactly to prevent "詩篇 1" from matching "詩篇 23:1"
                                                            if (searchNumPart === dbNumPart) {
                                                                const bookPart = searchRef.replace(searchNumPart, '');
                                                                const dbBookPart = dbRef.replace(dbNumPart, '');
                                                                let matchIdx = 0;
                                                                for (let i = 0; i < dbBookPart.length && matchIdx < bookPart.length; i++) {
                                                                    if (dbBookPart[i] === bookPart[matchIdx]) {
                                                                        matchIdx++;
                                                                    }
                                                                }
                                                                if (matchIdx === bookPart.length && matchIdx > 0) {
                                                                    foundLocal = true;
                                                                    foundText = verse.text;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    }
                                                    
                                                    if (foundLocal) {
                                                        setEditingCustomSet(prev => {
                                                            const newVerses = [...prev.verses];
                                                            newVerses[idx].text = foundText;
                                                            return {...prev, verses: newVerses};
                                                        });
                                                        btn.innerText = originalIcon;
                                                        return;
                                                    }
                                                    
                                                    // Fallback to Online API 
                                                    const searchNumMatch = searchRef.match(/\d+.*$/);
                                                    if (!searchNumMatch) throw new Error("Invalid Format");
                                                    
                                                    const searchNumPart = searchNumMatch[0];
                                                    const bookPart = searchRef.replace(searchNumPart, '');
                                                    
                                                    const chapMatch = searchNumPart.match(/^(\d+)/);
                                                    const chapter = chapMatch ? parseInt(chapMatch[1]) : 1;
                                                    
                                                    let startVerse = 1;
                                                    let endVerse = 999;
                                                    
                                                    const verseMatch = searchNumPart.match(/:(\d+)(?:-(\d+))?/);
                                                    if (verseMatch) {
                                                        startVerse = parseInt(verseMatch[1]);
                                                        endVerse = verseMatch[2] ? parseInt(verseMatch[2]) : startVerse;
                                                    } else if (!searchNumPart.includes(':')) {
                                                        startVerse = 1;
                                                        endVerse = 999;
                                                    }
                                                    
                                                    const bookInfo = BIBLE_BOOKS.find(b => b.names.some(n => n.toLowerCase() === bookPart || bookPart.includes(n.toLowerCase()) || n.toLowerCase().includes(bookPart)));
                                                    if (!bookInfo) throw new Error("Book not found");
                                                    
                                                    const bollsVersion = version === 'CUV' ? 'CUV' : 'KJV';
                                                    const res = await fetch(`https://bolls.life/get-text/${bollsVersion}/${bookInfo.id}/${chapter}/`);
                                                    if (!res.ok) throw new Error("API Connection Failed");
                                                    
                                                    const json = await res.json();
                                                    if (!Array.isArray(json) || json.length === 0) throw new Error("No data returned");
                                                    
                                                    const filtered = json.filter(v => v.verse >= startVerse && v.verse <= endVerse);
                                                    if (filtered.length === 0) throw new Error("Verses out of range");
                                                    
                                                    let combinedText = "";
                                                    if (version === 'CUV') {
                                                        combinedText = filtered.map(v => v.text.replace(/<[^>]+>/g, '').replace(/\s+/g, '')).join('');
                                                    } else {
                                                        combinedText = filtered.map(v => v.text.replace(/<[^>]+>/g, '').trim()).join(' ');
                                                    }
                                                    
                                                    setEditingCustomSet(prev => {
                                                        const newVerses = [...prev.verses];
                                                        newVerses[idx].text = combinedText;
                                                        return {...prev, verses: newVerses};
                                                    });
                                                    
                                                } catch (e) {
                                                    alert(t(`找不到「${v.reference}」！(錯誤: ${e.message})\n請確認格式是否如「約 3:16」或手編測試。`, `Cannot find ${v.reference}. Error: ${e.message}`));
                                                }
                                                btn.innerText = originalIcon;
                                            }} title={t("自動擷取", "Auto-fetch")} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>🪄</button>
                                            
                                            <textarea value={v.text} onChange={e => {
                                                const newVerses = [...editingCustomSet.verses];
                                                newVerses[idx].text = e.target.value;
                                                setEditingCustomSet({...editingCustomSet, verses: newVerses});
                                            }} placeholder={t("經文內容", "Verse Text")} style={{ flex: 1, padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', minHeight: '40px', resize: 'vertical' }} />
                                            
                                            <button type="button" onClick={() => {
                                                const newVerses = editingCustomSet.verses.filter((_, i) => i !== idx);
                                                setEditingCustomSet({...editingCustomSet, verses: newVerses});
                                            }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.6rem', borderRadius: '4px', cursor: 'pointer' }}>✖</button>
                                        </div>
                                    ))}
                                    
                                    <button type="button" onClick={() => {
                                        setEditingCustomSet({
                                            ...editingCustomSet, 
                                            verses: [...editingCustomSet.verses, { version: 'CUV', reference: '', text: '' }]
                                        });
                                    }} style={{ background: '#e2e8f0', color: '#475569', border: '1px dashed #94a3b8', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', width: '100%', marginTop: '0.5rem', fontWeight: 'bold' }}>
                                        + {t("新增一節經文", "Add Verse")}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="button" onClick={() => {
                                        if(!editingCustomSet.title) return alert(t("請填寫標題", "Please fill in title"));
                                        if(editingCustomSet.verses.length === 0) return alert(t("請至少新增一節經文", "Please add at least one verse"));
                                        
                                        const setObj = {
                                            ...editingCustomSet,
                                            id: editingCustomSet.id || `custom-${Date.now()}`
                                        };
                                        
                                        let updatedSets;
                                        if(editingCustomSet.id) {
                                            updatedSets = customVerseSets.map(s => s.id === setObj.id ? setObj : s);
                                        } else {
                                            updatedSets = [setObj, ...customVerseSets];
                                        }
                                        
                                        setCustomVerseSets(updatedSets);
                                        localStorage.setItem('verseRain_custom_sets', JSON.stringify(updatedSets));
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
                                                    <button type="button" onClick={() => setEditingCustomSet(set)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>{t("編輯", "Edit")}</button>
                                                    <button type="button" onClick={() => {
                                                        if(window.confirm(t("確定要刪除嗎？", "Are you sure you want to delete?"))) {
                                                            const updated = customVerseSets.filter(s => s.id !== set.id);
                                                            setCustomVerseSets(updated);
                                                            localStorage.setItem('verseRain_custom_sets', JSON.stringify(updated));
                                                        }
                                                    }} style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#ef4444' }}>{t("刪除", "Delete")}</button>
                                                </div>
                                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', paddingRight: '120px' }}>{set.title}</h3>
                                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>{set.description}</p>
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
                
                {!multiplayerRoomId ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                    <p style={{ color: '#64748b' }}>{t("與朋友一起挑戰九宮格模式！最快拼出經文的人獲勝。", "Challenge your friends in Square mode! The fastest to assemble the verse wins.")}</p>
                    
                    <button 
                      onClick={() => {
                        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
                        let newRoom = '';
                        for(let i=0; i<4; i++) newRoom += chars.charAt(Math.floor(Math.random() * chars.length));
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
                        maxLength={4}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', textTransform: 'uppercase', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }} 
                        onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('joinRoomBtn')?.click(); }}
                      />
                      <button 
                        id="joinRoomBtn"
                        onClick={() => {
                          const code = document.getElementById('joinRoomInput')?.value.trim().toUpperCase();
                          if (code && code.length > 0) setMultiplayerRoomId(code);
                        }}
                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {t("加入", "Join")}
                      </button>
                    </div>
                  </div>
                ) : multiplayerState?.status === 'ready_check' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                     <div style={{ padding: '1.5rem', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '2px dashed #d946ef', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ margin: '0 0 1rem 0', color: '#86198f' }}>{t("準備比賽！", "Get Ready!")}</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c026d3', marginBottom: '0.5rem' }}>{multiplayerState.verseRef}</div>
                        <div style={{ fontSize: '1rem', color: '#701a75', marginBottom: '1rem', fontStyle: 'italic', maxWidth: '300px', lineHeight: '1.4' }}>"{multiplayerState.verseText}"</div>
                        <p style={{ color: '#a21caf', fontSize: '0.9rem', margin: 0 }}>{t("雙方準備就緒後即將開始", "Match starts when both are ready")}</p>
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
                     
                     <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
                        
                        <button 
                          onClick={() => {
                             if (socketRef.current) socketRef.current.send(JSON.stringify({ type: 'PLAYER_READY' }));
                          }}
                          disabled={multiplayerState.players[myClientId]?.isReady}
                          style={{ background: multiplayerState.players[myClientId]?.isReady ? '#10b981' : '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: multiplayerState.players[myClientId]?.isReady ? 'default' : 'pointer' }}
                        >
                          {multiplayerState.players[myClientId]?.isReady ? t("已準備", "Ready") : t("準備！", "Ready!")}
                        </button>
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
                               <option value="square">{t("共用九宮格 (Shared Square)", "Shared Square")}</option>
                               <option value="rain" disabled>{t("雨滴瀑布 (VerseRain) - 即將推出", "VerseRain - Coming Soon")}</option>
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
                                     <input 
                                         type="number" 
                                         min="1" 
                                         max={pickerSelectedSet.verses?.length || 1} 
                                         value={randomPickCount} 
                                         onChange={(e) => setRandomPickCount(Math.min(pickerSelectedSet.verses?.length || 1, Math.max(1, parseInt(e.target.value) || 1)))}
                                         style={{ width: '40px', padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                                     />
                                     <button 
                                       onClick={() => {
                                          if (!pickerSelectedSet || !pickerSelectedSet.verses) return;
                                          const shuffled = [...pickerSelectedSet.verses].sort(() => 0.5 - Math.random());
                                          const selected = shuffled.slice(0, randomPickCount);
                                          setActiveVerse(selected[0]);
                                          setPlayMode(multiplayerPlayMode);
                                          setDistractionLevel(multiplayerDistractionLevel);
                                          setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: selected, verse: selected[0] });
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
                                        setInitAutoStart({ trigger: true, isAuto: false, isMultiplayerReadyCheck: true, campaignQueue: multiplayerSelectedVerses, verse: multiplayerSelectedVerses[0] });
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
                            )})}
                         </div>
                      )}
                   </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', width: '100%', maxWidth: '400px' }}>
                      <h3 style={{ margin: '0 0 1rem 0', color: '#334155' }}>{t("等待玩家...", "Waiting...")}</h3>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '6px', marginBottom: '1rem' }}>{multiplayerRoomId}</div>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>{t("請朋友輸入上方的代碼來加入您的遊戲", "Ask your friend to enter this code to join")}</p>
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
                            <td style={{ padding: '1rem', textAlign: 'center', color: '#3b82f6', fontSize: '1.2rem' }}>{customVerseSets.some(c => c.id === set.id) ? '👑' : '📁'}</td>
                            <td style={{ padding: '1rem', fontWeight: 'bold', color: '#1e293b', fontSize: '1.05rem' }}>{set.title}</td>
                            <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>{set.description || ""}</td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: '#337ab7', fontWeight: 'bold' }}>{set.verses.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                              <option value="square">Square</option>
                              <option value="rain">Rain</option>
                            </select>
                            <select
                              onChange={(e) => setDistractionLevel(Number(e.target.value))}
                              value={distractionLevel}
                              style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              <option value={0}>Lv 0</option>
                              <option value={1}>Lv 1</option>
                              <option value={2}>Lv 2</option>
                              <option value={3}>Lv 3</option>
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

                          <button
                            onClick={() => {
                              initAudio();
                              const queue = [...VERSES_DB];
                              setCampaignQueue(queue.slice(1));
                              setCampaignResults([]);
                              setActiveVerse(queue[0]);
                              setTimeout(() => startGame(false, queue), 50);
                            }}
                            title={t("依序遊玩全部經文", "Play all verses in sequence")}
                            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '0 0.8rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <Play size={16} fill="white" /> {t("Play", "Play")}
                          </button>

                          <button
                            onClick={() => {
                              initAudio();
                              const queue = [...VERSES_DB];
                              setCampaignQueue(queue.slice(1));
                              setMainTab('multiplayer');
                              const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
                              let newRoom = '';
                              for(let i=0; i<4; i++) newRoom += chars.charAt(Math.floor(Math.random() * chars.length));
                              setMultiplayerRoomId(newRoom);
                            }}
                            title={t("開房間邀請連線遊玩", "Invite players for the whole set")}
                            style={{ backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', padding: '0 0.8rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s', fontWeight: 'bold', gap: '5px' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <Users size={16} /> {t("Invite", "Invite")}
                          </button>
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
                                      style={{ padding: '0.1rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#334155', backgroundColor: '#fff', width: '80px' }}
                                    >
                                      <option value="square">Square</option>
                                      <option value="rain">Rain</option>
                                    </select>
                                    <select
                                      onChange={(e) => setDistractionLevel(Number(e.target.value))}
                                      value={distractionLevel}
                                      style={{ padding: '0.1rem 0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#334155', backgroundColor: '#fff', width: '80px' }}
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

            {mainTab === 'leaderboard' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#d97706" /> {t("全球 VerseRain 排行榜", "Global Leaderboard")}</h2>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button onClick={() => { setGlobalLeaderboardTab('daily'); setGlobalLeaderboardPage(1); }} style={{ padding: '0.5rem 1rem', border: 'none', background: globalLeaderboardTab === 'daily' ? '#10b981' : '#e2e8f0', color: globalLeaderboardTab === 'daily' ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t("本日排行", "Daily")}</button>
                  <button onClick={() => { setGlobalLeaderboardTab('monthly'); setGlobalLeaderboardPage(1); }} style={{ padding: '0.5rem 1rem', border: 'none', background: globalLeaderboardTab === 'monthly' ? '#8b5cf6' : '#e2e8f0', color: globalLeaderboardTab === 'monthly' ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t("本月排行", "Monthly")}</button>
                  <button onClick={() => { setGlobalLeaderboardTab('alltime'); setGlobalLeaderboardPage(1); }} style={{ padding: '0.5rem 1rem', border: 'none', background: globalLeaderboardTab === 'alltime' ? '#3b82f6' : '#e2e8f0', color: globalLeaderboardTab === 'alltime' ? 'white' : '#475569', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t("歷史總榜", "All Time")}</button>
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

                <hr style={{ border: 'none', borderTop: '2px dashed #e2e8f0', margin: '2rem 0' }} />

                <h2 style={{ color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📖 VerseRain 使用手冊 / User Manual
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                  {/* Chinese Version */}
                  <div>
                    <h3 style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '0.8rem', color: '#1e293b' }}>中文版使用說明</h3>
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      <section>
                        <h4 style={{ color: '#3b82f6', marginBottom: '0.3rem' }}>1. 教會小組比賽</h4>
                        <p>這是一款非常適合團契、小組或是主日學舉辦比賽的工具。您可以將畫面投影到大螢幕上，讓不同隊伍同時針對某一組核心經文進行挑戰模式（Rain 模式）。透過實時排行榜，大家可以互相激勵，讓背聖經變得像電競一樣熱血！</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#3b82f6', marginBottom: '0.3rem' }}>2. 兒童與青少年的讀經利器</h4>
                        <p>對於正在學習認字或背誦的孩子，VerseRain 的「語音朗讀」功能非常關鍵。點擊掉落的字塊時，系統會同步發音，結合「視覺」與「聽覺」的雙重刺激，讓孩子在遊戲中不知不覺就背下了整段經文。</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#3b82f6', marginBottom: '0.3rem' }}>3. 個人靈修與默想</h4>
                        <p>在個人靜修時，您可以使用 Square（棋盤）模式。這種模式沒有時間壓力，您可以專注於經文的每一個詞彙、每一個逗點，透過點擊與重組的過程，反覆默想神的話語如何在您心中扎根。</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#3b82f6', marginBottom: '0.3rem' }}>4. 雙語學習與對照</h4>
                        <p>透過右上角的語系切換，您可以隨時在中文（和合本）與英文（KJV）之間切換。對於想學習英文經文或是想對照原文語感的玩家來說，這是一個極佳的語言學習工具。</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#3b82f6', marginBottom: '0.3rem' }}>5. 線上互派挑戰</h4>
                        <p>點擊列表右側的「分享」圖示，即可複製專屬的挑戰連結。您可以將連結貼到 LINE 或 WhatsApp 群組，邀請朋友針對某一節經文一較高下，看看誰能達成「完美無瑕 (Flawless)」的最高境界！</p>
                      </section>
                    </div>
                  </div>

                  {/* English Version */}
                  <div>
                    <h3 style={{ borderLeft: '4px solid #10b981', paddingLeft: '0.8rem', color: '#1e293b' }}>English User Manual</h3>
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      <section>
                        <h4 style={{ color: '#10b981', marginBottom: '0.3rem' }}>1. Church & Small Group Competition</h4>
                        <p>VerseRain is the perfect tool for fellowships or Sunday schools to host scripture memorization contests. Project the game on a big screen and let teams compete in "Rain" mode. The real-time leaderboard adds a competitive edge that makes learning scripture exciting!</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#10b981', marginBottom: '0.3rem' }}>2. Interactive Learning for Kids</h4>
                        <p>For children who are learning to read or memorize, the Text-to-Speech (TTS) feature is vital. As words fall and are clicked, the system reads them aloud. This combines visual and auditory learning, helping kids memorize verses effortlessly through playtime.</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#10b981', marginBottom: '0.3rem' }}>3. Personal Devotion & Meditation</h4>
                        <p>During your personal quiet time, use the "Square" mode. With no timer or pressure, you can focus on every word and punctuation. The physical act of selecting and reassembling the verse helps you ruminate on God's Word more deeply.</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#10b981', marginBottom: '0.3rem' }}>4. Bilingual Bible Study</h4>
                        <p>Toggle between Chinese (CUV) and English (KJV) using the language switcher in the top-right corner. It’s an excellent way for learners to master English scripture or for students of the Bible to compare different translations side-by-side.</p>
                      </section>
                      <section>
                        <h4 style={{ color: '#10b981', marginBottom: '0.3rem' }}>5. Social Challenge Sharing</h4>
                        <p>Click the "Share" icon on the verse table to copy a unique challenge link. Share it with friends on social media or messaging groups to invite them to beat your high score. Aim for the "Flawless" title together!</p>
                      </section>
                    </div>
                  </div>
                </div>

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
                 
                 {Object.values(multiplayerState.players).find(p => p.id !== myClientId) && (() => {
                    const opp = Object.values(multiplayerState.players).find(p => p.id !== myClientId);
                    return (
                       <div className="hud-glass" style={{ padding: '0.3rem 0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', minHeight: '36px', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                          <div style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '-0.3rem', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', color: '#f87171', opacity: 0.8 }}>
                            {[...Array(3)].map((_, i) => (
                              <Heart key={i} size={14} fill={i < (opp.health || 0) ? '#f87171' : 'transparent'} strokeWidth={i < (opp.health || 0) ? 0 : 2} />
                            ))}
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fecaca', fontFamily: 'monospace' }}>
                            {String(opp.score || 0).padStart(6, '0')}
                          </div>
                       </div>
                    );
                 })()}
              </>
            )}
          </div>

          {!isAutoPlay && playMode.startsWith('square') && (() => {
            const HUD_PAGE_SIZE = 40;
            const startIdx = Math.floor(currentSeqIndex / HUD_PAGE_SIZE) * HUD_PAGE_SIZE;
            const currentPhrasesWindow = activePhrases.slice(startIdx, currentSeqIndex);

            return (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '35vh', minHeight: '180px', zIndex: 10, pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}>
                 <div className="hud-glass" style={{ flex: 1, padding: '1rem 5vw', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '16px 16px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: 'none' }}>
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
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: playMode.startsWith('square') ? '35vh' : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 0 0 0', pointerEvents: 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${distractionLevel <= 1 ? 2 : 3}, minmax(0, 1fr))`, gap: '0.75rem', width: '95%', maxWidth: distractionLevel <= 1 ? '600px' : '900px', pointerEvents: 'auto' }}>
                {blocks.map(block => {
                  let appliedClasses = 'falling-block-inner';
                  if (block.error) appliedClasses += ' error-shake';
                  if (block.correct && (!block.claimedBy || block.claimedBy === myClientId)) appliedClasses += ' success-flash';
                  
                  let blockStyle = { cursor: 'pointer', padding: 'clamp(0.5rem, 2vw, 1.5rem)', fontSize: 'clamp(0.9rem, 2.5vw, 1.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px', wordBreak: 'break-word', hyphens: 'auto', textAlign: 'center', visibility: block.hidden ? 'hidden' : 'visible' };
                  
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

          {/* Waiting for others overlay for solo mode */}
          {multiplayerRoomId && multiplayerState?.playMode === 'square_solo' && multiplayerState?.players?.[myClientId]?.isFinished && (
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <h2 style={{ color: '#34d399', fontSize: '2.5rem', marginBottom: '1rem', animation: 'flashSuccess 1s ease-out' }}>{t("完成本回合！", "Round Finished!")}</h2>
                <div style={{ color: '#cbd5e1', fontSize: '1.2rem', animation: 'bounce 2s infinite' }}>{t("等待其他玩家完成...", "Waiting for others to finish...")}</div>
             </div>
          )}

          {/* Competitor Progress HUD for Solo Mode */}
          {multiplayerRoomId && multiplayerState?.playMode === 'square_solo' && (
             <div style={{ position: 'absolute', top: '5rem', left: '1rem', zIndex: 40, display: 'flex', flexDirection: 'column', gap: '0.8rem', pointerEvents: 'none' }}>
                {Object.values(multiplayerState.players || {}).filter(p => p.id !== myClientId && p.connected).map(p => (
                   <div key={p.id} style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.3rem', backdropFilter: 'blur(4px)' }}>
                      <div style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                         <span>{p.name}</span>
                         <span style={{ color: '#fbbf24' }}>{p.isFinished ? '✅' : `${p.seqIndex}/${activePhrases.length}`}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#cbd5e1', fontSize: '0.9rem', minWidth: '120px' }}>
                         <span style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{Math.max(0, p.score)} pts</span>
                         <span style={{ display: 'flex' }}>
                             {Array.from({ length: 3 }).map((_, i) => (
                               <Heart key={i} size={12} color={i < p.health ? "#ef4444" : "#475569"} fill={i < p.health ? "#ef4444" : "none"} style={{ marginLeft: '2px' }} />
                             ))}
                         </span>
                      </div>
                      {/* Mini progress bar */}
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                         <div style={{ width: `${(p.seqIndex / activePhrases.length) * 100}%`, height: '100%', background: p.isFinished ? '#10b981' : '#3b82f6', transition: 'width 0.3s' }}></div>
                      </div>
                   </div>
                ))}
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
                   .sort((a,b) => b.totalScore - a.totalScore)
                   .map((p, idx) => (
                   <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', backgroundColor: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : '#64748b' }}>#{idx+1}</div>
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
                              <div style={{ color: '#93c5fd', fontWeight: 'bold', textAlign: 'left', marginBottom: '0.5rem' }}>{t("回合", "Round")} {rIdx+1}: {round.verseRef}</div>
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                 {Object.keys(round.scores)
                                     .sort((a,b) => round.scores[b] - round.scores[a])
                                     .map((pid, rank) => {
                                         const player = multiplayerState.players[pid];
                                         if (!player) return null;
                                         return (
                                            <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', background: rank === 0 ? 'rgba(16, 185, 129, 0.2)' : 'transparent', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                               {rank === 0 && <span style={{color: '#10b981'}}>★</span>}
                                               {player.name}: <span style={{fontWeight: 'bold', fontFamily: 'monospace'}}>{Math.max(0, round.scores[pid])}</span>
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

      {gameState === 'intermission' && multiplayerState && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', flexDirection: 'column' }}>
          <div className="hud-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', padding: '4rem 2rem', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
             <h2 style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '1.5rem', fontWeight: 'bold' }}>{t("太棒了！準備下一回合", "Great job! Get ready...")}</h2>
             <p style={{ color: '#cbd5e1', fontSize: '1.5rem', marginBottom: '2.5rem' }}>
                {t("還剩", "Remaining:")} <strong style={{ color: '#fff' }}>{multiplayerState.campaignQueue?.length}</strong> {t("節經文", "verses")}
             </p>
             <p style={{ color: '#93c5fd', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                {t("接下來：", "Next Up:")} {multiplayerState.campaignQueue?.[0]?.reference || multiplayerState.campaignQueue?.[0]}
             </p>
             {multiplayerState.campaignQueue?.[0]?.text && (
                 <div style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '150px', overflowY: 'auto' }}>
                    {multiplayerState.campaignQueue[0].text}
                 </div>
             )}
             <div style={{ fontSize: '6rem', fontWeight: 'bold', color: '#fbbf24', animation: 'bounce 1s infinite' }}>
                {intermissionCountdown}
             </div>
          </div>
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
                setShowLoginModal(null);
                setShowNameEditModal(true);
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
                        setPlayerName(data.user.name || email.split('@')[0]);
                        setUserEmail(data.user.email);
                        setIsPremium(data.user.isPremium);
                        localStorage.setItem('verserain_player_name', data.user.name || email.split('@')[0]);
                        localStorage.setItem('verserain_player_email', data.user.email);
                        localStorage.setItem('verserain_is_premium', data.user.isPremium ? 'true' : 'false');
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
                onMouseOver={(e) => { if(!authLoading) e.target.style.background = '#2563eb' }}
                onMouseOut={(e) => { if(!authLoading) e.target.style.background = '#3b82f6' }}
              >
                {authLoading ? "..." : (showLoginModal === 'signup' ? t("建立新帳號 (需與 Skool Email 相同以獲取權限)", "Create Account") : t("登入", "Log In"))}
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
                {t("設定您的暱稱", "Set Your Display Name")}
              </h2>
              <button 
                onClick={() => setShowNameEditModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <XCircle size={24} />
              </button>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              {t("請輸入您想在排行榜上顯示的名稱（例如您的 Skool 名稱）。", "Enter the name you'd like to show on the leaderboard (e.g., your Skool name).")}
            </p>
            <input 
              id="nameEditInput"
              type="text"
              maxLength={20}
              placeholder={t("輸入名稱...", "Enter name...")}
              defaultValue={playerName && !playerName.startsWith("Google P") ? playerName : ""}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('saveNameBtn')?.click(); }}
              style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '1rem', outline: 'none' }}
            />
            <button 
              id="saveNameBtn"
              onClick={() => {
                const input = document.getElementById('nameEditInput');
                const newName = input ? input.value.trim() : "";
                if (newName) {
                  setPlayerName(newName);
                  localStorage.setItem('verserain_player_name', newName);
                  setToast(t("設定成功！觀迎遊玩，", "Name set! Welcome, ") + newName);
                  setTimeout(() => setToast(null), 3000);
                  setShowNameEditModal(false);
                }
              }}
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              {t("確認儲存", "Save & Continue")}
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

    </>
  );
}
