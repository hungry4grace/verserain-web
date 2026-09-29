import React, { useState, useEffect, useRef, useMemo } from 'react';
import { expandSameChapterRefs } from './lib/expandSameChapterRefs.js';
import { Play, Trophy, Crown, Home, XCircle, Headphones, Music, VolumeX, Share2, Mic, MicOff, Users, Info, Edit, TreePine, Gamepad2, Map, Settings, Library, Volume2, Shuffle, Swords, Apple, Sprout, Leaf, Hourglass, Frown, X, Square, Copy, ArrowRightLeft, Languages, Check, Save } from 'lucide-react';
import { UiHost, Button, IconButton, useBackToClose, toast, confirmDialog, alertDialog } from './ui';
import BottomNav from './BottomNav.jsx';
import { navTabOf } from './navTabs.js';
import TodayPage from './TodayPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import Onboarding from './Onboarding.jsx';
import { CATALOG as VOUCHER_CATALOG, DEFAULT_VALUE as VOUCHER_DEFAULTS } from '../api/_lib/rewardCatalog.js';
import confetti from 'canvas-confetti';
import usePartySocket from 'partysocket/react';
import PartySocket from 'partysocket';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { classifyGardenResponse, decideGardenSync, buildFruitAuthorKeys, aggregateFruitResults, tidyGarden, findGardenKey, findGardenKeyIndexed, buildCanonicalGardenIndex, compactGardenCells, gardenGapCount } from './lib/gardenSync.js';
import { voiceMatchesSavedKey, dedupeVoices, buildVoiceOptions } from './lib/voicePicker.js';
import { splitVersePhrases } from './lib/phraseSplitter.js';
import './index.css';
import { BIBLE_BOOKS, getBookAbbr, getBookFullName } from './bibleDictionary';
import { HEBREW_FULL_BOOK_ID, KOREAN_FULL_BOOK_ID, MULTILANG_FULL_BOOK_ID, ENGLISH_BOOK_LOCALIZATION_MAP, normalizeVerseReferenceKey, verseRefKey } from './lib/verseRef.js';
import { getUiDicts } from './uiDicts';
import QrScanner from 'qr-scanner';
import { loadLanguageSets } from './verseLoader';
import { getRandomFakePhrase } from './fakeLogic';
import { PREMIUM_EMAILS } from './premiumEmails';
import ChallengeSetupModal, { loadChallengeSetup } from './ChallengeSetupModal';
import GardenView from './GardenView.jsx';
import { REFERRAL_CODE_RE } from './lib/referralCode.js';
import { isBlankRef } from './lib/gardenView.js';
import { GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, APPLE_REDIRECT_URI, LINE_CHANNEL_ID } from './oauthConfig';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array, isWebPushSupported, isIOSStandalone, isIOSWithoutPWA, hasNativeDailyPush, callNativeDailyPush } from './pushConfig';
import { setVoiceApi, uploadSetAsset, compressBackgroundImage, getSetAssetDataUrl, userVoiceApi, voiceOwnerId, voiceCommentApi, uploadVoiceComment } from './setVoiceApi';
import VerseVoiceRecorder from './VerseVoiceRecorder';
import { APP_TITLE_BY_LANG, FIRST_RUN, INITIAL_VERIFY_CODE, setShareUiLang, SUPPORTED_UI_LANGS, buildPublicShareUrl, initialBibleVersion, parseRoute, pathWithSharedLang, postTouch, routeFromState, uiLangForVersion } from './lib/routes.js';
import { AUTO_PLAY_REFERENCE_PAUSE_MS, AUTO_PLAY_VERSE_PAUSE_MS, BIBLE_LANGUAGE_OPTIONS, DEFAULT_PLAY_DURATION_CHOICE, DEFAULT_PLAY_FONT_CHOICE, DEFAULT_PLAY_INK_CHOICE, PLAY_DURATION_OPTIONS, PLAY_FONT_OPTIONS, PLAY_INK_OPTIONS, dropLegacyBibleCaches, fetchBibleVerseFromAPI, fetchEditorVerseText, fetchVerseFromBolls, fetchVerseFromGetBible, fetchVerseFromTaibible, findMatchingVerse, formatLocalDate, getCachedBibleVerse, getDailyVerseIndex, getDailyVerseRemoteVersion, getEnglishReferenceFromKey, getVoiceLangForVersion, isEnglishBibleVersion, normalizeVerseInput, parseScriptureKey, pickRandomVerse, readPlayInkChoice, setCachedBibleVerse } from './lib/bible.js';
import { GARDEN_LOOKUP_LANGS, TOPIC_PREFIX_REGEX, extractVerseSetTopic, fetchGardenVerseOnline, findVerseByRef, formatVerseReferenceForDisplay, formatVerseReferenceForSpeech, getFirstTopicChar, localizeOfficialTopicSetTitle, parseVerseRef, titleSortKey, topicStrokeCollator } from './lib/verseDisplay.js';
import { PARTY_HOST, fetchRetry, isMySet, isOwnedByCurrentUser, rememberPreviousName } from './lib/partyApi.js';
import { PRESET_BGM, initAudio, pickPresetBgmFile, playBong, playFireworksSound, playTada, playThunder, presetBgmFor, startLoopingBgm } from './lib/audio.js';
import { SKOOL_LEVELS, getSkoolLevel, sanitizeRoomCode } from './lib/rooms.js';
import { setSpeechRateScale, speakText, stopSpeechIfActive } from './lib/speech.js';
import { ActivityHeatmap } from './garden/ActivityHeatmap.jsx';
import { BindInviterModal } from './invite/BindInviterModal.jsx';
import { OAuthButtons } from './auth/OAuthButtons.jsx';
import { PERSONAL_LOOSE_SET_ID } from './lib/sets.js';
import { VerseSetContinuousRainPlayer } from './player/VerseSetContinuousRainPlayer.jsx';
import AboutPage from './pages/AboutPage.jsx';
import SponsorPage from './pages/SponsorPage.jsx';
import DonatePage from './pages/DonatePage.jsx';
import ManualPage from './pages/ManualPage.jsx';
import MapPage from './pages/MapPage.jsx';
import VerifyPage from './pages/VerifyPage.jsx';
import SponsorsPage from './pages/SponsorsPage.jsx';
import GardenPage from './pages/GardenPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import VerseSetsPage from './pages/VerseSetsPage.jsx';
import CustomVersesPage from './pages/CustomVersesPage.jsx';
import MultiplayerPage from './pages/MultiplayerPage.jsx';
import AdvancedPage from './pages/AdvancedPage.jsx';
import AccessiblePage from './pages/AccessiblePage.jsx';
import DailyVersePage from './pages/DailyVersePage.jsx';
import BilingualRainPage from './pages/BilingualRainPage.jsx';
import RewardsAdminPage from './pages/RewardsAdminPage.jsx';
import CharityPage from './pages/CharityPage.jsx';
import ContestsPage from './pages/ContestsPage.jsx';
import MerchantPage from './pages/MerchantPage.jsx';
import { compactBtn } from './lib/compactBtn.js';
import VoicePlayScreen from './game/VoicePlayScreen.jsx';
import RainPlayScreen from './game/RainPlayScreen.jsx';
import WaitingScreen from './game/WaitingScreen.jsx';
import MultiplayerResultsScreen from './game/MultiplayerResultsScreen.jsx';
import IntermissionScreen from './game/IntermissionScreen.jsx';
import GameOverScreen from './game/GameOverScreen.jsx';
import CampaignResultsScreen from './game/CampaignResultsScreen.jsx';

// Lazy-load heavy, feature-specific chunks so they stay OUT of the initial bundle
// and download only when the feature is opened (behind a <Suspense>):
//   • WorldMap → the 3D globe (three / react-globe.gl), only on the Map tab (pages/MapPage.jsx)
//   • PlacePinMap → the pin-drop map, only on the merchant / rewards-admin pages (pages/*)
//   • BlindModeGame → recitation matching (pinyin-pro / opencc-js), only in blind mode (game/VoicePlayScreen.jsx)
//   • ReactQuill → the rich-text editor (react-quill-new + its CSS), only when editing a set (pages/CustomVersesPage.jsx)

// The game clock counts hundredths of a second (timeLeft 6000 = 60.00 s) but
// ticks every 100 ms: each tick re-renders all of App, and a 10 ms tick meant
// 100 renders a second on phones.
const GAME_TICK_MS = 100;
const GAME_TICK_STEP = GAME_TICK_MS / 10;


export default function App() {
  const [loadedLangs, setLoadedLangs] = useState({});
  const [isLangsLoading, setIsLangsLoading] = useState(true);
  const [speechReady, setSpeechReady] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!window.__speechUnlocked;
  });

  const [version, setVersion] = useState(() => initialBibleVersion());
  const [bilingualSecondaryVersion, setBilingualSecondaryVersion] = useState(() => localStorage.getItem('verseRain_bilingualSecondaryVersion') || 'kjv');
  useEffect(() => {
    localStorage.setItem('verseRain_version', version);
  }, [version]);
  useEffect(() => {
    localStorage.setItem('verseRain_bilingualSecondaryVersion', bilingualSecondaryVersion);
  }, [bilingualSecondaryVersion]);
  useEffect(() => {
    if (bilingualSecondaryVersion !== version) return;
    const fallback = BIBLE_LANGUAGE_OPTIONS.find(option => option.value !== version)?.value || 'kjv';
    setBilingualSecondaryVersion(fallback);
  }, [version, bilingualSecondaryVersion]);

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

  useEffect(() => {
    let mounted = true;
    if (bilingualSecondaryVersion && !loadedLangs[bilingualSecondaryVersion]) {
      loadLanguageSets(bilingualSecondaryVersion).then(data => {
        if (mounted) {
          setLoadedLangs(prev => ({ ...prev, [bilingualSecondaryVersion]: data }));
        }
      }).catch(error => {
        console.error('Failed to load bilingual secondary language', bilingualSecondaryVersion, error);
      });
    }
    return () => { mounted = false; };
  }, [bilingualSecondaryVersion, loadedLangs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      if (window.__speechUnlocked) setSpeechReady(true);
    };
    window.addEventListener('click', sync);
    window.addEventListener('touchstart', sync);
    return () => {
      window.removeEventListener('click', sync);
      window.removeEventListener('touchstart', sync);
    };
  }, []);

  const VERSES_CUV = loadedLangs['cuv']?.verses || [];
  const VERSES_KJV = loadedLangs['kjv']?.verses || [];
  const VERSES_ESV = loadedLangs['esv']?.verses || [];
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
  // 長輩模式: bigger text (html font-size), taller buttons, calmer screen,
  // stronger contrast and slower reading — one switch (設定 or first run).
  const [elderMode, setElderMode] = useState(() => localStorage.getItem('verserain_elder_mode') === 'true');
  useEffect(() => {
    document.documentElement.classList.toggle('elder-mode', elderMode);
    setSpeechRateScale(elderMode ? 0.85 : 1);
    try { localStorage.setItem('verserain_elder_mode', elderMode ? 'true' : 'false'); } catch { /* best effort */ }
  }, [elderMode]);
  const [selectedSetId, setSelectedSetId] = useState(() => parseRoute(window.location.hash).setId);
  const [authorSetsModal, setAuthorSetsModal] = useState(null);
  // 'idle' | 'playing' | 'paused' — TTS state for the verse set description.
  const [descTtsState, setDescTtsState] = useState('idle');
  useEffect(() => {
    setDescTtsState('idle');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [selectedSetId]);

  const [isPremium, setIsPremium] = useState(() => {
    const storedPremium = localStorage.getItem('verserain_is_premium') === 'true';
    const storedEmail = localStorage.getItem('verserain_player_email') || "";
    return storedPremium || PREMIUM_EMAILS.includes(storedEmail.toLowerCase());
  });

  // ─── My Inviter (推薦人) state ──────────────────────────────────────────
  // Single source of truth: localStorage.verseRain_inviter. On login the
  // OAuth handler already restores user.invitedBy into localStorage so this
  // value is consistent across devices for the same account.
  const [myInviterCode, setMyInviterCode] = useState(() => {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem('verserain_inviter') || null;
    // Treat self-invite as unbound — see [App.jsx:4138] for how this can
    // happen and the matching display-time guard below.
    const own = localStorage.getItem('verserain_personal_code');
    return v && v !== own ? v : null;
  });
  // myInviterName tri-state:
  //   undefined = not yet looked up (or no code to look up yet)
  //   null      = lookup completed but there's no name mapping for that code
  //   string    = inviter's nickname
  const [myInviterName, setMyInviterName] = useState(undefined);
  const [showBindInviterModal, setShowBindInviterModal] = useState(false);

  // Keep myInviterCode in sync with localStorage edits made elsewhere
  // (e.g. when login restores user.invitedBy into localStorage).
  useEffect(() => {
    const sync = () => {
      const raw = localStorage.getItem('verserain_inviter') || null;
      const own = localStorage.getItem('verserain_personal_code');
      const v = raw && raw !== own ? raw : null;
      setMyInviterCode(prev => (prev === v ? prev : v));
    };
    sync();
    const interval = setInterval(sync, 2000);
    return () => clearInterval(interval);
  }, []);

  // Look up the inviter's display name when we have a code.
  useEffect(() => {
    if (!myInviterCode) { setMyInviterName(undefined); return; }
    let cancelled = false;
    setMyInviterName(undefined); // mark "looking up"
    fetch(`/api/get-name-by-code?code=${encodeURIComponent(myInviterCode)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const name = data?.name || null;
        // Cross-device self-invite guard: if the resolved nickname matches
        // our own playerName, the "inviter" is actually ourselves on
        // another device (e.g. opened our own ref link in this WebView).
        // Clear it so the card flips back to the "未綁定" CTA. Read from
        // localStorage rather than the playerName state because that state
        // is declared later in the function and would TDZ here.
        const ownName = (typeof window !== 'undefined' && localStorage.getItem('verserain_player_name')) || '';
        if (name && ownName && name === ownName) {
          localStorage.removeItem('verserain_inviter');
          setMyInviterCode(null);
          setMyInviterName(undefined);
          return;
        }
        setMyInviterName(name);
      })
      .catch(() => { if (!cancelled) setMyInviterName(null); });
    return () => { cancelled = true; };
  }, [myInviterCode]);

  // ─── Web Push state ─────────────────────────────────────────────────────
  // 'idle' | 'subscribed' | 'denied' | 'unsupported' | 'needs-pwa'
  const [pushStatus, setPushStatus] = useState('idle');
  const [showPushModal, setShowPushModal] = useState(false);
  // Soft pre-permission prompt ("要不要開每日經文推播?"). Shown from the
  // 2nd app open onward — never on first launch (let people experience the
  // app before asking for anything), never after an explicit refusal, and
  // "remind me later" snoozes it for 7 days.
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(FIRST_RUN);
  const finishOnboarding = () => {
    try { localStorage.setItem('verserain_onboarded', '1'); } catch { /* best effort */ }
    setShowOnboarding(false);
  };
  // Deep-link auto-start gate: holds { run } when a ?startSet deep link is
  // ready to launch but the page hasn't seen a user gesture yet (Chrome
  // blocks speechSynthesis until then). One tap unlocks audio + launches.
  // May also carry { verseVoice } — a family member's recording of today's
  // verse, played right after the tap (親人聲音唸經文).
  const [deepLinkStartGate, setDeepLinkStartGate] = useState(null);

  // Tap on the gate: unlock audio and launch the pending deep-linked set.
  const beginDeepLinkStart = async () => {
    const gate = deepLinkStartGate;
    if (!gate) return;
    setDeepLinkStartGate(null);
    gate.run();
  };
  const swRegRef = useRef(null);

  // Count app opens (one per page load) for the prompt's 2nd-open gate.
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem('verserain_open_count') || '0') + 1;
      localStorage.setItem('verserain_open_count', String(n));
    } catch { /* private mode etc. */ }
  }, []);

  useEffect(() => {
    // Only nudge people who *could* subscribe right now and never have:
    // 'idle' excludes subscribed / denied / unsupported / needs-pwa.
    if (pushStatus !== 'idle') return;
    try {
      // Explicitly unsubscribed before → they made a choice; don't nag.
      // Already subscribed (per local flag) → the async status check may
      // still be in flight while pushStatus reads 'idle'; don't flash the
      // prompt at people who already said yes.
      const subscribedFlag = localStorage.getItem('verserain_push_subscribed');
      if (subscribedFlag === 'false' || subscribedFlag === 'true') return;
      const prompt = JSON.parse(localStorage.getItem('verserain_push_prompt') || '{}');
      if (prompt.never) return;
      if (prompt.remindAt && Date.now() < prompt.remindAt) return;
      const opens = Number(localStorage.getItem('verserain_open_count') || '0');
      if (opens < 2) return;
    } catch { return; }
    // Small delay so the prompt doesn't collide with app startup.
    const timer = setTimeout(() => setShowPushPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, [pushStatus]);

  const snoozePushPrompt = () => {
    try {
      const prompt = JSON.parse(localStorage.getItem('verserain_push_prompt') || '{}');
      prompt.remindAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem('verserain_push_prompt', JSON.stringify(prompt));
    } catch { /* ignore */ }
    setShowPushPrompt(false);
  };

  const dismissPushPromptForever = () => {
    try {
      localStorage.setItem('verserain_push_prompt', JSON.stringify({ never: true }));
    } catch { /* ignore */ }
    setShowPushPrompt(false);
  };

  // Register the service worker on mount + figure out the current push state.
  useEffect(() => {
    // Inside the iOS App Store wrapper: no Web Push, but the native shell
    // schedules local notifications for us. Ask it where things stand.
    if (hasNativeDailyPush()) {
      let cancelled = false;
      callNativeDailyPush('status').then((res) => {
        if (cancelled) return;
        if (res?.status === 'subscribed') setPushStatus('subscribed');
        else if (res?.status === 'denied') setPushStatus('denied');
        else setPushStatus('idle');
      });
      return () => { cancelled = true; };
    }
    if (!isWebPushSupported()) {
      // Older iOS Safari (pre-16.4) and the in-app WKWebView fall here.
      if (typeof navigator !== 'undefined' && /iPhone|iPad/i.test(navigator.userAgent || '') && !isIOSStandalone()) {
        setPushStatus('needs-pwa');
      } else {
        setPushStatus('unsupported');
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        if (cancelled) return;
        swRegRef.current = reg;
        if (Notification.permission === 'denied') { setPushStatus('denied'); return; }
        const existing = await reg.pushManager.getSubscription();
        setPushStatus(existing ? 'subscribed' : 'idle');
        // Backfill the personalCode → subscription index for devices that
        // subscribed before this existed.
        if (existing) registerPushCode(existing.toJSON());
      } catch (e) {
        console.error('SW register failed', e);
        setPushStatus('unsupported');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Also index this web-push subscription by personalCode (Redis) so referral
  // milestone / cheer notifications can reach this device — the daily-push table
  // is keyed by endpoint and can't be looked up by code.
  const registerPushCode = (subJson) => {
    if (!subJson || !subJson.endpoint || !personalCode) return;
    fetch('/api/save-push-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: personalCode, subscription: subJson }),
    }).catch(() => {});
  };

  // Wire a subscription up with the backend. Stores it under the user's
  // playerName so the cron sender can find it. Times are encoded in the
  // user's IANA timezone so the morning push lands at local 7am.
  const subscribeMorningPush = async () => {
    // Native iOS app: hand off to the native push layer (APNs remote push,
    // with a local-notification fallback when registration fails).
    if (hasNativeDailyPush()) {
      const res = await callNativeDailyPush('subscribe', {
        playerName: playerName || 'Anonymous',
        email: userEmail || '',
        version,
        hour: 7,
        // Lets the native app index its APNs token by personalCode so referral
        // milestone / cheer pushes can reach this device (see save-apns-code).
        personalCode: personalCode || '',
      });
      if (res?.status === 'subscribed') {
        setPushStatus('subscribed');
        localStorage.setItem('verserain_push_subscribed', 'true');
        return true;
      }
      setPushStatus(res?.status === 'denied' ? 'denied' : 'idle');
      return false;
    }
    try {
      if (!swRegRef.current) {
        const reg = await navigator.serviceWorker.register('/sw.js');
        swRegRef.current = reg;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus(permission === 'denied' ? 'denied' : 'idle');
        return false;
      }
      const subscription = await swRegRef.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei';
      const res = await fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/save-push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName || 'Anonymous',
          email: userEmail || '',
          subscription: subscription.toJSON(),
          timezone,
          version,
          hour: 7,
        }),
      });
      if (!res.ok) throw new Error('save-push-subscription failed');
      registerPushCode(subscription.toJSON());
      setPushStatus('subscribed');
      localStorage.setItem('verserain_push_subscribed', 'true');
      return true;
    } catch (e) {
      console.error('subscribeMorningPush failed', e);
      return false;
    }
  };

  const unsubscribeMorningPush = async () => {
    if (hasNativeDailyPush()) {
      await callNativeDailyPush('unsubscribe');
      setPushStatus('idle');
      localStorage.setItem('verserain_push_subscribed', 'false');
      return;
    }
    try {
      if (!swRegRef.current) return;
      const sub = await swRegRef.current.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      await fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/delete-push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName || 'Anonymous' }),
      }).catch(() => {});
      setPushStatus('idle');
      localStorage.setItem('verserain_push_subscribed', 'false');
    } catch (e) {
      console.error('unsubscribeMorningPush failed', e);
    }
  };
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('verserain_player_email') || "");
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('verserain_player_name') || "");
  // Inline rename in the header — null when not editing, else the draft value.
  const [editingPlayerName, setEditingPlayerName] = useState(null);
  const [editingPlayerNamePassword, setEditingPlayerNamePassword] = useState('');
  const [editingPlayerNameError, setEditingPlayerNameError] = useState('');
  const [savingPlayerName, setSavingPlayerName] = useState(false);
  // Personal invite code. Generated per-device on first run, but once the user
  // logs in we adopt the ACCOUNT's canonical code (returned by the server) so
  // every device shares one code — keeping referral/fruit-point keys aligned.
  const [personalCode, setPersonalCode] = useState(() => {
    let code = localStorage.getItem('verserain_personal_code');
    if (!code) {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      code = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      localStorage.setItem('verserain_personal_code', code);
    }
    return code;
  });

  // Adopt the account's canonical personalCode returned by login/verify. If it
  // differs from this device's local code, remember the old one so historic
  // fruit/referral points stored under it are still counted (see fruit fetch).
  // `rememberDevice` is false when the server says this device's code belongs
  // to ANOTHER account (shared tablet, or one person with two accounts): the
  // guest history under it is theirs, so it must not be folded into ours.
  const adoptAccountPersonalCode = React.useCallback((accountCode, rememberDevice = true) => {
    const code = typeof accountCode === 'string' ? accountCode.trim() : '';
    if (!code) return;
    const current = localStorage.getItem('verserain_personal_code');
    if (current && current !== code && rememberDevice) {
      // Preserve the set of prior codes this device used, so no fruits go missing.
      let prev = [];
      try { prev = JSON.parse(localStorage.getItem('verserain_prev_personal_codes') || '[]'); } catch { prev = []; }
      if (!prev.includes(current)) prev.push(current);
      localStorage.setItem('verserain_prev_personal_codes', JSON.stringify(prev));
    }
    localStorage.setItem('verserain_personal_code', code);
    setPersonalCode(code);
  }, []);

  // A restored session never goes through /login or /oauth-login again, so a
  // device that signed in before codes were unified would keep its own random
  // code forever (phone ≠ computer). On every start-up with a signed-in
  // account, ask the server for the account's canonical code and adopt it;
  // an account that has none yet takes this device's code.
  useEffect(() => {
    const email = (userEmail || '').trim().toLowerCase();
    if (!email) return;
    // "Previous codes" are per ACCOUNT: switching to a different account on
    // this device must not inherit the last account's codes.
    try {
      const owner = localStorage.getItem('verserain_prev_codes_owner') || '';
      if (owner && owner !== email) localStorage.setItem('verserain_prev_personal_codes', '[]');
      localStorage.setItem('verserain_prev_codes_owner', email);
    } catch { /* storage off */ }
    const deviceCode = localStorage.getItem('verserain_personal_code') || '';
    fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/sync-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, personalCode: deviceCode || undefined }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.personalCode) adoptAccountPersonalCode(d.personalCode, !d.deviceCodeTaken); })
      .catch(() => {});
  }, [userEmail, adoptAccountPersonalCode]);

  // Proof of sign-in for money routes (points → merchant discounts). Minted by
  // PartyKit on login; see sessionKey in src/party/server.js.
  const [sessionKey, setSessionKey] = useState(() => { try { return localStorage.getItem('verserain_session_key') || ''; } catch { return ''; } });

  const playerNameRef = useRef(playerName);

  // UI Language — independent of Bible version for scalable i18n
  const [uiLang, setUiLang] = useState(() => {
    // A share link carries the SENDER's UI language (?lang=…). Honour it so the
    // recipient reads the directions in the language the set was shared in
    // instead of their own default — an NIV set shared by an English user must
    // not land in a Chinese UI. Session-only: we deliberately do NOT persist it,
    // so the recipient's own saved preference survives.
    try {
      const linkLang = new URLSearchParams(window.location.search).get('lang');
      if (linkLang && SUPPORTED_UI_LANGS.includes(linkLang)) return linkLang;
    } catch { /* no window.location in non-browser contexts */ }
    const stored = localStorage.getItem('verseRain_uiLang');
    if (stored) return stored;
    // No saved UI language. Returning players keep the old rule (derived from
    // their saved Bible version); a first visit follows the phone's language.
    const savedVersion = localStorage.getItem('verseRain_version');
    if (savedVersion) {
      if (savedVersion === 'kjv' || savedVersion === 'esv') return 'en';
      if (savedVersion === 'ja') return 'ja';
      if (savedVersion === 'ko') return 'ko';
      return 'zh';
    }
    return uiLangForVersion(initialBibleVersion());
  });
  const setUiLangPersisted = (lang) => {
    localStorage.setItem('verseRain_uiLang', lang);
    setUiLang(lang);
  };
  // Mirror the active UI language to module scope so buildPublicShareUrl stamps
  // it on every link this device sends out.
  useEffect(() => {
    setShareUiLang(uiLang);
    if (typeof document !== 'undefined') {
      // Note: only lang/title — no document dir flip, the app's layout is LTR
      // by design and per-component RTL handling already covers ar/he/fa.
      document.documentElement.lang = uiLang;
      document.title = APP_TITLE_BY_LANG[uiLang] || APP_TITLE_BY_LANG.zh;
    }
  }, [uiLang]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  // Sync personalCode to playerName mapping
  useEffect(() => {
    if (playerName && personalCode && personalCode !== playerName) {
      fetch('/api/submit-name-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: personalCode, name: playerName })
      }).catch(e => e);
    }
  }, [playerName, personalCode]);

  // DAU presence ping. Fired once on app load (and again if the user logs in,
  // so a guest converts from a device-keyed to an email-keyed identity). This
  // is the only reliable "opened the app today" signal — returning users
  // restore a local session and never re-hit /login. Fire-and-forget.
  useEffect(() => {
    let deviceId = localStorage.getItem('verserain_device_id');
    if (!deviceId) {
      deviceId = (crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
      localStorage.setItem('verserain_device_id', deviceId);
    }
    const email = userEmail || localStorage.getItem('verserain_player_email') || '';
    fetch(`${PARTY_HOST}/seen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, email }),
    }).catch(() => {});
  }, [userEmail]);

  // On login: fetch garden from backend and merge with localStorage.
  // This ensures data is not lost when using different browsers (e.g. LINE in-app browser).
  //
  // SAFETY INVARIANT: we must NEVER overwrite the cloud copy with a local-only
  // snapshot. If we cannot positively confirm what the cloud currently holds,
  // pushing local data up can clobber newer progress made on another device.
  // A failed/non-200 fetch is therefore treated as "cloud state unknown" and we
  // do a local-only fallback WITHOUT writing back to the server.
  useEffect(() => {
    if (!playerName) return;
    const localGd = JSON.parse(localStorage.getItem('verseRain_gardenData') || '{}');

    const applyDecision = (decision) => {
      // Fold duplicate trees after the merge (the cloud copy may still hold
      // both spellings); `mergedInto` tells the server which keys to drop so
      // its own field-level merge doesn't resurrect them.
      const { garden, mergedInto, merged, moved } = tidyGarden(decision.garden, verseRefKey);
      if (merged || moved) console.info(`[garden-sync] merged ${merged} duplicate tree(s), moved ${moved} to free cells`);
      localStorage.setItem('verseRain_gardenData', JSON.stringify(garden));
      setGardenData(garden);
      if (decision.shouldPushToCloud) {
        // Safe to push: we either merged confirmed remote data, or confirmed the
        // player has no remote garden yet (404).
        fetchRetry(`${PARTY_HOST}/save-garden`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, gardenData: garden, ...(merged ? { mergedInto } : {}) })
        }).catch(() => { });
      } else {
        console.warn('[garden-sync] cloud state unknown; using local copy without pushing to server to avoid clobbering remote data');
      }
    };

    fetch(`https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/garden?player=${encodeURIComponent(playerName)}`)
      .then(classifyGardenResponse)
      .then((classification) => applyDecision(decideGardenSync(classification, localGd)))
      .catch(() => {
        // Network error — cloud state unknown. Display local only, never push up.
        applyDecision(decideGardenSync({ kind: 'unknown' }, localGd));
      });
  }, [playerName]);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  // Set from the ?resetToken=… link the 忘記密碼 email sends. Holds the raw
  // one-time token while the user picks a new password.
  const [resetToken, setResetToken] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [customVerseSets, setCustomVerseSets] = useState(() => {
    try {
      const saved = localStorage.getItem('verseRain_custom_sets');
      const arr = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(arr)) return [];
      // Backfill lastEditedAt for sets created before the field existed, so
      // the "most-recently-updated" sort has a value. Derive it from createdAt,
      // else the `custom-<ms>` id's creation time.
      let changed = false;
      const withTs = arr.map(s => {
        if (!s || s.lastEditedAt) return s;
        let ms = s.createdAt ? Date.parse(s.createdAt) : NaN;
        if (!Number.isFinite(ms) && String(s.id || '').startsWith('custom-')) {
          ms = parseInt(String(s.id).replace('custom-', ''), 10);
        }
        if (!Number.isFinite(ms)) return s;
        changed = true;
        return { ...s, lastEditedAt: new Date(ms).toISOString() };
      });
      if (changed) localStorage.setItem('verseRain_custom_sets', JSON.stringify(withTs));
      return withTs;
    } catch {
      return [];
    }
  });

  // Mirror customVerseSets to the backend tied to playerName so private
  // (unpublished) sets are visible across the user's devices. Without this,
  // a set created on a phone is invisible on web — they're separate
  // localStorage buckets.
  //
  // Strategy:
  //   - On login (playerName change): GET remote → merge with local, prefer
  //     the more-recently-edited copy of each id, then PUT the merge back.
  //   - On every customVerseSets state change AFTER initial sync: PUT to
  //     remote (debounced via the state-change effect's natural batching).
  //
  // We only sync sets owned by the current user — i.e. without authorName,
  // or whose authorName matches playerName — to avoid uploading copies of
  // other authors' published sets that the user pulled in via /custom-sets.
  // Wider authorship check: a user's playerName can change over time
  // ("hungry" → "hungry@G" → "hungry@y"), so a set authored under an OLD
  // playerName would otherwise be permanently stranded in localStorage and
  // never sync to backend. We treat the email's local part as the stable
  // identity and accept any authorName starting with it as "self".
  // Tell the server these earlier names are this account's: every published
  // set authored under them gets the current name + ownerEmail. Refreshes the
  // published list when anything changed.
  // Even with no names the server has work to do: sets bound to this email
  // still carrying an older display name are re-tagged, and that older name
  // then also claims legacy sets. So a start-up call with an empty list is
  // made once per device for each (email, name) — stamped only after the
  // server answered, so an older server (before deploy) doesn't burn it.
  const claimAuthorNames = React.useCallback(async (names, { force = false } = {}) => {
    const email = String(userEmail || '').trim().toLowerCase();
    const list = Array.from(new Set((names || []).map(n => String(n || '').trim()).filter(Boolean)));
    if (!email) return 0;
    const stamp = `${email}|${playerName || ''}|${[...list].sort().join(',')}`;
    if (!force) {
      try { if (localStorage.getItem('verserain_author_claimed') === stamp) return 0; } catch { /* storage off */ }
    }
    try {
      const r = await fetch(`${PARTY_HOST}/sets/claim-author`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, names: list }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return 0;
      try { localStorage.setItem('verserain_author_claimed', stamp); } catch { /* storage off */ }
      if (d.changed > 0) setPublishedSetsReload(n => n + 1);
      return d.changed || 0;
    } catch { return 0; }
  }, [userEmail, playerName]);
  const privateSetsInitialSyncDoneRef = useRef(false);
  const lastPushedPrivateSetsRef = useRef('');

  useEffect(() => {
    if (!playerName) return;
    privateSetsInitialSyncDoneRef.current = false;
    let cancelled = false;
    const host = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db";
    (async () => {
      try {
        const res = await fetch(`${host}/private-sets?player=${encodeURIComponent(playerName)}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const remoteSets = Array.isArray(data?.sets) ? data.sets : [];
        // Merge by id: keep the entry with the larger lastEditedAt timestamp.
        const localSetsJson = localStorage.getItem('verseRain_custom_sets');
        const allLocalSets = localSetsJson ? JSON.parse(localSetsJson) : [];
        // `verseRain_custom_sets` is keyed by device, not by account: two
        // people sharing an iPad land in the same bucket. Trust it only when
        // the stamped owner is this account; otherwise keep just the sets
        // this user actually authored and let the remote supply the rest.
        // Skipped while userEmail is still unresolved — identity is the
        // email, and filtering on an empty one would drop the user's own
        // sets authored under an older playerName.
        const setsOwner = String(userEmail || '').toLowerCase();
        const storedOwner = localStorage.getItem('verseRain_custom_sets_owner');
        const localSets = (!setsOwner || storedOwner === setsOwner)
          ? allLocalSets
          : allLocalSets.filter(s => isOwnedByCurrentUser(s, playerName, userEmail));
        if (setsOwner) localStorage.setItem('verseRain_custom_sets_owner', setsOwner);
        const byId = new globalThis.Map();
        const tsOf = (s) => {
          const t = Date.parse(s?.lastEditedAt || s?.createdAt || '');
          return Number.isFinite(t) ? t : 0;
        };
        for (const s of remoteSets) { if (s?.id) byId.set(s.id, s); }
        for (const s of localSets) {
          if (!s?.id) continue;
          const existing = byId.get(s.id);
          if (!existing) { byId.set(s.id, s); continue; }
          const tLocal = tsOf(s), tRemote = tsOf(existing);
          if (tLocal > tRemote) { byId.set(s.id, s); }
          else if (tLocal === tRemote) {
            const vLocal = (s.verses || []).length;
            const vRemote = (existing.verses || []).length;
            if (vLocal > vRemote) byId.set(s.id, s);
          }
        }
        const merged = Array.from(byId.values());
        if (!cancelled) {
          setCustomVerseSets(merged);
          localStorage.setItem('verseRain_custom_sets', JSON.stringify(merged));
          // Push the merge back so the remote has the union too.
          const ownedForPush = merged.filter(s => isOwnedByCurrentUser(s, playerName, userEmail));
          lastPushedPrivateSetsRef.current = JSON.stringify(ownedForPush);
          fetchRetry(`${host}/save-private-sets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, userEmail, sets: ownedForPush }),
          }).catch(() => {});
        }
      } catch {
        // No-op on network error; local data still works.
      } finally {
        if (!cancelled) privateSetsInitialSyncDoneRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [playerName, userEmail]);

  // Push customVerseSets to the backend whenever it changes — but only after
  // the initial sync has completed (avoids racing the merge above).
  useEffect(() => {
    if (!playerName) return;
    if (!privateSetsInitialSyncDoneRef.current) return;
    const ownedForPush = customVerseSets.filter(s => isOwnedByCurrentUser(s, playerName, userEmail));
    const payload = JSON.stringify(ownedForPush);
    if (payload === lastPushedPrivateSetsRef.current) return;
    lastPushedPrivateSetsRef.current = payload;
    fetchRetry(`${PARTY_HOST}/save-private-sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, userEmail, sets: ownedForPush }),
    }).catch(() => {
      toast.error(t('雲端同步失敗，稍後再試', 'Cloud sync failed, will retry later'));
    });
  }, [customVerseSets, playerName, userEmail]);
  const [hiddenOfficialSetIds, setHiddenOfficialSetIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('verseRain_hidden_official_sets') || '[]');
    } catch {
      return [];
    }
  });
  const [editingCustomSet, setEditingCustomSet] = useState(null);
  // Two-step delete confirmation (editor + 我的經文組 rows). window.confirm
  // silently returns false inside the iOS App's WKWebView (no WKUIDelegate
  // JS-panel implementation in shipped builds), so「刪除經文組」looked dead.
  // First tap arms the button, second tap within 5s deletes.
  const [deleteArmedId, setDeleteArmedId] = useState(null);
  // 提示 (in-game hint): the seqIndex of the block to light up, cleared after 1.5 s.
  const [hintSeq, setHintSeq] = useState(null);
  const hintTimerRef = useRef(null);
  const deleteArmTimerRef = useRef(null);
  const armDelete = (id) => {
    setDeleteArmedId(id);
    clearTimeout(deleteArmTimerRef.current);
    deleteArmTimerRef.current = setTimeout(() => setDeleteArmedId(null), 5000);
  };
  // 自訂背景圖 / 背景音樂上傳 (經文組編輯器).
  const [bgUploadBusy, setBgUploadBusy] = useState(false);
  const [musicUploadBusy, setMusicUploadBusy] = useState(false);
  const bgFileInputRef = useRef(null);
  const musicFileInputRef = useRef(null);
  // Editor previews for custom assets (+ live music audition).
  const [editorBgPreview, setEditorBgPreview] = useState(null);
  const [editorMusicUrl, setEditorMusicUrl] = useState(null);
  const [editorMusicPlaying, setEditorMusicPlaying] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const editorMusicAudioRef = useRef(null);
  const editorSetIdRef = useRef(null);

  const stopEditorMusicPreview = () => {
    try { editorMusicAudioRef.current?.pause(); } catch { /* noop */ }
    try { editorMusicAudioRef.current?._bgmDisconnect?.(); } catch { /* noop */ }
    editorMusicAudioRef.current = null;
    setEditorMusicPlaying(false);
  };

  const toggleEditorMusicPreview = () => {
    if (editorMusicPlaying) { stopEditorMusicPreview(); return; }
    if (!editorMusicUrl) return;
    // iOS honours volume only via Web Audio gain — startLoopingBgm handles it.
    editorMusicAudioRef.current = startLoopingBgm(editorMusicUrl, editingCustomSet?.bgMusicVolume ?? 0.18);
    setEditorMusicPlaying(true);
  };

  // Load previews when the editor opens on a set that already has custom
  // assets (and after fresh uploads — the fetch hits the session cache).
  useEffect(() => {
    const id = editingCustomSet?.id || null;
    if (editorSetIdRef.current !== id) {
      editorSetIdRef.current = id;
      setEditorBgPreview(null);
      setEditorMusicUrl(null);
      stopEditorMusicPreview();
    }
    let cancelled = false;
    const bg = String(editingCustomSet?.background || '');
    if (id && bg.startsWith('custom:')) {
      getSetAssetDataUrl(id, bg.slice('custom:'.length), editingCustomSet?.backgroundMime || 'image/webp')
        .then(u => { if (!cancelled) setEditorBgPreview(u); })
        .catch(() => {});
    } else {
      setEditorBgPreview(null);
    }
    const bm = String(editingCustomSet?.bgMusic || '');
    if (id && bm.startsWith('custom:')) {
      getSetAssetDataUrl(id, bm.slice('custom:'.length), editingCustomSet?.bgMusicMime || 'audio/mpeg')
        .then(u => { if (!cancelled) setEditorMusicUrl(u); })
        .catch(() => {});
    } else {
      // Shuffle: keep whatever preset track is already auditioning instead of
      // re-rolling on every unrelated re-run of this effect.
      const playing = String(editorMusicAudioRef.current?.src || '');
      const keep = !presetBgmFor(bm).file && PRESET_BGM.find(p => playing.endsWith(p.file));
      const file = bm === 'none' ? null : (keep ? keep.file : pickPresetBgmFile(bm));
      setEditorMusicUrl(file);
      if (!file) stopEditorMusicPreview();
      else if (editorMusicAudioRef.current && !String(editorMusicAudioRef.current.src || '').endsWith(file)) {
        // Preset switched while auditioning: carry the preview over to the new track.
        try { editorMusicAudioRef.current.pause(); editorMusicAudioRef.current._bgmDisconnect?.(); } catch { /* noop */ }
        editorMusicAudioRef.current = startLoopingBgm(file, editingCustomSet?.bgMusicVolume ?? 0.18);
      }
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCustomSet?.id, editingCustomSet?.background, editingCustomSet?.bgMusic]);

  // New sets get their id assigned at first upload so the asset has a home;
  // the save handler reuses editingCustomSet.id when present.
  const ensureEditingSetId = () => {
    const id = editingCustomSet?.id || `custom-${Date.now()}`;
    if (!editingCustomSet?.id) setEditingCustomSet(prev => ({ ...prev, id }));
    return id;
  };

  // 複製經文組 — clone any set (someone else's or my own) into 我的經文組
  // as a NEW set owned by the current user, then open it in the editor so
  // edits never touch the original. Custom-uploaded background/music assets
  // are stored server-side under the ORIGINAL set id and can't ride along —
  // preset backgrounds/music copy fine.
  const copyVerseSetToMine = (set) => {
    if (!set) return;
    if (!playerName) { setShowLoginModal('login'); return; }
    const now = new Date().toISOString();
    const copy = {
      ...set,
      id: `custom-${Date.now()}`,
      title: `${set.title || set.name || t('未命名經文組', 'Untitled set')}${t('（複本）', ' (Copy)')}`,
      authorName: playerName,
      lastEditorName: playerName,
      lastEditedAt: now,
      createdAt: now,
      isPublished: false,
      ownerEmail: undefined,
      adminEmail: undefined,
      adminName: undefined,
      verses: (set.verses || []).map(v => ({ ...v })),
    };
    if (String(copy.background || '').startsWith('custom:')) { copy.background = ''; copy.backgroundMime = undefined; }
    if (String(copy.bgMusic || '').startsWith('custom:')) { copy.bgMusic = ''; copy.bgMusicMime = undefined; }
    const updated = [copy, ...customVerseSets];
    setCustomVerseSets(updated);
    try { localStorage.setItem('verseRain_custom_sets', JSON.stringify(updated)); } catch { /* storage full — cloud sync still has it */ }
    toast.success(t('已複製，這份經文組現在是你的了 ✓', 'Copied — this set is yours now ✓'));
    setEditingCustomSet({ ...copy, verses: copy.verses.map(parseVerseRef) });
    setMainTab('custom_verses');
  };

  const handleBgImageUpload = async (file) => {
    if (!file || !editingCustomSet) return;
    setBgUploadBusy(true);
    try {
      const blob = await compressBackgroundImage(file);
      const setId = ensureEditingSetId();
      const assetId = await uploadSetAsset({ email: userEmail || '', setId, blob, kind: 'image' });
      setEditingCustomSet(prev => ({ ...prev, id: setId, background: `custom:${assetId}`, backgroundMime: blob.type }));
      toast.success(t('背景圖片已上傳 ✓', 'Background image uploaded ✓'));
    } catch (e) {
      toast.error(t('上傳失敗:{error}', 'Upload failed: {error}').replace('{error}', String(e.message || e)));
    }
    setBgUploadBusy(false);
  };

  const handleMusicUpload = async (file) => {
    if (!file || !editingCustomSet) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('音樂檔請小於 5MB', 'Music file must be under 5MB'));
      return;
    }
    setMusicUploadBusy(true);
    try {
      const setId = ensureEditingSetId();
      const assetId = await uploadSetAsset({ email: userEmail || '', setId, blob: file, kind: 'music' });
      setEditingCustomSet(prev => ({ ...prev, id: setId, bgMusic: `custom:${assetId}`, bgMusicMime: file.type || 'audio/mpeg' }));
      toast.success(t('背景音樂已上傳 ✓', 'Background music uploaded ✓'));
    } catch (e) {
      toast.error(t('上傳失敗:{error}', 'Upload failed: {error}').replace('{error}', String(e.message || e)));
    }
    setMusicUploadBusy(false);
  };

  // 批次匯入出處 — paste references (one per line, e.g.「太 19:14」),
  // match the book against the dictionary, auto-fetch each verse's text.
  const [bulkImportState, setBulkImportState] = useState(null); // null | { text, busy, progress, failed }

  // Match a pasted line's leading book token against every known book name:
  // Chinese full/abbr + simplified, English full/abbr, the current language's
  // abbreviation (e.g. Spanish "Sal"), and the full-name maps that carry
  // Spanish/Korean/Japanese/German/… full names ("Salmos", "시편", "詩篇").
  // Longest name wins so 「約翰一書」 beats 「約」 and "1 Juan" beats "Juan".
  // Returns { bookInfo, name, rest } or null.
  const bookById = (id) => BIBLE_BOOKS.find(b => b.id === id);
  const matchBookInLine = (line) => {
    // NFC-normalize so decomposed accents (NFD, common in macOS paste — "Éxodo"
    // as E+◌́) match the composed forms in the book-name maps. Also fold
    // full-width and non-breaking spaces to a plain space.
    const norm = String(line).normalize('NFC').replace(/[　 ]+/g, ' ').trim();
    let best = null;
    const consider = (name, bookInfo) => {
      if (!name || !bookInfo || !norm.startsWith(name)) return;
      const rest = norm.slice(name.length).trim();
      if (/^\d/.test(rest) && (!best || name.length > best.name.length)) {
        best = { bookInfo, name, rest };
      }
    };
    for (const b of BIBLE_BOOKS) {
      for (const name of [...(b.names || []), ...(b.cn || []), getBookAbbr(b, version)]) {
        consider(name, b);
      }
    }
    // Full-name maps — one entry per spelling → book id.
    for (const map of [MULTILANG_FULL_BOOK_ID, KOREAN_FULL_BOOK_ID]) {
      for (const name in map) consider(name, bookById(map[name]));
    }
    return best ? { bookInfo: best.bookInfo, name: best.name, rest: best.rest } : null;
  };

  // Fetch a verse's text for (book, "ch:vs[-vs]") — local DB first, then
  // the same remote fallbacks the single-row editor uses. Returns ''.
  const fetchVerseTextByBook = async (bookInfo, sanitized) => {
    if (!/^\d/.test(sanitized)) return '';
    const bookAbbr = getBookAbbr(bookInfo, version);
    const refStr = `${bookAbbr} ${sanitized}`;
    // 1) Local language DB (fast path when the verse already ships with the app).
    const db = loadedLangs[version]?.verses || [];
    const sanitizeRef = (str) => str.toString().replace(/\s+/g, '').replace(/[–—~]/g, '-').replace(/[：]/g, ':').toLowerCase();
    const searchRef = sanitizeRef(refStr);
    for (const dbVerse of db) {
      if (!dbVerse.reference) continue;
      if (sanitizeRef(dbVerse.reference) === searchRef) return dbVerse.text || '';
    }
    // 2) Remote — language-aware (English APIs / bolls-per-language / getbible).
    return await fetchEditorVerseText({ bookInfo, sanitized, version });
  };

  const runBulkImport = async () => {
    const raw = bulkImportState?.text || '';
    // Split on newlines AND commas (ASCII "," + full-width "，" + enumeration
    // "、") so references can be pasted one-per-line or comma-separated.
    // 逗號也用來接同一章的其他節：「約翰福音 1:1, 4」→ 1:1 與 1:4；「…, 2:7」→ 同書卷 2:7。
    const lines = expandSameChapterRefs(
      raw.split(/[\n,，、]+/).map(l => l.trim()).filter(Boolean),
      (tok) => { const m = matchBookInLine(tok); return m ? { name: m.name, rest: m.rest } : null; },
    );
    if (!lines.length) return;
    setBulkImportState(s => ({ ...s, busy: true, progress: `0 / ${lines.length}`, failed: [] }));
    const imported = [];
    const failed = [];
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const m = matchBookInLine(line);
      if (!m) {
        failed.push(line);
      } else {
        const sanitized = normalizeVerseInput(m.rest);
        // Keep the book name the user actually typed (e.g. "Salmos") so the
        // stored reference matches the set's language instead of a zh/abbr form.
        const refStr = `${m.name} ${sanitized}`;
        // Retry once on a miss — the per-verse fetch occasionally drops a
        // request (transient network / API hiccup) that a second try clears.
        let text = await fetchVerseTextByBook(m.bookInfo, sanitized);
        if (!text) {
          await new Promise(r => setTimeout(r, 500));
          text = await fetchVerseTextByBook(m.bookInfo, sanitized);
        }
        if (text) {
          imported.push({ book: m.bookInfo.id, verseInput: sanitized, reference: refStr, text });
        } else {
          failed.push(line);
        }
      }
      setBulkImportState(s => (s ? { ...s, progress: `${li + 1} / ${lines.length}` } : s));
    }
    if (imported.length) {
      setEditingCustomSet(prev => ({
        ...prev,
        // Drop untouched blank rows, then append the imported verses.
        verses: [...prev.verses.filter(v => v.reference || v.text), ...imported],
      }));
    }
    if (failed.length) {
      setBulkImportState(s => (s ? { ...s, busy: false, failed } : s));
    } else {
      setBulkImportState(null);
      toast.success(t('已匯入 {n} 節經文 ✓', `Imported {n} verse${imported.length === 1 ? '' : 's'} ✓`).replace('{n}', String(imported.length)));
    }
  };

  // 經文組創作者親聲朗讀 — recordings for the set being edited, keyed by
  // verse reference. null target = recorder closed.
  const [editorVerseVoices, setEditorVerseVoices] = useState({});
  const [editorVoiceTarget, setEditorVoiceTarget] = useState(null); // { reference, text }
  // Which editor verse row is currently reading aloud (row index), so the
  // ▶ button can flip to a ⏹ stop button while playback runs.
  const [editorPlayingVerse, setEditorPlayingVerse] = useState(null);
  // reference → 'processing' | 'error' while a recording bakes + uploads in the
  // background (so the creator isn't blocked and can record the next verse).
  const [editorVoiceStatus, setEditorVoiceStatus] = useState({});
  // Same last-take-wins ordering as saveMyVoice: re-recording a verse in the
  // editor fires a fresh background upload before the previous one lands, so
  // without this an earlier take's register could overwrite a later one and the
  // row would keep the first take. Chain same-verse saves and drop superseded takes.
  const editorSaveSeqRef = useRef({});   // reference → latest issued seq
  const editorUploadJobRef = useRef({}); // reference → in-flight save promise
  useEffect(() => {
    let cancelled = false;
    const setId = editingCustomSet?.id;
    if (!setId) { setEditorVerseVoices({}); return undefined; }
    setVoiceApi.getAll(setId)
      .then(res => { if (!cancelled) setEditorVerseVoices(res?.voices || {}); })
      .catch(() => { if (!cancelled) setEditorVerseVoices({}); });
    return () => { cancelled = true; };
  }, [editingCustomSet?.id]);
  const [bookPickerIdx, setBookPickerIdx] = useState(null); // which verse row has the book picker open
  // Two-tap delete confirm for verse rows: first tap arms (shows 確定?), second
  // tap removes. In-app (no window.confirm — that's a silent no-op in iOS WKWebView).
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);
  const confirmDeleteTimerRef = useRef(null);
  // Narrow (phone) layout for the verse-set editor rows: stack book + ch:vs
  // vertically and give the verse text two lines so it's readable.
  const [isNarrowEditor, setIsNarrowEditor] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsNarrowEditor(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Bumped after the server re-tags 「作者」 on this account's sets (rename /
  // claiming an old name) so the list shows the new name without a reload.
  const [publishedSetsReload, setPublishedSetsReload] = useState(0);
  const [publishedVerseSets, setPublishedVerseSets] = useState([]);
  const [viewCounts, setViewCounts] = useState({});
  // Favorite verse-set ids (synced with PartyKit below). Declared here so the
  // 我的經文組 "favorites" sort can read them; the load/save effects live further down.
  const [favoriteVerseSetIds, setFavoriteVerseSetIds] = useState([]);
  const favoriteVerseSetIdSet = React.useMemo(() => new Set(favoriteVerseSetIds), [favoriteVerseSetIds]);
  // 我的經文組 list controls — sort + 10-per-page pagination.
  // (Lives after viewCounts — the popular sort reads it.)
  const [customSetsSort, setCustomSetsSort] = useState('newest'); // newest | title | popular | favorites
  const [customSetsPage, setCustomSetsPage] = useState(1);
  const sortedCustomSets = React.useMemo(() => {
    const arr = [...customVerseSets];
    // "最新" now means most-recently-updated: lastEditedAt (written on every
    // save), falling back to createdAt, then the `custom-<ms>` id's creation
    // time for sets that predate the timestamp fields.
    const updatedMs = (s) => {
      if (s?.lastEditedAt) { const ts = Date.parse(s.lastEditedAt); if (Number.isFinite(ts)) return ts; }
      if (s?.createdAt) { const ts = Date.parse(s.createdAt); if (Number.isFinite(ts)) return ts; }
      if (String(s?.id || '').startsWith('custom-')) {
        const ts = parseInt(String(s.id).replace('custom-', ''), 10);
        if (Number.isFinite(ts)) return ts;
      }
      return 0;
    };
    if (customSetsSort === 'title') {
      arr.sort((a, b) => topicStrokeCollator.compare(titleSortKey(a.title), titleSortKey(b.title)));
    } else if (customSetsSort === 'popular') {
      arr.sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0));
    } else if (customSetsSort === 'favorites') {
      // Float favorited sets to the top so the user's favorites are seen at a
      // glance; within each group keep most-recently-updated first.
      arr.sort((a, b) => {
        const favA = favoriteVerseSetIdSet.has(a.id) ? 1 : 0;
        const favB = favoriteVerseSetIdSet.has(b.id) ? 1 : 0;
        if (favA !== favB) return favB - favA;
        return updatedMs(b) - updatedMs(a);
      });
    } else {
      arr.sort((a, b) => updatedMs(b) - updatedMs(a));
    }
    return arr;
  }, [customVerseSets, customSetsSort, viewCounts, favoriteVerseSetIdSet]);

  const [versesetsPage, setVersesetsPage] = useState(1);
  const [versesetsSort, setVersesetsSort] = useState('newest'); // 'newest' | 'title' | 'popular'
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
    // Fold duplicate trees and give every tree its own cell on the way in.
    try { return tidyGarden(JSON.parse(localStorage.getItem('verseRain_gardenData')) || {}, verseRefKey).garden; } catch { return {}; }
  });
  // One pass over the garden per gardenData change, so lookups for many
  // references against it (a contest's whole verse list, a verse-set's rows)
  // don't each rescan the garden — see findGardenKeyIndexed below.
  const gardenCanonicalIndex = React.useMemo(() => buildCanonicalGardenIndex(gardenData, verseRefKey), [gardenData]);

  const [creatorPoints, setCreatorPoints] = useState(0);
  const [creatorOnlyPoints, setCreatorOnlyPoints] = useState(0);
  const [referralOnlyPoints, setReferralOnlyPoints] = useState(0);
  const [creatorHistory, setCreatorHistory] = useState([]);
  const [referralHistory, setReferralHistory] = useState([]);
  const [referralKeys, setReferralKeys] = useState([]); // every name/code this account was known by
  const [showOldInviters, setShowOldInviters] = useState(false);
  // People who joined through my invite: [{ name, joinedAt, referredCount }]
  // (null while loading) + their garden progress keyed by name (null while loading).
  const [myReferees, setMyReferees] = useState(null);
  const [refereeGardenStats, setRefereeGardenStats] = useState(null);
  const [refereesPage, setRefereesPage] = useState(1);
  const [pendingRefereesPage, setPendingRefereesPage] = useState(1);
  // Keys the 我推薦的朋友 list was fetched with (names + device codes) — the
  // 提醒他 nudge sends the same ones so the server finds the same referees.
  const refereeAuthorKeysRef = useRef([]);
  // 提醒他: when each friend can be nudged again ({ name: retryAt ms }).
  const [nudgedUntil, setNudgedUntil] = useState(() => { try { return JSON.parse(localStorage.getItem('verserain_nudged_until') || '{}') || {}; } catch { return {}; } });
  const [nudgeBusyName, setNudgeBusyName] = useState(null);
  const [creatorHistoryPage, setCreatorHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 5;

  useEffect(() => {
    if (playerName) {
      // Fetch fruit points keyed by: playerName (authoring) + the current
      // personalCode (referrals) + any PREVIOUS personalCodes this device used
      // before adopting the account's canonical code. Including the old codes
      // ensures historic referral fruits aren't lost when the code unifies
      // across devices. We dedupe keys so nothing is double-counted.
      let prevCodes = [];
      try { prevCodes = JSON.parse(localStorage.getItem('verserain_prev_personal_codes') || '[]'); } catch { prevCodes = []; }
      const authorKeys = buildFruitAuthorKeys(playerName, personalCode, prevCodes);
      refereeAuthorKeysRef.current = authorKeys;

      // Points and referral records live under whatever code/name this person
      // had when they were written (old name, a code from another phone), so
      // first link this device's keys to the account — they accumulate across
      // devices and renames — then read everything through the union so every
      // device shows the same totals and the same history.
      const email = (userEmail || '').trim().toLowerCase();
      const linkStep = email
        ? fetch('/api/link-identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, keys: authorKeys }) })
            .then(r => r.json())
            .then((d) => {
              // Every name this account was ever known by (linked here on past
              // renames / by hand) also claims the sets published under it, so
              // 「作者」 shows the current name and the sets stay editable.
              const names = (Array.isArray(d?.keys) ? d.keys : []).filter(k => k && k !== playerName && !authorKeys.includes(k));
              // This device's 我的經文組 bucket is stamped with the account's email;
              // author names still on those sets are earlier names of this
              // account (sets published before renames re-tagged them).
              try {
                if ((localStorage.getItem('verseRain_custom_sets_owner') || '').toLowerCase() === email) {
                  const mine = JSON.parse(localStorage.getItem('verseRain_custom_sets') || '[]');
                  for (const set of Array.isArray(mine) ? mine : []) {
                    const a = String(set?.authorName || '').trim();
                    if (a && a !== 'Anonymous' && a !== playerName && !names.includes(a)) names.push(a);
                  }
                }
              } catch { /* ignore a bad local bucket */ }
              claimAuthorNames(names); // self-throttled: skipped when this exact hand-in was already answered
            })
            .catch(() => null)
        : Promise.resolve();

      linkStep.then(() => Promise.all(
        email
          ? [fetch(`/api/get-creator-points?author=${encodeURIComponent(authorKeys[0])}&authors=${encodeURIComponent(authorKeys.join(','))}&email=${encodeURIComponent(email)}&history=true`)
              .then(r => r.json())
              .catch(() => null)]
          : authorKeys.map(key =>
              fetch(`/api/get-creator-points?author=${encodeURIComponent(key)}&history=true`)
                .then(r => r.json())
                .catch(() => null)
            )
      )).then((results) => {
        const agg = aggregateFruitResults(results);
        setCreatorOnlyPoints(agg.creator);
        setReferralOnlyPoints(agg.referral);
        setCreatorPoints(agg.total);
        setCreatorHistory(agg.creatorHist);
        setReferralHistory(agg.refHist);
        setReferralKeys(agg.keys || []);
      }).catch(e => console.error(e));

      // 我推薦的朋友 — who joined through my invite, how many people they
      // referred, and their garden progress. Referees are named by playerName,
      // which is also the garden key, so the card can link to their garden.
      setMyReferees(null);
      setRefereeGardenStats(null);
      setRefereesPage(1);
      setPendingRefereesPage(1);
      const refereesQuery = new URLSearchParams({ authors: authorKeys.join(',') });
      if (email) refereesQuery.set('email', email);
      linkStep
        .then(() => fetch(`/api/get-referees?${refereesQuery.toString()}`))
        .then(r => r.ok ? r.json() : { referees: [] })
        .then(async (d) => {
          const list = Array.isArray(d?.referees) ? d.referees : [];
          setMyReferees(list);
          if (!list.length) { setRefereeGardenStats({}); return; }
          // Trees / fruits live in the PartyKit garden, not Redis; the cached
          // all-gardens stats cover every player in one call.
          const g = await fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/all-gardens')
            .then(r => r.ok ? r.json() : null).catch(() => null);
          const stats = {};
          for (const r of list) {
            const s = g?.statsMap?.[r.name];
            if (s) stats[r.name] = { plants: s.plants || 0, fruits: g?.fruitsMap?.[r.name] || 0 };
          }
          setRefereeGardenStats(stats);
        })
        .catch(() => { setMyReferees([]); setRefereeGardenStats({}); });
    }
  }, [playerName, personalCode, userEmail, claimAuthorNames]);

  const localFruits = React.useMemo(() => Object.entries(gardenData || {}).filter(([k]) => k !== '_activity').reduce((sum, [, curr]) => sum + (curr.fruits || 0), 0), [gardenData]);
  const totalFruits = localFruits + creatorPoints;

  // Phase 1 personal-progress widgets (Garden page header). Cheap memoized
  // derivations from the existing _activity map and verse entries — no new
  // data sources are added.
  const todayDateStr = React.useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const personalProgress = React.useMemo(() => {
    const activity = (gardenData && gardenData._activity) || {};
    const verseEntries = Object.entries(gardenData || {}).filter(([k]) => k !== '_activity');

    // Trees + champ counts.
    const treesPlanted = verseEntries.length;
    const champVerses = verseEntries.filter(([, v]) => (v?.fruits || 0) > 0).length;
    // Passed (大樹, stage 10) — a local count; anything that pays out
    // (contest completion) re-checks the server's copy of the garden.
    const passedVerses = verseEntries.filter(([, v]) => (v?.stage || 0) >= 10).length;

    // Streaks: walk back from today, counting consecutive days with activity.
    const today = new Date(`${todayDateStr}T00:00:00`);
    let currentStreak = 0;
    for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
      const k = d.toLocaleDateString('en-CA');
      if ((activity[k] || 0) > 0) currentStreak++;
      else break;
    }
    // Longest streak: scan all keys, find max run of consecutive YYYY-MM-DD.
    const sortedKeys = Object.keys(activity).filter(k => (activity[k] || 0) > 0).sort();
    let longestStreak = 0, run = 0, prevTs = null;
    for (const k of sortedKeys) {
      const ts = new Date(`${k}T00:00:00`).getTime();
      if (prevTs !== null && ts - prevTs === 86400000) run++;
      else run = 1;
      if (run > longestStreak) longestStreak = run;
      prevTs = ts;
    }

    const todayCount = activity[todayDateStr] || 0;
    const totalActivities = Object.values(activity).reduce((s, n) => s + (n || 0), 0);

    return { todayCount, currentStreak, longestStreak, treesPlanted, champVerses, passedVerses, totalActivities };
  }, [gardenData, todayDateStr]);
  // No tree yet: greet a newcomer with what to do instead of "welcome back".
  const isFirstGardenVisit = personalProgress.treesPlanted === 0;
  const skoolLevel = React.useMemo(() => getSkoolLevel(totalFruits), [totalFruits]);

  // ── 推薦里程碑 (referral milestone) ────────────────────────────────────────
  // When a referred player (B) plants their 1st / 10th / every 100th tree,
  // notify the inviter (A) so A can cheer them on; the server also turns the
  // 1st tree into a qualified referral for A and every 100th into a reward for
  // B. Milestone = distinct trees in the garden (treesPlanted). One-shot per
  // milestone via a localStorage latch; the server also de-dupes. On first run
  // we seed latches for already-reached milestones so existing installs don't
  // retro-notify their inviter.
  const referralMilestonesUpTo = (trees) => {
    const list = [1, 10];
    for (let m = 100; m <= trees; m += 100) list.push(m);
    return list;
  };
  useEffect(() => {
    let inviter = null;
    try { inviter = localStorage.getItem('verserain_inviter'); } catch { /* storage off */ }
    if (!inviter || inviter === personalCode) return;
    const trees = personalProgress?.treesPlanted || 0;
    const REFERRAL_MILESTONES = referralMilestonesUpTo(trees);
    const seeded = (() => { try { return localStorage.getItem('verserain_ms_init'); } catch { return true; } })();
    if (!seeded) {
      // First run: mark milestones already reached as sent (no retro-notify).
      try {
        for (const m of REFERRAL_MILESTONES) { if (trees >= m) localStorage.setItem(`verserain_ms_${m}_sent`, '1'); }
        localStorage.setItem('verserain_ms_init', '1');
      } catch { /* ignore */ }
      return;
    }
    const refereeName = playerName
      || (() => { try { return localStorage.getItem('verserain_player_name'); } catch { return ''; } })()
      || (userEmail || '').split('@')[0] || 'Guest';
    for (const m of REFERRAL_MILESTONES) {
      if (trees < m) continue;
      try { if (localStorage.getItem(`verserain_ms_${m}_sent`)) continue; } catch { continue; }
      try { localStorage.setItem(`verserain_ms_${m}_sent`, '1'); } catch { /* ignore */ }
      fetch('/api/referral-milestone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviterCode: inviter, refereeCode: personalCode, refereeName, refereeEmail: userEmail || '', milestone: m }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalProgress?.treesPlanted, personalCode, playerName, userEmail]);

  const [notifyInboxReload, setNotifyInboxReload] = useState(0);

  // Creating custom verse sets is open to ANY signed-in user — the publish
  // endpoint is owner-protected on the server, so no premium check is needed.
  // Premium / Lv.3 now only earns a celebratory badge; it's not a gate.
  const canCreateCustomSets = !!userEmail;
  const isAdmin = ['samhsiung@gmail.com', 'davidhwang1125@gmail.com', 'hsiungsam@gmail.com', 'hungry4grace@gmail.com', 'verserain.admin@gmail.com'].includes(userEmail.toLowerCase());
  const isSuperAdmin = ['samhsiung@gmail.com', 'davidhwang1125@gmail.com', 'hsiungsam@gmail.com', 'hungry4grace@gmail.com'].includes(userEmail.toLowerCase());
  // Who may edit a published set: admins (the server accepts their email for
  // any set and keeps the original author), or its owner. Unattributed /
  // "Anonymous" sets are left to admins, since the server would refuse
  // anyone else's update.
  const canEditSet = (s) => {
    if (!s) return false;
    if (isAdmin) return true;
    const email = String(userEmail || '').trim().toLowerCase();
    if (email && s.ownerEmail && String(s.ownerEmail).trim().toLowerCase() === email) return true;
    if (!s.authorName || s.authorName === 'Anonymous') return false;
    return isMySet(s, playerName, userEmail);
  };
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [showFruitInfo, setShowFruitInfo] = useState(false);
  const [levelCounts, setLevelCounts] = useState(null);
  const [globalFruitsMap, setGlobalFruitsMap] = useState({});
  const [viewingPlayerGarden, setViewingPlayerGarden] = useState(null); // { playerName, gardenData } or null

  const handleViewPlayerGarden = async (name) => {
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
        setViewingPlayerGarden({ playerName: name, gardenData: tidyGarden(data.gardenData, verseRefKey).garden, creatorPoints: creatorPts, referralPoints: refPts, loading: false });
      } else {
        setViewingPlayerGarden({ playerName: name, gardenData: {}, creatorPoints: creatorPts, referralPoints: refPts, loading: false, error: t('該玩家尚未分享園地', 'This player has not shared their garden yet') });
      }
    } catch {
      setViewingPlayerGarden({ playerName: name, gardenData: {}, loading: false, error: t('無法載入', 'Failed to load') });
    }
  };

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
  // Verse the garden should open on and flash: set when a game starts so the
  // garden lands on the field of the verse just played. GardenView consumes it.
  const [gardenFocus, setGardenFocus] = useState(null); // { ref, nonce } | null
  const clearGardenFocus = React.useCallback(() => setGardenFocus(null), []);
  // Where the garden was scrolled to when a challenge was launched from it.
  // The whole menu unmounts during a game, so without this the player lands
  // back at the top of the page instead of at the field they were on.
  const gardenReturnRef = useRef(null);
  // The menu scrolls inside its own container (100dvh, overflow auto), so the
  // window's scrollY is always 0; save/restore that container's scrollTop.
  const menuScrollRef = useRef(null);
  const manualBodyRef = useRef(null);
  // Scroll an element into view inside the menu scroller ONLY. scrollIntoView
  // would also scroll #root (index.css: height 100vh, overflow hidden), which
  // the user cannot scroll back — on phones the page then looks cut off and
  // stuck. `block: 'center'` centres the element, otherwise it goes near the top.
  // Bottom-bar tabs → the page each one opens. Tapping the tab you are on
  // goes back to its top level (e.g. the set list from inside a set).
  const selectNavTab = (tab) => {
    const target = { today: 'lobby', sets: 'versesets', garden: 'garden', play: 'multiplayer', me: 'advanced' }[tab] || 'lobby';
    if (tab === 'sets') setSelectedSetId(null);
    setMainTab(target);
    const el = menuScrollRef.current;
    if (el) el.scrollTop = 0;
  };
  const scrollMenuTo = (el, { block = 'start', offset = 12 } = {}) => {
    const scroller = menuScrollRef.current;
    if (!el || !scroller) return;
    try {
      const root = document.getElementById('root');
      if (root && root.scrollTop) root.scrollTop = 0;
      const er = el.getBoundingClientRect();
      const sr = scroller.getBoundingClientRect();
      const lead = block === 'center' ? Math.max(0, (scroller.clientHeight - er.height) / 2) : offset;
      scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + (er.top - sr.top) - lead), behavior: 'smooth' });
    } catch { /* ignore */ }
  };
  const versionBeforeChallenge = useRef(null); // saved version to restore after cross-lang challenge
  const updateGarden = React.useCallback((ref, type, setId, amount = 1) => {
    // 即時脈動:廣播「本玩家剛做了動作」給所有地圖觀看者(在 updater 之外,
    // 避免 side effect 進 setState)。login 不發,否則每次開 app 都會洗版。
    const pulseKind = type === 'listen' ? 'listen'
      : type === 'played' ? 'play'
      : type === 'champ' ? 'fruit'        // 創新高 / 得新果子 → 鼓聲
      : type === 'completed' ? 'done' : null;
    if (pulseKind && playerNameRef.current) {
      try { socketRef.current?.send(JSON.stringify({ type: 'PULSE', name: playerNameRef.current, action: pulseKind })); } catch {}
    }
    setGardenData(prev => {
      const updated = { ...prev };
      let isNewVerseChallenge = false;
      // A verse saved without 出處 would be planted under a blank key and show
      // up as a nameless tree; count the activity but don't plant it.
      if (ref && ref !== 'activity_only' && !isBlankRef(ref)) {
        // Same verse already planted under another spelling → grow that tree.
        ref = findGardenKey(updated, ref, verseRefKey) || ref;
        isNewVerseChallenge = !updated[ref] && type === 'played';
        if (!updated[ref]) {
          const used = new Set(Object.entries(updated).filter(([k]) => k !== '_activity').map(([,v]) => v.gridIndex));
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
      }

      const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' local time
      if (!updated._activity) updated._activity = {};
      
      let currentAct = updated._activity[todayStr] || 0;
      if (currentAct > 0 && currentAct < 100) currentAct = 100;
      
      if (type === 'login') {
        if (currentAct < 100) currentAct = 100;
      } else if (type === 'listen') {
        currentAct += 100;
      } else if (isNewVerseChallenge) {
        currentAct += 1000;              // brand-new verse — biggest reward, on first play
      } else if (type === 'completed') {
        currentAct += 500;               // completing any challenge (incl. verses already in the garden)
      } else if (type === 'champ') {
        currentAct += 1000;              // completion (500) + new personal best / fruit (500)
      }
      updated._activity[todayStr] = currentAct;
      localStorage.setItem('verseRain_gardenData', JSON.stringify(updated));
      // Sync to backend if logged in
      const pn = playerNameRef.current;
      if (pn) {
        fetchRetry(`${PARTY_HOST}/save-garden`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: pn, gardenData: updated })
        }).catch(() => { });
      }
      return updated;
    });
  }, []);

  // 整理園子: close the empty cells left by deleted trees. Order is kept;
  // only gridIndex changes, so the cloud merge (incoming cell wins) follows.
  const gardenGaps = React.useMemo(() => gardenGapCount(gardenData), [gardenData]);
  const compactMyGarden = () => {
    const { garden, moved } = compactGardenCells(gardenData || {});
    if (!moved) return;
    setGardenData(garden);
    try { localStorage.setItem('verseRain_gardenData', JSON.stringify(garden)); } catch { /* ignore */ }
    const pn = playerNameRef.current;
    if (pn) {
      fetchRetry(`${PARTY_HOST}/save-garden`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: pn, gardenData: garden }) }).catch(() => { });
    }
    toast.success(t('已整理園子，填補了 {n} 個空格', 'Garden tidied: {n} empty cells closed').replace('{n}', String(moved)));
  };

  React.useEffect(() => {
    updateGarden('activity_only', 'login');
  }, [updateGarden]);

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
        if (!Array.isArray(data)) return;
        setPublishedVerseSets(data);
        setCustomVerseSets(prev => {
          let changed = false;
          const updated = prev.map(cs => {
            const pub = data.find(p => p.id === cs.id);
            if (!pub) return cs;
            const tPub = Date.parse(pub.lastEditedAt || '') || 0;
            const tLocal = Date.parse(cs.lastEditedAt || '') || 0;
            const contentDiffers = pub.title !== cs.title || (pub.verses || []).length !== (cs.verses || []).length;
            if (tPub > tLocal || (tPub === tLocal && contentDiffers)) { changed = true; return { ...pub }; }
            return cs;
          });
          if (changed) localStorage.setItem('verseRain_custom_sets', JSON.stringify(updated));
          return changed ? updated : prev;
        });
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
  }, [publishedSetsReload]);

  const baseVerseSets = loadedLangs[version]?.sets || [];
  const activeVerseSets = React.useMemo(() => {
    const merged = [];
    customVerseSets.forEach(cs => {
      const csLang = cs.language || 'cuv';
      if (csLang === version) {
        const pub = publishedVerseSets.find(p => p.id === cs.id);
        if (pub) {
          const tPub = Date.parse(pub.lastEditedAt || '') || 0;
          const tLocal = Date.parse(cs.lastEditedAt || '') || 0;
          const base = tPub >= tLocal ? pub : cs;
          merged.push({
            ...base,
            authorName: (pub.authorName !== "Anonymous") ? pub.authorName : (cs.authorName || playerName || "匿名玩家"),
            lastEditorName: pub.lastEditorName || cs.lastEditorName,
            lastEditedAt: pub.lastEditedAt || cs.lastEditedAt
          });
        } else {
          merged.push({
            ...cs,
            authorName: cs.authorName || playerName || "匿名玩家",
          });
        }
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
    const filteredBase = baseVerseSets.filter(bs => !merged.some(m => m.id === bs.id) && !hiddenOfficialSetIds.includes(bs.id));
    return [...filteredBase, ...merged].map(set => localizeOfficialTopicSetTitle(set, version));
  }, [customVerseSets, publishedVerseSets, baseVerseSets, playerName, version, hiddenOfficialSetIds]);

  // Pick a random verse from the "rain-verses" set for the homepage subtitle
  const [rainVerseIndex, setRainVerseIndex] = React.useState(() => Math.floor(Math.random() * 10000));
  const [isLobbyReading, setIsLobbyReading] = React.useState(false);
  const lobbyReadRunRef = React.useRef(0);
  const preferredRainSet = React.useMemo(() => {
    const rainSets = activeVerseSets.filter(s => s.id && s.id.startsWith('rain-verses'));
    if (!rainSets.length) return null;
    return (
      rainSets.find(s => s.language === version && s.id.endsWith(`-${version}`)) ||
      rainSets.find(s => s.language === version) ||
      rainSets[0]
    );
  }, [activeVerseSets, version]);
  const getSetsForVersion = React.useCallback((targetVersion) => {
    const localSets = loadedLangs[targetVersion]?.sets || [];
    const customSets = customVerseSets.filter(set => (set.language || 'cuv') === targetVersion);
    const publishedSets = publishedVerseSets.filter(set => (set.language || 'cuv') === targetVersion);
    const byId = new globalThis.Map();
    [...localSets, ...customSets, ...publishedSets].forEach(set => {
      if (set?.id) byId.set(set.id, set);
    });
    return Array.from(byId.values());
  }, [customVerseSets, publishedVerseSets, loadedLangs]);

  // ── 經文組翻譯 ────────────────────────────────────────────────────
  // Localize a whole set into another language: machine-translate the TITLE,
  // remap each verse's 出處 to the target language's book name, and fetch that
  // language's OFFICIAL verse text. The 簡介 (description) is copied untranslated.
  const stripSetLangSuffix = (id) => String(id || '')
    .replace(/-(cuv|cuvs|kjv|esv|niv|ja|ko|fa|he|es|tr|de|my|vi|id|ms|tw|pt|fr|ru|hi|km)$/i, '');
  const translateTitleText = async (text, targetVersion, sourceVersion) => {
    const src = String(text || '').trim();
    if (!src) return '';
    try {
      const res = await fetch('/api/translate-passage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: src, targetVersion, sourceVersion }),
      });
      if (!res.ok) return '';
      const data = await res.json().catch(() => ({}));
      return String(data?.text || '').trim();
    } catch { return ''; }
  };
  const runSetTranslation = async () => {
    const tm = translateModal;
    if (!tm || !tm.set || !tm.target) return;
    const set = tm.set;
    const target = tm.target;
    // Anyone may translate + preview; login is only required to publish (加入經文組).
    const targetId = target === 'cuv' ? stripSetLangSuffix(set.id) : `${stripSetLangSuffix(set.id)}-${target}`;
    // Make sure the target language's official sets are loaded, then bail out if
    // this translation already exists (official or previously published). Check the
    // FRESHLY-awaited langData.sets directly — getSetsForVersion closes over the
    // pre-update `loadedLangs`, so it wouldn't see a just-loaded language.
    let langData = loadedLangs[target];
    if (!langData) {
      try { langData = await loadLanguageSets(target); setLoadedLangs(prev => ({ ...prev, [target]: langData })); } catch { /* best-effort */ }
    }
    const existing = [
      ...((langData?.sets) || []),
      ...customVerseSets.filter(s => (s.language || 'cuv') === target),
      ...publishedVerseSets.filter(s => (s.language || 'cuv') === target),
    ].find(s => s?.id === targetId);
    if (existing) { setTranslateModal(m => (m ? { ...m, phase: 'exists', targetId, existingTitle: existing.title } : m)); return; }

    const srcVerses = (set.verses || []).filter(Boolean);
    setTranslateModal(m => (m ? { ...m, phase: 'working', targetId, progress: { done: 0, total: srcVerses.length } } : m));
    const translatedTitle = (await translateTitleText(set.title || '', target, version)) || set.title || '';
    const outVerses = [];
    for (let i = 0; i < srcVerses.length; i++) {
      const v = srcVerses[i];
      let reference = v.reference || '';
      let text = '';
      let _bookId = null;
      let _cv = '';
      const parsed = parseScriptureKey(v.reference);
      if (parsed && parsed.bookId) {
        const bookInfo = BIBLE_BOOKS.find(b => b.id === parsed.bookId);
        if (bookInfo) {
          _bookId = parsed.bookId;
          _cv = parsed.verses ? `${parsed.chapter}:${parsed.verses}` : `${parsed.chapter}`;
          const bookName = getBookFullName(bookInfo, target) || getBookAbbr(bookInfo, target) || '';
          reference = `${bookName} ${_cv}`.trim();
          try { text = await fetchEditorVerseText({ bookInfo, sanitized: _cv, version: target }); } catch { text = ''; }
        }
      }
      outVerses.push({ id: v.id || `${targetId}-v${i + 1}`, reference, title: translatedTitle, text: text || '', failed: !text, _bookId, _cv });
      setTranslateModal(m => (m && m.phase === 'working') ? { ...m, progress: { done: i + 1, total: srcVerses.length } } : m);
    }
    setTranslateModal(m => (m ? { ...m, phase: 'preview', title: translatedTitle, verses: outVerses, targetId } : m));
  };
  const retryTranslateVerse = async (index) => {
    const cur = translateModal;
    if (!cur || cur.phase !== 'preview') return;
    const v = cur.verses?.[index];
    if (!v?._bookId) return;
    const bookInfo = BIBLE_BOOKS.find(b => b.id === v._bookId);
    if (!bookInfo) return;
    setTranslateModal(m => { if (!m) return m; const vs = [...m.verses]; vs[index] = { ...vs[index], retrying: true }; return { ...m, verses: vs }; });
    let text = '';
    try { text = await fetchEditorVerseText({ bookInfo, sanitized: v._cv, version: cur.target }); } catch { text = ''; }
    setTranslateModal(m => { if (!m) return m; const vs = [...m.verses]; vs[index] = { ...vs[index], text: text || '', failed: !text, retrying: false }; return { ...m, verses: vs }; });
  };
  const publishTranslatedSet = () => {
    const tm = translateModal;
    if (!tm || tm.phase !== 'preview') return;
    if (!userEmail) { setShowLoginModal('login'); return; }
    const { set, target, targetId } = tm;
    const title = (tm.title || '').trim() || set.title || '';
    const now = new Date().toISOString();
    const setObj = {
      id: targetId,
      language: target,
      title,
      // 簡介不複製 — 原文是來源語言，換了語言就不適用。留空讓建立者自己寫。
      description: '',
      verses: (tm.verses || []).map(v => ({ id: v.id, reference: v.reference, title, text: v.text || '' })),
      isPublished: true,
      authorName: playerName || 'Anonymous',
      createdAt: set.createdAt || now,
      lastEditedAt: now,
      lastEditorName: playerName || 'Anonymous',
      translatedFrom: set.id,
    };
    setCustomVerseSets(prev => {
      const next = prev.some(s => s.id === setObj.id) ? prev.map(s => s.id === setObj.id ? setObj : s) : [setObj, ...prev];
      try { localStorage.setItem('verseRain_custom_sets', JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
    fetch('https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...setObj, adminEmail: userEmail, adminName: playerName }),
    }).then(async (res) => {
      if (res.ok) return;
      const d = await res.json().catch(() => ({}));
      toast.error(t('發布失敗:{error}。其他人將看不到這個經文組。', "Publish failed: {error}. Others won't see this set.").replace('{error}', String(d.error || res.status)));
      setPublishedVerseSets(prev => prev.filter(p => p.id !== setObj.id));
    }).catch(e => console.error('Publish translated set failed', e));
    setPublishedVerseSets(prev => prev.some(p => p.id === setObj.id) ? prev.map(p => p.id === setObj.id ? setObj : p) : [setObj, ...prev]);
    const langLabel = (BIBLE_LANGUAGE_OPTIONS.find(o => o.value === target) || {}).label || target;
    toast.success(t('已加入「{lang}」經文組，可在此編輯或補上簡介', 'Added to the {lang} library — edit it or add a description here').replace('{lang}', langLabel));
    // Per the requested flow: switch the app to the new language and drop the
    // user straight into that set's editor so they can refine it / write the 簡介.
    setTranslateModal(null);
    handleVersionChange(target);
    setSelectedSetId(setObj.id);
    setEditingCustomSet({ ...setObj, isPublished: true, verses: (setObj.verses || []).map(parseVerseRef) });
    setMainTab('custom_verses');
  };

  // Flat list of all verses loaded for the secondary language (built-in + custom + published)
  const allSecondaryVerses = React.useMemo(() => {
    if (!bilingualSecondaryVersion) return [];
    const sets = getSetsForVersion(bilingualSecondaryVersion);
    return sets.flatMap(s => s.verses || []).filter(Boolean);
  }, [bilingualSecondaryVersion, getSetsForVersion]);

  const findSecondarySetForPrimarySet = React.useCallback((primarySet) => {
    if (!primarySet || !bilingualSecondaryVersion || bilingualSecondaryVersion === version) return null;
    const secondarySets = getSetsForVersion(bilingualSecondaryVersion);
    if (!secondarySets.length) return null;
    const primaryId = primarySet.id || '';
    const normalizedTitle = String(primarySet.title || '')
      .replace(/\s*\((KJV|ESV|NIV)\)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const primaryRefs = new Set((primarySet.verses || []).map(v => normalizeVerseReferenceKey(v.reference)).filter(Boolean));

    // CUV sets are historically stored with no language suffix (e.g.
    // "gospel-of-john"), while every other language uses "<base>-<lang>"
    // (e.g. "gospel-of-john-he", "gospel-of-john-cuvs"). So when pairing
    // *into* CUV we also try the bare base id, and when pairing *from* CUV
    // we treat the entire id as the base.
    const baseId = primaryId.replace(/-(cuv|cuvs|kjv|esv|niv|ja|ko|fa|he|es|tr|de|my|vi|id|ms|tw|pt|fr|ru|hi)$/i, '');
    const candidates = [
      secondarySets.find(set => set.id === `${primaryId}-${bilingualSecondaryVersion}`),
      secondarySets.find(set => set.id === primaryId.replace(/-(cuv|cuvs|kjv|esv|niv|ja|ko|fa|he|es|tr|de|my|vi|id|ms|tw|pt|fr|ru|hi)$/i, `-${bilingualSecondaryVersion}`)),
      bilingualSecondaryVersion === 'cuv' ? secondarySets.find(set => set.id === baseId) : null,
      bilingualSecondaryVersion !== 'cuv' ? secondarySets.find(set => set.id === `${baseId}-${bilingualSecondaryVersion}`) : null,
      secondarySets.find(set => primaryId === 'rain-verses' && set.id === `rain-verses-${bilingualSecondaryVersion}`),
      secondarySets.find(set => set.id === primaryId),
      secondarySets.find(set => String(set.title || '').replace(/\s*\((KJV|ESV|NIV)\)\s*/gi, '').replace(/\s+/g, ' ').trim().toLowerCase() === normalizedTitle)
    ].filter(Boolean);
    if (candidates[0]) return candidates[0];

    let bestSet = null;
    let bestScore = 0;
    secondarySets.forEach(set => {
      const refs = (set.verses || []).map(v => normalizeVerseReferenceKey(v.reference)).filter(Boolean);
      const score = refs.reduce((sum, ref) => sum + (primaryRefs.has(ref) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestSet = set;
      }
    });
    return bestScore > 0 ? bestSet : null;
  }, [bilingualSecondaryVersion, version, getSetsForVersion]);

  const secondaryRainSet = React.useMemo(() => {
    const secondarySets = getSetsForVersion(bilingualSecondaryVersion);
    const rainSets = secondarySets.filter(s => s.id && s.id.startsWith('rain-verses'));
    if (!rainSets.length) return null;
    return (
      rainSets.find(s => s.language === bilingualSecondaryVersion && s.id.endsWith(`-${bilingualSecondaryVersion}`)) ||
      rainSets.find(s => s.language === bilingualSecondaryVersion) ||
      rainSets.find(s => s.id === preferredRainSet?.id) ||
      rainSets[0]
    );
  }, [getSetsForVersion, bilingualSecondaryVersion, preferredRainSet?.id]);
  const randomRainVerse = React.useMemo(() => {
    if (preferredRainSet && preferredRainSet.verses && preferredRainSet.verses.length > 0) {
      return preferredRainSet.verses[rainVerseIndex % preferredRainSet.verses.length];
    }
    return null;
  }, [preferredRainSet, rainVerseIndex]);

  const [dailyVerseDate, setDailyVerseDate] = useState(() => formatLocalDate(new Date()));
  // Set when the lobby 話語甘霖 card is tapped, so the daily player auto-opens
  // its 每日經文 / 我的最愛 / 主題經文 picker on entry. Cleared once consumed.
  const [openDailyPickerOnEnter, setOpenDailyPickerOnEnter] = useState(false);
  // The verse set last listened to in the set player, for 今日 → 繼續上次.
  const [lastListen, setLastListen] = useState(() => {
    try { return JSON.parse(localStorage.getItem('verserain_last_listen') || 'null'); } catch { return null; }
  });
  const rememberLastListen = (set, verse) => {
    if (!set?.id || !verse?.reference || String(set.id).startsWith('daily-')) return;
    const next = { setId: set.id, title: set.title || '', ref: verse.reference, at: Date.now() };
    setLastListen(next);
    try { localStorage.setItem('verserain_last_listen', JSON.stringify(next)); } catch { /* best effort */ }
  };
  // vo= from a listenDaily share link — the sender's personal-voice owner id,
  // passed through to the daily player so recipients hear the sender's
  // recording instead of TTS. Cleared when leaving the daily player.
  const [dailySharedVoiceOwner, setDailySharedVoiceOwner] = useState(null);
  const [remoteDailyVerse, setRemoteDailyVerse] = useState(null);
  const [isDailyVerseLoading, setIsDailyVerseLoading] = useState(true);
  const dailyVerseRemoteVersion = getDailyVerseRemoteVersion(version);
  const dailyVerse = React.useMemo(() => {
    const pool = preferredRainSet?.verses?.length
      ? preferredRainSet.verses
      : activeVerseSets.flatMap(s => s.verses || []);
    return pool[getDailyVerseIndex(pool.length, `${dailyVerseDate}T00:00:00`)] || null;
  }, [preferredRainSet, activeVerseSets, dailyVerseDate]);
  const changeDailyVerseDate = React.useCallback((nextDateOrUpdater) => {
    setRemoteDailyVerse(null);
    setIsDailyVerseLoading(true);
    setDailyVerseDate(prev => {
      const nextDate = typeof nextDateOrUpdater === 'function' ? nextDateOrUpdater(prev) : nextDateOrUpdater;
      return nextDate || prev;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const remoteVersion = dailyVerseRemoteVersion;
    if (!remoteVersion) {
      setRemoteDailyVerse(null);
      setIsDailyVerseLoading(false);
      return () => { cancelled = true; };
    }
    setRemoteDailyVerse(null);
    setIsDailyVerseLoading(true);
    fetch(`/api/daily-verse?date=${dailyVerseDate}&version=${remoteVersion}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`Daily verse ${res.status}`)))
      .then(data => {
        if (cancelled) return;
        if (data?.text && data?.reference) {
          setRemoteDailyVerse({
            id: `dailyverses-${data.date || dailyVerseDate}-${remoteVersion}`,
            reference: data.reference,
            text: data.text,
            title: 'Daily Verse',
            sourceUrl: data.sourceUrl,
            date: data.date || dailyVerseDate,
            translation: data.translation || remoteVersion
          });
        }
      })
      .catch(() => {
        if (!cancelled) setRemoteDailyVerse(null);
      })
      .finally(() => {
        if (!cancelled) setIsDailyVerseLoading(false);
      });
    return () => { cancelled = true; };
  }, [dailyVerseDate, dailyVerseRemoteVersion]);

  const remoteDailyVerseMatches =
    remoteDailyVerse?.translation === dailyVerseRemoteVersion &&
    remoteDailyVerse?.date === dailyVerseDate;
  const displayedDailyVerse = remoteDailyVerseMatches ? remoteDailyVerse : (isDailyVerseLoading ? null : dailyVerse);
  const dailySecondaryVerseSet = React.useMemo(() => {
    if (!displayedDailyVerse || !bilingualSecondaryVersion || bilingualSecondaryVersion === version) return null;
    const secondarySets = getSetsForVersion(bilingualSecondaryVersion);
    for (const set of secondarySets) {
      const match = findMatchingVerse(displayedDailyVerse, [displayedDailyVerse], set.verses || [], { allowIndexFallback: false });
      if (match) {
        return {
          id: `daily-secondary-${bilingualSecondaryVersion}-${dailyVerseDate}`,
          title: set.title || BIBLE_LANGUAGE_OPTIONS.find(option => option.value === bilingualSecondaryVersion)?.label || bilingualSecondaryVersion,
          verses: [match]
        };
      }
    }
    return null;
  }, [displayedDailyVerse, bilingualSecondaryVersion, version, getSetsForVersion, dailyVerseDate]);

  const dummySet = useMemo(() => [{
    id: "dummy",
    title: version === 'ja' ? '経文セットが見つかりません'
      : version === 'ko' ? '성경 구절 세트를 찾을 수 없습니다'
        : isEnglishBibleVersion(version) ? 'No Verse Sets Found'
          : version === 'fa' ? 'مجموعه‌ای یافت نشد'
            : version === 'he' ? 'לא נמצא סט פסוקים'
              : '尚未發現經文組',
    authorName: "System",
    verses: [{
      reference: "N/A", text: version === 'ja' ? '現在この言語には経文セットがありません。👑 マイ問題集から作成してください。'
        : version === 'ko' ? '현재 이 언어에 대한 구절 세트가 없습니다. 👑 내 문제집에서 만드십시오.'
          : isEnglishBibleVersion(version) ? 'There are no verse sets for this language yet. Create one in 👑 Custom Sets.'
            : version === 'fa' ? 'هنوز مجموعه‌ای برای این زبان وجود ندارد.'
              : version === 'he' ? 'עדיין אין סטי פסוקים לשפה זו.'
                : '目前此語言沒有經文組。請去 👑 我的經文組 中建立！'
    }]
  }], [version]);

  const safeActiveSets = activeVerseSets.length > 0 ? activeVerseSets : dummySet;

  // Resolve a garden cell's planted reference to a verse the viewer can read
  // and challenge. Order: the viewer's own sets → bundled sets of the viewer's
  // version → a live fetch in the viewer's version (so a 繁體 viewer sees 繁體
  // even when the planter used 简体 or a custom verse) → every other bundled
  // language. Returns { verse, lang }; lang !== version means the verse text
  // is in another language and the challenge should switch to it.
  const resolveGardenVerse = async (ref) => {
    const ownVerses = [...safeActiveSets, ...customVerseSets].flatMap(s => s.verses);
    const own = findVerseByRef(ownVerses, ref);
    if (own) return { verse: own, lang: version };
    setIsLangsLoading(true);
    try {
      const loadLang = async (lang) => {
        let data = loadedLangs[lang];
        if (!data) {
          try { data = await loadLanguageSets(lang); } catch { return null; }
          setLoadedLangs(prev => ({ ...prev, [lang]: data }));
        }
        return data;
      };
      const mine = await loadLang(version);
      const inMine = mine && findVerseByRef(mine.verses, ref);
      if (inMine) return { verse: inMine, lang: version };
      const online = await fetchGardenVerseOnline(ref, version);
      if (online) return { verse: online, lang: version };
      for (const lang of GARDEN_LOOKUP_LANGS) {
        if (lang === version) continue;
        const data = await loadLang(lang);
        const found = data && findVerseByRef(data.verses, ref);
        if (found) return { verse: found, lang };
      }
    } finally {
      setIsLangsLoading(false);
    }
    return { verse: null, lang: version };
  };

  // Start a challenge from a garden cell (own garden or a friend's): switch
  // language temporarily when the verse was found in another one (restored
  // when the game ends), then go through the usual challenge-setup modal.
  const challengeGardenVerse = ({ verse, lang, setId }) => {
    if (!verse) return;
    if (lang && lang !== version) { versionBeforeChallenge.current = version; setVersion(lang); }
    openChallengeSetup({
      subtitle: verse.reference,
      run: () => {
        gardenReturnRef.current = { y: menuScrollRef.current ? menuScrollRef.current.scrollTop : window.scrollY, tab: 'garden' };
        setActiveVerse(verse);
        setSelectedVerseRefs([verse.reference]);
        if (setId) setSelectedSetId(setId);
        setTimeout(() => startGame(false, verse), 50);
      },
    });
  };
  // favoriteVerseSetIds / favoriteVerseSetIdSet are declared earlier (near the
  // 我的經文組 sort controls) so the "favorites" sort can read them.
  const saveFavoriteVerseSetIds = React.useCallback(async (nextIds) => {
    if (!userEmail) return false;
    const res = await fetchRetry(`${PARTY_HOST}/verse-set-favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, playerName, setIds: nextIds }),
    });
    if (!res.ok) {
      throw new Error(`favorites save failed: ${res.status}`);
    }
    const data = await res.json().catch(() => null);
    if (Array.isArray(data?.setIds)) {
      setFavoriteVerseSetIds(data.setIds);
    }
    return true;
  }, [userEmail, playerName]);

  const handleFavoriteSaveError = React.useCallback(() => {
      toast.error(t('我的最愛同步失敗，稍後再試', 'Favorites sync failed, please try again later'));
  }, []);

  useEffect(() => {
    if (!userEmail) {
      setFavoriteVerseSetIds([]);
      return;
    }
    let cancelled = false;
    fetch(`${PARTY_HOST}/verse-set-favorites?email=${encodeURIComponent(userEmail)}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`)))
      .then(data => {
        if (cancelled) return;
        const setIds = Array.isArray(data?.setIds) ? data.setIds.filter(id => typeof id === 'string' && id.trim()) : [];
        setFavoriteVerseSetIds(Array.from(new Set(setIds)));
      })
      .catch(() => {
        if (!cancelled) {
          setFavoriteVerseSetIds([]);
          toast.error(t('無法載入我的最愛', 'Could not load favorites'));
        }
      });
    return () => { cancelled = true; };
  }, [userEmail]);

  const toggleFavoriteVerseSet = React.useCallback((set) => {
    const setId = typeof set === 'string' ? set : set?.id;
    if (!setId) return;
    if (!userEmail) {
      setShowLoginModal('login');
      return;
    }
    const previous = favoriteVerseSetIds;
    const next = previous.includes(setId)
      ? previous.filter(id => id !== setId)
      : [...previous, setId];
    setFavoriteVerseSetIds(next);
    saveFavoriteVerseSetIds(next).catch(() => {
      setFavoriteVerseSetIds(previous);
      handleFavoriteSaveError();
    });
  }, [userEmail, favoriteVerseSetIds, saveFavoriteVerseSetIds, handleFavoriteSaveError]);

  const favoriteVerseSets = React.useMemo(() => {
    const byId = new globalThis.Map(safeActiveSets.filter(set => set?.id).map(set => [set.id, set]));
    return favoriteVerseSetIds.map(id => byId.get(id)).filter(Boolean);
  }, [favoriteVerseSetIds, safeActiveSets]);

  const topicVerseSets = React.useMemo(
    () => safeActiveSets.filter(set => TOPIC_PREFIX_REGEX.test(String(set?.title || '').trim())),
    [safeActiveSets]
  );

  const currentSet = (selectedSetId ? (safeActiveSets.find(s => s.id === selectedSetId) || customVerseSets.find(s => s.id === selectedSetId)) : null) || safeActiveSets[0];
  // 創作者親聲朗讀 — recordings map for the set detail page, so verse rows
  // can show a ⭐ on recorded verses. voiceRefreshTick bumps when the editor
  // closes so newly-recorded verses show up here even though currentSet.id
  // is unchanged (otherwise the detail page keeps the pre-editing snapshot
  // and most fresh recordings look "missing" until a full reload).
  const [currentSetVoices, setCurrentSetVoices] = useState({});
  // Every reference with ANY recording (author OR any public contributor), so a
  // ⭐ shows even when the recording is someone else's — not just the viewer's
  // own or the author's. A Set of reference strings.
  const [currentSetVoiceRefs, setCurrentSetVoiceRefs] = useState(() => new Set());
  // MY OWN recordings in this set, keyed by reference — separate from the two
  // above because ⭐ answers "anyone recorded here" while this answers "I
  // recorded here, and is it public", which is what the per-row mic badge needs.
  // Includes private ones (the request identifies us), which no other listing
  // does.
  const [myVoicesInSet, setMyVoicesInSet] = useState({});
  const [voiceRefreshTick, setVoiceRefreshTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setCurrentSetVoices({});
    setCurrentSetVoiceRefs(new Set());
    setMyVoicesInSet({});
    const id = currentSet?.id;
    if (!id) return undefined;
    setVoiceApi.getAll(id)
      .then(res => { if (!cancelled) setCurrentSetVoices(res?.voices || {}); })
      .catch(() => { /* no recordings */ });
    userVoiceApi.getVoiceRefs(id)
      .then(res => { if (!cancelled && Array.isArray(res?.refs)) setCurrentSetVoiceRefs(new Set(res.refs)); })
      .catch(() => { /* union is best-effort — the author-only ⭐ still shows */ });
    if (userEmail) {
      (async () => {
        try {
          // Resolve the owner id here rather than reading myVoiceOwnerId state:
          // that's declared further down this component, so depending on it
          // would throw at render.
          const mine = await voiceOwnerId(userEmail);
          if (cancelled || !mine) return;
          // Both buckets, same as the player: a recording made on a loose verse
          // (random/search) shows up inside a real set too, and the badge has to
          // agree with what the player will actually play.
          const buckets = id !== PERSONAL_LOOSE_SET_ID ? [PERSONAL_LOOSE_SET_ID, id] : [PERSONAL_LOOSE_SET_ID];
          const out = {};
          for (const bucket of buckets) {
            const res = await userVoiceApi.getAll(bucket, mine, { email: userEmail }).catch(() => null);
            if (res?.voices) for (const [ref, meta] of Object.entries(res.voices)) out[ref] = { ...meta, voiceBucket: bucket };
          }
          if (!cancelled) setMyVoicesInSet(out);
        } catch { /* the badge is optional */ }
      })();
    }
    return () => { cancelled = true; };
  }, [currentSet?.id, voiceRefreshTick, userEmail]);
  // Toggle one of my own recordings listed/unlisted straight from the verse row.
  const [voiceVisibilityBusy, setVoiceVisibilityBusy] = useState('');
  const toggleMyVerseVoicePublic = React.useCallback(async (reference) => {
    const rec = myVoicesInSet[reference];
    if (!userEmail || !rec || voiceVisibilityBusy) return;
    const next = rec.public === false;
    setVoiceVisibilityBusy(reference);
    try {
      await userVoiceApi.setVisibility(userEmail, rec.voiceBucket || currentSet?.id, reference, next);
      setMyVoicesInSet(prev => ({ ...prev, [reference]: { ...prev[reference], public: next } }));
      // The ⭐ (and everyone else's picker) reflects public recordings only, so
      // refetch the shared listings too.
      setVoiceRefreshTick(x => x + 1);
    } catch (e) {
      console.error('verse voice visibility toggle failed', e);
    }
    setVoiceVisibilityBusy('');
  }, [myVoicesInSet, userEmail, voiceVisibilityBusy, currentSet?.id]);
  const getVerseSetAuthorName = React.useCallback((set) => {
    if (!set) return "";
    if (set.authorName && set.authorName !== "Anonymous") return set.authorName;
    return String(set.id).startsWith("custom-") ? '匿名玩家' : 'Verserain 官方';
  }, []);
  const getVerseSetLastEditorName = React.useCallback((set) => {
    if (!set?.lastEditorName || set.lastEditorName === "Anonymous") return "";
    const author = getVerseSetAuthorName(set);
    return set.lastEditorName === author ? "" : set.lastEditorName;
  }, [getVerseSetAuthorName]);
  const currentSetAuthorName = getVerseSetAuthorName(currentSet);
  const currentSetLastEditorName = getVerseSetLastEditorName(currentSet);
  const sortedVerseSetList = React.useMemo(() => {
    let sortedSets = [...activeVerseSets];
    if (versesetsSort === 'topic') {
      sortedSets = sortedSets.filter(set => extractVerseSetTopic(set.title));
      sortedSets.sort((a, b) => {
        const aTopic = extractVerseSetTopic(a.title);
        const bTopic = extractVerseSetTopic(b.title);
        const firstCompare = topicStrokeCollator.compare(getFirstTopicChar(aTopic), getFirstTopicChar(bTopic));
        if (firstCompare !== 0) return firstCompare;
        const topicCompare = topicStrokeCollator.compare(aTopic, bTopic);
        if (topicCompare !== 0) return topicCompare;
        return topicStrokeCollator.compare(String(a.title || ''), String(b.title || ''));
      });
      return sortedSets;
    }
    if (versesetsSort === 'popular') {
      sortedSets.sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0));
      return sortedSets;
    }
    if (versesetsSort === 'title') {
      // 標題 = 依標題首字筆畫排序 (stroke-count collation for zh-Hant),
      // ignoring leading punctuation/brackets.
      sortedSets.sort((a, b) => topicStrokeCollator.compare(titleSortKey(a.title), titleSortKey(b.title)));
      return sortedSets;
    }
    // Unified "newest" = most-recently-updated. Anything with a real timestamp
    // competes head-to-head, preferring the last-edit time over creation:
    //   1. set.lastEditedAt (written on every save/admin edit)        → Date.parse → ms
    //   2. set.createdAt (explicit ISO date on the set)               → Date.parse → ms
    //   3. custom- IDs                                                → numeric suffix → ms
    //   4. published-over-official: look up the base's timestamps     → official's ISO date
    //   5. anything else without timestamp                            → baseIndex (small number)
    // Buckets 1-4 use real epoch ms so they always rank above bucket 5.
    // Bucket 4 matters because admin-edited published officials lack their own timestamp.
    const getEffectiveUpdatedAt = (set) => {
      if (set?.lastEditedAt) {
        const t = Date.parse(set.lastEditedAt);
        if (Number.isFinite(t)) return t;
      }
      if (set?.createdAt) {
        const t = Date.parse(set.createdAt);
        if (Number.isFinite(t)) return t;
      }
      if (String(set?.id || '').startsWith('custom-')) {
        const ts = parseInt(String(set.id).replace('custom-', ''), 10);
        if (Number.isFinite(ts)) return ts;
      }
      const baseMatch = baseVerseSets.find(b => b.id === set?.id);
      if (baseMatch?.lastEditedAt) {
        const t = Date.parse(baseMatch.lastEditedAt);
        if (Number.isFinite(t)) return t;
      }
      if (baseMatch?.createdAt) {
        const t = Date.parse(baseMatch.createdAt);
        if (Number.isFinite(t)) return t;
      }
      const indexInBase = baseVerseSets.findIndex(b => b.id === set?.id);
      return indexInBase !== -1 ? indexInBase : -1;
    };
    sortedSets.sort((a, b) => getEffectiveUpdatedAt(b) - getEffectiveUpdatedAt(a));
    return sortedSets;
  }, [activeVerseSets, baseVerseSets, versesetsSort, viewCounts]);
  const authorVerseSets = React.useMemo(() => {
    if (!authorSetsModal?.authorName) return [];
    return activeVerseSets.filter(set => getVerseSetAuthorName(set) === authorSetsModal.authorName);
  }, [activeVerseSets, authorSetsModal, getVerseSetAuthorName]);
  const VERSES_DB = currentSet.verses;

  const [activeVerse, setActiveVerse] = useState(VERSES_DB[0] || { reference: "N/A", text: "" });
  const [selectedVerseRefs, setSelectedVerseRefs] = useState([VERSES_DB[0]?.reference || "N/A"]);
  // Verse list table: default is the set's own order; "未通過優先" resorts so
  // not-yet-mastered verses (lowest garden stage first, i.e. most needing
  // practice) come before anything already 已熟練 (stage ≥ 10).
  const [verseSortNeedsPractice, setVerseSortNeedsPractice] = useState(false);
  const verseRowsWithGarden = React.useMemo(() => {
    const rows = VERSES_DB.map((v, i) => {
      const gKey = findGardenKeyIndexed(gardenCanonicalIndex, gardenData || {}, v.reference, verseRefKey);
      return { v, i, gEntry: gKey ? gardenData[gKey] : null };
    });
    if (!verseSortNeedsPractice) return rows;
    return [...rows].sort((a, b) => {
      const aStage = a.gEntry?.stage || 0;
      const bStage = b.gEntry?.stage || 0;
      const aPassed = aStage >= 10, bPassed = bStage >= 10;
      if (aPassed !== bPassed) return aPassed ? 1 : -1;
      return aStage - bStage || a.i - b.i;
    });
  }, [VERSES_DB, gardenData, gardenCanonicalIndex, verseSortNeedsPractice]);

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
      bgmAudioRef.current.volume = 0.16;
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

  // opts.keepUiLang: 設定 page — the Bible version changes on its own, the
  // app language stays what the person picked there.
  const handleVersionChange = async (newVer, opts = {}) => {
    setVersion(newVer);
    // Auto-sync UI language immediately so mobile users get instant feedback.
    if (opts.keepUiLang) { /* keep */ }
    else if (newVer === 'fa') setUiLangPersisted('fa');
    else if (newVer === 'ar') setUiLangPersisted('ar');
    else if (newVer === 'he') setUiLangPersisted('he');
    else if (newVer === 'kjv' || newVer === 'esv' || newVer === 'niv') setUiLangPersisted('en');
    else if (newVer === 'ja') setUiLangPersisted('ja');
    else if (newVer === 'ko') setUiLangPersisted('ko');
    else if (newVer === 'es') setUiLangPersisted('es');
    else if (newVer === 'tr') setUiLangPersisted('tr');
    else if (newVer === 'de') setUiLangPersisted('de');
    else if (newVer === 'my') setUiLangPersisted('my');
    else if (newVer === 'vi') setUiLangPersisted('vi');
    else if (newVer === 'id') setUiLangPersisted('id');
    else if (newVer === 'ms') setUiLangPersisted('ms');
    else if (newVer === 'pt') setUiLangPersisted('pt');
    else if (newVer === 'fr') setUiLangPersisted('fr');
    else if (newVer === 'ru') setUiLangPersisted('ru');
    else if (newVer === 'hi') setUiLangPersisted('hi');
    else if (newVer === 'km') setUiLangPersisted('km');
    else if (newVer === 'cuvs') setUiLangPersisted('cuvs');
    else setUiLangPersisted('zh');

    setIsLangsLoading(true);
    try {
      let data = loadedLangs[newVer];
      if (!data) {
        data = await loadLanguageSets(newVer);
        setLoadedLangs(prev => ({ ...prev, [newVer]: data }));
      }

      let targetVerses = data?.verses || [];
      if (targetVerses.length === 0) {
        targetVerses = [{ reference: "N/A", text: newVer === 'fa' ? 'آیه‌ای یافت نشد.' : (newVer === 'he' ? 'לא נמצא פסוק.' : (newVer === 'ja' ? '経文が見つかりません。' : (newVer === 'ko' ? '성경 구절을 찾을 수 없습니다.' : (newVer === 'kjv' || newVer === 'esv' || newVer === 'niv' ? 'No verses found.' : '目前的分類下沒有經文。')))) }];
      }
      setActiveVerse(targetVerses[0]);
      setSelectedVerseRefs([targetVerses[0].reference]);
      setCampaignQueue(null);
    } catch (error) {
      console.error('Failed to load language sets', newVer, error);
    } finally {
      setIsLangsLoading(false);
    }
  };

  // One-time cleanup of the pre-v2 verse cache (see BIBLE_CACHE_KEY).
  useEffect(() => { dropLegacyBibleCaches(); }, []);

  useEffect(() => {
    const parseUrlArgs = async () => {
      const params = new URLSearchParams(window.location.search);
      const mParam = params.get('m');
      const dxParam = params.get('dx');
      const vParam = params.get('v');
      const textParam = params.get('text');
      const refParam = params.get('ref');

      // ?notify=1 — arrived by tapping a referral push notification: open the
      // 🔔 panel once the app is up, then strip the param from the URL.
      if (params.get('notify') === '1') {
        setShowEncouragePanel(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('notify');
        window.history.replaceState({}, '', url.toString());
      }

      // ?resetToken=… — the single-use link from the 忘記密碼 email. Strip it
      // from the address bar immediately so the token doesn't linger in
      // history, bookmarks or a screen-shared URL bar.
      const resetTokenParam = params.get('resetToken');
      if (resetTokenParam) {
        setResetToken(resetTokenParam);
        const url = new URL(window.location.href);
        url.searchParams.delete('resetToken');
        window.history.replaceState({}, '', url.toString());
      }

      if (refParam) {
        // Refuse self-referral — without this, a user opening their own ref
        // link in a fresh WebView would silently bind themselves as their
        // own inviter, and the "我的推薦人" card would surface their own
        // name/email forever (cross-device restore can't overwrite it).
        const ownCode = localStorage.getItem('verserain_personal_code');
        if (refParam !== ownCode) {
          localStorage.setItem('verserain_inviter', refParam);
          localStorage.removeItem('verserain_invite_claimed');
          if (ownCode) postTouch({ deviceCode: ownCode, inviter: refParam, kind: 'link' });
        }
      }

      // ?startSet=<setId>[&mode=play|campaign]
      // Stash for the dedicated launch effect below (we don't have
      // activeVerseSets loaded yet at this stage). Strip the params
      // immediately so a refresh doesn't re-launch unexpectedly.
      const startSetParam = params.get('startSet');
      if (startSetParam) {
        const mode = params.get('mode') === 'play' ? 'play' : 'campaign';
        sessionStorage.setItem('verserain_pending_start_set', startSetParam);
        sessionStorage.setItem('verserain_pending_start_set_mode', mode);
        const url = new URL(window.location.href);
        url.searchParams.delete('startSet');
        url.searchParams.delete('mode');
        window.history.replaceState({}, '', url.toString());
      }

      let shouldAutoPlay = false;
      let loadedVerses = [];
      let overrideVersion = null;

      if (mParam) {
        const cleanM = mParam.replace(/['"]/gi, '').toLowerCase();
        if (cleanM === 'verse square' || cleanM === 'square') {
          setPlayMode('square_solo');
        } else if (cleanM === 'rain') {
          setPlayMode('rain_solo');
        } else if (cleanM === 'blind') {
          setPlayMode('blind'); // deprecated but keeping for safety
        } else if (cleanM === 'voice') {
          setPlayMode('voice_solo');
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

        const isEnglish = /^[a-zA-Z\s.,:;’”’’’’””?!()\-]+$/.test(cleanText.substring(0, 50));
        setVersion(isEnglish ? (isEnglishBibleVersion(version) ? version : 'kjv') : 'cuv');

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

  // Same splitter as the rain player — these two had drifted apart, which is how
  // Japanese lost 、in one copy while Korean was space-split into one block per
  // word in the other. Script detection lives in lib/phraseSplitter.js.
  const activePhrases = React.useMemo(
    () => splitVersePhrases(activeVerse.text),
    [activeVerse]
  );

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

  // ── 多人 *_solo：每位玩家用自己的語言參賽 ──────────────────────────────
  // The host broadcasts verse objects in the host's language, but each verse
  // carries a language-neutral `reference`. In individual/PK (*_solo) modes every
  // player has their OWN board, so we resolve each verse's text into THIS player's
  // own `version` and build their tiles from that. Team/synchronous modes share
  // one board and are left on the host's language. Fallback = the host's text.
  const versionRef = useRef(version);
  useEffect(() => { versionRef.current = version; }, [version]);
  const localizedTextByRefRef = useRef({}); // `${ver}|${normKey}` -> resolved text ('' = unresolvable)
  const [localizedTick, setLocalizedTick] = useState(0); // bumps when a verse finishes localizing (triggers reactive swap)
  const resolveVerseTextForVersion = async (reference, ver) => {
    if (!reference || !ver) return null;
    const normKey = normalizeVerseReferenceKey(reference);
    // tier 1: a set already loaded in that language (instant, no network)
    try {
      for (const s of getSetsForVersion(ver)) {
        const hit = (s.verses || []).find(v => normalizeVerseReferenceKey(v.reference) === normKey);
        if (hit?.text) return hit.text;
      }
    } catch { /* ignore */ }
    // tier 2: bible cache
    const cached = getCachedBibleVerse(ver, normKey);
    if (cached) return cached;
    // tier 3: fetch the official text in that version
    try {
      const parsed = parseScriptureKey(reference);
      if (parsed?.bookId) {
        const bookInfo = BIBLE_BOOKS.find(b => b.id === parsed.bookId);
        const cv = parsed.verses ? `${parsed.chapter}:${parsed.verses}` : `${parsed.chapter}`;
        const text = await fetchEditorVerseText({ bookInfo, sanitized: cv, version: ver });
        if (text) { setCachedBibleVerse(ver, normKey, text); return text; }
      }
    } catch { /* ignore */ }
    return null;
  };
  // Freshest localized text for a reference in the player's CURRENT version, else fallback.
  const mpLocalTextFor = (reference, fallback) => {
    if (!reference) return fallback;
    const t = localizedTextByRefRef.current[`${versionRef.current}|${normalizeVerseReferenceKey(reference)}`];
    return (t !== undefined && t !== '') ? t : fallback;
  };
  // Localize just the reference LABEL (book name) into the player's version — purely
  // a book-name remap, so it's synchronous and always available (no fetch needed).
  const mpLocalRefFor = (reference) => {
    if (!reference) return reference;
    try {
      const parsed = parseScriptureKey(reference);
      if (parsed?.bookId) {
        const bookInfo = BIBLE_BOOKS.find(b => b.id === parsed.bookId);
        const name = getBookFullName(bookInfo, versionRef.current) || getBookAbbr(bookInfo, versionRef.current);
        const cv = parsed.verses ? `${parsed.chapter}:${parsed.verses}` : `${parsed.chapter}`;
        if (name) return `${name} ${cv}`.trim();
      }
    } catch { /* ignore */ }
    return reference;
  };
  // NOTE: the pre-resolve effect lives after the multiplayer state declarations
  // (it depends on multiplayerState / multiplayerRoomId).

  // When activeVerseSets becomes non-empty AND we have a pending startSet
  // from a deep link, fire it once. Sets load asynchronously per language;
  // launching too early would silently fail to find the set.
  useEffect(() => {
    if (!activeVerseSets || activeVerseSets.length === 0) return;
    const pending = sessionStorage.getItem('verserain_pending_start_set');
    if (!pending) return;
    const mode = sessionStorage.getItem('verserain_pending_start_set_mode') === 'play' ? 'play' : 'campaign';
    sessionStorage.removeItem('verserain_pending_start_set');
    sessionStorage.removeItem('verserain_pending_start_set_mode');

    const launch = async () => {
      // launchSetById defined below; safe to call here because the effect
      // closes over the latest definition via dependency on activeVerseSets.
      // eslint-disable-next-line no-use-before-define
      launchSetById(pending, mode).catch(() => {});
    };
    // Chrome mutes speechSynthesis until the page has received at least one
    // real user gesture ("not-allowed"). Deep links land here with zero
    // interaction, so auto-launching would start the game with silent TTS.
    // Show a one-tap "start" gate first — the tap unlocks audio AND launches.
    // If the user has already interacted (in-app navigation), skip the gate.
    if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) {
      launch();
    } else {
      setDeepLinkStartGate({ run: launch });
    }
    // We intentionally omit launchSetById from deps — it's reconstructed
    // every render via useCallback, and depending on it would re-fire the
    // effect repeatedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVerseSets]);

  // Launch a verse-set campaign by id — used by the Companion Teams modal
  // 「開始挑戰」 button and by ?startSet=<id> deep links. Looks the set up
  // in active+custom, falls back to fetching shared sets. Returns true if
  // launched, false if the set is unknown so the caller can show an error.
  //
  // mode='campaign' → scored, writes to leaderboard, counts toward team
  //                   set-pass / set-attempt points.
  // mode='play'    → autoplay rehearsal (TTS reads verses, no blocks/score),
  //                   purely for familiarization; does NOT affect any
  //                   leaderboard so team progress stays untouched.
  const launchSetById = React.useCallback(async (setId, mode = 'campaign', verseIndex = null, versesOverride = null) => {
    if (!setId) return false;
    let set = activeVerseSets.find(s => s.id === setId) || customVerseSets.find(s => s.id === setId);
    if (!set) {
      try {
        const r = await fetch(`https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/share-set?id=${encodeURIComponent(setId)}`);
        if (r.ok) {
          const data = await r.json();
          if (data?.set?.verses?.length) set = data.set;
        }
      } catch { /* fall through to false */ }
    }
    // Last resort: caller already has a verses snapshot (e.g. recipient
    // of a team share link — their bible version may not load that set).
    if (!set?.verses?.length && Array.isArray(versesOverride) && versesOverride.length > 0) {
      set = { id: setId, title: setId, verses: versesOverride };
    }
    if (!set?.verses?.length) return false;
    initAudio();
    // When verseIndex is given (per-day reading model), queue just that one
    // verse. Otherwise fall back to the whole set (back-compat for any
    // legacy callers — there should be none in normal flow).
    const queue = (typeof verseIndex === 'number' && verseIndex >= 0 && verseIndex < set.verses.length)
      ? [set.verses[verseIndex]]
      : [...set.verses];
    setSelectedSetId(set.id);
    setCampaignQueue(queue.slice(1));
    campaignQueueRef.current = queue.slice(1);
    setCampaignResults([]);
    // We don't use the legacy /api/submit-set-score path for team plays
    // anymore (every verse is its own day-completion event reported via
    // PartyKit). Keep activeCampaignSetId null so submit-set-score's
    // gate-effect doesn't fire.
    setActiveCampaignSetId(null);
    setActiveCampaignSetTotal(0);
    setActiveVerse(queue[0]);
    setSelectedVerseRefs([queue[0].reference]);
    setTimeout(() => startGame(mode === 'play', queue[0]), 200);
    return true;
    // playMode + distractionLevel are dependencies because startGame
    // closes over both — without them the team-launched closure stays
    // pinned to whatever playMode/distractionLevel was when the first
    // render created it, which made 經文雨 silently launch square mode
    // (block stuck at top-left under the rain background).
  }, [activeVerseSets, customVerseSets, playMode, distractionLevel]);
  // startGame() and the block builder used to read playMode / distractionLevel
  // straight off state, so any DEFERRED start (a challenge confirmed in a
  // modal, a team launch) ran with whatever the closure captured before the
  // new settings committed. That is the bug the team-launch dependency array
  // below documents: 經文雨 silently launching as square mode. These refs are
  // written synchronously the moment a mode is chosen, so the start path
  // never depends on React having flushed. Reads during play/render still use
  // the state — those re-run on the next render anyway.
  const playModeRef = useRef(playMode);
  const distractionLevelRef = useRef(distractionLevel);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);
  useEffect(() => { distractionLevelRef.current = distractionLevel; }, [distractionLevel]);
  const [isBlindMode, setIsBlindMode] = useState(() => localStorage.getItem('verseRain_blindMode') === 'true');
  // Debug mode — persisted in localStorage, also toggleable from the ⚡ 挑戰
  // chooser so a phone user can flip on the voice-mode "expects vs heard" HUD
  // without dev tools.
  const [isDebugMode, setIsDebugMode] = useState(() => localStorage.getItem('verseRain_debugMode') === 'true');
  // Voice Mode: skip the "repeat the phrase you just recited" TTS beat.
  const [skipReadback, setSkipReadback] = useState(() => localStorage.getItem('verseRain_noReadback') === 'true');

  // ─── Challenge setup modal ────────────────────────────────────────────
  // Every single-player 挑戰 button opens this instead of relying on a pair of
  // <select>s parked in a toolbar. `run` is whatever that particular button
  // used to do on click; it is deferred until the player confirms.
  const [challengeSetup, setChallengeSetup] = useState(null); // { subtitle, run, value }

  const openChallengeSetup = ({ subtitle, run }) => {
    setChallengeSetup({ subtitle: subtitle || '', run, value: loadChallengeSetup() });
  };

  const confirmChallengeSetup = (v) => {
    // initAudio() has to happen inside a real tap for iOS to grant audio —
    // the modal's Start button is that tap now, not the original button.
    initAudio();
    // Written synchronously: the start path reads these refs, so it sees the
    // chosen mode even though setState has not flushed yet.
    playModeRef.current = v.mode;
    distractionLevelRef.current = v.difficulty;
    setPlayMode(v.mode);
    setDistractionLevel(v.difficulty);
    setIsDebugMode(v.debug);
    setSkipReadback(v.noReadback);
    const run = challengeSetup?.run;
    setChallengeSetup(null);
    if (typeof run === 'function') run(v);
  };

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
  const [mainTab, setMainTab] = useState(() => parseRoute(window.location.hash).tab);
  useEffect(() => {
    if (gameState !== 'menu' || !gardenReturnRef.current) return;
    const { y, tab } = gardenReturnRef.current;
    gardenReturnRef.current = null;
    if (mainTab !== tab) return;
    // Two passes: once after the garden mounts, once after async data settles.
    const go = () => { const el = menuScrollRef.current; if (el) el.scrollTop = y; else window.scrollTo({ top: y, behavior: 'auto' }); };
    const t1 = setTimeout(go, 60);
    const t2 = setTimeout(go, 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);
  const [mapView, setMapView] = useState('2d');   // 地圖 2D/3D 切換
  const [mapFocus, setMapFocus] = useState(null);  // 3D→2D 切換時帶入的焦點座標
  const [bilingualRainActive, setBilingualRainActive] = useState(false);
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

  // Header language picker — grid/table layout so all 15+ languages are
  // visible at once instead of buried in a scroll-cropped <select>.
  const [showLangPicker, setShowLangPicker] = useState(false);
  const langPickerRef = useRef(null);
  useEffect(() => {
    if (!showLangPicker) return undefined;
    const close = (e) => {
      if (!langPickerRef.current?.contains(e.target)) setShowLangPicker(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [showLangPicker]);
  const [verifyEmail, setVerifyEmail] = useState("");

  // ─── OAuth (Google / Apple / LINE) ────────────────────────────────────────
  // Hand the provider's credential to the PartyKit /oauth-login endpoint,
  // which verifies it (ID token signature, or access token via Google's
  // userinfo endpoint), then matches by email or auto-creates a verified
  // user. No password is needed because the OAuth provider has already
  // verified the email.
  const handleOAuthSignIn = React.useCallback(async (provider, credential) => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const host = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db";
      // Forward the referral code from localStorage so the backend can bind
      // the inviter to this account — see [App.jsx:5060] reward flow.
      const inviter = localStorage.getItem('verserain_inviter') || undefined;
      // This device's referral code: the server binds the first one it sees
      // as the account's canonical code and returns it, so every device that
      // signs in with Google/Apple/LINE ends up sharing ONE code (adopted
      // below) — the same as the password login path.
      const devicePersonalCode = localStorage.getItem('verserain_personal_code') || undefined;
      const response = await fetch(host + '/oauth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, inviter, personalCode: devicePersonalCode, ...credential })
      });
      const data = await response.json().catch(() => ({}));

      if (!(response.ok && data.success && data.user)) {
        setAuthError(data.error || t("OAuth 登入失敗", "OAuth sign-in failed"));
        return;
      }

      const user = data.user;
      const displayName = user.name || (user.email || '').split('@')[0];
      const prevEmail = localStorage.getItem('verserain_player_email');
      if (prevEmail && prevEmail !== user.email) {
        localStorage.removeItem('verseRain_gardenData');
        setGardenData({});
      }
      const isPrem = user.isPremium || PREMIUM_EMAILS.includes((user.email || '').toLowerCase());
      setPlayerName(user.name || displayName);
      setUserEmail(user.email);
      setIsPremium(isPrem);
      localStorage.setItem('verserain_player_name', user.name || displayName);
      localStorage.setItem('verserain_player_email', user.email);
      localStorage.setItem('verserain_is_premium', isPrem ? 'true' : 'false');
      // Remember this is an OAuth (Google/Apple/LINE) login → these accounts
      // have no password, so the profile editor hides the password fields and
      // saves without one (the server allows password-less updates for them).
      localStorage.setItem('verserain_auth_provider', user.oauthProvider || provider || 'oauth');
      if (data.sessionKey) { try { localStorage.setItem('verserain_session_key', data.sessionKey); } catch { /* ignore */ } setSessionKey(data.sessionKey); }
      if (user.personalCode) adoptAccountPersonalCode(user.personalCode, !data.deviceCodeTaken);
      if (user.city) localStorage.setItem('verserain_custom_city', user.city);
      if (user.country) localStorage.setItem('verserain_custom_country', user.country);
      // Cross-device referral: the server is the source of truth for
      // invitedBy. Until the reward is claimed on some device, prefer the
      // server's value over whatever this WebView has cached — older
      // versions could leave stale or self-referencing inviter codes in
      // localStorage that would otherwise be sticky forever (the "我的推薦
      // 人 顯示成自己" class of bug).
      if (!localStorage.getItem('verserain_invite_claimed')) {
        const ownCode = localStorage.getItem('verserain_personal_code');
        if (user.invitedBy && user.invitedBy !== ownCode) {
          localStorage.setItem('verserain_inviter', user.invitedBy);
        }
      }
      setShowLoginModal(null);
    } catch (err) {
      setAuthError(t("OAuth 連線失敗", "OAuth connection failed"));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // E-mail sign-in: /login and /verify-email both return the full user object
  // plus a session key, so a fresh sign-up is logged in the moment the code is
  // verified. keepLocation: the verify reply has no city/country yet, so keep
  // whatever this device already chose.
  const applyPasswordLogin = (data, email, { keepLocation = false } = {}) => {
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
    // Email/password account → clear any stale OAuth marker so
    // the profile editor shows the password fields for them.
    localStorage.removeItem('verserain_auth_provider');
    if (data.sessionKey) { try { localStorage.setItem('verserain_session_key', data.sessionKey); } catch { /* ignore */ } setSessionKey(data.sessionKey); }
    if (data.user.personalCode) adoptAccountPersonalCode(data.user.personalCode, !data.deviceCodeTaken);

    if (data.user.city) localStorage.setItem('verserain_custom_city', data.user.city);
    else if (!keepLocation) localStorage.removeItem('verserain_custom_city');

    if (data.user.country) localStorage.setItem('verserain_custom_country', data.user.country);
    else if (!keepLocation) localStorage.removeItem('verserain_custom_country');

    // Cross-device referral restore — same logic as OAuth path.
    // Server's invitedBy wins over stale local cache until claimed.
    if (!localStorage.getItem('verserain_invite_claimed')) {
      const ownCode = localStorage.getItem('verserain_personal_code');
      if (data.user.invitedBy && data.user.invitedBy !== ownCode) {
        localStorage.setItem('verserain_inviter', data.user.invitedBy);
      }
    }

    // Force a submit to update map immediately with correct location
    if (geoRef.current) {
      fetch('/api/submit-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.user.name || email.split('@')[0],
          score: 0,
          lat: parseFloat(geoRef.current.latitude),
          lng: parseFloat(geoRef.current.longitude),
          country: data.user.country || geoRef.current.country_name || geoRef.current.country || '',
          city: data.user.city || geoRef.current.city || '',
          verseRef: '',
          roomId: multiplayerRoomRef.current || null
        })
      }).catch(() => {});
    }
  };

  // LINE OAuth redirect return — startLineLogin() sent the user to LINE, and
  // LINE redirected back to <origin>/?code=...&state=line_.... Exchange the
  // code via the PartyKit backend, then scrub the OAuth params from the URL so
  // a refresh doesn't replay a now-consumed code.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state') || '';
    if (!code || !state.startsWith('line_')) return;
    const savedState = sessionStorage.getItem('verserain_line_state');
    const redirectUri = sessionStorage.getItem('verserain_line_redirect') || (window.location.origin + '/');
    sessionStorage.removeItem('verserain_line_state');
    sessionStorage.removeItem('verserain_line_redirect');
    ['code', 'state', 'error', 'error_description'].forEach(k => params.delete(k));
    const rest = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (rest ? '?' + rest : '') + (window.location.hash || ''));
    if (savedState !== state) return; // CSRF state mismatch — ignore the response
    // Re-open the login modal so the spinner shows while we exchange the code
    // and any error has somewhere to surface; success closes it again.
    setShowLoginModal('login');
    handleOAuthSignIn('line', { code, redirectUri });
  }, [handleOAuthSignIn]);

  const [verseViewModal, setVerseViewModal] = useState(null);
  // Single-verse voice chooser — when a verse has MORE THAN ONE recording
  // (the set author's + public contributors'), tapping 🎧 opens this so the
  // listener can pick whose voice to hear. { setId, reference, text, vLang,
  // options:[{kind:'owner'|'personal', ownerId?, recordedBy, voiceId, voiceMime, mine?}], loading }.
  const [verseVoicePicker, setVerseVoicePicker] = useState(null);
  // 錄音留言 — comments attached to ONE recording. Panel target:
  // { setId, reference, targetOwnerId, recordedBy, mine }. Data + composer state.
  const [voiceCommentPanel, setVoiceCommentPanel] = useState(null);
  const [voiceCommentData, setVoiceCommentData] = useState(null); // { comments, recordingReactions } | null(loading)
  const [voiceCommentText, setVoiceCommentText] = useState('');
  const [voiceCommentBusy, setVoiceCommentBusy] = useState(false);
  const [commentRecTarget, setCommentRecTarget] = useState(null); // opens VerseVoiceRecorder for an audio comment
  // 💬/❤️ badge counts for the picker rows, keyed `${reference}||${ownerId}`.
  const [voiceCommentCounts, setVoiceCommentCounts] = useState({});
  // 鼓勵收件匣 — the logged-in user's own inbox (by their ownerId).
  const [encourageInbox, setEncourageInbox] = useState(null); // { items, lastReadAt } | null
  // Referral notifications, keyed by personalCode (works without login): the
  // people you invited hitting garden milestones, and cheers you received.
  const [notifyInbox, setNotifyInbox] = useState(null); // { items, lastReadAt } | null
  const [showEncouragePanel, setShowEncouragePanel] = useState(false);
  // The 🔔 list used to load once per login, so a notice that arrived while
  // the app stayed open (a pool or place to review, an approval) only showed
  // after a full reload. Refresh it when the panel opens and every 3 minutes
  // while the tab is visible.
  useEffect(() => {
    if (!showEncouragePanel) return undefined;
    const id = setTimeout(() => setNotifyInboxReload(n => n + 1), 0);
    return () => clearTimeout(id);
  }, [showEncouragePanel]);
  useEffect(() => {
    const id = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState === 'visible') setNotifyInboxReload(n => n + 1); }, 180000);
    return () => clearInterval(id);
  }, []);
  // Admins: what is waiting for review, fetched fresh whenever the 🔔 panel
  // opens — this does not depend on the push configuration.
  const [adminPending, setAdminPending] = useState(null); // { pools, places, contests } | null
  useEffect(() => {
    if (!showEncouragePanel || !isSuperAdmin || !userEmail) return undefined;
    let cancelled = false;
    const headers = { 'Content-Type': 'application/json', ...(adminToken ? { 'X-Admin-Token': adminToken } : {}) };
    Promise.all([
      fetch(`/api/pools?all=1&adminEmail=${encodeURIComponent(userEmail)}`, { headers }).then(r => r.ok ? r.json() : { pools: [] }).catch(() => ({ pools: [] })),
      fetch(`/api/places?all=1&adminEmail=${encodeURIComponent(userEmail)}`, { headers }).then(r => r.ok ? r.json() : { places: [] }).catch(() => ({ places: [] })),
      fetch(`/api/contests?all=1&adminEmail=${encodeURIComponent(userEmail)}`, { headers }).then(r => r.ok ? r.json() : { contests: [] }).catch(() => ({ contests: [] })),
    ]).then(([p, q, c]) => {
      if (cancelled) return;
      setAdminPending({ pools: (p.pools || []).filter(x => x.status === 'pending' || x.cashAppeal?.status === 'pending').length, places: (q.places || []).filter(x => x.status === 'pending').length, contests: (c.contests || []).filter(x => x.status === 'pending').length });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEncouragePanel, isSuperAdmin, userEmail]);
  const [myVoiceOwnerId, setMyVoiceOwnerId] = useState(null);
  // 創作者親聲朗讀 in the verse view modal — when the verse came from a set
  // with a creator recording, the 朗讀 button plays it instead of TTS.
  const verseModalAudioRef = useRef(null);
  const setVoicesLookupRef = useRef(new globalThis.Map());      // setId → { reference: meta }
  const setVoiceAudioLookupRef = useRef(new globalThis.Map());  // voiceId → data URL

  // When the creator leaves the set editor, drop the cached recordings for
  // that set (both the playback lookup and the detail-page ⭐ map) so verses
  // recorded during the session are visible immediately — not stale until a
  // full app reload. Recordings persist server-side keyed by (setId, ref);
  // only these client caches were going stale.
  const prevEditingSetIdRef = useRef(null);
  useEffect(() => {
    const cur = editingCustomSet?.id || null;
    const prev = prevEditingSetIdRef.current;
    prevEditingSetIdRef.current = cur;
    if (prev && !cur) {
      setVoicesLookupRef.current.delete(prev);
      setVoiceRefreshTick(x => x + 1);
    }
  }, [editingCustomSet?.id]);

  const stopVerseModalAudio = () => {
    try { verseModalAudioRef.current?.pause(); } catch { /* noop */ }
    verseModalAudioRef.current = null;
  };

  // Play the creator's recording for (setId, reference) if one exists;
  // returns false so the caller can fall back to TTS.
  const playSetVerseVoice = async (setId, reference) => {
    if (!setId || !reference) return false;
    try {
      let voices = setVoicesLookupRef.current.get(setId);
      if (!voices) {
        const res = await setVoiceApi.getAll(setId);
        voices = res?.voices || {};
        setVoicesLookupRef.current.set(setId, voices);
      }
      const rec = voices[reference];
      if (!rec?.voiceId) return false;
      let dataUrl = setVoiceAudioLookupRef.current.get(rec.voiceId);
      if (!dataUrl) {
        const res = await setVoiceApi.getAudio(setId, rec.voiceId);
        if (!res?.data) return false;
        dataUrl = `data:${rec.voiceMime || 'audio/webm'};base64,${res.data}`;
        setVoiceAudioLookupRef.current.set(rec.voiceId, dataUrl);
      }
      stopSpeechIfActive();
      stopVerseModalAudio();
      const audio = new Audio(dataUrl);
      verseModalAudioRef.current = audio;
      await audio.play();
      return true;
    } catch {
      return false;
    }
  };

  // Collect every recording available for (setId, reference): the set author's
  // (creator layer) plus each public contributor's (personal layer). Used by the
  // single-verse 🎧 to decide between "just play" and "let the listener choose".
  const gatherVerseVoiceOptions = async (setId, reference) => {
    const options = [];
    if (!setId || !reference) return options;
    try {
      let ownerVoices = setVoicesLookupRef.current.get(setId);
      if (!ownerVoices) {
        const res = await setVoiceApi.getAll(setId);
        ownerVoices = res?.voices || {};
        setVoicesLookupRef.current.set(setId, ownerVoices);
      }
      const ownerRec = ownerVoices[reference];
      if (ownerRec?.voiceId) {
        // ownerId (author's byOwnerId) lets recording-comments target this
        // recording the same way they target contributors.
        options.push({ kind: 'owner', ownerId: ownerRec.byOwnerId || null, recordedBy: ownerRec.recordedBy || '', voiceId: ownerRec.voiceId, voiceMime: ownerRec.voiceMime });
      }
      const cres = await userVoiceApi.getContributors(setId).catch(() => null);
      const contributors = cres?.contributors || [];
      const mineId = userEmail ? await voiceOwnerId(userEmail).catch(() => null) : null;
      for (const c of contributors) {
        const vres = await userVoiceApi.getAll(setId, c.ownerId).catch(() => null);
        const rec = vres?.voices?.[reference];
        if (rec?.voiceId) {
          options.push({ kind: 'personal', ownerId: c.ownerId, recordedBy: c.recordedBy || rec.recordedBy || '', voiceId: rec.voiceId, voiceMime: rec.voiceMime, mine: !!(mineId && c.ownerId === mineId) });
        }
      }
    } catch { /* best-effort — fall back to whatever we gathered */ }
    return options;
  };

  // Play one gathered option's audio (owner or personal share alike live in the
  // shared set-voice store keyed by setId). Returns false so callers can TTS.
  const playVerseVoiceOption = async (setId, opt) => {
    if (!opt?.voiceId) return false;
    try {
      let dataUrl = setVoiceAudioLookupRef.current.get(opt.voiceId);
      if (!dataUrl) {
        const res = await setVoiceApi.getAudio(setId, opt.voiceId);
        if (!res?.data) return false;
        dataUrl = `data:${opt.voiceMime || 'audio/webm'};base64,${res.data}`;
        setVoiceAudioLookupRef.current.set(opt.voiceId, dataUrl);
      }
      stopSpeechIfActive();
      stopVerseModalAudio();
      const audio = new Audio(dataUrl);
      verseModalAudioRef.current = audio;
      await audio.play();
      return true;
    } catch {
      return false;
    }
  };

  // ── 錄音留言 helpers ────────────────────────────────────────────────
  // Open the comments panel for one recording (a picker option). Only real
  // recordings (owner/personal with an ownerId) can carry comments — TTS can't.
  const openVoiceComments = async (setId, reference, opt) => {
    if (!opt?.ownerId) return;
    const panel = { setId, reference, targetOwnerId: opt.ownerId, recordedBy: opt.recordedBy || '', mine: !!opt.mine };
    setVoiceCommentPanel(panel);
    setVoiceCommentData(null);
    setVoiceCommentText('');
    try {
      const res = await voiceCommentApi.list(setId, reference, opt.ownerId);
      setVoiceCommentData({ comments: res?.comments || [], recordingReactions: res?.recordingReactions || [] });
    } catch {
      setVoiceCommentData({ comments: [], recordingReactions: [] });
    }
  };
  // Called by the continuous player's 💬 — opens the comment panel for the
  // recording currently being read.
  const openVoiceCommentsFromPlayer = (target) => {
    if (!target?.targetOwnerId) return;
    openVoiceComments(target.setId, target.reference, { ownerId: target.targetOwnerId, recordedBy: target.recordedBy, mine: target.mine });
  };
  const refreshVoiceComments = async (panel = voiceCommentPanel) => {
    if (!panel) return;
    try {
      const res = await voiceCommentApi.list(panel.setId, panel.reference, panel.targetOwnerId);
      setVoiceCommentData({ comments: res?.comments || [], recordingReactions: res?.recordingReactions || [] });
    } catch { /* keep prior */ }
  };
  const submitTextComment = async () => {
    const panel = voiceCommentPanel;
    const body = voiceCommentText.trim();
    if (!panel || !body || !userEmail) return;
    setVoiceCommentBusy(true);
    try {
      await voiceCommentApi.createText(userEmail, recordedByNameApp(), panel.setId, panel.reference, panel.targetOwnerId, body);
      setVoiceCommentText('');
      await refreshVoiceComments(panel);
    } catch (e) { console.error('comment failed', e); }
    setVoiceCommentBusy(false);
  };
  const deleteVoiceComment = async (cid) => {
    const panel = voiceCommentPanel;
    if (!panel || !userEmail) return;
    try {
      await voiceCommentApi.remove(userEmail, recordedByNameApp(), panel.setId, panel.reference, panel.targetOwnerId, cid);
      await refreshVoiceComments(panel);
    } catch (e) { console.error('delete comment failed', e); }
  };
  const reactVoiceComment = async (cid, emoji) => {
    const panel = voiceCommentPanel;
    if (!panel || !userEmail) return;
    try {
      await voiceCommentApi.reactComment(userEmail, panel.setId, panel.reference, panel.targetOwnerId, cid, emoji);
      await refreshVoiceComments(panel);
    } catch (e) { console.error('react comment failed', e); }
  };
  const likeRecording = async (emoji) => {
    const panel = voiceCommentPanel;
    if (!panel || !userEmail) return;
    try {
      await voiceCommentApi.reactRecording(userEmail, recordedByNameApp(), panel.setId, panel.reference, panel.targetOwnerId, emoji);
      await refreshVoiceComments(panel);
    } catch (e) { console.error('like recording failed', e); }
  };
  // Play a voice-comment's audio (same content-addressed store as recordings).
  const playCommentAudio = async (setId, voiceId, mime) => {
    try {
      let dataUrl = setVoiceAudioLookupRef.current.get(voiceId);
      if (!dataUrl) {
        const res = await setVoiceApi.getAudio(setId, voiceId);
        if (!res?.data) return;
        dataUrl = `data:${mime || 'audio/webm'};base64,${res.data}`;
        setVoiceAudioLookupRef.current.set(voiceId, dataUrl);
      }
      stopSpeechIfActive();
      stopVerseModalAudio();
      const audio = new Audio(dataUrl);
      verseModalAudioRef.current = audio;
      await audio.play();
    } catch { /* ignore */ }
  };
  const recordedByNameApp = () => playerName || (userEmail || '').split('@')[0] || 'Anonymous';

  // My recorder id + encouragement inbox (for the 🔔 badge). Refetched on login.
  useEffect(() => {
    let cancelled = false;
    if (!userEmail) { setMyVoiceOwnerId(null); setEncourageInbox(null); return undefined; }
    (async () => {
      const oid = await voiceOwnerId(userEmail).catch(() => null);
      if (cancelled) return;
      setMyVoiceOwnerId(oid);
      if (oid) {
        const res = await voiceCommentApi.getEncouragement(oid).catch(() => null);
        if (!cancelled && res) setEncourageInbox({ items: res.items || [], lastReadAt: res.lastReadAt || '' });
      }
    })();
    return () => { cancelled = true; };
  }, [userEmail]);

  // Referral notification inbox (keyed by personalCode — no login needed).
  useEffect(() => {
    let cancelled = false;
    if (!personalCode) return undefined;
    (async () => {
      try {
        const res = await fetch(`/api/get-notify?code=${encodeURIComponent(personalCode)}`).then(r => r.ok ? r.json() : null);
        if (!cancelled && res) setNotifyInbox({ items: res.items || [], lastReadAt: res.lastReadAt || '' });
      } catch { /* offline — badge just stays empty */ }
    })();
    return () => { cancelled = true; };
  }, [personalCode, notifyInboxReload]);

  // A cheers a referee B for a milestone (adds a 讚 to B's inbox).
  const sendReferralCheer = (item) => {
    if (!item?.refereeCode) return;
    fetch('/api/referral-cheer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromCode: personalCode, fromName: playerName || 'Someone', toCode: item.refereeCode, milestone: item.milestone }),
    }).catch(() => {});
    // Optimistically mark this milestone item as cheered.
    setNotifyInbox(prev => prev ? {
      ...prev,
      items: prev.items.map(it => (it.at === item.at && it.refereeCode === item.refereeCode) ? { ...it, cheered: true } : it),
    } : prev);
    toast.success(t('已送出鼓勵 👍', 'Cheer sent 👍'));
  };

  // ── 提醒朋友來玩 (我推薦的朋友 → 已加入，還沒開始) ─────────────────────────
  // 提醒他: an in-app nudge (🔔 inbox + push) through /api/referral-nudge;
  // once per friend every 3 days.
  const nudgeReferee = async (name) => {
    if (!userEmail || !sessionKey) { setShowLoginModal('login'); return; }
    const showToast = (msg) => { setToast(msg); };
    const markUntil = (until) => setNudgedUntil(prev => {
      const next = { ...prev, [name]: until };
      try { localStorage.setItem('verserain_nudged_until', JSON.stringify(next)); } catch { /* storage off */ }
      return next;
    });
    setNudgeBusyName(name);
    try {
      const res = await fetch('/api/referral-nudge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, sessionKey, authors: refereeAuthorKeysRef.current, name }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        markUntil(d.retryAt || Date.now() + 3 * 86400000);
        showToast(d.delivered > 0
          ? t('已提醒 {name} 👍', 'Reminder sent to {name} 👍').replace('{name}', name)
          : t('找不到 {name} 的裝置，他登入 App 後才能收到提醒', "Couldn't reach {name}'s device — they'll need to sign in to the app first").replace('{name}', name));
      } else if (d.error === 'too_soon') {
        if (d.retryAt) markUntil(d.retryAt);
        showToast(t('3 天內已經提醒過 {name} 了', 'You already reminded {name} in the last 3 days').replace('{name}', name));
      } else if (d.error === 'daily_limit') {
        showToast(t('今天的提醒次數已用完，明天再試', "You've used today's reminders — try again tomorrow"));
      } else if (d.error === 'already_started') {
        showToast(t('{name} 已經開始玩了 🎉', '{name} has already started 🎉').replace('{name}', name));
      } else if (d.error === 'session_invalid') {
        showToast(t('請重新登入後再試', 'Please log in again and retry'));
      } else {
        showToast(t('提醒失敗，請稍後再試', "Couldn't send the reminder, please try again later"));
      }
    } catch {
      showToast(t('提醒失敗，請稍後再試', "Couldn't send the reminder, please try again later"));
    } finally {
      setNudgeBusyName(null);
    }
  };

  // ── 獎勵 (rewards) ─────────────────────────────────────────────────────────
  // A reward lands in the 🔔 inbox as kind:'reward'; the recipient confirms an
  // email to send it to (→ /api/reward-claim). Admins fulfil it by hand from
  // the 獎勵管理 page (→ /api/rewards) and the recipient gets kind:'reward_sent'.
  const rewardLabel = (kind, milestone) => kind === 'invites'
    ? t('邀請的 {n} 位朋友都通過了經文', '{n} friends you invited each passed verses').replace('{n}', milestone)
    : t('通過了 {n} 個經文', 'passed {n} verses').replace('{n}', milestone);
  // Claim form per reward: { email, region, lineId, voucher }. Region and the
  // preferred voucher are the player's choice — never inferred.
  const [rewardClaimForm, setRewardClaimForm] = useState({});
  const readChurchCode = () => { try { return localStorage.getItem('verserain_church_code') || ''; } catch { return ''; } };
  const [myChurchCode, setMyChurchCode] = useState(readChurchCode);
  const saveChurchCode = (v) => {
    const code = String(v || '').trim().toUpperCase().replace(/\s+/g, '-');
    setMyChurchCode(code);
    try { if (code) localStorage.setItem('verserain_church_code', code); else localStorage.removeItem('verserain_church_code'); } catch { /* ignore */ }
    setSponsorsInfo(null); // refetch the wall with my church marked
  };
  const claimFormFor = (id) => ({ email: userEmail || '', region: 'tw', lineId: '', voucher: '', church: myChurchCode, ...(rewardClaimForm[id] || {}) });
  const setClaimField = (id, field, value) => setRewardClaimForm(prev => ({ ...prev, [id]: { ...claimFormFor(id), [field]: value, ...(field === 'region' ? { voucher: '' } : {}) } }));
  const [claimedRewards, setClaimedRewards] = useState(() => new Set());
  const isRewardClaimed = (id) => {
    if (claimedRewards.has(id)) return true;
    try { return !!localStorage.getItem(`verserain_reward_claimed_${id}`); } catch { return false; }
  };
  const claimReward = async (item) => {
    const id = item?.rewardId;
    if (!id) return;
    const f = claimFormFor(id);
    const email = String(f.email || '').trim();
    if (!email) { toast.error(t('請輸入要收獎勵的 Email', 'Enter the email to send the reward to')); return; }
    try {
      const res = await fetch('/api/reward-claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: id, code: personalCode, email, name: playerName || '', region: f.region, lineId: f.lineId, preferredVoucherId: f.voucher || undefined, churchCode: f.church || '' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || res.status);
      if ((f.church || '') !== myChurchCode) saveChurchCode(f.church);
      setClaimedRewards(prev => new Set(prev).add(id));
      try { localStorage.setItem(`verserain_reward_claimed_${id}`, '1'); } catch { /* ignore */ }
      toast.success(t('已登記！獎勵會寄到 {email}', 'Registered! Your reward will go to {email}').replace('{email}', email));
    } catch (e) {
      toast.error(t('領取失敗：{error}', 'Claim failed: {error}').replace('{error}', String(e?.message || e)));
    }
  };
  const voucherLabel = (region, id) => ((VOUCHER_CATALOG[region] || []).find(v => v.id === id) || {}).label || id || '';
  const fmtMoney = (n, cur) => `${cur === 'USD' ? 'US$' : 'NT$'}${Number(n || 0).toLocaleString()}`;

  // Sponsor wall + pool totals for the public 贊助獎勵計劃 page.
  const [sponsorsInfo, setSponsorsInfo] = useState(null); // { sponsors, pool } | null
  useEffect(() => {
    if (mainTab !== 'sponsors' || sponsorsInfo) return undefined;
    let cancelled = false;
    fetch(`/api/sponsors${myChurchCode ? `?church=${encodeURIComponent(myChurchCode)}` : ''}`).then(r => r.json()).then(d => { if (!cancelled) setSponsorsInfo(d || {}); }).catch(() => { if (!cancelled) setSponsorsInfo({}); });
    return () => { cancelled = true; };
  }, [mainTab, sponsorsInfo, myChurchCode]);

  // Admin: the reward ledger + sponsor pool, loaded when the 獎勵管理 page
  // opens. Money-backed routes need the ADMIN_TOKEN header on top of the
  // email whitelist; the token is typed once and kept in localStorage.
  const [adminToken, setAdminToken] = useState(() => { try { return localStorage.getItem('verserain_admin_token') || ''; } catch { return ''; } });
  const saveAdminToken = (v) => { setAdminToken(v); try { localStorage.setItem('verserain_admin_token', v); } catch { /* ignore */ } };
  const adminHeaders = () => ({ 'Content-Type': 'application/json', ...(adminToken ? { 'X-Admin-Token': adminToken } : {}) });
  const [rewardsAdmin, setRewardsAdmin] = useState(null); // { loading, rewards, sponsors, pool, error } | null
  const [rewardsAdminFilter, setRewardsAdminFilter] = useState('pending');
  const [rewardNoteDraft, setRewardNoteDraft] = useState({});
  const [rewardSendDraft, setRewardSendDraft] = useState({}); // id → { poolId, voucherId, voucherValue, deliveredVia }
  const [sponsorDraft, setSponsorDraft] = useState(null); // sponsor being added/edited | null
  const [rewardsAdminReload, setRewardsAdminReload] = useState(0);
  useEffect(() => {
    if (mainTab !== 'rewards_admin' || !isSuperAdmin) return undefined;
    let cancelled = false;
    setRewardsAdmin(prev => ({ ...(prev || {}), rewards: prev?.rewards || [], sponsors: prev?.sponsors || [], error: '', loading: true }));
    fetch(`/api/rewards?adminEmail=${encodeURIComponent(userEmail)}`, { headers: adminHeaders() })
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, d })))
      .then(({ ok, status, d }) => { if (!cancelled) setRewardsAdmin({ loading: false, rewards: d.rewards || [], sponsors: d.sponsors || [], pool: d.pool || null, error: ok ? '' : (status === 401 ? 'token' : String(d.error || 'error')) }); })
      .catch(e => { if (!cancelled) setRewardsAdmin({ loading: false, rewards: [], sponsors: [], pool: null, error: String(e?.message || e) }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, isSuperAdmin, userEmail, rewardsAdminReload]);
  const rewardCurrency = (r) => ((r.region || 'tw') === 'intl' ? 'USD' : 'TWD');
  // Pools this reward may be paid from: same currency, active, and for a
  // church pool the claimant must have entered that church's code.
  const poolsFor = (r) => (rewardsAdmin?.sponsors || []).filter(sp => sp.active !== false && sp.currency === rewardCurrency(r) && (sp.scope !== 'church' || (sp.churchCode && sp.churchCode === String(r.churchCode || '').toUpperCase())));
  const sendDraftFor = (r) => {
    const region = r.region || 'tw';
    const currency = rewardCurrency(r);
    // Default pool: the player's own church pool first; otherwise the open
    // pool that was received earliest (first in, first used), so every
    // sponsor sees their gift spent in order. The admin can override.
    const pools = poolsFor(r);
    const churchPool = pools.find(sp => sp.scope === 'church');
    const remainingOf = (sp) => (rewardsAdmin?.pool?.bySponsor?.[sp.id]?.remaining ?? sp.amount);
    const fifoOpen = pools.filter(sp => sp.scope !== 'church' && remainingOf(sp) > 0).sort((x, y) => String(x.receivedAt || '').localeCompare(String(y.receivedAt || '')))[0];
    return {
      poolId: r.poolId || (churchPool ? churchPool.id : (fifoOpen ? fifoOpen.id : '')),
      voucherId: r.voucherId || r.preferredVoucherId || ((VOUCHER_CATALOG[region] || [])[0] || {}).id || '',
      voucherValue: r.voucherValue || (VOUCHER_DEFAULTS[r.kind] || VOUCHER_DEFAULTS.verses)[currency] || 0,
      deliveredVia: r.deliveredVia || (r.lineId ? 'line' : 'email'),
      ...(rewardSendDraft[r.id] || {}),
    };
  };
  const setSendField = (id, r, field, value) => setRewardSendDraft(prev => ({ ...prev, [id]: { ...sendDraftFor(r), [field]: value } }));
  const markReward = async (reward, action, extra = {}) => {
    try {
      const draft = action === 'sent' ? sendDraftFor(reward) : {};
      const res = await fetch('/api/rewards', {
        method: 'POST', headers: adminHeaders(),
        body: JSON.stringify({
          adminEmail: userEmail, rewardId: reward.id, action, note: rewardNoteDraft[reward.id] ?? reward.note ?? '', region: reward.region || 'tw',
          ...(action === 'sent' ? { ...draft, voucherValue: Number(draft.voucherValue) || 0, voucherCurrency: rewardCurrency(reward) } : {}),
          ...extra,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error === 'insufficient_pool' ? t('贊助池餘額不足', 'Sponsor pool balance too low') : d.error === 'church_mismatch' ? t('此池僅限該教會會友，玩家的教會代碼不符', 'This pool is for that church’s members only; the player’s church code does not match') : (d.error || res.status));
      setRewardsAdmin(prev => prev ? { ...prev, rewards: prev.rewards.map(r => r.id === d.reward.id ? d.reward : r) } : prev);
      setRewardsAdminReload(n => n + 1);
      toast.success(action === 'sent' ? t('已標記為寄出，並通知對方 🎁', 'Marked as sent — recipient notified 🎁') : action === 'reject' ? t('已標記為無效', 'Marked as invalid') : t('已改回待處理', 'Moved back to pending'));
    } catch (e) {
      toast.error(t('更新失敗：{error}', 'Update failed: {error}').replace('{error}', String(e?.message || e)));
    }
  };
  const saveSponsorRecord = async (sponsor, action = 'upsert') => {
    try {
      const res = await fetch('/api/sponsors', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ adminEmail: userEmail, action, sponsor, sponsorId: sponsor?.id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || res.status);
      setRewardsAdmin(prev => prev ? { ...prev, sponsors: d.sponsors || prev.sponsors, pool: d.pool || prev.pool } : prev);
      setSponsorDraft(null);
      setSponsorsInfo(null);
      toast.success(t('贊助紀錄已儲存', 'Sponsor record saved'));
    } catch (e) {
      toast.error(t('更新失敗：{error}', 'Update failed: {error}').replace('{error}', String(e?.message || e)));
    }
  };

  // ── 商家折扣：點數折抵 (points → merchant discount) ──────────────────
  // Leaderboard scores are never deducted; the server keeps a separate
  // "spent" ledger and issues one-time vouchers (see api/redeem.js).
  const [redeemPlace, setRedeemPlace] = useState(null); // place object from the map popup
  const [pointsBalance, setPointsBalance] = useState(null);
  const [showTodayInfo, setShowTodayInfo] = useState(false); // 今日得分 "?" breakdown in 我的園子
  const [pointsBalanceBusy, setPointsBalanceBusy] = useState(false);
  const [redeemBill, setRedeemBill] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem('verserain_active_voucher') || 'null'); return v && v.code ? v : null; } catch { return null; }
  });
  const [voucherNow, setVoucherNow] = useState(Date.now());
  const saveActiveVoucher = (v) => {
    setActiveVoucher(v);
    try { if (v) localStorage.setItem('verserain_active_voucher', JSON.stringify(v)); else localStorage.removeItem('verserain_active_voucher'); } catch { /* ignore */ }
  };
  const redeemErrorText = (code) => ({
    session_invalid: t('為了安全，請重新登入一次再折抵', 'For security, please sign in again before using points'),
    not_eligible: t('尚未符合折抵資格：需通過 3 節經文且帳號滿 7 天', 'Not eligible for a discount yet: pass 3 verses and have an account at least 7 days old'),
    not_enough_passed: t('尚未符合折抵資格：需先通過 3 節經文', 'Not eligible for a discount yet: pass 3 verses first'),
    account_too_new: t('尚未符合折抵資格：帳號需滿 7 天', 'Not eligible for a discount yet: your account must be at least 7 days old'),
    no_email: t('尚未符合折抵資格：需以 Email 或 LINE／Google 帳號登入', 'Not eligible for a discount yet: sign in with an email, LINE or Google account'),
    place_unavailable: t('此商家目前無法折抵', 'This shop is not offering a discount right now'),
    pool_unavailable: t('這個愛心行動目前未開放', 'This pool is not open right now'),
    daily_cap: t('今天在這個愛心行動的投入已達上限（NT$100）', 'You have reached today’s limit for this pool (NT$100)'),
    insufficient_balance: t('可用點數不足', 'Not enough available points'),
    contrib_invalid: t('請以 1,000 點為單位投入', 'Contribute in steps of 1,000 pts'),
    merchant_not_in_pool: t('這家商家尚未參與此愛心行動', 'This shop has not joined the pool'),
    pool_exists: t('這個教會／機構已經有愛心行動了', 'This church / organisation already has a pool'),
    pool_limit: t('這個標記進行中的愛心行動已達上限（5 個）', 'This marker already runs the maximum of 5 open Love in Action projects'),
    org_place_invalid: t('只有已上地圖的教會／機構可以建立愛心行動', 'Only a church or organisation already on the map can create a pool'),
    consent_required: t('請先勾選同意條款', 'Please tick the terms first'),
    cash_org_required: t('請填寫收款機構的全名', 'Enter the organisation’s full legal name'),
    cash_org_type_invalid: t('請選擇機構類型', 'Choose the organisation type'),
    cash_permit_required: t('請填寫勸募許可字號', 'Enter the fundraising permit number'),
    cash_permit_url_invalid: t('查證連結需以 https:// 開頭', 'The verification link must start with https://'),
    cash_bank_required: t('請填寫銀行名稱', 'Enter the bank name'),
    cash_account_name_mismatch: t('帳戶戶名必須和機構全名相同', 'The account name must match the organisation’s full legal name'),
    cash_account_invalid: t('帳號只能是數字（可含 -），長度 8–20 碼', 'The account number must be 8–20 digits (dashes allowed)'),
    cash_goal_invalid: t('經費目標請填正整數（新台幣）', 'Enter the funding goal as a whole number (NT$)'),
    cash_deadline_invalid: t('請選擇截止日', 'Choose an end date'),
    caps_invalid: t('上限需為整數：單筆 1–2,000、每月 1–10,000', 'Caps must be whole numbers: 1–2,000 per order and 1–10,000 per month'),
    bill_invalid: t('請輸入正確的消費金額', 'Enter a valid bill amount'),
    too_small: t('折抵金額不足 NT$1', 'The discount would be under NT$1'),
    daily_place_limit: t('今天在這家店的折抵次數已達上限', 'You have reached today’s coupon limit at this shop'),
    open_voucher_exists: t('你已有一張未使用的折扣券', 'You already have an unused coupon'),
    verify_unavailable: t('核算服務暫時無法使用，稍後再試', 'Verification is temporarily unavailable, try again later'),
    rate_limited: t('操作太頻繁，請稍後再試', 'Too many requests, please try again later'),
    login_required: t('請先登入', 'Please sign in first'),
    not_owner: t('這不是你登記的項目', 'This listing is not yours'),
    place_not_found: t('找不到這筆登記，可能已被刪除', 'Listing not found — it may have been deleted'),
    has_vouchers: t('已發出過折扣券，只能下架不能刪除', 'Coupons were issued for this place — it can be withdrawn but not deleted'),
    referrer_not_found: t('找不到這個推薦碼，請確認推薦者的分享碼', 'Referral code not found — check the code on their Share page'),
    referrer_invalid: t('推薦碼格式不正確，應為 10 個字母/數字。', 'Invalid format. Expected 10 letters/numbers.'),
    contest_unavailable: t('這個讀經比賽目前未開放', 'This reading contest is not open right now'),
    contest_closed: t('這個讀經比賽已經結束', 'This reading contest has ended'),
    contest_limit: t('這個標記進行中的讀經比賽已達上限（5 個）', 'This marker already runs the maximum of 5 open reading contests'),
    join_required: t('請先按「我要參加」加入這個讀經比賽', 'Join this reading contest first'),
    challenge_required: t('請先按「接受背經文挑戰」才能上排行榜', 'Accept the memorisation challenge first to join the leaderboard'),
    set_required: t('請選擇一組經文', 'Please choose a verse set'),
    verses_required: t('這組經文組目前沒有內容，請換一組', 'This verse set has no verses — pick another one'),
    ends_after_starts: t('結束時間必須晚於開始時間', 'The end date must be after the start date'),
    name_required: t('請輸入活動名稱', 'Please enter a name for the contest'),
  })[code] || String(code || 'error');
  const fetchPointsBalance = async () => {
    if (!userEmail) return null;
    setPointsBalanceBusy(true);
    try {
      const res = await fetch(`/api/points-balance?email=${encodeURIComponent(userEmail)}&sessionKey=${encodeURIComponent(sessionKey)}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setPointsBalance({ error: d.error || String(res.status) }); return null; }
      setPointsBalance(d);
      if (d.openVoucher && (!activeVoucher || activeVoucher.code !== d.openVoucher.code)) saveActiveVoucher({ ...d.openVoucher, status: 'issued' });
      return d;
    } catch (e) {
      setPointsBalance({ error: String(e?.message || e) });
      return null;
    } finally {
      setPointsBalanceBusy(false);
    }
  };
  // 商家推薦獎勵: the 2.5% this account earned from redemptions at shops it
  // introduced (api/referral-bonus), shown under 互惠點數紀錄 in 我的園子.
  const [merchantRefBonus, setMerchantRefBonus] = useState(null);
  const [merchantRefBonusPage, setMerchantRefBonusPage] = useState(1);
  const [charityContribPage, setCharityContribPage] = useState(1);
  const fetchReferralBonus = async () => {
    if (!userEmail || !sessionKey) return;
    try {
      const res = await fetch(`/api/referral-bonus?email=${encodeURIComponent(userEmail)}&sessionKey=${encodeURIComponent(sessionKey)}`);
      const d = await res.json().catch(() => ({}));
      setMerchantRefBonus(res.ok ? { items: Array.isArray(d.items) ? d.items : [], totalBonus: Number(d.totalBonus) || 0 } : { error: d.error || String(res.status) });
    } catch (e) {
      setMerchantRefBonus({ error: String(e?.message || e) });
    }
  };
  // 我的園子 shows the spendable balance; refresh it on entry, at most once a minute.
  const pointsBalanceAtRef = useRef(0);
  useEffect(() => {
    if (mainTab !== 'garden' || !userEmail || !sessionKey) return;
    if (Date.now() - pointsBalanceAtRef.current < 60000) return;
    pointsBalanceAtRef.current = Date.now();
    fetchPointsBalance();
    fetchReferralBonus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, userEmail, sessionKey]);
  // Every finished game goes through here so the account ledger (累積點數)
  // gets the session proof; the leaderboard part is unchanged for guests.
  const scoreSessionWarnedRef = useRef(false);
  // 讀經比賽 (reading contest) scoring hooks in right here rather than on the
  // old "campaign queue finished" screen: most Challenge play is one verse at
  // a time (from a set's listing, from the garden, mid-queue in a longer
  // run…), and every single one of those routes through this one function
  // before reaching the server — it is the one place a finished, scored verse
  // is guaranteed to pass through, whichever mode got it here. `selectedSetId`
  // (not `activeCampaignSetId`, which only accessible/voice-mode runs ever
  // set) tracks the set the challenged verse belongs to in every mode. The
  // server keeps each verse's own best score and sums those, so `verseRef`
  // must go along with `score` — replaying the same verse only raises the
  // leaderboard total when it beats that verse's previous best.
  const submitContestScoreIfMatched = (score, verseRef) => {
    if (!userEmail || !sessionKey || !(score > 0) || !selectedSetId || !verseRef) return;
    const mine = contestMine && !contestMine.error ? contestMine.joined : [];
    const matches = mine.filter(c => c.accepted && c.setId === selectedSetId && c.status === 'approved');
    matches.forEach(c => {
      fetch('/api/contests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_score', email: userEmail, sessionKey, contestId: c.id, setId: c.setId, verseRef, score }),
      }).then(() => loadContestMine()).catch(() => {});
    });
  };
  const submitScoreToServer = (payload) => { submitContestScoreIfMatched(payload.score, payload.verseRef); return fetch('/api/submit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, ...(userEmail && sessionKey ? { email: userEmail, sessionKey } : {}) }),
  }).then((r) => {
    if (userEmail && sessionKey) {
      pointsBalanceAtRef.current = Date.now();
      fetchPointsBalance();
      // Tell the player when the score reached the leaderboard but not their
      // account total, instead of silently leaving 累積點數 unchanged.
      r.clone().json().then((d) => {
        const err = d && d.points && d.points.error;
        if (err === 'session_invalid' && !scoreSessionWarnedRef.current) {
          scoreSessionWarnedRef.current = true;
          toast.info(t('分數已上排行榜，但要重新登入一次才會計入累積點數', 'Score posted to the leaderboard, but sign in again for it to count toward your total points'));
        } else if (err === 'verify_unavailable') {
          toast.error(t('分數已上排行榜；累積點數暫時無法更新，稍後會再試', 'Score posted; your total points could not be updated right now'));
        } else if (d && d.points && d.points.checkin) {
          showCheckinToast(d.points.checkin);
        }
      }).catch(() => {});
    }
    return r;
  }); };
  // 每日登入: the day's first listened or challenged verse pays the streak
  // bonus (api/_lib/dailyPoints.js); the server says which day of the streak.
  const showCheckinToast = (ck) => {
    if (!ck || !(ck.amount > 0)) return;
    const msg = ck.graceUsed > 0
      ? t('🕊️ 用了 {k} 天恩典日，連續登入第 {n} 天 +{x} 分', '🕊️ Used {k} grace day(s): day {n} in a row, +{x} points').replace('{k}', String(ck.graceUsed))
      : t('📅 連續登入第 {n} 天 +{x} 分', '📅 Day {n} in a row: +{x} points');
    toast.success(msg.replace('{n}', String(ck.streak)).replace('{x}', String(ck.amount)));
  };
  // 聆聽經文: +100 for a verse listened to the end, once per verse per Taipei
  // day, 20 a day (api/listen-credit.js). Guests earn nothing, as with scores.
  const listenCreditRef = useRef({ day: '', sent: new Set(), capped: false });
  const creditListen = (verse) => {
    if (!userEmail || !sessionKey || !verse || !verse.reference) return;
    const ref = String(verseRefKey(verse.reference) || '').replace(/\s+/g, '').slice(0, 40);
    if (!ref) return;
    const day = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    const memo = listenCreditRef.current;
    if (memo.day !== day) { memo.day = day; memo.sent = new Set(); memo.capped = false; }
    if (memo.capped || memo.sent.has(ref)) return;
    memo.sent.add(ref);
    fetch('/api/listen-credit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, sessionKey, ref }),
    }).then(r => r.json().catch(() => ({}))).then((d) => {
      if (!d || !d.success || !d.listen) { if (!d || !d.success) memo.sent.delete(ref); return; }
      pointsBalanceAtRef.current = 0; // 我的園子 refetches the total on the next visit
      if (d.checkin) { showCheckinToast(d.checkin); return; }
      if (d.listen.capped) {
        memo.capped = true;
        toast.info(t('今天的聆聽分數已經滿 {n} 節了，明天再來！', 'You have earned listening points for {n} verses today. Come back tomorrow!').replace('{n}', String(d.dailyMax || 20)));
      } else if (d.listen.credited) {
        toast.info(t('🎧 聆聽 +{x} 分（今天 {c}/{n} 節）', '🎧 Listening +{x} points ({c}/{n} verses today)').replace('{x}', String(d.listen.credited)).replace('{c}', String(d.listen.count)).replace('{n}', String(d.dailyMax || 20)));
      }
    }).catch(() => { memo.sent.delete(ref); });
  };
  const openRedeem = (place) => {
    if (!place || !place.id) return;
    if (!userEmail) { setShowLoginModal('login'); toast.error(t('請先登入才能用點數折抵', 'Sign in to use points for a discount')); return; }
    setRedeemPlace(place); setRedeemBill(''); setPointsBalance(null);
    fetchPointsBalance();
  };
  const redeemPreview = (() => {
    const pb = pointsBalance; const place = redeemPlace;
    if (!pb || pb.error || !place) return null;
    const bill = Math.floor(Number(redeemBill) || 0);
    const pct = Number(place.discountPct) || 0;
    const raw = Math.floor(bill * pct / 100);
    const caps = [
      ['voucher_cap', pb.voucherCapNTD ?? 200],
      ['monthly', Math.max(0, (pb.monthlyCapNTD ?? 500) - (pb.monthlyUsedNTD || 0))],
      ['balance', Math.floor((pb.balancePoints || 0) / (pb.pointsPerNTD || 1000))],
    ];
    let ntd = raw, limitedBy = null;
    for (const [k, cap] of caps) { if (cap < ntd) { ntd = cap; limitedBy = k; } }
    return { bill, raw, ntd: Math.max(0, ntd), points: Math.max(0, ntd) * (pb.pointsPerNTD || 1000), limitedBy };
  })();
  const confirmRedeem = async () => {
    if (!redeemPlace || !redeemPreview || redeemPreview.ntd < 1) return;
    setRedeemBusy(true);
    try {
      const res = await fetch('/api/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, sessionKey, placeId: redeemPlace.id, billNTD: redeemPreview.bill }) });
      const d = await res.json().catch(() => ({}));
      if (d.voucher && (d.success || d.error === 'open_voucher_exists')) { saveActiveVoucher({ ...d.voucher, status: d.voucher.status || 'issued' }); if (d.balance) setPointsBalance(d.balance); setRedeemPlace(null); return; }
      if (d.error === 'daily_place_limit' && d.limit) throw new Error(t('今天在這家店已用 {n} 張，達到上限', 'You have already used {n} coupons at this shop today, the limit').replace('{n}', String(d.limit)));
      throw new Error(redeemErrorText(d.error || res.status));
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setRedeemBusy(false);
    }
  };
  // Countdown + status poll while a voucher is open (staff marks it used).
  useEffect(() => {
    if (!activeVoucher || activeVoucher.status !== 'issued') return undefined;
    const tick = setInterval(() => setVoucherNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/redeem-verify?code=${encodeURIComponent(activeVoucher.code)}`);
        const d = await r.json().catch(() => ({}));
        if (d.status && d.status !== 'issued') saveActiveVoucher({ ...activeVoucher, status: d.status, usedAt: d.usedAt || null });
      } catch { /* offline */ }
    }, 10000);
    return () => { clearInterval(tick); clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVoucher?.code, activeVoucher?.status]);
  const voucherSecondsLeft = activeVoucher && activeVoucher.expiresAt ? Math.max(0, Math.floor((Date.parse(activeVoucher.expiresAt) - voucherNow) / 1000)) : 0;
  const formatVoucherCode = (c) => String(c || '').replace(/(.{4})(.{4})/, '$1-$2');

  // ── 折扣券核銷 (store-side verify page) ──────────────────────────────
  // The QR deep link is #verify/<code>. The router rewrites the hash to plain
  // #verify on its first sync, so the code is stashed in sessionStorage the
  // moment it is seen and survives that rewrite (and a reload).
  const [verifyCodeInput, setVerifyCodeInput] = useState(() => INITIAL_VERIFY_CODE);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyScanOpen, setVerifyScanOpen] = useState(false); // camera scanner modal
  const lookupVoucher = async (codeRaw) => {
    const code = String(codeRaw || verifyCodeInput || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) { setVerifyResult({ status: 'not_found' }); return; }
    setVerifyBusy(true);
    try {
      const r = await fetch(`/api/redeem-verify?code=${encodeURIComponent(code)}`);
      const d = await r.json().catch(() => ({}));
      setVerifyResult(r.ok ? d : { status: d.status || 'not_found', error: d.error });
    } catch { setVerifyResult({ status: 'error' }); }
    finally { setVerifyBusy(false); }
  };
  const useVoucher = async () => {
    if (!verifyResult || verifyResult.status !== 'issued') return;
    if (!(await confirmDialog({ message: t('確認顧客已結帳並給了折扣？此動作無法復原。', 'Confirm the customer has paid with the discount applied? This cannot be undone.'), confirmLabel: t('確認核銷', 'Redeem') }))) return;
    setVerifyBusy(true);
    try {
      const r = await fetch('/api/redeem-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: verifyResult.code, action: 'use' }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error === 'already_used' ? t('這張券已經用過了', 'This voucher was already used') : d.error === 'expired' ? t('這張券已過期', 'This voucher has expired') : String(d.error || r.status));
      setVerifyResult({ ...verifyResult, ...(d.voucher || {}), status: 'used' });
      toast.success(t('已核銷 ✓', 'Marked as used ✓'));
    } catch (e) { toast.error(String(e?.message || e)); }
    finally { setVerifyBusy(false); }
  };
  useEffect(() => {
    if (mainTab === 'verify' && verifyCodeInput.length === 8 && !verifyResult) lookupVoucher(verifyCodeInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab]);

  // ── 商家／教會／機構登記 (map place registration) ───────────────────────
  const newPlaceDraft = () => ({ id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind: 'merchant', name: '', address: '', lat: null, lng: null, discountPct: 10, dailyPerPerson: 3, description: '', message: '', phone: '', website: '', hours: '', photoAssetId: '', photoMime: '', referrerCode: '', agree: false, editing: null });
  // The draft lives in localStorage: a first-time submit may bounce the owner
  // to re-login (new session key), and nobody should retype a listing.
  const [merchantDraft, setMerchantDraft] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem('verserain_merchant_draft') || 'null'); if (d && d.id && d.kind) return { ...newPlaceDraft(), ...d, agree: false }; } catch { /* ignore */ }
    return newPlaceDraft();
  });
  useEffect(() => {
    try { localStorage.setItem('verserain_merchant_draft', JSON.stringify(merchantDraft)); } catch { /* ignore */ }
  }, [merchantDraft]);
  const [merchantBusy, setMerchantBusy] = useState(false);
  // Inline outcome of the last submit (a toast disappears in 3.5 s — too easy
  // to miss, which is how a registration that bounced on a stale login got
  // mistaken for a sent one). { type: 'ok'|'error'|'login', text }
  const [merchantSubmitStatus, setMerchantSubmitStatus] = useState(null);
  // Set when a submit was blocked for want of a valid login: once the login
  // modal hands back a fresh sessionKey the form is sent again by itself.
  const merchantResubmitAtRef = useRef(0);
  const [merchantGeoBusy, setMerchantGeoBusy] = useState(false);
  const [merchantPhotoPreview, setMerchantPhotoPreview] = useState(null);
  const [merchantPhotoBusy, setMerchantPhotoBusy] = useState(false);
  const [myPlaces, setMyPlaces] = useState(null);
  const merchantPhotoInputRef = useRef(null);
  // 推薦者 (the player who introduced this place) on a new listing: the code
  // is typed or scanned from their share QR; the name shown under the field
  // comes from the public code→name mapping (the server checks the account
  // itself on submit). Kept as {code, name} so the effect never sets state
  // synchronously; a code the lookup has not answered yet reads as loading.
  const [merchantScanOpen, setMerchantScanOpen] = useState(false);
  const [merchantReferrerLookup, setMerchantReferrerLookup] = useState({ code: '', name: null });
  useEffect(() => {
    const code = String(merchantDraft.referrerCode || '').trim();
    if (!REFERRAL_CODE_RE.test(code)) return undefined;
    let cancelled = false;
    const id = setTimeout(() => {
      fetch(`/api/get-name-by-code?code=${encodeURIComponent(code)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (!cancelled) setMerchantReferrerLookup({ code, name: (d && d.name) || null }); })
        .catch(() => { if (!cancelled) setMerchantReferrerLookup({ code, name: null }); });
    }, 400);
    return () => { cancelled = true; clearTimeout(id); };
  }, [merchantDraft.referrerCode]);
  const loadMyPlaces = React.useCallback(() => {
    if (!userEmail) { setMyPlaces([]); return; }
    fetch(`/api/places?mine=1&email=${encodeURIComponent(userEmail)}`).then(r => r.json()).then(d => setMyPlaces(Array.isArray(d.places) ? d.places : [])).catch(() => setMyPlaces([]));
  }, [userEmail]);
  useEffect(() => { if (mainTab === 'merchant') loadMyPlaces(); }, [mainTab, loadMyPlaces]);
  // ── Owner self-service on 「我的登記」 (edit / 下架 / 重新上架 / delete) ──
  const [myPlaceBusyId, setMyPlaceBusyId] = useState(null);
  const merchantFormRef = useRef(null);
  const PLACE_DRAFT_FIELDS = ['kind', 'name', 'address', 'lat', 'lng', 'discountPct', 'dailyPerPerson', 'description', 'message', 'phone', 'website', 'hours', 'photoAssetId', 'photoMime'];
  const cancelEditPlace = () => {
    setMerchantDraft(newPlaceDraft()); setMerchantPhotoPreview(null); setMerchantSubmitStatus(null);
    try { localStorage.removeItem('verserain_merchant_draft'); } catch { /* ignore */ }
  };
  // Load a stored place into the form. Same id → the submit becomes an
  // owner_update; `editing` rides along in the persisted draft so a reload or
  // re-login mid-edit keeps the banner and the update semantics.
  const startEditPlace = async (pl) => {
    const d = merchantDraft;
    const dirty = !d.editing && ((d.name || '').trim() || (d.address || '').trim());
    if (dirty && !(await confirmDialog({
      title: t('取代目前的草稿？', 'Replace your draft?'),
      message: t('你正在填寫的登記資料會被「{name}」取代。', 'The form you are filling in will be replaced by “{name}”.').replace('{name}', pl.name || ''),
      confirmLabel: t('取代', 'Replace'),
    }))) return;
    const next = { ...newPlaceDraft(), id: pl.id, agree: false, editing: { name: pl.name, status: pl.status, referrerCode: pl.referrerCode || '', referrerName: pl.referrerName || '' } };
    for (const f of PLACE_DRAFT_FIELDS) if (pl[f] !== undefined && pl[f] !== null) next[f] = pl[f];
    setMerchantDraft(next); setMerchantPhotoPreview(null); setMerchantSubmitStatus(null);
    setTimeout(() => scrollMenuTo(merchantFormRef.current), 0);
  };
  const ownerPlaceAction = async (action, pl) => {
    if (!userEmail) { setShowLoginModal('login'); return; }
    setMyPlaceBusyId(pl.id);
    try {
      const res = await fetch('/api/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, email: userEmail, sessionKey, placeId: pl.id }) });
      const d = await res.json().catch(() => ({}));
      if (d.error === 'session_invalid' || d.error === 'login_required') { setShowLoginModal('login'); throw new Error(redeemErrorText('session_invalid')); }
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      toast.success(action === 'withdraw'
        ? t('已下架，已從地圖移除；已發出的折扣券仍可核銷。', 'Withdrawn and removed from the map; coupons already issued can still be used.')
        : action === 'relist'
          ? t('已重新送審，通過後會回到地圖上。', 'Re-submitted — it returns to the map once approved.')
          : t('已刪除登記', 'Registration deleted'));
      if (merchantDraft.editing && merchantDraft.id === pl.id) cancelEditPlace();
      loadMyPlaces();
    } catch (e) { toast.error(String(e?.message || e)); }
    finally { setMyPlaceBusyId(null); setDeleteArmedId(null); }
  };
  const geocodeMerchant = async () => {
    const q = String(merchantDraft.address || '').trim();
    if (!q) return;
    setMerchantGeoBusy(true);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(uiLang === 'en' ? 'en' : 'zh-TW')}`);
      const d = await r.json().catch(() => ({}));
      if (r.ok && Number.isFinite(d.lat)) { setMerchantDraft(m => ({ ...m, lat: d.lat, lng: d.lng })); setToast(d.approximate ? t('只定位到街道，請把大頭針拖到正確位置', 'Located the street only — drag the pin to the exact spot') : t('已定位，可在地圖上拖曳大頭針微調', 'Located — drag the pin to fine-tune')); }
      else { setMerchantDraft(m => ({ ...m, lat: m.lat ?? 23.7, lng: m.lng ?? 121.0 })); toast.error(t('找不到這個地址，請在地圖上點選或拖曳大頭針', 'Address not found — click or drag the pin on the map')); }
    } catch { toast.error(t('定位失敗，請稍後再試', 'Geocoding failed, try again later')); }
    finally { setMerchantGeoBusy(false); }
  };
  const useMyLocationForMerchant = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMerchantDraft(m => ({ ...m, lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) })),
      () => { toast.error(t('無法取得目前位置', 'Could not get your location')); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  const handleMerchantPhoto = async (file) => {
    if (!file || !userEmail) return;
    setMerchantPhotoBusy(true);
    try {
      const blob = await compressBackgroundImage(file, { maxWidth: 1200, maxBytes: 300000 });
      const assetId = await uploadSetAsset({ email: userEmail, setId: `place:${merchantDraft.id}`, blob, kind: 'image', sessionKey });
      setMerchantDraft(m => ({ ...m, photoAssetId: assetId, photoMime: blob.type || 'image/webp' }));
      setMerchantPhotoPreview(URL.createObjectURL(blob));
    } catch (e) {
      toast.error(String(e?.message || e).includes('session') ? redeemErrorText('session_invalid') : t('照片上傳失敗：{error}', 'Photo upload failed: {error}').replace('{error}', String(e?.message || e)));
    } finally { setMerchantPhotoBusy(false); }
  };
  const submitMerchant = async () => {
    const m = merchantDraft;
    setMerchantSubmitStatus(null);
    if (!m.name.trim() || !m.address.trim()) { toast.error(t('請填寫名稱與地址', 'Name and address are required')); return; }
    if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng)) { toast.error(t('請先按「定位」或在地圖上點選位置', 'Locate the address or pick the spot on the map first')); return; }
    if (!m.agree) { toast.error(t('請勾選同意條款', 'Please tick the agreement'), 2500); return; }
    const referrerCode = String(m.referrerCode || '').trim();
    if (!m.editing && referrerCode && !REFERRAL_CODE_RE.test(referrerCode)) { toast.error(t('推薦碼格式不正確，應為 10 個字母/數字。', 'Invalid format. Expected 10 letters/numbers.')); return; }
    // No valid login on this device (signed in before sessionKeys existed,
    // or the key was rotated out by logins elsewhere): get one first, then
    // the effect below sends this same form the moment the key arrives.
    const needLogin = () => {
      merchantResubmitAtRef.current = Date.now();
      setMerchantSubmitStatus({ type: 'login', text: t('需要重新登入才能送出。登入後會自動幫你送出。', 'Please sign in again to submit — it will be sent automatically once you are back.') });
      setShowLoginModal('login');
    };
    if (!sessionKey) { needLogin(); return; }
    setMerchantBusy(true);
    try {
      const { agree, editing, ...place } = m; void agree;
      place.referrerCode = referrerCode;
      const payload = editing
        ? { action: 'owner_update', email: userEmail, sessionKey, placeId: m.id, place }
        : { action: 'register', email: userEmail, sessionKey, place };
      const res = await fetch('/api/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => ({}));
      if (d.error === 'session_invalid' || d.error === 'login_required') { needLogin(); return; }
      if (!res.ok || !d.success) throw new Error(d.error === 'daily_limit' ? t('今天已達登記上限（3 筆）', 'Daily registration limit (3) reached') : redeemErrorText(d.error || res.status));
      const okText = !editing
        ? t('已送出，等待審核。可在下方「我的登記」看到狀態。', 'Submitted and awaiting review — see “My submissions” below.')
        : d.reviewRequired
          ? t('已儲存。主要資料有變更，已重新送審，審核通過前暫時不在地圖上。', 'Saved. Key details changed, so it is back in review and off the map until approved.')
          : t('已儲存修改，地圖上的資料已更新。', 'Changes saved — the map is updated.');
      setMerchantSubmitStatus({ type: 'ok', text: okText });
      toast.success(editing ? okText : t('已送出，管理員審核後就會出現在地圖上 🎉', 'Submitted — it will appear on the map once approved 🎉'));
      setMerchantDraft(newPlaceDraft()); setMerchantPhotoPreview(null); loadMyPlaces();
      try { localStorage.removeItem('verserain_merchant_draft'); } catch { /* ignore */ }
    } catch (e) {
      const text = String(e?.message || e);
      setMerchantSubmitStatus({ type: 'error', text: t('送出失敗：{error}', 'Submit failed: {error}').replace('{error}', text) });
      toast.error(text);
    }
    finally { setMerchantBusy(false); }
  };
  // A fresh sessionKey after a blocked submit → send the kept form now
  // (within 10 minutes of the block, so a login next week doesn't fire it).
  useEffect(() => {
    if (!sessionKey || !merchantResubmitAtRef.current) return undefined;
    if (Date.now() - merchantResubmitAtRef.current > 10 * 60 * 1000) { merchantResubmitAtRef.current = 0; return undefined; }
    merchantResubmitAtRef.current = 0;
    const id = setTimeout(() => submitMerchant(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  // ── 管理員：地圖標記審核與折扣券 ────────────────────────────────────
  const [placesAdmin, setPlacesAdmin] = useState(null);
  const [placesAdminFilter, setPlacesAdminFilter] = useState('pending');
  const [placeEdit, setPlaceEdit] = useState(null); // { ...place, isNew? }
  const [vouchersAdmin, setVouchersAdmin] = useState(null);
  useEffect(() => {
    if (mainTab !== 'rewards_admin' || !isSuperAdmin) return undefined;
    let cancelled = false;
    fetch(`/api/places?all=1&adminEmail=${encodeURIComponent(userEmail)}`, { headers: adminHeaders() }).then(r => r.json()).then(d => { if (!cancelled) setPlacesAdmin(Array.isArray(d.places) ? d.places : []); }).catch(() => { if (!cancelled) setPlacesAdmin([]); });
    fetch(`/api/redeem-verify?all=1&adminEmail=${encodeURIComponent(userEmail)}`, { headers: adminHeaders() }).then(r => r.json()).then(d => { if (!cancelled) setVouchersAdmin(Array.isArray(d.vouchers) ? d.vouchers : []); }).catch(() => { if (!cancelled) setVouchersAdmin([]); });
    fetch(`/api/pools?all=1&adminEmail=${encodeURIComponent(userEmail)}`, { headers: adminHeaders() }).then(r => r.json()).then(d => { if (!cancelled) setPoolsAdmin(Array.isArray(d.pools) ? d.pools : []); }).catch(() => { if (!cancelled) setPoolsAdmin([]); });
    fetch(`/api/contests?all=1&adminEmail=${encodeURIComponent(userEmail)}`, { headers: adminHeaders() }).then(r => r.json()).then(d => { if (!cancelled) setContestsAdmin(Array.isArray(d.contests) ? d.contests : []); }).catch(() => { if (!cancelled) setContestsAdmin([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, isSuperAdmin, userEmail, rewardsAdminReload]);
  // Bumped after an admin approves / hides a marker or a Love in Action project so the
  // map (src/WorldMap.jsx) refetches at once instead of at its next 5-minute poll.
  const [placesVersion, setPlacesVersion] = useState(0);
  const placeAdminAction = async (action, { placeId, patch, place } = {}) => {
    try {
      const res = await fetch('/api/places', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ action, adminEmail: userEmail, placeId, patch, place }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || res.status);
      if (Array.isArray(d.places)) setPlacesAdmin(d.places);
      setPlaceEdit(null);
      setPlacesVersion(n => n + 1);
      toast.success(t('已更新地圖標記', 'Map marker updated'));
    } catch (e) { toast.error(t('更新失敗：{error}', 'Update failed: {error}').replace('{error}', String(e?.message || e))); }
  };
  const voucherAdminAction = async (code, action) => {
    try {
      const res = await fetch('/api/redeem-verify', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ action, adminEmail: userEmail, code }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || res.status);
      setRewardsAdminReload(n => n + 1);
      toast.success(t('已更新折扣券', 'Coupon updated'));
    } catch (e) { toast.error(t('更新失敗：{error}', 'Update failed: {error}').replace('{error}', String(e?.message || e))); }
  };

  // ── 折抵紀錄 (redemption history) ───────────────────────────────────
  const [myVouchers, setMyVouchers] = useState(null); // { vouchers, summary } | { error } | null
  const [placeLedger, setPlaceLedger] = useState({}); // placeId → { loading } | { vouchers, summary, place } | { error }
  const [placeLedgerOpen, setPlaceLedgerOpen] = useState({});
  const loadMyVouchers = React.useCallback(async () => {
    if (!userEmail) { setMyVouchers(null); return; }
    try {
      const r = await fetch(`/api/redeem-history?scope=me&email=${encodeURIComponent(userEmail)}&sessionKey=${encodeURIComponent(sessionKey)}`);
      const d = await r.json().catch(() => ({}));
      setMyVouchers(r.ok ? d : { error: d.error || String(r.status) });
    } catch (e) { setMyVouchers({ error: String(e?.message || e) }); }
  }, [userEmail, sessionKey]);
  useEffect(() => { if (mainTab === 'sponsors' && userEmail) loadMyVouchers(); }, [mainTab, userEmail, loadMyVouchers, activeVoucher?.status]);
  const togglePlaceLedger = async (placeId) => {
    const opening = !placeLedgerOpen[placeId];
    setPlaceLedgerOpen(o => ({ ...o, [placeId]: opening }));
    if (!opening || (placeLedger[placeId] && !placeLedger[placeId].error && !placeLedger[placeId].loading)) return;
    setPlaceLedger(l => ({ ...l, [placeId]: { loading: true } }));
    try {
      const r = await fetch(`/api/redeem-history?scope=place&placeId=${encodeURIComponent(placeId)}&email=${encodeURIComponent(userEmail)}&sessionKey=${encodeURIComponent(sessionKey)}`);
      const d = await r.json().catch(() => ({}));
      setPlaceLedger(l => ({ ...l, [placeId]: r.ok ? d : { error: d.error || String(r.status) } }));
    } catch (e) { setPlaceLedger(l => ({ ...l, [placeId]: { error: String(e?.message || e) } })); }
  };
  const voucherStatusBadge = (st) => st === 'issued' ? { text: t('有效', 'Valid'), bg: '#dcfce7', fg: '#166534' } : st === 'used' ? { text: t('已使用', 'Used'), bg: '#e2e8f0', fg: '#334155' } : st === 'expired' ? { text: t('已過期', 'Expired'), bg: '#fee2e2', fg: '#991b1b' } : { text: t('已作廢', 'Voided'), bg: '#fee2e2', fg: '#991b1b' };

  // ── 愛心行動 (Love in Action projects, api/pools.js) ─────────────────
  // A player "contributes" (投入) points: the points are burned from the
  // player's balance and become the organisation's discount allowance at the
  // shops that joined the pool. No transfer, no wallet, no refund, no receipt.
  const [charityPools, setCharityPools] = useState(null); // { pools } | { error } | null
  const [charityMine, setCharityMine] = useState(null); // { owned, contributed, merchantOf } | { error } | null
  const [charityFocus, setCharityFocus] = useState(''); // pool id opened from the map
  const [contributeModal, setContributeModal] = useState(null); // { pool } | null
  const [contributeNTD, setContributeNTD] = useState('10'); // raw text while typing; clamped by contributeClampNTD
  const [contributeBusy, setContributeBusy] = useState(false);
  const [poolRedeemModal, setPoolRedeemModal] = useState(null); // { pool, placeId, bill } | null
  const [poolRedeemBusy, setPoolRedeemBusy] = useState(false);
  const [poolCreateDraft, setPoolCreateDraft] = useState({ orgPlaceId: '', name: '', description: '', agree: false });
  const [poolCreateBusy, setPoolCreateBusy] = useState(false);
  const [poolJoinDraft, setPoolJoinDraft] = useState({}); // key → { poolId, perOrderMaxNTD, monthlyMaxNTD, consent }
  const [poolJoinBusy, setPoolJoinBusy] = useState('');
  const [poolsAdmin, setPoolsAdmin] = useState(null);
  const [poolsAdminFilter, setPoolsAdminFilter] = useState('pending');
  // 現金捐款: the owner's edit form per pool (poolId → draft) and the busy pool id.
  const [cashDraft, setCashDraft] = useState({});
  const [cashBusy, setCashBusy] = useState('');
  // fresh=true bypasses the CDN copy of the public list (s-maxage) right after
  // this client changed a pool, so the card shows the new numbers at once.
  const loadCharityPools = React.useCallback(async (fresh = false) => {
    try {
      const r = fresh ? await fetch(`/api/pools?fresh=${Date.now()}`, { cache: 'no-store' }) : await fetch('/api/pools');
      const d = await r.json().catch(() => ({}));
      setCharityPools(r.ok ? { pools: Array.isArray(d.pools) ? d.pools : [] } : { error: d.error || String(r.status) });
    } catch (e) { setCharityPools({ error: String(e?.message || e) }); }
  }, []);
  const loadCharityMine = React.useCallback(async () => {
    if (!userEmail) { setCharityMine(null); return; }
    try {
      const r = await fetch(`/api/pools?mine=1&email=${encodeURIComponent(userEmail)}&sessionKey=${encodeURIComponent(sessionKey)}`);
      const d = await r.json().catch(() => ({}));
      setCharityMine(r.ok ? { owned: d.owned || [], contributed: d.contributed || [], merchantOf: d.merchantOf || [] } : { error: d.error || String(r.status) });
    } catch (e) { setCharityMine({ error: String(e?.message || e) }); }
  }, [userEmail, sessionKey]);
  useEffect(() => {
    if (mainTab === 'charity') { loadCharityPools(); if (userEmail) { loadCharityMine(); loadMyPlaces(); } }
    else if (mainTab === 'garden' && userEmail) loadCharityMine();
    else if (mainTab === 'merchant' && userEmail) { loadCharityPools(); loadCharityMine(); }
  }, [mainTab, userEmail, loadCharityPools, loadCharityMine, loadMyPlaces]);
  useEffect(() => {
    if (mainTab !== 'charity' || !charityFocus || !charityPools) return;
    scrollMenuTo(document.getElementById(`pool-${charityFocus}`), { block: 'center' });
  }, [mainTab, charityFocus, charityPools]);
  const charityNoticeText = () => t('點數無現金價值；投入後不可撤回；本機構不開立捐贈收據；折抵額度僅供在指定合作商家折抵消費，不可轉讓、不可兌現。經文雨不經手任何款項，折抵後的餘額由機構直接支付給商家。', 'Points have no cash value; contributions cannot be reversed; the organisation issues no donation receipt; the allowance can only be used as a discount at the listed shops and cannot be transferred or cashed out. VerseRain never handles money; the organisation pays the remainder to the shop directly.');
  const openContribute = (pool) => {
    if (!pool || !pool.id) return;
    if (!userEmail) { setShowLoginModal('login'); toast.error(t('請先登入才能投入點數', 'Sign in to contribute points')); return; }
    setContributeModal({ pool }); setContributeNTD('10'); setPointsBalance(null);
    fetchPointsBalance();
  };
  // NT$ a player may put in right now: 1…100 per day, never more than the balance allows.
  const contributeMaxNTD = (pb) => (pb && !pb.error ? Math.max(0, Math.min(100, Math.floor((pb.balancePoints || 0) / 1000))) : 100);
  const contributeClampNTD = (raw, pb) => Math.max(1, Math.min(Math.floor(Number(raw) || 1), Math.max(1, contributeMaxNTD(pb))));
  const confirmContribute = async () => {
    if (!contributeModal) return;
    const points = contributeClampNTD(contributeNTD, pointsBalance) * 1000;
    setContributeBusy(true);
    try {
      const res = await fetch('/api/pools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'contribute', email: userEmail, sessionKey, poolId: contributeModal.pool.id, points }) });
      const d = await res.json().catch(() => ({}));
      if (d.error === 'session_invalid' || d.error === 'login_required') { setShowLoginModal('login'); throw new Error(redeemErrorText('session_invalid')); }
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      if (d.balance) setPointsBalance(d.balance);
      // Patch the card from the response first (the list refetch below may still hit the CDN);
      // the response carries no voucher summary, so keep the card's usedNTD.
      if (d.pool?.id) setCharityPools(cp => (cp?.pools ? { pools: cp.pools.map(p => (p.id === d.pool.id ? { ...p, ...d.pool, usedNTD: p.usedNTD } : p)) } : cp));
      setContributeModal(null);
      toast.success(t('已投入 {p} 點，「{pool}」折抵額度 +NT${n} ❤️', 'Contributed {p} pts — NT${n} added to “{pool}” ❤️').replace('{p}', points.toLocaleString()).replace('{pool}', String(contributeModal.pool.name || '')).replace('{n}', String(d.contribution?.ntd ?? points / 1000)));
      loadCharityPools(true); loadCharityMine();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setContributeBusy(false);
    }
  };
  const poolRedeem = async () => {
    const m = poolRedeemModal;
    if (!m || !m.pool || !m.placeId) return;
    const bill = Math.floor(Number(m.bill) || 0);
    if (bill < 1) { toast.error(redeemErrorText('bill_invalid')); return; }
    setPoolRedeemBusy(true);
    try {
      const res = await fetch('/api/pools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pool_redeem', email: userEmail, sessionKey, poolId: m.pool.id, placeId: m.placeId, billNTD: bill }) });
      const d = await res.json().catch(() => ({}));
      if (d.voucher && (d.success || d.error === 'open_voucher_exists')) { saveActiveVoucher({ ...d.voucher, status: d.voucher.status || 'issued' }); setPoolRedeemModal(null); loadCharityMine(); return; }
      if (d.error === 'too_small' && d.limitedBy === 'monthly') throw new Error(t('這家商家本月的折抵額度已用完', 'This shop’s monthly allowance is used up'));
      throw new Error(redeemErrorText(d.error || res.status));
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setPoolRedeemBusy(false);
    }
  };
  const merchantPoolAction = async (action, placeId, poolId, caps = {}) => {
    setPoolJoinBusy(placeId);
    try {
      const res = await fetch('/api/pools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, email: userEmail, sessionKey, poolId, placeId, ...caps }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      toast.success(action === 'merchant_leave' ? t('已退出愛心行動', 'Left the Love in Action project') : t('已更新愛心行動的參與設定', 'Love in Action participation saved'));
      setPoolJoinDraft(o => { const n = { ...o }; delete n[placeId]; return n; });
      loadCharityMine(); loadCharityPools(true);
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setPoolJoinBusy('');
    }
  };
  const createPool = async () => {
    const d0 = poolCreateDraft;
    if (!d0.orgPlaceId || !d0.agree) { toast.error(redeemErrorText('consent_required')); return; }
    setPoolCreateBusy(true);
    try {
      const res = await fetch('/api/pools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', email: userEmail, sessionKey, pool: { orgPlaceId: d0.orgPlaceId, name: d0.name, description: d0.description, agree: true } }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      setPoolCreateDraft({ orgPlaceId: '', name: '', description: '', agree: false });
      toast.success(t('已送出，等待審核', 'Submitted, awaiting review'));
      loadCharityMine();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setPoolCreateBusy(false);
    }
  };
  // 現金捐款 (cash appeal): only an organisation holding a fundraising permit
  // may publish where to give money; an admin checks the permit and that the
  // account is in the organisation's name before anyone else can see it.
  const CASH_FIELDS = ['orgLegalName', 'orgType', 'permitNo', 'permitUrl', 'bankName', 'bankBranch', 'accountName', 'accountNo', 'goalNTD', 'purpose', 'deadline', 'transferNote'];
  const startCashEdit = (pool) => {
    const c = pool.cashAppeal || {};
    const d = { agree: false };
    CASH_FIELDS.forEach(k => { d[k] = c[k] !== undefined && c[k] !== null ? String(c[k]) : ''; });
    if (!d.orgType) d.orgType = 'foundation';
    if (!d.transferNote) d.transferNote = String(pool.name || '').slice(0, 60);
    setCashDraft(o => ({ ...o, [pool.id]: d }));
  };
  const saveCashAppeal = async (poolId, remove = false) => {
    const d = cashDraft[poolId];
    if (!remove && (!d || !d.agree)) { toast.error(redeemErrorText('consent_required')); return; }
    setCashBusy(poolId);
    try {
      const cashAppeal = remove ? null : { ...Object.fromEntries(CASH_FIELDS.map(k => [k, String(d[k] || '').trim()])), goalNTD: Math.floor(Number(d.goalNTD) || 0) };
      const res = await fetch('/api/pools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cash_update', email: userEmail, sessionKey, poolId, agree: !remove, cashAppeal }) });
      const r = await res.json().catch(() => ({}));
      if (r.error === 'session_invalid' || r.error === 'login_required') { setShowLoginModal('login'); throw new Error(redeemErrorText('session_invalid')); }
      if (!res.ok || !r.success) throw new Error(redeemErrorText(r.error || res.status));
      setCashDraft(o => { const n = { ...o }; delete n[poolId]; return n; });
      toast.success(remove ? t('已停止公開現金捐款資訊', 'Cash donation details removed') : (r.pool?.cashAppeal?.status === 'verified' ? t('已更新', 'Updated') : t('已送出，等待審核', 'Submitted, awaiting review')));
      loadCharityMine(); loadCharityPools(true);
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setCashBusy('');
    }
  };
  const poolAdminAction = async (action, poolId, extra = {}) => {
    try {
      const res = await fetch('/api/pools', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ action, adminEmail: userEmail, poolId, ...extra }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || String(res.status));
      toast.success(t('已更新愛心行動', 'Pool updated'));
      setRewardsAdminReload(n => n + 1);
      setPlacesVersion(n => n + 1);
    } catch (e) { toast.error(String(e?.message || e)); }
  };
  const cashStatusBadge = (st) => st === 'verified' ? { text: t('已公開', 'Published'), bg: '#dcfce7', fg: '#166534' } : st === 'rejected' ? { text: t('未通過', 'Not approved'), bg: '#fee2e2', fg: '#991b1b' } : { text: t('審核中', 'Under review'), bg: '#fef3c7', fg: '#92400e' };
  const cashOrgTypeLabel = (k) => ({ foundation: t('財團法人', 'Foundation'), association: t('公益社團法人', 'Public-interest association'), school: t('公立學校', 'Public school'), agency: t('行政法人', 'Administrative agency') })[k] || String(k || '');
  const poolStatusBadge = (st) => st === 'approved' ? { text: t('進行中', 'Open'), bg: '#dcfce7', fg: '#166534' } : st === 'pending' ? { text: t('待審核', 'Pending'), bg: '#fef3c7', fg: '#92400e' } : st === 'closed' ? { text: t('已關閉', 'Closed'), bg: '#e2e8f0', fg: '#334155' } : { text: t('已退回', 'Rejected'), bg: '#fee2e2', fg: '#991b1b' };

  // ── 讀經比賽 (Bible reading contests) ──────────────────────────────────────
  // Code says "contest", never "campaign" — the Challenge engine already uses
  // campaign*/activeCampaignSetId for "the current Challenge play queue",
  // an unrelated concept. Reading progress is judged from the player's own
  // garden (stage ≥ 10 per verse, same threshold as 通過經文 elsewhere); the
  // score leaderboard only counts Challenge runs on the contest's own set,
  // and only once a player has separately "accepted the challenge".
  const [contests, setContests] = useState(null); // { contests } | { error } | null
  const [contestMine, setContestMine] = useState(null); // { owned, joined } | { error } | null
  const [contestFocus, setContestFocus] = useState(''); // contest id opened from the map
  const [contestsAdmin, setContestsAdmin] = useState(null);
  const [contestsAdminFilter, setContestsAdminFilter] = useState('pending');
  const [contestCreateDraft, setContestCreateDraft] = useState({ orgPlaceId: '', setId: '', name: '', description: '', rewardDescription: '', startsAt: '', endsAt: '', agree: false });
  const [contestCreateBusy, setContestCreateBusy] = useState(false);
  const [contestActionBusy, setContestActionBusy] = useState(''); // contestId currently busy
  const [contestLeaderboards, setContestLeaderboards] = useState({}); // contestId → [{who,score}]
  const loadContests = React.useCallback(async (fresh = false) => {
    try {
      const r = fresh ? await fetch(`/api/contests?fresh=${Date.now()}`, { cache: 'no-store' }) : await fetch('/api/contests');
      const d = await r.json().catch(() => ({}));
      setContests(r.ok ? { contests: Array.isArray(d.contests) ? d.contests : [] } : { error: d.error || String(r.status) });
    } catch (e) { setContests({ error: String(e?.message || e) }); }
  }, []);
  const loadContestMine = React.useCallback(async () => {
    if (!userEmail) { setContestMine(null); return; }
    try {
      const r = await fetch(`/api/contests?mine=1&email=${encodeURIComponent(userEmail)}&sessionKey=${encodeURIComponent(sessionKey)}`);
      const d = await r.json().catch(() => ({}));
      setContestMine(r.ok ? { owned: d.owned || [], joined: d.joined || [] } : { error: d.error || String(r.status) });
    } catch (e) { setContestMine({ error: String(e?.message || e) }); }
  }, [userEmail, sessionKey]);
  const loadContestLeaderboard = async (contestId) => {
    try {
      const r = await fetch(`/api/contests?leaderboard=1&contestId=${encodeURIComponent(contestId)}`);
      const d = await r.json().catch(() => ({}));
      setContestLeaderboards(o => ({ ...o, [contestId]: Array.isArray(d.leaderboard) ? d.leaderboard : [] }));
    } catch { /* leaderboard is a nice-to-have */ }
  };
  useEffect(() => {
    if (mainTab === 'contests') { loadContests(); if (userEmail) { loadContestMine(); loadMyPlaces(); } }
    else if (mainTab === 'garden' && userEmail) loadContestMine();
  }, [mainTab, userEmail, loadContests, loadContestMine, loadMyPlaces]);
  useEffect(() => {
    if (mainTab !== 'contests' || !contestFocus || !contests) return;
    scrollMenuTo(document.getElementById(`contest-${contestFocus}`), { block: 'center' });
  }, [mainTab, contestFocus, contests]);
  // Verses of `contest` this player has already reached "已熟練" (stage ≥ 10)
  // on, straight from the local garden — no round trip needed just to show a
  // progress bar; the server independently re-checks before it ever marks a
  // completion, so nothing here has to be trusted.
  const contestProgress = (contest) => {
    const verses = (contest && contest.verses) || [];
    // Same normalized lookup as the verse-set page's status icons — a verse
    // planted under a differently-formatted spelling of the reference must
    // still count as passed here, or this progress bar undercounts against
    // what the icons show.
    const passed = verses.filter(ref => {
      const gKey = findGardenKeyIndexed(gardenCanonicalIndex, gardenData || {}, ref, verseRefKey);
      return gKey && (gardenData[gKey].stage || 0) >= 10;
    }).length;
    return { passed, total: verses.length };
  };
  const contestNoticeText = () => t('讀完整組經文（每一節都練到「已熟練」）即可申請認證，機構會依公告方式頒發獎勵；經文雨不經手獎勵本身。額外接受「背經文挑戰」的話，活動期間內這組經文每一節只算你自己的最高分，加總成為排行榜分數——重複挑戰同一節不會增加總分，除非破了自己的紀錄。', 'Finish every verse of the set (each one practised to "mastered") to apply for certified completion — the organisation hands out the reward itself, off the app. If you also accept the memorisation challenge, only your own best score on each verse of this set during the contest window counts — the leaderboard total is the sum of those bests, so replaying the same verse won’t raise your score unless you beat your own record.');
  const joinContestAction = async (contest) => {
    if (!contest || !contest.id) return;
    if (!userEmail) { setShowLoginModal('login'); toast.error(t('請先登入才能參加', 'Sign in to join')); return; }
    setContestActionBusy(contest.id);
    try {
      const res = await fetch('/api/contests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', email: userEmail, sessionKey, contestId: contest.id }) });
      const d = await res.json().catch(() => ({}));
      if (d.error === 'session_invalid' || d.error === 'login_required') { setShowLoginModal('login'); throw new Error(redeemErrorText('session_invalid')); }
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      toast.success(t('已加入「{name}」📖', 'Joined “{name}” 📖').replace('{name}', String(contest.name || '')));
      loadContestMine(); loadContests(true);
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setContestActionBusy('');
    }
  };
  const acceptContestChallengeAction = async (contest) => {
    if (!contest || !contest.id) return;
    setContestActionBusy(contest.id);
    try {
      const res = await fetch('/api/contests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept_challenge', email: userEmail, sessionKey, contestId: contest.id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      toast.success(t('已接受背經文挑戰，開始玩「背經文」拿分數吧！', 'Challenge accepted — play Memorise mode to start scoring!'));
      loadContestMine();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setContestActionBusy('');
    }
  };
  const claimContestCompletionAction = async (contest) => {
    if (!contest || !contest.id) return;
    setContestActionBusy(contest.id);
    try {
      const res = await fetch('/api/contests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'claim_completion', email: userEmail, sessionKey, contestId: contest.id }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      if (!d.completed) { toast.info(t('還沒讀完整組（{p}/{n} 節），再加油！', 'Not finished yet ({p}/{n} verses) — keep going!').replace('{p}', String(d.passed || 0)).replace('{n}', String(d.total || 0))); return; }
      toast.success(t('🎉 已認證完成「{name}」，機構會另行通知獎勵方式', '🎉 Completion of “{name}” verified — the organisation will follow up on the reward').replace('{name}', String(contest.name || '')));
      loadContestMine();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setContestActionBusy('');
    }
  };
  const createContest = async () => {
    const d0 = contestCreateDraft;
    if (!d0.orgPlaceId || !d0.setId || !d0.name.trim() || !d0.startsAt || !d0.endsAt || !d0.agree) { toast.error(redeemErrorText('consent_required')); return; }
    const set = safeActiveSets.find(s => s.id === d0.setId);
    if (!set) { toast.error(redeemErrorText('set_required')); return; }
    setContestCreateBusy(true);
    try {
      const res = await fetch('/api/contests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create', email: userEmail, sessionKey,
          contest: {
            orgPlaceId: d0.orgPlaceId, name: d0.name, description: d0.description, rewardDescription: d0.rewardDescription,
            setId: set.id, setTitle: set.title, setLang: version || '', verses: (set.verses || []).map(v => v.reference),
            startsAt: new Date(d0.startsAt).toISOString(), endsAt: new Date(d0.endsAt + 'T23:59:59').toISOString(),
            seriesId: d0.seriesId || '', agree: true,
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(redeemErrorText(d.error || res.status));
      setContestCreateDraft({ orgPlaceId: '', setId: '', name: '', description: '', rewardDescription: '', startsAt: '', endsAt: '', agree: false });
      toast.success(t('已送出，等待審核', 'Submitted, awaiting review'));
      loadContestMine();
    } catch (e) {
      toast.error(String(e?.message || e));
    } finally {
      setContestCreateBusy(false);
    }
  };
  const contestAdminAction = async (action, contestId) => {
    try {
      const res = await fetch('/api/contests', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ action, adminEmail: userEmail, contestId }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || String(res.status));
      toast.success(t('已更新讀經比賽', 'Contest updated'));
      setRewardsAdminReload(n => n + 1);
      setPlacesVersion(n => n + 1);
    } catch (e) { toast.error(String(e?.message || e)); }
  };
  // 「我的登記」 card of an approved shop: join / update / leave a pool.
  const renderMerchantPoolSection = (pl) => {
    const joinedList = (charityMine && !charityMine.error ? charityMine.merchantOf : []).filter(m => m.placeId === pl.id);
    const joinedIds = new Set(joinedList.map(m => m.poolId));
    const openPools = (charityPools?.pools || []).filter(p => !joinedIds.has(p.id));
    const key = `join-${pl.id}`;
    const d = poolJoinDraft[key] || { poolId: openPools[0]?.id || '', perOrderMaxNTD: 500, monthlyMaxNTD: 5000, consent: false };
    const setD = (patch) => setPoolJoinDraft(o => ({ ...o, [key]: { ...d, ...patch } }));
    const busy = poolJoinBusy === pl.id;
    const small = { width: 110, padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' };
    const btn = (bg, fg = '#fff', border = 'none') => compactBtn(bg, fg, border, busy);
    return (
      <div data-testid={`merchant-pool-${pl.id}`} style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed #fecdd3' }}>
        <b style={{ color: '#be123c', fontSize: '0.9rem' }}>❤️ {t('參與愛心行動', 'Join a Love in Action project')}</b>
        {joinedList.map(m => {
          const ek = `edit-${pl.id}-${m.poolId}`;
          const ed = poolJoinDraft[ek] || { perOrderMaxNTD: m.perOrderMaxNTD, monthlyMaxNTD: m.monthlyMaxNTD };
          const setE = (patch) => setPoolJoinDraft(o => ({ ...o, [ek]: { ...ed, ...patch } }));
          return (
            <div key={m.poolId} style={{ background: '#fff1f2', borderRadius: 8, padding: '0.5rem 0.7rem', marginTop: '0.4rem', fontSize: '0.85rem', color: '#334155' }}>
              <div><b>{m.poolName}</b> <span style={{ color: '#64748b' }}>· ⛪ {m.orgPlaceName}</span> {m.poolStatus !== 'approved' && <span style={{ color: '#94a3b8' }}>({poolStatusBadge(m.poolStatus).text})</span>}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>{t('本月已折抵 NT${n}', 'NT${n} used this month').replace('{n}', String(m.monthUsedNTD || 0))}</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.4rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#475569' }}>{t('單筆最高折抵 NT$', 'Max discount per order NT$')} <input type="number" min={1} max={2000} value={ed.perOrderMaxNTD} onChange={e => setE({ perOrderMaxNTD: Number(e.target.value) })} style={small} /></label>
                <label style={{ fontSize: '0.78rem', color: '#475569' }}>{t('每月最高折抵 NT$', 'Max discount per month NT$')} <input type="number" min={1} max={10000} value={ed.monthlyMaxNTD} onChange={e => setE({ monthlyMaxNTD: Number(e.target.value) })} style={small} /></label>
                <button type="button" disabled={busy} onClick={() => merchantPoolAction('merchant_update', pl.id, m.poolId, { perOrderMaxNTD: ed.perOrderMaxNTD, monthlyMaxNTD: ed.monthlyMaxNTD, consent: true })} style={btn('#be123c')}>{t('更新上限', 'Update caps')}</button>
                <button type="button" disabled={busy} onClick={async () => { if (await confirmDialog({ title: t('退出「{pool}」？', 'Leave “{pool}”?').replace('{pool}', m.poolName || ''), message: t('之後顧客就不能在這家店用這個愛心行動折抵。', 'Customers will no longer be able to use this Love in Action pool at this shop.'), confirmLabel: t('退出', 'Leave'), danger: true })) merchantPoolAction('merchant_leave', pl.id, m.poolId); }} style={btn('transparent', '#991b1b', '1px solid #fecaca')}>{t('退出', 'Leave')}</button>
              </div>
            </div>
          );
        })}
        {openPools.length > 0 ? (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#334155' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={d.poolId} onChange={e => setD({ poolId: e.target.value })} style={{ ...small, width: 'auto', maxWidth: '100%' }}>
                {openPools.map(p => <option key={p.id} value={p.id}>{p.name}（{p.orgPlaceName}）</option>)}
              </select>
              <label style={{ fontSize: '0.78rem', color: '#475569' }}>{t('單筆最高折抵 NT$', 'Max discount per order NT$')} <input type="number" min={1} max={2000} value={d.perOrderMaxNTD} onChange={e => setD({ perOrderMaxNTD: Number(e.target.value) })} style={small} /></label>
              <label style={{ fontSize: '0.78rem', color: '#475569' }}>{t('每月最高折抵 NT$', 'Max discount per month NT$')} <input type="number" min={1} max={10000} value={d.monthlyMaxNTD} onChange={e => setD({ monthlyMaxNTD: Number(e.target.value) })} style={small} /></label>
            </div>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
              <input type="checkbox" checked={!!d.consent} onChange={e => setD({ consent: e.target.checked })} style={{ marginTop: 3 }} />
              <span>{t('我同意參與此愛心行動：本店自願提供折扣，接受機構以愛心行動額度折抵消費（單筆與每月上限如上），餘額由機構直接支付；本店可隨時退出，已產生的折扣券仍予受理。經文雨不經手款項、不收取任何費用。', 'I agree to join this Love in Action project: the shop voluntarily offers the discount, accepts the organisation’s pool allowance against purchases (within the caps above) and receives the remainder from the organisation directly; the shop may leave at any time and will still honour vouchers already issued. VerseRain handles no money and charges no fee.')}</span>
            </label>
            <button type="button" disabled={busy || !d.consent || !d.poolId} onClick={() => merchantPoolAction('merchant_join', pl.id, d.poolId, { perOrderMaxNTD: d.perOrderMaxNTD, monthlyMaxNTD: d.monthlyMaxNTD, consent: true })} style={{ ...btn(d.consent ? '#be123c' : '#e2e8f0', d.consent ? '#fff' : '#94a3b8'), marginTop: '0.4rem' }}>❤️ {t('加入愛心行動', 'Join pool')}</button>
          </div>
        ) : joinedList.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 4 }}>{t('目前沒有開放中的愛心行動', 'No Love in Action project is open right now')}</div>
        ) : null}
      </div>
    );
  };

  // Merge the two inboxes (voice encouragement by email, referral notifications
  // by personalCode) into one 🔔 list, newest first, with a combined unread
  // count. Each item is tagged with _src so the panel and read-marking know
  // which source it came from.
  const combinedInbox = React.useMemo(() => {
    const voiceItems = (encourageInbox?.items || []).map(it => ({ ...it, _src: 'voice' }));
    const notifyItems = (notifyInbox?.items || []).map(it => ({ ...it, _src: 'notify' }));
    const all = [...voiceItems, ...notifyItems].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const voiceRead = encourageInbox?.lastReadAt || '';
    const notifyRead = notifyInbox?.lastReadAt || '';
    const unread = all.filter(it => (it.at || '') > (it._src === 'voice' ? voiceRead : notifyRead)).length;
    return { all, unread };
  }, [encourageInbox, notifyInbox]);

  // 💬/❤️ counts for the recording picker rows, fetched once per open.
  useEffect(() => {
    if (!verseVoicePicker?.setId) return undefined;
    let cancelled = false;
    voiceCommentApi.getCounts(verseVoicePicker.setId)
      .then(res => { if (!cancelled && res?.counts) setVoiceCommentCounts(res.counts); })
      .catch(() => { /* badges are optional */ });
    return () => { cancelled = true; };
  }, [verseVoicePicker]);

  // Legacy name kept for the many call sites: setToast(msg) shows a toast,
  // setToast(null) hides it. New code calls toast.success / toast.error.
  const setToast = toast;
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const [qrShareModal, setQrShareModal] = useState(null); // { url, reference }
  // 經文組翻譯 modal。phase: 'pick' | 'working' | 'preview' | 'exists' | 'done'.
  // { set, target, targetId?, title?, verses?, progress?, existingId? }
  const [translateModal, setTranslateModal] = useState(null);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState(null);
  const [multiplayerRoomMode, setMultiplayerRoomMode] = useState(null);
  const [multiplayerRoomRole, setMultiplayerRoomRole] = useState('player');
  const [multiplayerTeamCount, setMultiplayerTeamCount] = useState(4);
  const [multiplayerHostPlays, setMultiplayerHostPlays] = useState(false); // team host also competes
  const [wsConnected, setWsConnected] = useState(false);
  const geoRef = useRef(null); // cached IP geolocation
  const [showMultiplayerVersePicker, setShowMultiplayerVersePicker] = useState(false);
  const [pickerSelectedSet, setPickerSelectedSet] = useState(null);
  const [multiplayerPlayMode, setMultiplayerPlayMode] = useState('square_solo');
  const [flyingBlocks, setFlyingBlocks] = useState([]);
  const [multiplayerDistractionLevel, setMultiplayerDistractionLevel] = useState(0);

  // Voice Control State
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
    try {
      const byVersion = JSON.parse(localStorage.getItem('verseRain_voiceByVersion') || '{}');
      const v = initialBibleVersion();
      return byVersion?.[v] || localStorage.getItem('verseRain_voiceName') || '';
    } catch (e) {
      return localStorage.getItem('verseRain_voiceName') || '';
    }
  });
  const langPrefixForVersion = (v) => (isEnglishBibleVersion(v) ? 'en' : v === 'ja' ? 'ja' : v === 'ko' ? 'ko' : v === 'fa' ? 'fa' : v === 'ar' ? 'ar' : v === 'he' ? 'he' : v === 'es' ? 'es' : v === 'tr' ? 'tr' : v === 'de' ? 'de' : v === 'my' ? 'my' : v === 'vi' ? 'vi' : v === 'id' ? 'id' : v === 'ms' ? 'ms' : v === 'pt' ? 'pt' : v === 'fr' ? 'fr' : v === 'ru' ? 'ru' : v === 'hi' ? 'hi' : v === 'km' ? 'km' : 'zh');
  const filteredVoicesForVersion = dedupeVoices(availableVoices.filter(vc => (vc.lang || '').toLowerCase().startsWith(langPrefixForVersion(version))));
  // Deduped + disambiguated display options for the voice <select> (fixes the
  // duplicate "Chinese Hong Kong" entries on Android).
  const voiceOptionsForVersion = buildVoiceOptions(filteredVoicesForVersion, { cloudLabel: '☁️' });
  // The <select> value must equal one of the option ids. selectedVoiceName may
  // be a legacy "name__lang" key, so resolve it to the matching option's id.
  const selectedVoiceOptionId = (() => {
    if (!selectedVoiceName) return '';
    const match = voiceOptionsForVersion.find(o => voiceMatchesSavedKey(o.voice, selectedVoiceName));
    return match ? match.id : '';
  })();
  const saveVoiceForVersion = (voiceName) => {
    try {
      const byVersion = JSON.parse(localStorage.getItem('verseRain_voiceByVersion') || '{}');
      if (voiceName) {
        byVersion[version] = voiceName;
        localStorage.setItem('verseRain_voiceName', voiceName); // backward compatibility
      } else {
        delete byVersion[version];
        localStorage.removeItem('verseRain_voiceName');
      }
      localStorage.setItem('verseRain_voiceByVersion', JSON.stringify(byVersion));
      setSelectedVoiceName(voiceName || '');
      toast.success(t('語音已更新！', 'Voice updated!'));
    } catch (e) {}
  };
  useEffect(() => {
    try {
      const byVersion = JSON.parse(localStorage.getItem('verseRain_voiceByVersion') || '{}');
      setSelectedVoiceName(byVersion?.[version] || localStorage.getItem('verseRain_voiceName') || '');
    } catch (e) {
      setSelectedVoiceName(localStorage.getItem('verseRain_voiceName') || '');
    }
  }, [version]);
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
  const [continuousRainSet, setContinuousRainSet] = useState(null);
  // The lobby music must not play over a set's own soundtrack. Pause it while
  // a listening session, a game, or the daily player (話語甘霖) is on screen,
  // and resume it afterwards only if it was on before.
  const lobbyMusicResumeRef = useRef(false);
  useEffect(() => {
    const busy = !!continuousRainSet || gameState !== 'menu' || mainTab === 'daily_verse';
    if (busy && isMusicPlaying) { lobbyMusicResumeRef.current = true; setIsMusicPlaying(false); }
    else if (!busy && lobbyMusicResumeRef.current) { lobbyMusicResumeRef.current = false; setIsMusicPlaying(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuousRainSet, gameState, mainTab]);

  // 播放順序選擇 — holds the set while the user picks 隨機 or 按序.
  const [playOrderChooser, setPlayOrderChooser] = useState(null);
  const [playDurationChoice, setPlayDurationChoice] = useState(() => {
    try {
      return localStorage.getItem('verseRainPlayDuration') || DEFAULT_PLAY_DURATION_CHOICE;
    } catch {
      return DEFAULT_PLAY_DURATION_CHOICE;
    }
  });
  const selectedPlayDuration = PLAY_DURATION_OPTIONS.find(option => option.value === playDurationChoice) || PLAY_DURATION_OPTIONS[1];
  useEffect(() => {
    try {
      localStorage.setItem('verseRainPlayDuration', selectedPlayDuration.value);
    } catch {
      // Ignore storage failures; playback can still use the in-memory choice.
    }
  }, [selectedPlayDuration.value]);
  const [playFontChoice, setPlayFontChoice] = useState(() => {
    try {
      return localStorage.getItem('verseRainPlayFontSize') || DEFAULT_PLAY_FONT_CHOICE;
    } catch {
      return DEFAULT_PLAY_FONT_CHOICE;
    }
  });
  const selectedPlayFont = PLAY_FONT_OPTIONS.find(option => option.value === playFontChoice) || PLAY_FONT_OPTIONS[2];
  useEffect(() => {
    try {
      localStorage.setItem('verseRainPlayFontSize', selectedPlayFont.value);
    } catch {
      // Ignore storage failures; playback can still use the in-memory choice.
    }
  }, [selectedPlayFont.value]);
  const [playInkChoice, setPlayInkChoice] = useState(readPlayInkChoice);
  const selectedPlayInk = PLAY_INK_OPTIONS.find(option => option.value === playInkChoice) || PLAY_INK_OPTIONS[0];
  useEffect(() => {
    try {
      localStorage.setItem('verseRainPlayInk', selectedPlayInk.value);
    } catch {
      // Ignore storage failures; playback can still use the in-memory choice.
    }
  }, [selectedPlayInk.value]);
  // Play-time voice source: null = auto (my voice › author › TTS). Otherwise
  // { type:'tts'|'owner'|'personal', ownerId?, label }. Chosen in the 播放方式
  // modal; threaded onto continuousRainSet as sharedVoiceOwner/forceTTS/
  // forceOwnerLayer, which the player's override machinery already understands.
  const [voiceChoice, setVoiceChoice] = useState(null);
  // Fetched when the modal opens: { contributors:[{ownerId,recordedBy,count}],
  // ownerHasVoice, ownerName, mineId }. null while loading / no set.
  const [voiceOptions, setVoiceOptions] = useState(null);
  useEffect(() => {
    if (!playOrderChooser?.id) { setVoiceOptions(null); setVoiceChoice(null); return undefined; }
    let cancelled = false;
    setVoiceOptions(null);
    setVoiceChoice(null);
    const setId = playOrderChooser.voiceSetId || playOrderChooser.id;
    (async () => {
      const [contribRes, ownerRes, mineId] = await Promise.all([
        userVoiceApi.getContributors(setId).catch(() => null),
        setVoiceApi.getAll(setId).catch(() => null),
        userEmail ? voiceOwnerId(userEmail).catch(() => null) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      const contributors = contribRes?.contributors || [];
      const ownerVoices = ownerRes?.voices || {};
      const ownerHasVoice = Object.keys(ownerVoices).length > 0;
      const ownerName = ownerHasVoice ? (Object.values(ownerVoices)[0]?.recordedBy || '') : '';
      setVoiceOptions({ contributors, ownerHasVoice, ownerName, mineId });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playOrderChooser, userEmail]);
  const startContinuousPlay = (set, order) => {
    if (!set?.verses?.length) return;
    const vc = voiceChoice;
    setPlayOrderChooser(null);
    setContinuousRainSet({
      id: set.id,
      title: set.title,
      verses: set.verses,
      playOrder: order, // 'random' | 'sequential' — both loop forever
      playDurationMinutes: selectedPlayDuration.minutes,
      fontSizeLevel: selectedPlayFont.value,
      inkColor: selectedPlayInk.value,
      startVerse: order === 'sequential' ? set.verses[0] : undefined,
      voiceSetId: set.voiceSetId || null,
      background: set.background || '',
      backgroundMime: set.backgroundMime || '',
      bgMusic: set.bgMusic || '',
      bgMusicMime: set.bgMusicMime || '',
      bgMusicVolume: set.bgMusicVolume,
      // Voice source (see voiceChoice). A contributor pick rides the existing
      // sharedVoiceOwner path; TTS / author use the two force flags.
      sharedVoiceOwner: vc?.type === 'personal' ? vc.ownerId : (set.sharedVoiceOwner || null),
      forceTTS: vc?.type === 'tts',
      forceOwnerLayer: vc?.type === 'owner',
    });
  };
  const [multiplayerSearchText, setMultiplayerSearchText] = useState('');
  const [showPickerBrowser, setShowPickerBrowser] = useState(false);
  // 邀人對戰 from a set page: the room's setup panel opens with that set already
  // chosen, so the host only picks mode, difficulty and how many verses.
  const [pickerLockedSet, setPickerLockedSet] = useState(false);

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
          country: localStorage.getItem('verserain_custom_country') || geo.country_name || geo.country || '',
          city: localStorage.getItem('verserain_custom_city') || geo.city || '',
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
          try { 
            const geo = await svc(); 
            const customLat = localStorage.getItem('verserain_custom_lat');
            const customLng = localStorage.getItem('verserain_custom_lng');
            if (customLat && customLng) {
              geo.latitude = customLat;
              geo.longitude = customLng;
            }
            geoRef.current = geo; 
            doSubmit(geo); 
            return; 
          } catch { }
        }
      };
      tryGeo();
    }
  }, [multiplayerRoomId]);

  const [multiplayerState, setMultiplayerState] = useState(null);
  const [myClientId, setMyClientId] = useState(null);
  // Pre-resolve the whole *_solo queue into the player's version (during ready-check),
  // so each verse can start in their own language without a mid-round fetch hitch.
  // (Placed here because it depends on multiplayerState / multiplayerRoomId.)
  useEffect(() => {
    const st = multiplayerState;
    if (!multiplayerRoomId || !st?.playMode?.endsWith('_solo')) return undefined;
    const queue = (st.campaignQueue && st.campaignQueue.length)
      ? st.campaignQueue
      : (st.verseRef ? [{ reference: st.verseRef, text: st.verseText }] : []);
    if (!queue.length) return undefined;
    let cancelled = false;
    (async () => {
      for (const v of queue) {
        if (cancelled) return;
        if (!v?.reference) continue;
        const cacheKey = `${version}|${normalizeVerseReferenceKey(v.reference)}`;
        if (localizedTextByRefRef.current[cacheKey] !== undefined) continue;
        const text = await resolveVerseTextForVersion(v.reference, version);
        if (cancelled) return;
        localizedTextByRefRef.current[cacheKey] = text || '';
        if (text) setLocalizedTick(n => n + 1); // wake the reactive swap below
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiplayerState?.campaignQueue, multiplayerState?.playMode, multiplayerRoomId, version]);
  // On slow (mobile) networks the localized text can arrive AFTER a *_solo verse
  // already started in the host's language. When it lands (localizedTick) and we're
  // still at the very start of the current verse, swap it in and rebuild the board
  // so the player sees their own language. Guarded to seqIndex 0 to avoid yanking
  // the board out from under a player who's already begun.
  useEffect(() => {
    if (!multiplayerRoomId || !multiplayerState?.playMode?.endsWith('_solo')) return;
    if (gameState !== 'playing' || !activeVerse?.reference) return;
    if (currentSeqRef.current !== 0) return;
    const localized = mpLocalTextFor(activeVerse.reference, null);
    if (!localized || localized === activeVerse.text) return;
    const verseObj = { ...activeVerse, text: localized };
    setActiveVerse(verseObj);
    if (multiplayerState.playMode === 'square_solo') {
      initSquareBlocks(false, null, verseObj);
    } else if (multiplayerState.playMode === 'rain_solo') {
      setBlocks([]); // upcoming spawns read the now-localized activePhrases
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localizedTick, gameState, activeVerse?.reference, multiplayerRoomId]);
  const [intermissionCountdown, setIntermissionCountdown] = useState(0);
  const [intermissionEndsAt, setIntermissionEndsAt] = useState(null);
  const [joinRoomError, setJoinRoomError] = useState(null);
  const joinRoomTimeoutRef = useRef(null);
  const isGuestJoinRef = useRef(false);

  const startLocalIntermissionCountdown = (seconds) => {
    const duration = Math.max(1, Number(seconds) || 1);
    setIntermissionCountdown(duration);
    setIntermissionEndsAt(Date.now() + duration * 1000);
  };

  useEffect(() => {
    if (gameState !== 'intermission' || !intermissionEndsAt) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((intermissionEndsAt - Date.now()) / 1000));
      setIntermissionCountdown(remaining);
      if (remaining === 0) setIntermissionEndsAt(null);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 200);
    return () => clearInterval(timer);
  }, [gameState, intermissionEndsAt]);

  useEffect(() => {
    if (gameState === 'intermission' && intermissionCountdown === 0 && intermissionEndsAt === null) {
      // square_solo: each player advances to their next verse independently
      if (multiplayerRoomId && multiplayerState?.playMode?.endsWith('_solo') && localNextVerse) {
        // Resolve this next verse into the player's own language (falls back to host text).
        const nextText = mpLocalTextFor(localNextVerse.reference, localNextVerse.text);
        const verseObj = { reference: localNextVerse.reference, text: nextText, title: 'Multiplayer' };
        setActiveVerse(verseObj);
        setCurrentSeqIndex(0);
        currentSeqRef.current = 0;
        setScore(0);
        setCombo(0);
        setHealth(3);
        const phraseCount = splitVersePhrases(nextText).length;
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
        const phrases = splitVersePhrases(nextVerse.text);

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
  }, [gameState, intermissionCountdown, intermissionEndsAt, multiplayerState, myClientId, multiplayerRoomId, localNextVerse]);

  const socketRef = useRef(null);
  const pendingInvitePKRef = useRef(null);

  // Deferred referral: the first time this guest sees the host's game start,
  // record "I played in <hostKey>'s room" (server /touch, src/party/referral.js)
  // and, if this browser has no inviter yet, adopt the host locally too.
  useEffect(() => {
    if (!multiplayerRoomId || multiplayerRoomRole === 'host') return;
    const hostKey = multiplayerState?.hostKey;
    if (!hostKey || multiplayerState?.status !== 'playing' || hostKey === personalCode) return;
    const guard = 'verserain_touched_' + multiplayerRoomId;
    try { if (sessionStorage.getItem(guard)) return; sessionStorage.setItem(guard, '1'); } catch { /* noop */ }
    postTouch({ deviceCode: personalCode, inviter: hostKey, kind: 'room', roomId: multiplayerRoomId });
    try {
      if (!localStorage.getItem('verserain_inviter')) {
        localStorage.setItem('verserain_inviter', hostKey);
        localStorage.removeItem('verserain_invite_claimed');
      }
    } catch { /* noop */ }
  }, [multiplayerRoomId, multiplayerRoomRole, multiplayerState?.status, multiplayerState?.hostKey, personalCode]);

  useEffect(() => {
    const targetRoom = multiplayerRoomId || "global-lobby";
    const socketQuery = { name: playerName || "Player" + Math.floor(Math.random() * 999) };
    if (multiplayerRoomId) {
      socketQuery.playerKey = personalCode;
      if (multiplayerRoomRole === 'host') socketQuery.hostKey = personalCode;
      if (multiplayerRoomMode) socketQuery.mode = multiplayerRoomMode;
      if (multiplayerRoomRole) socketQuery.role = multiplayerRoomRole;
      if (multiplayerRoomMode === 'team' && multiplayerRoomRole === 'host') {
        socketQuery.teamCount = multiplayerTeamCount;
        if (multiplayerHostPlays) socketQuery.hostPlays = '1';
      }
    }

    const socket = new PartySocket({
      host: "verserain-party.hungry4grace.partykit.dev", // Production Cloudflare Worker URL
      room: targetRoom,
      query: socketQuery
    });

    socketRef.current = socket;

    let heartbeatInterval = null;

    const handleOpen = () => {
      setMyClientId(socket.id);
      setWsConnected(true);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'PING', ts: Date.now() }));
        }
      }, 30000);
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

    const handleClose = () => {
      setWsConnected(false);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };

    const handleError = () => {
      setWsConnected(false);
    };

    const handleMessage = (e) => {
      if (socket.id) setMyClientId(socket.id);
      setWsConnected(true);
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'PONG') return;
        if (msg.type === 'PULSE') {
          // 轉成 window 事件,讓地圖(WorldMap2D)自行畫漣漪,不必穿 props。
          try { window.dispatchEvent(new CustomEvent('verserain:pulse', { detail: { name: msg.name, action: msg.action } })); } catch {}
          return;
        }
        if (msg.type === 'STATE_UPDATE') {
          setMultiplayerState(msg.state);
          // Room validation for guest join:
          // If we received a state AND there are other players (host exists), room is valid → clear timeout
          // If status='waiting' and only 1 player (just us), room is empty/nonexistent
          if (isGuestJoinRef.current) {
            const players = msg.state.players || {};
            const playerCount = Object.keys(players).length;
            const hasSeparateHost = msg.state.host && msg.state.host !== socket.id;
            if (playerCount > 1 || msg.state.status !== 'waiting' || hasSeparateHost) {
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
          const isTeamHostSpectator = msg.state.matchType === 'team' && msg.state.host === socket.id && !msg.state.players?.[socket.id];
          if (msg.state.status === 'playing' && isTeamHostSpectator) {
            setGameState('waiting_for_others');
            if (timerRef.current) clearInterval(timerRef.current);
            return;
          }
          const needsTeamBeforeStart = msg.state.status === 'playing'
            && msg.state.matchType === 'team'
            && msg.state.host !== socket.id
            && msg.state.players?.[socket.id]
            && !msg.state.players[socket.id].teamId;
          if (needsTeamBeforeStart) {
            setGameState('menu');
            setMainTab('multiplayer');
            if (timerRef.current) clearInterval(timerRef.current);
            return;
          }
          if (msg.state.status === 'playing' && !isGameActive) {
            // Fix: always reset autoplay when a multiplayer game starts
            setIsAutoPlay(false);
            isAutoPlayRef.current = false;

            // *_solo: each player renders verse 0 in THEIR OWN language (resolved from
            // the reference); other (shared-board) modes keep the host's blocks/text.
            const isSolo = msg.state.playMode?.endsWith('_solo');
            const verse0Text = (isSolo ? mpLocalTextFor(msg.state.verseRef, msg.state.verseText) : msg.state.verseText)
              || msg.state.verseText || msg.state.blocks.filter(b => !b.isFake).map(b => b.text).join('');
            const fakeVerse = { reference: msg.state.verseRef, title: "Multiplayer", text: verse0Text };
            setActiveVerse(fakeVerse);
            // Sync the ref synchronously so the local block builder uses the host's
            // difficulty (state set below is async / this handler's closure can lag).
            if (msg.state.distractionLevel !== undefined) distractionLevelRef.current = msg.state.distractionLevel;
            if (isSolo && msg.state.playMode === 'square_solo') {
              // Build this player's own tiles from their own-language text.
              initSquareBlocks(false, null, fakeVerse);
            } else {
              setBlocks(msg.state.blocks);
            }
            setGameState('playing');
            setHealth(3);
            setCombo(0);
            setScore(0);
            const phraseCount = splitVersePhrases(verse0Text).length;
            setTimeLeft(500 + phraseCount * 500);
            setCurrentSeqIndex(0);
            currentSeqRef.current = 0;
            // For square_solo: store full ordered verse list so each player can advance independently.
            // campaignQueue from the server already includes all verses starting from verse 0.
            // Only init if not already set (host sets it in initAutoStart before INIT_GAME)
            if (isSolo && !multiplayerSoloActiveRef.current) {
              multiplayerSoloActiveRef.current = true;
              localCampaignListRef.current = (msg.state.campaignQueue && msg.state.campaignQueue.length > 0)
                ? msg.state.campaignQueue
                : [{ reference: msg.state.verseRef, text: msg.state.verseText, title: 'Multiplayer' }];
              localVerseIndexRef.current = 0;
            }
            setPlayMode(msg.state.playMode || 'square_solo');
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
                  ]) { 
                    try { 
                      const g = await svc(); 
                      const customLat = localStorage.getItem('verserain_custom_lat');
                      const customLng = localStorage.getItem('verserain_custom_lng');
                      if (customLat && customLng) {
                        g.latitude = customLat;
                        g.longitude = customLng;
                      }
                      geoRef.current = g; 
                      submitLoc(g); 
                      return; 
                    } catch { } 
                  }
                })();
              }
            }

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - GAME_TICK_STEP)), GAME_TICK_MS);

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
            const countdownByLevel = [5, 3, 2, 1];
            startLocalIntermissionCountdown(countdownByLevel[msg.state.distractionLevel || 0] || 5);
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
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    // The shared lobby only carries map ripples and presence, so drop it while
    // the app is in the background instead of keeping the radio busy with
    // state broadcasts; reconnect when it comes back. Game rooms stay open.
    const isLobby = !multiplayerRoomId;
    let closedWhileHidden = false;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        closedWhileHidden = true;
        socket.close();
      } else if (closedWhileHidden) {
        closedWhileHidden = false;
        socket.reconnect();
      }
    };
    if (isLobby) document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (isLobby) document.removeEventListener('visibilitychange', handleVisibility);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      socket.close();
      socketRef.current = null;
      setWsConnected(false);
      multiplayerSoloActiveRef.current = false;
    };
  }, [multiplayerRoomId, multiplayerRoomMode, multiplayerRoomRole, multiplayerTeamCount, multiplayerHostPlays, playerName, personalCode, triggerLightning]);

  // Process Challenge URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeRef = params.get('challenge');
    const setRef = params.get('set');
    const rcParam = params.get('rc');
    const roomParam = params.get('room');
    const listenDaily = params.get('listenDaily');
    const listenSetRef = params.get('listenSet');
    const listenVerseRef = params.get('listenVerse');
    const requestedVersion = params.get('version');

    // version= carries whatever the SENDER's app was set to. Apply it once as a
    // first guess so the right language chunk starts loading — but only once,
    // because the set's OWN language is the authority (see the listenSet branch
    // below) and re-applying this would fight it forever.
    if ((listenDaily || listenSetRef) && requestedVersion && requestedVersion !== version
        && !appliedLinkVersionRef.current) {
      appliedLinkVersionRef.current = true;
      setVersion(requestedVersion);
      return;
    }

    if (roomParam) {
      const roomCode = sanitizeRoomCode(roomParam);
      if (roomCode.length === 4) {
        setMainTab('multiplayer');
        setMultiplayerRoomMode(null);
        setMultiplayerRoomRole('player');
        setMultiplayerRoomId(roomCode);
      }
      // Small timeout to allow state applied before url replace
      setTimeout(() => window.history.replaceState({}, document.title, pathWithSharedLang()), 100);
      return;
    }

    if (listenDaily) {
      changeDailyVerseDate(listenDaily);
      // vo= → recipients hear the sender's personal recording (same contract
      // as the listenSet share below).
      const dailyVoParam = params.get('vo');
      setDailySharedVoiceOwner(/^[a-f0-9]{16}$/.test(String(dailyVoParam || '')) ? dailyVoParam : null);
      setContinuousRainSet(null);
      setMainTab('daily_verse');
      window.history.replaceState({}, document.title, pathWithSharedLang());
      return;
    }

    if (listenSetRef) {
      // activeVerseSets only holds sets whose language === the current version,
      // so a share for a set in ANOTHER language can never be found there: every
      // remote fetch below lands the set into state and it still stays
      // invisible, leaving the recipient staring at an empty player. Resolve
      // against the unfiltered lists first and adopt the set's OWN language —
      // the link's version= is the sender's setting, not the set's.
      const setInAnyLanguage = publishedVerseSets.find(s => s.id === listenSetRef)
        || customVerseSets.find(s => s.id === listenSetRef)
        || null;
      const setLanguage = setInAnyLanguage ? (setInAnyLanguage.language || 'cuv') : null;
      if (setLanguage && setLanguage !== version) {
        setVersion(setLanguage);
        return; // re-runs once the language loads; the set is then in activeVerseSets
      }

      const foundSet = activeVerseSets.find(s => s.id === listenSetRef);
      if (foundSet) {
        // listenOrder=seq → play ALL verses in canonical order (looping),
        // starting from the first verse unless listenVerse pins a start.
        const sequential = ['seq', 'sequential'].includes(params.get('listenOrder') || '');
        // listenIndex pins the shared verse BY POSITION — robust for large sets
        // whose text exceeds /share-set's 128KB cap (listen-card.js then can't
        // resolve the index → reference server-side and drops listenVerse, which
        // used to leave the recipient on a random verse). We have the full set
        // locally here, so index straight into it.
        const listenIndexRaw = params.get('listenIndex');
        const listenIndex = /^\d+$/.test(String(listenIndexRaw || '')) ? Number(listenIndexRaw) : null;
        const startVerse = listenVerseRef
          ? (foundSet.verses || []).find(v => v.reference === listenVerseRef)
          : (listenIndex !== null && listenIndex >= 0 && listenIndex < (foundSet.verses || []).length
              ? (foundSet.verses || [])[listenIndex]
              : (sequential ? (foundSet.verses || [])[0] : null));
        setSelectedSetId(foundSet.id);
        setMainTab('versesets');
        const voParam = params.get('vo');
        const vvParam = params.get('vv');
        setContinuousRainSet({
          id: foundSet.id,
          title: foundSet.title,
          verses: foundSet.verses || [],
          startVerse,
          playOrder: sequential ? 'sequential' : undefined,
          // Synthetic single-verse shares carry the real set id here so
          // creator recordings still resolve for recipients.
          voiceSetId: foundSet.voiceSetId || null,
          // vo= → play the sender's personal voice over the owner's / TTS.
          sharedVoiceOwner: /^[a-f0-9]{16}$/.test(String(voParam || '')) ? voParam : null,
          // vv= → the exact recording that was shared, which is what unlocks it
          // when the sender keeps it unlisted (it's hidden from all listings).
          sharedVoiceId: /^v_[A-Za-z0-9]{6,20}$/.test(String(vvParam || '')) ? vvParam : null,
          background: foundSet.background || '',
          backgroundMime: foundSet.backgroundMime || '',
          bgMusic: foundSet.bgMusic || '',
          bgMusicMime: foundSet.bgMusicMime || '',
          bgMusicVolume: foundSet.bgMusicVolume,
        });
        window.history.replaceState({}, document.title, pathWithSharedLang());
      } else if (!listenSetFetchAttemptedRef.current.has(listenSetRef)) {
        // Set not in current activeVerseSets — could be because:
        //  • publishedVerseSets hasn't finished its on-mount fetch yet, OR
        //  • the set is a private custom set still syncing via /private-sets, OR
        //  • this is a different account opening a freshly-published share URL.
        // Trigger fresh fetches so the useEffect re-runs with up-to-date data
        // once the responses come back. Guarded by a Set so we only fire each
        // remote lookup once per set id.
        listenSetFetchAttemptedRef.current.add(listenSetRef);
        const host = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db";
        fetch(`${host}/custom-sets`)
          .then(r => r.ok ? r.json() : null)
          .then(arr => { if (Array.isArray(arr)) setPublishedVerseSets(arr); })
          .catch(() => {});
        if (playerName) {
          fetch(`${host}/private-sets?player=${encodeURIComponent(playerName)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              const remote = Array.isArray(data?.sets) ? data.sets : null;
              if (!remote || !remote.length) return;
              setCustomVerseSets(prev => {
                const byId = new globalThis.Map(prev.map(s => [s.id, s]));
                for (const s of remote) { if (s?.id && !byId.has(s.id)) byId.set(s.id, s); }
                const merged = Array.from(byId.values());
                try { localStorage.setItem('verseRain_custom_sets', JSON.stringify(merged)); } catch {}
                return merged;
              });
            })
            .catch(() => {});
        }
        // Share-set fallback: works for recipients who aren't logged in or
        // aren't the set's owner. Lands the set into publishedVerseSets so
        // activeVerseSets re-computes and the URL handler picks it up on
        // the next render.
        fetch(`${host}/share-set?id=${encodeURIComponent(listenSetRef)}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.set?.id) return;
            setPublishedVerseSets(prev => prev.some(s => s.id === data.set.id) ? prev : [...prev, data.set]);
          })
          .catch(() => {});
      }
      return;
    }

    const viewSetRef = params.get('viewSet');
    if (viewSetRef) {
      const foundSet = activeVerseSets.find(s => s.id === viewSetRef);
      if (foundSet) {
        setSelectedSetId(foundSet.id);
        setMainTab('versesets');
        window.history.replaceState({}, document.title, pathWithSharedLang());
      } else if (!viewSetFetchAttemptedRef.current.has(viewSetRef)) {
        // Set not in local lists yet — typical for share links opened in a
        // fresh context (Skool in-app webview, new device, logged-out, etc.).
        // Hit the public /custom-sets list, the user's /private-sets, and the
        // /share-set link-share endpoint. Any of them landing into state will
        // re-run this useEffect via activeVerseSets dep, and the set will be
        // found on the second pass. Keep the URL in place — do NOT
        // history.replaceState here, otherwise the second pass loses the
        // viewSet param and falls through to the home page.
        viewSetFetchAttemptedRef.current.add(viewSetRef);
        const host = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db";
        fetch(`${host}/custom-sets`)
          .then(r => r.ok ? r.json() : null)
          .then(arr => { if (Array.isArray(arr)) setPublishedVerseSets(arr); })
          .catch(() => {});
        if (playerName) {
          fetch(`${host}/private-sets?player=${encodeURIComponent(playerName)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              const remote = Array.isArray(data?.sets) ? data.sets : null;
              if (!remote || !remote.length) return;
              setCustomVerseSets(prev => {
                const byId = new globalThis.Map(prev.map(s => [s.id, s]));
                for (const s of remote) { if (s?.id && !byId.has(s.id)) byId.set(s.id, s); }
                const merged = Array.from(byId.values());
                try { localStorage.setItem('verseRain_custom_sets', JSON.stringify(merged)); } catch {}
                return merged;
              });
            })
            .catch(() => {});
        }
        fetch(`${host}/share-set?id=${encodeURIComponent(viewSetRef)}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.set?.id) return;
            setPublishedVerseSets(prev => prev.some(s => s.id === data.set.id) ? prev : [...prev, data.set]);
          })
          .catch(() => {});
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
          window.history.replaceState({}, document.title, pathWithSharedLang());
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
          if ((isEnglish && !isEnglishBibleVersion(version)) || (!isEnglish && version !== 'cuv')) {
            setVersion(isEnglish ? 'kjv' : 'cuv');
            return;
          }
          setActiveVerse(targetVerse);
          setSelectedVerseRefs([targetVerse.reference]);
          window.history.replaceState({}, document.title, pathWithSharedLang());
          setTimeout(() => {
            setInitAutoStart({ trigger: true, isAuto: false });
          }, 300);
        } else {
          const normalizedKey = normalizeVerseReferenceKey(challengeRef);
          if (normalizedKey && !challengeFetchAttemptedRef.current.has(challengeRef)) {
            challengeFetchAttemptedRef.current.add(challengeRef);
            const isEnglish = /^[a-zA-Z]/.test(challengeRef);
            const targetVersion = isEnglish ? (version === 'cuv' ? 'kjv' : version) : 'cuv';
            (async () => {
              let text = null;
              if (targetVersion === 'esv' || targetVersion === 'kjv' || targetVersion === 'niv') {
                const engRef = getEnglishReferenceFromKey(normalizedKey);
                if (engRef) text = await fetchBibleVerseFromAPI(engRef, targetVersion);
              } else if (targetVersion === 'tr' || targetVersion === 'my') {
                text = await fetchVerseFromGetBible(normalizedKey, targetVersion);
              } else if (targetVersion === 'tw') {
                text = await fetchVerseFromTaibible(normalizedKey);
              } else {
                text = await fetchVerseFromBolls(normalizedKey, targetVersion);
              }
              if (!text) {
                toast.error(t('找不到此經文，請確認經文出處', 'Verse not found, please check the reference'));
                window.history.replaceState({}, document.title, pathWithSharedLang());
                return;
              }
              const dynamicVerse = { reference: challengeRef, text, book: parseInt(normalizedKey.split('|')[0], 10) || 0 };
              setActiveVerse(dynamicVerse);
              setSelectedVerseRefs([challengeRef]);
              window.history.replaceState({}, document.title, pathWithSharedLang());
              setTimeout(() => {
                setInitAutoStart({ trigger: true, isAuto: false });
              }, 300);
            })();
          }
        }
      }
    }
  }, [playerName, activeVerseSets, version, changeDailyVerseDate, setActiveVerse, setSelectedVerseRefs, setInitAutoStart, setShowLoginModal, setVersion]);

  const timerRef = useRef(null);
  // Stop the game clock once play is over. Some exits (voice/blind onFail,
  // leaving a multiplayer room) only change gameState and used to leave the
  // interval re-rendering App in the menu.
  useEffect(() => {
    if (gameState !== 'menu' && gameState !== 'multiplayer_results') return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // The voice/blind-mode chime contexts resume themselves on next use.
    for (const ctx of [window.__sharedDingCtx, window.__sharedDongCtx]) {
      if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    }
  }, [gameState]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  const isGameTimerPausedRef = useRef(false);
  const speechRef = useRef(null);
  // Tracks listenSet ids we've already fired a fallback remote fetch for, so
  // the share-URL handler doesn't hammer PartyKit on every activeVerseSets re-render.
  const listenSetFetchAttemptedRef = useRef(new globalThis.Set());
  // The link's version= is applied at most once. After that the set's own
  // language wins, so the two can't ping-pong against each other.
  const appliedLinkVersionRef = useRef(false);
  // Same idea for ?viewSet=... share URLs (links shared on Skool / WhatsApp /
  // etc. land here in fresh contexts where the set may not yet be in any
  // local list).
  const viewSetFetchAttemptedRef = useRef(new globalThis.Set());
  const challengeFetchAttemptedRef = useRef(new globalThis.Set());

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
      if (distractionLevelRef.current === 3) maxFakesAllowed = 2;
      if (distractionLevel === 2) maxFakesAllowed = 1;
      if (distractionLevel === 1) maxFakesAllowed = 1;

      let spawnFake = distractionLevel > 0 && Math.random() < (distractionLevel * 0.3);
      if (fakesOnScreen >= maxFakesAllowed) spawnFake = false;

      if (candidates.includes(targetSeq)) {
        seqToSpawn = targetSeq; // Absolute guarantee the required phrase is spawned
      } else if (spawnFake && !playModeRef.current.startsWith('square')) {
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

  const playSingleVerseCard = async (verse, sourceSet = null) => {
    initAudio();
    const setId = sourceSet?.id || null;
    // Resolve the voice BEFORE mounting the card so the first play already
    // knows whose recording to use. The set author's recording plays via the
    // creator layer, and the viewer's own via the default override — but a
    // *contributor's* recording (someone who is neither the author nor the
    // viewer) is otherwise never consulted, so the play button would fall back
    // to TTS. Route that contributor through the existing sharedVoiceOwner path.
    let sharedVoiceOwner = null;
    if (setId && verse?.reference) {
      try {
        const opts = await gatherVerseVoiceOptions(setId, verse.reference);
        if (!opts.some(o => o.kind === 'owner')) {
          const mineId = userEmail ? await voiceOwnerId(userEmail).catch(() => null) : null;
          const pick = opts.find(o => o.kind === 'personal' && o.ownerId === mineId)
            || opts.find(o => o.kind === 'personal');
          if (pick) sharedVoiceOwner = pick.ownerId;
        }
      } catch { /* best-effort — fall back to the default auto behavior */ }
    }
    // Carry the FULL set's verses so the player's own (synchronous) ‹ › can
    // walk them — critical on iOS, where audio must start inside the tap
    // gesture; rebuilding the card async between verses loses that blessing and
    // the next verse comes up silent / stuck. clampNav = stop at the ends
    // (no wrap); loopCurrent = a finished verse replays instead of auto-moving,
    // so the card stays on the verse you opened until you tap ‹ ›.
    const fullVerses = sourceSet?.verses?.length ? sourceSet.verses : [verse];
    setContinuousRainSet({
      id: `single-${verse.reference}`,
      title: verse.reference,
      verses: fullVerses,
      startVerse: verse,
      clampNav: fullVerses.length > 1,
      loopCurrent: true,
      // 創作者親聲朗讀 / custom assets need the REAL originating set id —
      // the synthetic `single-…` id has nothing stored under it.
      voiceSetId: setId,
      sharedVoiceOwner,
      background: sourceSet?.background || '',
      backgroundMime: sourceSet?.backgroundMime || '',
      bgMusic: sourceSet?.bgMusic || '',
      bgMusicMime: sourceSet?.bgMusicMime || '',
      bgMusicVolume: sourceSet?.bgMusicVolume,
    });
  };

  // Reader-launched challenge. `opts` ({ mode, difficulty }) comes from the
  // player's ⚡ chooser; the actual startGame fires from the effect below so it
  // runs AFTER the re-render commits — startGame reads playMode/distractionLevel
  // from its render closure, and a same-tick setTimeout would capture the stale
  // pre-chooser values.
  const pendingReaderChallengeRef = useRef(null);
  // The reader (continuousRainSet) the challenge was launched from, stashed so
  // the game-over 回到主頁 button can drop the player back into that reading
  // instead of the lobby — they can then ‹ › to the next verse and ⚡ again.
  const readerReturnRef = useRef(null);

  // ─── Browser history ↔ page state (see parseRoute/routeFromState) ───
  const quitGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* noop */ }
    multiplayerSoloActiveRef.current = false;
    const back = readerReturnRef.current;
    readerReturnRef.current = null;
    setGameState('menu');
    setCampaignQueue(null);
    if (back) setContinuousRainSet(back);
  };
  const leaveMultiplayerRoom = () => {
    if (socketRef.current) { try { socketRef.current.close(); } catch { /* noop */ } socketRef.current = null; }
    multiplayerSoloActiveRef.current = false;
    setMultiplayerRoomMode(null);
    setMultiplayerRoomRole('player');
    setMultiplayerRoomId(null);
    setMultiplayerState(null);
  };
  // The phone's Back closes these hand-made overlays too (src/ui Modal does it
  // for itself).
  useBackToClose(!!showLoginModal, () => setShowLoginModal(false));
  useBackToClose(!!qrShareModal, () => setQrShareModal(null));
  useBackToClose(showFruitInfo, () => setShowFruitInfo(false));
  useBackToClose(showLevelInfo, () => setShowLevelInfo(false));
  useBackToClose(!!translateModal, () => setTranslateModal(null));
  useBackToClose(!!playOrderChooser, () => setPlayOrderChooser(null));
  useBackToClose(showPushModal, () => setShowPushModal(false));
  useBackToClose(!!authorSetsModal, () => setAuthorSetsModal(null));
  useBackToClose(showEncouragePanel, () => setShowEncouragePanel(false));
  useBackToClose(showBindInviterModal, () => setShowBindInviterModal(false));
  const routeStateRef = useRef({});
  routeStateRef.current = { mainTab, selectedSetId, editing: !!editingCustomSet, listening: !!continuousRainSet, playing: gameState !== 'menu', roomId: multiplayerRoomId };
  const applyingHistoryRef = useRef(false);
  // popstate → state: leave every layer the target route doesn't include.
  useEffect(() => {
    const onPop = () => {
      const r = parseRoute(window.location.hash);
      const st = routeStateRef.current;
      applyingHistoryRef.current = true;
      if (st.listening && !r.listen) setContinuousRainSet(null);
      if (st.playing && !r.play) quitGame();
      if (st.roomId && r.roomId !== st.roomId) leaveMultiplayerRoom();
      if (st.editing && !r.edit) setEditingCustomSet(null);
      if (r.tab !== st.mainTab) setMainTab(r.tab);
      if (r.tab === 'versesets' && (r.setId || null) !== (st.selectedSetId || null)) setSelectedSetId(r.setId || null);
      // #verify/<code> reached by in-app navigation (the QR opens it in an
      // already-running app): take the code before the hash gets normalised.
      if (r.tab === 'verify' && r.code) {
        const code = String(r.code).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code) { setVerifyCodeInput(code); setVerifyResult(null); try { sessionStorage.setItem('verserain_verify_code', code); } catch { /* ignore */ } }
      }
      // Layers that need data (listen/play/edit/room) can't be rebuilt from a
      // URL. If nothing changed (so the sync effect below won't run), rewrite
      // the hash to what is actually shown.
      setTimeout(() => {
        applyingHistoryRef.current = false;
        const actual = routeFromState(routeStateRef.current);
        if (window.history.state?.vr !== actual) {
          const url = window.location.pathname + window.location.search + (actual === 'lobby' ? '' : '#' + actual);
          try { window.history.replaceState({ ...(window.history.state || {}), vr: actual }, '', url); } catch { /* noop */ }
        }
      }, 120);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // state → history: one entry per step; replace (never push) on first sync
  // or while applying a popstate, so StrictMode double-runs and Back/Forward
  // never create extra entries.
  useEffect(() => {
    const route = routeFromState(routeStateRef.current);
    const cur = window.history.state?.vr;
    if (cur === route) { applyingHistoryRef.current = false; return; }
    const url = window.location.pathname + window.location.search + (route === 'lobby' ? '' : '#' + route);
    try {
      if (cur === undefined || applyingHistoryRef.current) window.history.replaceState({ ...(window.history.state || {}), vr: route }, '', url);
      else window.history.pushState({ vr: route }, '', url);
    } catch { /* noop */ }
    applyingHistoryRef.current = false;
  }, [mainTab, selectedSetId, !!editingCustomSet, !!continuousRainSet, gameState !== 'menu', multiplayerRoomId]);
  // A #versesets/<id> that never resolves (deleted set, bad link): fall back to
  // the list instead of silently showing the first set as if it were that one.
  useEffect(() => {
    if (!selectedSetId) return;
    const found = safeActiveSets.some(s => s.id === selectedSetId) || customVerseSets.some(s => s.id === selectedSetId);
    if (found) return;
    const t = setTimeout(() => {
      const stillMissing = !safeActiveSets.some(s => s.id === selectedSetId) && !customVerseSets.some(s => s.id === selectedSetId);
      if (stillMissing) setSelectedSetId(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [selectedSetId, safeActiveSets, customVerseSets]);
  const [readerChallengeKick, setReaderChallengeKick] = useState(0);
  useEffect(() => {
    const pending = pendingReaderChallengeRef.current;
    if (!pending) return;
    pendingReaderChallengeRef.current = null;
    setTimeout(() => startGame(false, pending.verse), 50);
  }, [readerChallengeKick]);

  const challengeVerseFromReader = (verse, opts = null) => {
    if (!verse) return;
    initAudio(); // synchronous, inside the tap — keeps the iOS audio blessing
    if (opts?.mode) setPlayMode(opts.mode);
    if (typeof opts?.difficulty === 'number') setDistractionLevel(opts.difficulty);
    if (typeof opts?.debug === 'boolean') setIsDebugMode(opts.debug);
    if (typeof opts?.noReadback === 'boolean') setSkipReadback(opts.noReadback);
    // Remember the reading we came from so 回到主頁 can return to it (see
    // readerReturnRef). The reader is torn down during the challenge to stop its
    // playback; we re-open it when the game ends — at the verse just challenged
    // and PAUSED, so it doesn't re-narrate. Play or ‹ › resumes.
    readerReturnRef.current = continuousRainSet
      ? { ...continuousRainSet, startVerse: verse, startPaused: true }
      : null;
    setContinuousRainSet(null);
    setCampaignQueue(null);
    campaignQueueRef.current = null;
    setCampaignResults([]);
    setActiveCampaignSetId(null);
    setActiveCampaignSetTotal(1);
    setActiveVerse(verse);
    setSelectedVerseRefs([verse.reference]);
    pendingReaderChallengeRef.current = { verse };
    setReaderChallengeKick(k => k + 1);
  };

  // Push a verse set to the backend's share-set endpoint so anyone who opens
  // the share URL can fetch it back — no admin permission needed, no global
  // publish list pollution. Fire-and-forget; the link will resolve once
  // PartyKit has written the row (sub-second typical).
  const pushSetForSharing = (set, force = false) => {
    if (!set || !set.id) return;
    // Built-in sets are already in every device's verses_*.js bundle —
    // pushing them is wasteful. EXCEPT for /lc share links: the OG-card
    // endpoint resolves the set title + verse text server-side from
    // /share-set, so those pushes pass force=true for built-ins too.
    if (!force && !set.id.startsWith('custom-')) return;
    fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/share-set", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set }),
    }).catch(() => {});
  };

  const openListeningShare = async (url, reference) => {
    setQrShareModal({ url, reference });
    try {
      await navigator.clipboard?.writeText(url);
      toast.success(t('讀經連結已複製！', 'Reading link copied!'));
    } catch {
      // QR modal remains available when clipboard permission is unavailable.
    }
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
          initSquareBlocks(true, initAutoStart.campaignQueue, initAutoStart.verse, initAutoStart.playMode);
        } else if (initAutoStart.playMode === 'rain_solo' || initAutoStart.playMode === 'voice_solo') {
          if (socketRef.current) {
            const verse = initAutoStart.verse || activeVerse;
            const phrases = splitVersePhrases(verse.text);

            socketRef.current.send(JSON.stringify({
              type: 'INIT_GAME',
              matchType: multiplayerState?.matchType || multiplayerRoomMode || 'team',
              teamCount: multiplayerState?.teamCount || multiplayerTeamCount,
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

  const initSquareBlocks = (isMultiplayerReadyCheck = false, campaignQueue = null, overrideVerse = null, passedPlayMode = null) => {
    const verse = overrideVerse || activeVerse;
    const actualPlayMode = passedPlayMode || playMode;
    let phrases;
    if (overrideVerse) {
      phrases = splitVersePhrases(verse.text);
    } else {
      phrases = activePhrasesRef.current;
    }

    // Grid size depends on difficulty. Read from refs so this stays correct even
    // when called from the room-join-bound socket handler (whose closured state can
    // lag), e.g. a joining player building their own square_solo board.
    const dl = distractionLevelRef.current;
    const maxGridSize = dl <= 1 ? 4 : 9;

    const fakesCount = dl > 0 ? dl : 0;
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
          text: getRandomFakePhrase(versionRef.current, VERSES_DB),
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
        matchType: multiplayerState?.matchType || multiplayerRoomMode || 'team',
        teamCount: multiplayerState?.teamCount || multiplayerTeamCount,
        blocks: newBlocks,
        verseRef: verse.reference,
        verseText: verse.text,
        playMode: actualPlayMode,
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
      const phraseCount = splitVersePhrases(initialVerse.text).length;
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
      activePhrasesRef.current = splitVersePhrases(actualVerse.text);
    }

    isGameTimerPausedRef.current = playModeRef.current?.startsWith('voice') || isBlindMode;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (isGameTimerPausedRef.current) return;
      // Stops at 0; the game now allows users to keep going past the time limit.
      setTimeLeft(t => Math.max(0, t - GAME_TICK_STEP));
    }, GAME_TICK_MS);

    if (!isAuto) {
      if (playModeRef.current.startsWith('square')) {
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
      setGardenFocus({ ref: actualVerse.reference, nonce: Date.now() });
    }
  };

  useEffect(() => {
    let cancelAutoPlay = false;

    const runAutoPlayLoop = async () => {
      if (!isAutoPlay || gameState !== 'playing') return;

      const TTS_LANG = getVoiceLangForVersion(version);

      // Start from current position (supports mid-game activation)
      const startFrom = currentSeqRef.current;

      // Only announce title when starting from the beginning
      if (startFrom === 0 && !cancelAutoPlay && gameStateRef.current === 'playing') {
        setSpeakingTitle(true);
        speechRef.current = speakText(formatVerseReferenceForSpeech(activeVerse.reference, version), 1.0, TTS_LANG);
        await speechRef.current;
        setSpeakingTitle(false);
        await new Promise(r => setTimeout(r, AUTO_PLAY_REFERENCE_PAUSE_MS));
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
      let timeMultiplier = (playMode === 'blind' || playMode?.startsWith('voice')) ? 0.75 : 0.5;
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
          // `claimed` is per device, so the server also dedupes the claim per
          // account (refereeEmail) — a second phone must not pay the inviter
          // twice or hand out a second welcome fruit.
          const refereeEmail = (userEmail || '').trim().toLowerCase() || undefined;
          // Reward the inviter (+1 fruit, +5000 score)
          fetch("/api/submit-referral-point", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author: inviter, amount: 1, scoreAmount: 5000, player: currentPlayerName, type: 'referred', refereeEmail })
          }).catch(e => e);

          // Reward the new player (+1 fruit)
          fetch("/api/submit-referral-point", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ author: personalCode || currentPlayerName, amount: 1, scoreAmount: 0, player: inviter, type: 'invited_by', refereeEmail })
          }).catch(e => e);

          localStorage.setItem('verserain_invite_claimed', 'true');
          toast.success(t('成功透過 {inviter} 的邀請首次過關！雙方各獲 1 顆果子，推薦者額外獲得 5000 點！', "First clear through {inviter}'s invite! You each get 1 fruit, and your inviter gets 5,000 bonus points!").replace('{inviter}', inviter));
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
        submitScoreToServer({ name: playerName, score: finalCalculatedScore, verseRef: activeVerse.reference, mode: actualModeName }).then(() => {
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

          const isTeamCompetition = multiplayerState?.matchType === 'team';

          // Submit personal scores only for individual PK rooms. Team competition is an ephemeral classroom result.
          if (!isTeamCompetition && playerName && finalCalculatedScore > 0 && healthRef.current > 0) {
            const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;
            submitScoreToServer({ name: playerName, score: finalCalculatedScore, verseRef: activeVerse.reference, mode: actualModeName }).catch(() => { });
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
            startLocalIntermissionCountdown(countdownByLevel[distractionLevel] || 5);
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
            submitScoreToServer({ name: playerName, score: finalCalculatedScore, verseRef: activeVerse.reference, mode: actualModeName }).catch(() => { });
          }

          const nextVerse = campaignQueue[0];
          const nextQueue = campaignQueue.slice(1);
          const advanceToNextVerse = () => {
            if (gameStateRef.current !== 'playing') return;
            setActiveVerse(nextVerse);
            setCampaignQueue(nextQueue);
            campaignQueueRef.current = nextQueue;
            setCurrentSeqIndex(0);
            currentSeqRef.current = 0;
            startGame(isAutoPlayRef.current, nextVerse);
          };

          const shouldPauseBeforeNextVerse = isAutoPlayRef.current || playMode?.startsWith('voice') || isBlindMode;
          if (shouldPauseBeforeNextVerse) {
            if (!isAutoPlayRef.current) playTada();
            setTimeout(advanceToNextVerse, AUTO_PLAY_VERSE_PAUSE_MS);
          } else {
            playTada();
            setTimeout(advanceToNextVerse, 50);
          }
        } else {
          endGame();
        }
      }
    }
  }, [currentSeqIndex, gameState, activePhrases.length, multiplayerRoomId, multiplayerState?.playMode, multiplayerState?.matchType, campaignQueue, activeVerse, playerName, distractionLevel, playMode, isBlindMode]);

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
      const TTS_LANG = getVoiceLangForVersion(version);

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
                startLocalIntermissionCountdown(countdownByLevel[distractionLevel] || 5);
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

  const {
    he: heDict, fa: faDict, ar: arDict, ja: jaDict, ko: koDict,
    es: esDict, tr: trDict, de: deDict, my: myDict, vi: viDict,
    id: idDict, ms: msDict, zhcn: zhcnDict,
    pt: ptDict, fr: frDict, ru: ruDict, hi: hiDict, km: kmDict,
  } = getUiDicts();
                          
  const t = (zh, en) => {
    if (zh === '活動') {
      if (uiLang === 'en') return 'Activity';
      if (uiLang === 'fa') return 'فعالیت';
      if (uiLang === 'ar') return 'نشاط';
      if (uiLang === 'he') return 'פעילות';
      if (uiLang === 'ja') return '活動';
      if (uiLang === 'ko') return '활동';
      if (uiLang === 'es') return 'Actividad';
      if (uiLang === 'tr') return 'Aktivite';
      if (uiLang === 'de') return 'Aktivität';
      if (uiLang === 'my') return 'လှုပ်ရှားမှု';
      if (uiLang === 'vi') return 'Hoạt động';
      if (uiLang === 'id') return 'Aktivitas';
      if (uiLang === 'ms') return 'Aktiviti';
      if (uiLang === 'pt') return 'Atividade';
      if (uiLang === 'fr') return 'Activité';
      if (uiLang === 'ru') return 'Активность';
      if (uiLang === 'hi') return 'गतिविधि';
      if (uiLang === 'km') return 'សកម្មភាព';
      if (uiLang === 'cuvs') return '活动';
      return '活動';
    }
    if (uiLang === 'en') return en || zh;
    if (uiLang === 'fa') return faDict[zh] || en || zh;
    if (uiLang === 'ar') return arDict[zh] || en || zh;
    if (uiLang === 'he') return heDict[zh] || en || zh;
    if (uiLang === 'ja') return jaDict[zh] || zh;
    if (uiLang === 'ko') return koDict[zh] || zh;
    if (uiLang === 'es') return esDict[zh] || en || zh;
    if (uiLang === 'tr') return trDict[zh] || en || zh;
    if (uiLang === 'de') return deDict[zh] || en || zh;
    if (uiLang === 'my') return myDict[zh] || en || zh;
    if (uiLang === 'vi') return viDict[zh] || en || zh;
    if (uiLang === 'id') return idDict[zh] || en || zh;
    if (uiLang === 'ms') return msDict[zh] || en || zh;
    if (uiLang === 'pt') return ptDict[zh] || en || zh;
    if (uiLang === 'fr') return frDict[zh] || en || zh;
    if (uiLang === 'ru') return ruDict[zh] || en || zh;
    if (uiLang === 'hi') return hiDict[zh] || en || zh;
    if (uiLang === 'km') return kmDict[zh] || en || zh;
    if (uiLang === 'cuvs') return zhcnDict[zh] || zh;
    if (uiLang !== 'zh' && uiLang !== 'cuv' && uiLang !== 'cuvs') return en || zh;
    return zh; // default: 'zh'
  };

  const startAccessibleBlindGame = (set, count = 1) => {
    if (!set?.verses?.length) return;
    initAudio();
    const n = Math.min(set.verses.length, Math.max(1, parseInt(count) || 1));
    const queue = [...set.verses].sort(() => 0.5 - Math.random()).slice(0, n);
    setSelectedSetId(set.id);
    setIsBlindMode(true);
    localStorage.setItem('verseRain_blindMode', 'true');
    setPlayMode('voice_solo');
    setDistractionLevel(0);
    setCampaignQueue(queue.slice(1));
    campaignQueueRef.current = queue.slice(1);
    setCampaignResults([]);
    setActiveCampaignSetId(set.id);
    setActiveCampaignSetTotal(queue.length);
    setActiveVerse(queue[0]);
    setSelectedVerseRefs([queue[0].reference]);
    speakText(t('視障版開始。請允許麥克風。聽到提示音後，開口背誦經文。', 'Accessible mode starting. Please allow microphone access. After the prompt sound, recite the verse aloud.'), 0.95, isEnglishBibleVersion(version) ? 'en-US' : 'zh-TW');
    setTimeout(() => startGame(false, queue[0]), 700);
  };

  const readAccessibleGuide = (set, count = 1) => {
    const message = t(
      '這是視障友善版。現在選擇的是 {title}，本次 {n} 節經文。按開始後，系統會先讀經文出處，停頓兩秒，再等你開口背誦。若一段時間沒有答對，系統會朗讀提示。遊戲中按 Escape 可以離開。',
      'This is the accessible mode. The selected set is {title}, {n} verses. After starting, the app reads the reference, pauses for two seconds, then waits for your recitation. If you need help, the app will read a prompt. Press Escape during the game to leave.'
    ).replace('{title}', String(set?.title || currentSet?.title)).replace('{n}', String(count));
    speakText(message, 0.95, isEnglishBibleVersion(version) ? 'en-US' : 'zh-TW');
  };

  const restartTeamSoloRun = () => {
    if (!multiplayerState?.playMode?.endsWith('_solo')) return;
    const queue = (multiplayerState.campaignQueue && multiplayerState.campaignQueue.length > 0)
      ? multiplayerState.campaignQueue
      : [{ reference: multiplayerState.verseRef, text: multiplayerState.verseText, title: 'Multiplayer' }];
    const firstVerse = queue[0];
    if (!firstVerse?.text) return;

    const verseObj = { reference: firstVerse.reference, text: firstVerse.text, title: firstVerse.title || 'Multiplayer' };
    const nextPlayMode = multiplayerState.playMode || 'square_solo';
    const nextDifficulty = multiplayerState.distractionLevel || 0;
    const phraseCount = splitVersePhrases(verseObj.text).length;

    multiplayerSoloActiveRef.current = true;
    localCampaignListRef.current = queue;
    localVerseIndexRef.current = 0;
    setLocalNextVerse(null);
    setActiveVerse(verseObj);
    setPlayMode(nextPlayMode);
    setDistractionLevel(nextDifficulty);
    setCurrentSeqIndex(0);
    currentSeqRef.current = 0;
    setScore(0);
    setCombo(0);
    setHealth(3);
    setTimeLeft(500 + phraseCount * 500);
    setGameState('playing');

    if (nextPlayMode === 'square_solo') {
      initSquareBlocks(false, null, verseObj, nextPlayMode);
    } else if (nextPlayMode === 'rain_solo') {
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
      setTimeout(spawnWhenReady, 100);
    }
  };

  const squareGridSize = distractionLevel <= 1 ? 2 : 3;
  const squareBlockFontSize = useMemo(() => {
    const measureText = (text) => {
      const value = String(text || '').trim();
      if (!value) return 1;
      const cjkCount = (value.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
      const latinCount = Math.max(0, value.length - cjkCount);
      return cjkCount + Math.ceil(latinCount * 0.58);
    };
    const textCandidates = [
      ...activePhrases,
      ...blocks.filter(block => block.isFake && !block.hidden).map(block => block.text)
    ];
    const longest = Math.max(1, ...textCandidates.map(measureText));
    // 讓最長句「對折」成兩行:以半長作為字級依據,字可放更大;超過半長的句子
    // 會自然換成兩行(ceil(longest/2) 保證最多兩行)。短句(≤9)維持單行。
    const perLine = longest > 9 ? Math.ceil(longest / 2) : longest;

    if (squareGridSize === 2) {
      if (perLine <= 4) return 'clamp(3.4rem, min(9vw, 13vh), 8rem)';
      if (perLine <= 7) return 'clamp(2.8rem, min(7vw, 10vh), 6.2rem)';
      if (perLine <= 10) return 'clamp(2.3rem, min(5.6vw, 8vh), 5rem)';
      if (perLine <= 14) return 'clamp(1.95rem, min(4.6vw, 6.6vh), 4rem)';
      return 'clamp(1.6rem, min(3.7vw, 5.4vh), 3.2rem)';
    }

    if (perLine <= 4) return 'clamp(2.4rem, min(6vw, 8vh), 5.5rem)';
    if (perLine <= 7) return 'clamp(2.0rem, min(4.6vw, 6.6vh), 4.2rem)';
    if (perLine <= 10) return 'clamp(1.7rem, min(3.7vw, 5.4vh), 3.3rem)';
    if (perLine <= 14) return 'clamp(1.45rem, min(3.0vw, 4.5vh), 2.7rem)';
    return 'clamp(1.25rem, min(2.5vw, 3.6vh), 2.2rem)';
  }, [activePhrases, blocks, squareGridSize]);

  // 經文雨（下落方塊）字體：仿照九宮格的作法，依每一塊自己的文字長度自動放大，
  // 讓玩家的眼睛不會那麼累。每塊獨立漂浮，故可以各自算出最大可用字級。
  const measureBlockText = React.useCallback((text) => {
    const value = String(text || '').trim();
    if (!value) return 1;
    const cjkCount = (value.match(/[㐀-鿿぀-ヿ가-힯]/g) || []).length;
    const latinCount = Math.max(0, value.length - cjkCount);
    return cjkCount + Math.ceil(latinCount * 0.58);
  }, []);
  const getRainBlockFontSize = React.useCallback((text) => {
    const longest = measureBlockText(text);
    if (longest <= 4) return 'clamp(1.9rem, min(6.5vw, 5.5vh), 3.4rem)';
    if (longest <= 7) return 'clamp(1.6rem, min(5.2vw, 4.6vh), 2.9rem)';
    if (longest <= 10) return 'clamp(1.35rem, min(4.3vw, 3.9vh), 2.4rem)';
    if (longest <= 14) return 'clamp(1.15rem, min(3.5vw, 3.2vh), 2.05rem)';
    return 'clamp(1rem, min(2.9vw, 2.7vh), 1.8rem)';
  }, [measureBlockText]);

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

  const mixedScriptFallbackFontStack = "'Noto Sans Hebrew', 'Noto Sans', 'Vazirmatn', 'PingFang TC', 'PingFang SC', 'Noto Sans TC', 'Noto Sans SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  const cjkDataFontStack = "'PingFang TC', 'PingFang SC', 'Noto Sans TC', 'Noto Sans SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  const simplifiedChineseFontStack = `'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', ${mixedScriptFallbackFontStack}`;
  const traditionalChineseFontStack = `'PingFang TC', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', ${mixedScriptFallbackFontStack}`;
  const japaneseFontStack = `'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', YuGothic, 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', ${mixedScriptFallbackFontStack}`;
  const koreanFontStack = `'Apple SD Gothic Neo', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', ${mixedScriptFallbackFontStack}`;
  const myanmarFontStack = `'Noto Sans Myanmar', 'Myanmar MN', 'Padauk', -apple-system, BlinkMacSystemFont, 'Segoe UI', ${mixedScriptFallbackFontStack}`;
  const latinFontStack = `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, ${mixedScriptFallbackFontStack}`;
  const isActiveLanguage = (code) => uiLang === code || version === code;
  const documentLang =
    isActiveLanguage('ja') ? 'ja' :
      isActiveLanguage('ko') ? 'ko' :
        isActiveLanguage('fa') ? 'fa' :
          isActiveLanguage('ar') ? 'ar' :
            isActiveLanguage('he') ? 'he' :
              isActiveLanguage('es') ? 'es' :
                isActiveLanguage('tr') ? 'tr' :
                  isActiveLanguage('de') ? 'de' :
                    isActiveLanguage('my') ? 'my' :
                      isActiveLanguage('vi') ? 'vi' :
                        isActiveLanguage('cuvs') ? 'zh-Hans' :
                          (isActiveLanguage('zh') || isActiveLanguage('cuv')) ? 'zh-Hant' :
                            'en';
  const activeFontStack =
    isActiveLanguage('fa') ? `'Vazirmatn', Tahoma, Arial, ${mixedScriptFallbackFontStack}` :
      isActiveLanguage('ar') ? `'Noto Naskh Arabic', 'Amiri', 'Geeza Pro', Tahoma, Arial, ${mixedScriptFallbackFontStack}` :
        isActiveLanguage('he') ? `'Noto Sans Hebrew', Tahoma, Arial, ${mixedScriptFallbackFontStack}` :
          isActiveLanguage('ja') ? japaneseFontStack :
          isActiveLanguage('ko') ? koreanFontStack :
            isActiveLanguage('my') ? myanmarFontStack :
              isActiveLanguage('cuvs') ? simplifiedChineseFontStack :
                (isActiveLanguage('zh') || isActiveLanguage('cuv')) ? traditionalChineseFontStack :
                  latinFontStack;
  const scriptureQuoteMarks = ['zh-Hans', 'zh-Hant', 'ja'].includes(documentLang) ? ['「', '」'] : ['"', '"'];

  return (
    <>
      <div
        data-ui-root
        data-bottom-nav={gameState === 'menu' ? '' : undefined}
        lang={documentLang}
        dir={isActiveLanguage('fa') || isActiveLanguage('ar') || isActiveLanguage('he') ? 'rtl' : 'ltr'}
        style={{
          fontFamily: activeFontStack,
          '--app-font-family': activeFontStack,
          '--control-font-family': activeFontStack
        }}
        className={performanceMode || elderMode ? 'performance-mode' : ''}
      >
        <style>
          {`
            @media (orientation: landscape) and (max-height: 800px) {
              .landscape-compact-header { padding: calc(env(safe-area-inset-top) + 4px) max(16px, env(safe-area-inset-right)) 4px max(16px, env(safe-area-inset-left)) !important; }
              .landscape-compact-nav { padding: 4px max(16px, env(safe-area-inset-right)) 4px max(16px, env(safe-area-inset-left)) !important; }
              .landscape-compact-content { margin-top: 8px !important; }
              .app-brand-wordmark { font-size: 1.2rem !important; }
              .landscape-compact-nav > div { padding: 0.3rem 0.8rem !important; font-size: 0.85rem !important; }
            }
          `}
        </style>
        {/* The menu is an opaque full-screen page, so the rain behind it is
            hidden there instead of animating (and filtering) unseen. */}
        <div className={`bg-layer ${combo >= 3 && gameState !== 'menu' ? 'golden-bg' : ''}`} />
        <div className={`rain-system ${combo >= 3 && gameState !== 'menu' ? 'golden-rain' : ''} ${gameState === 'menu' ? 'rain-idle' : ''}`}>
          <div className="rain-layer back" />
          <div className="rain-layer mid" />
          <div className="rain-layer front" />
        </div>

        {continuousRainSet && !speechReady && (
          <div className="continuous-rain-overlay" style={{ background: 'rgba(15, 23, 42, 0.97)', zIndex: 999 }}>
            <button type="button" className="continuous-rain-stop" onClick={() => { setContinuousRainSet(null); setMainTab('lobby'); }}>
              <XCircle size={24} /> {t('停止播放', 'Stop')}
            </button>
            <div style={{ display: 'grid', placeItems: 'center', padding: '1.5rem', width: '100%', height: '100%' }}>
              <div className="hud-glass" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2rem 1.8rem' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>🌧️</div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', lineHeight: 1.3 }}>
                  {continuousRainSet.title || t('經文組', 'Verse Set')}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.6rem 0 1.5rem 0' }}>
                  {t('輕觸下方按鈕開始聆聽。', 'Tap to start listening.')}
                </p>
                <button
                  type="button"
                  className="rain-action-btn play-btn"
                  style={{ width: '100%', fontSize: '1.05rem', padding: '0.9rem 1.5rem', borderRadius: '12px', justifyContent: 'center' }}
                  onClick={() => { initAudio(); setSpeechReady(true); }}
                >
                  <Volume2 size={20} /> {t('開始聆聽', 'Start Listening')}
                </button>
              </div>
            </div>
          </div>
        )}
        {continuousRainSet && speechReady && (
          <VerseSetContinuousRainPlayer
            verseSet={continuousRainSet}
            secondaryVerseSet={findSecondarySetForPrimarySet(continuousRainSet)}
            secondaryVersion={bilingualSecondaryVersion}
            onSecondaryVersionChange={setBilingualSecondaryVersion}
            allSecondaryVerses={allSecondaryVerses}
            topicSets={topicVerseSets}
            favoriteVerseSets={favoriteVerseSets}
            startVerse={continuousRainSet.startVerse || null}
            startPaused={continuousRainSet.startPaused || false}
            playDurationMinutes={continuousRainSet.playDurationMinutes ?? null}
            initialFontSizeLevel={continuousRainSet.fontSizeLevel || DEFAULT_PLAY_FONT_CHOICE}
            initialInkColor={continuousRainSet.inkColor || selectedPlayInk.value}
            version={version}
            t={t}
            userEmail={userEmail}
            playerName={playerName}
            onRequestLogin={() => setShowLoginModal('login')}
            onOpenVoiceComments={openVoiceCommentsFromPlayer}
            onVoiceRecorded={() => setVoiceRefreshTick(x => x + 1)}
            isFavoriteSet={favoriteVerseSetIdSet.has(continuousRainSet.voiceSetId || continuousRainSet.id)}
            onToggleFavoriteSet={() => toggleFavoriteVerseSet(continuousRainSet.voiceSetId || continuousRainSet.id)}
            onSelectDailyVerse={() => { setContinuousRainSet(null); setMainTab('daily_verse'); }}
            onStop={() => {
              setContinuousRainSet(null);
              // Coming back to the verse list: re-read which verses have
              // recordings. The recorder/delete/visibility handlers already
              // report their own changes, but this also picks up recordings
              // other people made while this page sat open — and means the
              // badges can't drift out of sync if some future path forgets.
              setVoiceRefreshTick(x => x + 1);
            }}
            onSelectTopicSet={(set) => {
              setSelectedSetId(set.id);
              setContinuousRainSet({
                ...set,
                startVerse: pickRandomVerse(set.verses || []),
                playDurationMinutes: continuousRainSet.playDurationMinutes ?? null,
                fontSizeLevel: continuousRainSet.fontSizeLevel || DEFAULT_PLAY_FONT_CHOICE,
                inkColor: continuousRainSet.inkColor || selectedPlayInk.value
              });
            }}
            onListenLogged={(v) => { updateGarden('activity_only', 'listen'); creditListen(v); rememberLastListen(continuousRainSet, v); }}
            onChallengeVerse={challengeVerseFromReader}
            onShareVerse={(verse, shareOpts) => {
              if (!verse || !continuousRainSet?.id) return;
              // Share the REAL originating set, not a synthetic single-verse
              // wrapper (id `single-…`): voiceSetId points back at the source
              // set when the player was opened via the per-verse play button.
              // Recipients then get the full set (starting at this verse) AND
              // the creator recordings resolve correctly.
              const shareSetId = continuousRainSet.voiceSetId || continuousRainSet.id;
              // Find the canonical set object (continuousRainSet.verses may
              // be a subset/transient slice). Prefer customVerseSets first
              // — that's where the latest edits live.
              const fullSet =
                customVerseSets.find(s => s.id === shareSetId) ||
                publishedVerseSets.find(s => s.id === shareSetId) ||
                continuousRainSet;
              pushSetForSharing(fullSet, true);
              // /lc = OG card endpoint — short link; the card resolves the
              // set title + verse text server-side from /share-set.
              const verseIdx = (fullSet.verses || []).findIndex(v => v?.reference === verse.reference);
              const link = buildPublicShareUrl('/lc', {
                ref: personalCode,
                set: shareSetId,
                ...(verseIdx >= 0 ? { i: verseIdx } : { verse: verse.reference }),
                // vo = opaque voice-owner id → recipient hears MY personal
                // recording for this verse (my voice › set owner › TTS).
                ...(shareOpts?.voiceOwner ? { vo: shareOpts.voiceOwner } : {}),
                // vv = that recording's voiceId. Unlisted recordings are hidden
                // from every listing, so the link has to name the recording
                // itself for the recipient to be allowed to hear it.
                ...(shareOpts?.voiceId ? { vv: shareOpts.voiceId } : {}),
                version,
              });
              openListeningShare(link, `${fullSet.title || continuousRainSet.title || t('經文組', 'Verse Set')} · ${verse.reference}`);
            }}
          />
        )}

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
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('麥克風聽見：', 'Heard:')}</span>
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
          <div ref={menuScrollRef} style={{ position: 'relative', width: '100vw', height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', backgroundColor: '#f4f6f8', zIndex: 10, fontFamily: 'var(--app-font-family)', paddingBottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))' }}>
            <BottomNav t={t} active={navTabOf(mainTab)} onSelect={selectNavTab} />

            {/* Header */}
            <div className="landscape-compact-header app-shell-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div className="app-header-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div className="app-brand-lockup" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div className="app-brand-wordmark" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6', fontFamily: 'cursive', lineHeight: '1' }}>
                    verserain
                  </div>
                  <div className="app-brand-version" style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px', marginTop: '4px', marginLeft: '2px' }}>
                    v4.0.146
                  </div>
                </div>
                <div ref={langPickerRef} className="app-lang-control" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="app-language-select"
                    onClick={() => setShowLangPicker(prev => !prev)}
                    title="Language"
                    style={{ padding: '0.3rem 0.7rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--control-font-family)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>{t('版本：', 'Version: ')}{BIBLE_LANGUAGE_OPTIONS.find(o => o.value === version)?.label || version}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.85 }}>▾</span>
                  </button>
                  {showLangPicker && (
                    <div
                      role="dialog"
                      dir="ltr"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        // In Hebrew / Persian (RTL) layout the language button
                        // sits on the visual right of the header, so anchor
                        // the dropdown's right edge instead — otherwise it
                        // overflows off-screen to the right.
                        // Use isActiveLanguage (covers both uiLang AND version)
                        // because the dropdown is often opened mid-switch when
                        // uiLang hasn't synced yet — the underlying layout dir
                        // is already RTL via version, so the anchor must match.
                        ...(isActiveLanguage('he') || isActiveLanguage('fa') || isActiveLanguage('ar') ? { right: 0 } : { left: 0 }),
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        boxShadow: '0 18px 35px rgba(15, 23, 42, 0.18), 0 6px 12px rgba(15, 23, 42, 0.08)',
                        padding: '0.55rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))',
                        gap: '0.4rem',
                        zIndex: 200,
                        fontFamily: 'var(--control-font-family)',
                      }}
                    >
                      {BIBLE_LANGUAGE_OPTIONS.map(option => {
                        const isActive = option.value === version;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => { handleVersionChange(option.value); setShowLangPicker(false); }}
                            style={{
                              padding: '0.55rem 0.6rem',
                              border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                              borderRadius: '7px',
                              background: isActive ? '#3b82f6' : '#f8fafc',
                              color: isActive ? '#ffffff' : '#0f172a',
                              fontSize: '0.85rem',
                              fontWeight: isActive ? 700 : 600,
                              cursor: 'pointer',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <select
                  className="app-language-select"
                  value={selectedVoiceOptionId}
                  onChange={(e) => saveVoiceForVersion(e.target.value)}
                  title={t('朗讀語音設定', 'Text-to-Speech Voice')}
                  style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#0f172a', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--control-font-family)', maxWidth: '180px' }}
                >
                  <option value="">{t('語音：系統預設', 'Voice: Default')}</option>
                  {voiceOptionsForVersion.map(o => (
                    <option key={o.id} value={o.id}>{t('語音：', 'Voice: ')}{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="app-auth-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* Logged in = has an account email (LINE logins get a stand-in one).
                    A guest who only typed a leaderboard nickname still sees 登入. */}
                {userEmail ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {/* Admins always get the bell: the panel carries what is waiting for review. */}
                    {(combinedInbox.all.length > 0 || isSuperAdmin) && (() => {
                      const unread = combinedInbox.unread;
                      return (
                        <IconButton
                          label={t('我收到的鼓勵', 'Encouragement I received')}
                          style={{ position: 'relative' }}
                          onClick={() => {
                            setShowEncouragePanel(v => !v);
                            if (unread > 0) {
                              const nowIso = new Date().toISOString();
                              if (myVoiceOwnerId) voiceCommentApi.markEncouragementRead(myVoiceOwnerId).catch(() => {});
                              if (personalCode) fetch('/api/notify-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: personalCode }) }).catch(() => {});
                              setEncourageInbox(prev => prev ? { ...prev, lastReadAt: nowIso } : prev);
                              setNotifyInbox(prev => prev ? { ...prev, lastReadAt: nowIso } : prev);
                            }
                          }}
                        >
                          <span style={{ fontSize: '1.25rem' }} aria-hidden="true">🔔</span>
                          {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--color-danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread > 99 ? '99+' : unread}</span>}
                        </IconButton>
                      );
                    })()}
                    {editingPlayerName !== null ? (() => {
                      // Accounts with a password need it re-entered to confirm
                      // the change server-side; OAuth accounts (and pure
                      // guests with no account at all) don't.
                      const needsPassword = !!userEmail && !localStorage.getItem('verserain_auth_provider');
                      const cancelEdit = () => {
                        setEditingPlayerName(null);
                        setEditingPlayerNamePassword('');
                        setEditingPlayerNameError('');
                      };
                      const savePlayerName = async () => {
                        const val = editingPlayerName.trim();
                        if (!val) return;
                        if (!userEmail) {
                          // No account to sync — this is a local-only guest name.
                          setPlayerName(val);
                          localStorage.setItem('verserain_player_name', val);
                          cancelEdit();
                          return;
                        }
                        if (needsPassword && !editingPlayerNamePassword) {
                          setEditingPlayerNameError(t('請輸入密碼以確認變更', 'Enter your password to confirm'));
                          return;
                        }
                        setSavingPlayerName(true);
                        setEditingPlayerNameError('');
                        try {
                          const authProvider = localStorage.getItem('verserain_auth_provider') || undefined;
                          const res = await fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/update-profile", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: userEmail, password: needsPassword ? editingPlayerNamePassword : undefined, newName: val, authProvider })
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok || !data.success) {
                            setEditingPlayerNameError(data.error || t('改名失敗，請再試一次', 'Rename failed — please try again'));
                            setSavingPlayerName(false);
                            return;
                          }
                          // Server confirmed — safe to update local state now.
                          // Doing this only after success (not optimistically)
                          // is what keeps the name from reverting to the old
                          // one on the next login.
                          // Keep the old name linked to the account so referrals
                          // recorded against it still show under the new name.
                          if (playerName && playerName !== val && userEmail) {
                            fetch('/api/link-identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, keys: [playerName] }) }).catch(() => {});
                            // The server just re-tagged 「作者」 on this account's
                            // published sets; remember the old name locally too
                            // so sets still carrying it are treated as mine.
                            rememberPreviousName(playerName);
                            setPublishedSetsReload(n => n + 1);
                          }
                          setPlayerName(val);
                          localStorage.setItem('verserain_player_name', val);
                          setSavingPlayerName(false);
                          cancelEdit();
                        } catch (e) {
                          setEditingPlayerNameError(t('網路錯誤，請再試一次', 'Network error — please try again'));
                          setSavingPlayerName(false);
                        }
                      };
                      return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '0.3rem 0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <input
                            type="text"
                            autoFocus
                            maxLength={20}
                            disabled={savingPlayerName}
                            value={editingPlayerName}
                            onChange={(e) => setEditingPlayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePlayerName();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            style={{ width: '120px', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #3b82f6', fontSize: '0.95rem' }}
                          />
                          {needsPassword && (
                            <input
                              type="password"
                              disabled={savingPlayerName}
                              value={editingPlayerNamePassword}
                              onChange={(e) => setEditingPlayerNamePassword(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') savePlayerName();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              placeholder={t('目前密碼', 'Current password')}
                              style={{ width: '110px', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #3b82f6', fontSize: '0.95rem' }}
                            />
                          )}
                          <IconButton label={t('儲存', 'Save')} disabled={savingPlayerName} onClick={savePlayerName} style={{ color: 'var(--color-primary-strong)' }}><Check size={20} /></IconButton>
                          <IconButton label={t('取消', 'Cancel')} disabled={savingPlayerName} onClick={cancelEdit}><X size={20} /></IconButton>
                        </div>
                        {editingPlayerNameError && (
                          <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>{editingPlayerNameError}</span>
                        )}
                      </div>
                      );
                    })() : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem' }}>
                        <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '0.95rem' }}>{playerName}</span>
                        {isPremium && <Crown size={14} style={{ color: '#fbbf24' }} />}
                        <IconButton label={t('改暱稱', 'Edit display name')} onClick={() => setEditingPlayerName(playerName)}><Edit size={18} /></IconButton>
                      </div>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => { setPlayerName(''); setIsPremium(false); setUserEmail(''); setFavoriteVerseSetIds([]); setEditingPlayerName(null); localStorage.removeItem('verserain_player_name'); localStorage.removeItem('verserain_is_premium'); localStorage.removeItem('verserain_player_email'); localStorage.removeItem('verserain_auth_provider'); localStorage.removeItem('verserain_session_key'); setSessionKey(''); localStorage.removeItem('verseRain_gardenData'); setGardenData({}); localStorage.removeItem('verseRain_custom_sets'); localStorage.removeItem('verseRain_custom_sets_owner'); lastPushedPrivateSetsRef.current = ''; setCustomVerseSets([]); }}>{t("登出", "Logout")}</Button>
                  </div>
                ) : (
                  <>
                    {playerName && (
                      <span data-testid="guest-name" className="app-guest-name" title={t('訪客的成績不會存進帳號，登入後才會保存', 'Guest scores are not saved to an account until you log in')} style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t('訪客：{name}', 'Guest: {name}').replace('{name}', String(playerName))}
                      </span>
                    )}
                    <Button variant="text" size="sm" onClick={() => setShowLoginModal('login')}>{t("登入", "Login")}</Button>
                    <Button size="sm" onClick={() => setShowLoginModal('signup')}>{t("申請帳號", "Sign Up")}</Button>
                  </>
                )}
              </div>
            </div>

            {/* Navigation Bar */}
            {/* Main Content Area */}
            <div className="landscape-compact-content" style={{ maxWidth: '1000px', margin: '0 auto' }}>

              {mainTab === 'lobby' && (() => {
                const today = formatLocalDate(new Date());
                const resumeSet = lastListen && [...safeActiveSets, ...(publishedVerseSets || []), ...(customVerseSets || [])].find(x => x.id === lastListen.setId && x.verses?.length);
                return (
                  <TodayPage
                    t={t}
                    dateLocale={documentLang}
                    streak={personalProgress.currentStreak}
                    verse={dailyVerseDate === today ? displayedDailyVerse : null}
                    verseLoading={isDailyVerseLoading || dailyVerseDate !== today}
                    onListen={() => { setOpenDailyPickerOnEnter(false); if (dailyVerseDate !== today) changeDailyVerseDate(today); setMainTab('daily_verse'); }}
                    onChallenge={() => {
                      const v = displayedDailyVerse;
                      if (!v) return;
                      openChallengeSetup({
                        subtitle: formatVerseReferenceForDisplay(v.reference, version),
                        run: () => challengeVerseFromReader(v),
                      });
                    }}
                    onOpenRain={() => { setOpenDailyPickerOnEnter(true); setMainTab('daily_verse'); }}
                    lastListen={resumeSet ? { title: resumeSet.title || lastListen.title, ref: lastListen.ref } : null}
                    onContinue={() => {
                      const vs = resumeSet.verses;
                      const i = vs.findIndex(v => v.reference === lastListen.ref);
                      setSelectedSetId(resumeSet.id);
                      setContinuousRainSet({ ...resumeSet, startVerse: vs[(i + 1) % vs.length] || vs[0] });
                    }}
                    loggedIn={!!userEmail}
                    treesPlanted={personalProgress.treesPlanted}
                    onLogin={() => setShowLoginModal('login')}
                    onGarden={() => setMainTab('garden')}
                  />
                );
              })()}

              {mainTab === 'accessible' && <AccessiblePage {...{ t, currentSet, randomPickCount, readAccessibleGuide, safeActiveSets, setRandomPickCount, setSelectedSetId, startAccessibleBlindGame }} />}

              {mainTab === 'daily_verse' && <DailyVersePage {...{ t, allSecondaryVerses, bilingualSecondaryVersion, challengeVerseFromReader, changeDailyVerseDate, creditListen, dailySecondaryVerseSet, dailySharedVoiceOwner, dailyVerseDate, displayedDailyVerse, favoriteVerseSets, handleVersionChange, openDailyPickerOnEnter, openListeningShare, openVoiceCommentsFromPlayer, personalCode, playerName, remoteDailyVerse, saveVoiceForVersion, selectedVoiceOptionId, setBilingualSecondaryVersion, setContinuousRainSet, setDailySharedVoiceOwner, setMainTab, setOpenDailyPickerOnEnter, setSelectedSetId, setShowLoginModal, setSpeechReady, setVoiceRefreshTick, speechReady, topicVerseSets, updateGarden, userEmail, version, voiceOptionsForVersion }} />}

              {mainTab === 'bilingual_rain' && <BilingualRainPage {...{ t, allSecondaryVerses, bilingualRainActive, bilingualSecondaryVersion, challengeVerseFromReader, creditListen, favoriteVerseSetIdSet, favoriteVerseSets, handleVersionChange, openListeningShare, openVoiceCommentsFromPlayer, personalCode, playerName, preferredRainSet, pushSetForSharing, secondaryRainSet, setBilingualRainActive, setBilingualSecondaryVersion, setContinuousRainSet, setMainTab, setSelectedSetId, setSpeechReady, setVoiceRefreshTick, toggleFavoriteVerseSet, topicVerseSets, updateGarden, userEmail, version }} />}

              {mainTab === 'settings' && (
                <SettingsPage
                  t={t}
                  uiLangs={SUPPORTED_UI_LANGS}
                  uiLang={uiLang}
                  onUiLang={setUiLangPersisted}
                  versions={BIBLE_LANGUAGE_OPTIONS}
                  version={version}
                  onVersion={(v) => handleVersionChange(v, { keepUiLang: true })}
                  voiceOptions={voiceOptionsForVersion}
                  voiceId={selectedVoiceOptionId}
                  onVoice={saveVoiceForVersion}
                  pushOn={pushStatus === 'subscribed'}
                  onPush={() => setShowPushModal(true)}
                  elderMode={elderMode}
                  onElderMode={setElderMode}
                  performanceMode={performanceMode}
                  onPerformanceMode={(on) => { setPerformanceMode(on); try { localStorage.setItem('verseRainPerformanceMode', on ? 'true' : 'false'); } catch { /* best effort */ } }}
                  onAccessible={() => setMainTab('accessible')}
                />
              )}

              {mainTab === 'advanced' && <AdvancedPage {...{ t, combinedInbox, isPremium, isSuperAdmin, menuScrollRef, playerName, pushStatus, scrollMenuTo, setMainTab, setShowEncouragePanel, setShowLoginModal, setShowPushModal, userEmail }} />}

              {mainTab === 'custom_verses' && <CustomVersesPage {...{ t, bgFileInputRef, bgUploadBusy, bookPickerIdx, bulkImportState, canCreateCustomSets, confirmDeleteIdx, confirmDeleteTimerRef, customSetsPage, customSetsSort, customVerseSets, editingCustomSet, editorBgPreview, editorMusicAudioRef, editorMusicPlaying, editorMusicUrl, editorPlayingVerse, editorSaveSeqRef, editorUploadJobRef, editorVerseVoices, editorVoiceStatus, editorVoiceTarget, handleBgImageUpload, handleMusicUpload, isNarrowEditor, loadedLangs, musicFileInputRef, musicUploadBusy, playerName, playSetVerseVoice, presetMenuOpen, publishedVerseSets, runBulkImport, setBookPickerIdx, setBulkImportState, setConfirmDeleteIdx, setCustomSetsPage, setCustomSetsSort, setCustomVerseSets, setEditingCustomSet, setEditorPlayingVerse, setEditorVerseVoices, setEditorVoiceStatus, setEditorVoiceTarget, setMainTab, setPresetMenuOpen, setPublishedVerseSets, setSelectedSetId, setShowLoginModal, setTranslateModal, setVoicesLookupRef, sortedCustomSets, stopVerseModalAudio, toggleEditorMusicPreview, userEmail, verseModalAudioRef, version }} />}

              {mainTab === 'multiplayer' && <MultiplayerPage {...{ t, activeVerseSets, customVerseSets, fetchGlobalLeaderboard, isGuestJoinRef, joinRoomError, joinRoomTimeoutRef, mpLocalRefFor, mpLocalTextFor, multiplayerDistractionLevel, multiplayerHostPlays, multiplayerPlayMode, multiplayerRoomId, multiplayerRoomMode, multiplayerSearchText, multiplayerSelectedVerses, multiplayerState, multiplayerTeamCount, myClientId, personalCode, pickerLockedSet, pickerSelectedSet, playerName, randomPickCount, setActiveVerse, setDistractionLevel, setInitAutoStart, setJoinRoomError, setMainTab, setMultiplayerDistractionLevel, setMultiplayerHostPlays, setMultiplayerPlayMode, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, setMultiplayerSearchText, setMultiplayerSelectedVerses, setMultiplayerState, setMultiplayerTeamCount, setPickerLockedSet, setPickerSelectedSet, setPlayerName, setPlayMode, setRandomPickCount, setShowMultiplayerVersePicker, setShowPickerBrowser, showMultiplayerVersePicker, showPickerBrowser, socketRef, version }} />}

              {mainTab === 'versesets' && <VerseSetsPage {...{ t, canCreateCustomSets, canEditSet, copyVerseSetToMine, currentSet, currentSetAuthorName, currentSetLastEditorName, currentSetVoiceRefs, currentSetVoices, customVerseSets, descTtsState, distractionLevel, favoriteVerseSetIdSet, hiddenOfficialSetIds, isAdmin, isSuperAdmin, myVoicesInSet, openChallengeSetup, personalCode, playerName, playMode, playSingleVerseCard, publishedVerseSets, pushSetForSharing, randomPickCount, selectedSetId, selectedVerseRefs, setActiveVerse, setAuthorSetsModal, setCampaignQueue, setCampaignResults, setDescTtsState, setEditingCustomSet, setHiddenOfficialSetIds, setIsFetchingLeaderboard, setLeaderboardModalData, setLeaderboardModalVerse, setMainTab, setMultiplayerDistractionLevel, setMultiplayerPlayMode, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, setMultiplayerSearchText, setMultiplayerSelectedVerses, setPickerLockedSet, setPickerSelectedSet, setPlayOrderChooser, setPublishedVerseSets, setQrShareModal, setRandomPickCount, setSelectedSetId, setSelectedVerseRefs, setShowMultiplayerVersePicker, setShowPickerBrowser, setTranslateModal, setVersesetsPage, setVersesetsSort, setVerseSortNeedsPractice, setVerseViewModal, setViewCounts, sortedVerseSetList, startGame, toggleFavoriteVerseSet, toggleMyVerseVoicePublic, toggleSelection, userEmail, verseRowsWithGarden, versesetsPage, versesetsSort, verseSortNeedsPractice, version, viewCounts, voiceVisibilityBusy }} />}

              {mainTab === 'garden' && <GardenPage {...{ t, challengeGardenVerse, charityContribPage, charityMine, clearGardenFocus, compactMyGarden, contestMine, contestProgress, creatorOnlyPoints, gardenData, gardenFocus, gardenGaps, handleViewPlayerGarden, HISTORY_PAGE_SIZE, isFirstGardenVisit, isNarrowEditor, merchantRefBonus, merchantRefBonusPage, myInviterCode, myInviterName, myReferees, nudgeBusyName, nudgedUntil, nudgeReferee, pendingRefereesPage, personalCode, personalProgress, playerName, pointsBalance, refereeGardenStats, refereesPage, referralHistory, referralKeys, referralOnlyPoints, resolveGardenVerse, scrollMenuTo, sessionKey, setCharityContribPage, setMainTab, setMerchantRefBonusPage, setPendingRefereesPage, setQrShareModal, setRefereesPage, setShowBindInviterModal, setShowFruitInfo, setShowLevelInfo, setShowLoginModal, setShowOldInviters, setShowTodayInfo, showOldInviters, showTodayInfo, skoolLevel, totalFruits, userEmail, version }} />}

              {mainTab === 'rewards_admin' && <RewardsAdminPage {...{ t, adminToken, cashOrgTypeLabel, cashStatusBadge, contestAdminAction, contestsAdmin, contestsAdminFilter, fmtMoney, isSuperAdmin, markReward, placeAdminAction, placeEdit, placesAdmin, placesAdminFilter, poolAdminAction, poolsAdmin, poolsAdminFilter, poolsFor, poolStatusBadge, rewardCurrency, rewardLabel, rewardNoteDraft, rewardsAdmin, rewardsAdminFilter, saveAdminToken, saveSponsorRecord, sendDraftFor, setContestsAdminFilter, setMainTab, setPlaceEdit, setPlacesAdminFilter, setPoolsAdminFilter, setRewardNoteDraft, setRewardsAdminFilter, setRewardsAdminReload, setSendField, setSponsorDraft, sponsorDraft, voucherAdminAction, voucherLabel, vouchersAdmin }} />}

              {mainTab === 'sponsors' && <SponsorsPage t={t} fmtMoney={fmtMoney} myVouchers={myVouchers} redeemErrorText={redeemErrorText} saveActiveVoucher={saveActiveVoucher} setMainTab={setMainTab} setShowLoginModal={setShowLoginModal} sponsorsInfo={sponsorsInfo} userEmail={userEmail} voucherStatusBadge={voucherStatusBadge} />}

              {mainTab === 'donate' && <DonatePage t={t} setMainTab={setMainTab} setToast={setToast} />}

              {mainTab === 'sponsor' && <SponsorPage t={t} setMainTab={setMainTab} />}

              {mainTab === 'charity' && <CharityPage {...{ t, cashBusy, cashDraft, cashOrgTypeLabel, cashStatusBadge, charityFocus, charityMine, charityNoticeText, charityPools, createPool, myPlaces, openContribute, poolCreateBusy, poolCreateDraft, poolStatusBadge, redeemErrorText, saveActiveVoucher, saveCashAppeal, setCashDraft, setMainTab, setPoolCreateDraft, setPoolRedeemModal, setShowLoginModal, startCashEdit, userEmail, voucherStatusBadge }} />}

              {mainTab === 'contests' && <ContestsPage {...{ t, acceptContestChallengeAction, claimContestCompletionAction, contestActionBusy, contestCreateBusy, contestCreateDraft, contestFocus, contestLeaderboards, contestMine, contestNoticeText, contestProgress, contests, createContest, joinContestAction, loadContestLeaderboard, myPlaces, poolStatusBadge, safeActiveSets, setContestCreateDraft, setMainTab, setSelectedSetId, userEmail }} />}

              {/* ── 投入視窗：把點數投入愛心行動 ── */}
              {contributeModal && (() => {
                const pb = pointsBalance; const pool = contributeModal.pool;
                const field = { width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1.1rem', background: '#fff' };
                const maxNTD = contributeMaxNTD(pb);
                const ntd = contributeClampNTD(contributeNTD, pb);
                const points = ntd * 1000;
                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget && !contributeBusy) setContributeModal(null); }}>
                    <div data-testid="contribute-modal" style={{ background: '#fff', borderRadius: 14, padding: '1.2rem 1.3rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>❤️ {t('愛心行動', 'Love in Action')}</div>
                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e293b' }}>{pool.name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>⛪ {pool.orgPlaceName}</div>
                        </div>
                        <button type="button" onClick={() => setContributeModal(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                      </div>
                      {!pb ? (
                        <div style={{ color: '#94a3b8', padding: '1rem 0' }}>{pointsBalanceBusy ? t('載入中…', 'Loading…') : ''}</div>
                      ) : pb.error ? (
                        <div style={{ color: '#b45309', padding: '0.8rem 0', fontSize: '0.9rem' }}>{redeemErrorText(pb.error)}{pb.error === 'session_invalid' && <> <button type="button" onClick={() => setShowLoginModal('login')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.8rem', cursor: 'pointer', fontWeight: 700 }}>{t('重新登入', 'Sign in again')}</button></>}</div>
                      ) : !pb.eligible ? (
                        <div style={{ color: '#b45309', padding: '0.8rem 0', fontSize: '0.9rem' }}>{redeemErrorText(['session_invalid', 'not_enough_passed', 'account_too_new', 'no_email'].find(r => (pb.reasons || []).includes(r)) || 'not_eligible')}</div>
                      ) : maxNTD < 1 ? (
                        <div style={{ color: '#b45309', padding: '0.8rem 0', fontSize: '0.9rem' }}>{t('可用點數不足（至少 1,000 點才能投入）', 'Not enough available points (at least 1,000 pts needed)')}</div>
                      ) : (
                        <div style={{ marginTop: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#334155', marginBottom: '0.6rem' }}>
                            <span>{t('可用點數', 'Available points')}</span>
                            <b>{(pb.balancePoints || 0).toLocaleString()} {t('點', 'pts')}</b>
                          </div>
                          <label style={{ color: '#64748b', fontSize: '0.82rem' }}>{t('投入的折抵額度（NT$，每 1,000 點 → NT$1）', 'Allowance to contribute (NT$, every 1,000 pts → NT$1)')}</label>
                          <input type="range" min={1} max={Math.max(1, maxNTD)} step={1} value={ntd} onChange={e => setContributeNTD(String(e.target.value))} style={{ width: '100%', margin: '0.4rem 0' }} />
                          {/* Bound to the raw text so the field can be emptied while typing; clamped on blur. */}
                          <input type="number" inputMode="numeric" min={1} max={Math.max(1, maxNTD)} step={1} value={contributeNTD} onChange={e => setContributeNTD(e.target.value)} onBlur={() => setContributeNTD(String(ntd))} style={field} />
                          <div data-testid="contribute-preview" style={{ marginTop: '0.6rem', background: '#fff1f2', borderRadius: 8, padding: '0.6rem 0.8rem', fontWeight: 700, color: '#9f1239' }}>
                            {t('投入 {p} 點 → 「{pool}」折抵額度 +NT${n}', 'Contribute {p} pts → NT${n} added to “{pool}”').replace('{p}', points.toLocaleString()).replace('{pool}', String(pool.name || '')).replace('{n}', String(ntd))}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.5rem' }}>{t('每人每個愛心行動每天最多投入 NT$100（100,000 點）', 'Up to NT$100 (100,000 pts) per person per pool per day')}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '0.5rem', lineHeight: 1.5 }}>{charityNoticeText()}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.9rem' }}>
                            <button type="button" onClick={() => setContributeModal(null)} style={{ background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700 }}>{t('取消', 'Cancel')}</button>
                            <button type="button" disabled={contributeBusy} onClick={confirmContribute} style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.1rem', cursor: contributeBusy ? 'wait' : 'pointer', fontWeight: 800 }}>{contributeBusy ? '…' : `❤️ ${t('確認投入（不可撤回）', 'Confirm (cannot be undone)')}`}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── 機構用池內額度產生折扣券 ── */}
              {poolRedeemModal && (() => {
                const m = poolRedeemModal; const pool = m.pool;
                const field = { width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1.1rem', background: '#fff' };
                const terms = (pool.merchants || []).find(x => x.placeId === m.placeId) || null;
                const bill = Math.floor(Number(m.bill) || 0);
                const caps = terms ? [
                  ['per_order', Number(terms.perOrderMaxNTD) || 0],
                  ['monthly', Math.max(0, (Number(terms.monthlyMaxNTD) || 0) - (Number(terms.monthUsedNTD) || 0))],
                  ['allowance', Number(pool.allowanceNTD) || 0],
                ] : [];
                let ntd = bill, limitedBy = null;
                for (const [k, cap] of caps) { if (cap < ntd) { ntd = cap; limitedBy = k; } }
                ntd = Math.max(0, ntd);
                const limitText = { per_order: t('受商家單筆上限限制', 'Limited by the shop’s per-order cap'), monthly: t('受商家每月上限限制', 'Limited by the shop’s monthly cap'), allowance: t('受池內可用額度限制', 'Limited by the pool’s allowance') };
                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget && !poolRedeemBusy) setPoolRedeemModal(null); }}>
                    <div data-testid="pool-redeem-modal" style={{ background: '#fff', borderRadius: 14, padding: '1.2rem 1.3rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>🎟️ {t('用愛心行動額度折抵', 'Discount from the Love in Action project')}</div>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e293b' }}>{pool.name}</div>
                      <div style={{ color: '#334155', fontSize: '0.9rem', margin: '0.4rem 0' }}>{t('可用折抵額度', 'Discount allowance available')}：<b style={{ color: '#be123c' }}>NT${pool.allowanceNTD || 0}</b></div>
                      <label style={{ color: '#64748b', fontSize: '0.82rem', display: 'block', marginTop: '0.6rem' }}>{t('選擇合作商家', 'Choose a participating shop')}</label>
                      <select value={m.placeId} onChange={e => setPoolRedeemModal(x => ({ ...x, placeId: e.target.value }))} style={{ ...field, fontSize: '0.95rem' }}>
                        {(pool.merchants || []).map(x => <option key={x.placeId} value={x.placeId}>{x.placeName}</option>)}
                      </select>
                      {terms && <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>{t('單筆最高 NT${n}', 'up to NT${n} per order').replace('{n}', String(terms.perOrderMaxNTD))} · {t('本月剩餘 NT${n}', 'NT${n} left this month').replace('{n}', String(Math.max(0, (terms.monthlyMaxNTD || 0) - (terms.monthUsedNTD || 0))))}</div>}
                      <label style={{ color: '#64748b', fontSize: '0.82rem', display: 'block', marginTop: '0.6rem' }}>{t('消費金額（NT$）', 'Bill amount (NT$)')}</label>
                      <input type="number" inputMode="numeric" min={1} value={m.bill} onChange={e => setPoolRedeemModal(x => ({ ...x, bill: e.target.value }))} placeholder="8000" style={field} autoFocus />
                      {bill > 0 && (
                        <div style={{ marginTop: '0.6rem', background: ntd > 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: '0.6rem 0.8rem', fontWeight: 700 }}>
                          <div style={{ fontSize: '1.05rem', color: ntd > 0 ? '#166534' : '#991b1b' }}>{t('折抵 NT${n}（由愛心行動扣除）', 'NT${n} off (taken from the pool allowance)').replace('{n}', String(ntd))}</div>
                          {limitedBy && <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 400 }}>{limitText[limitedBy]}</div>}
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2, fontWeight: 400 }}>{t('餘額 NT${n} 請由機構直接付給商家', 'Pay the remaining NT${n} to the shop directly').replace('{n}', String(Math.max(0, bill - ntd)))}</div>
                        </div>
                      )}
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.6rem', lineHeight: 1.5 }}>{t('折扣券 30 分鐘內有效、只能用一次；折抵後的餘額請直接付給商家。', 'The voucher is valid 30 minutes and single-use; pay the remainder to the shop directly.')}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.9rem' }}>
                        <button type="button" onClick={() => setPoolRedeemModal(null)} style={{ background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700 }}>{t('取消', 'Cancel')}</button>
                        <button type="button" disabled={poolRedeemBusy || ntd < 1} onClick={poolRedeem} style={{ background: ntd < 1 ? '#e2e8f0' : '#f59e0b', color: ntd < 1 ? '#94a3b8' : '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.1rem', cursor: poolRedeemBusy ? 'wait' : 'pointer', fontWeight: 800 }}>{poolRedeemBusy ? '…' : `🎟️ ${t('產生折扣券', 'Get a discount voucher')}`}</button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 折抵視窗：用點數換商家折扣 ── */}
              {redeemPlace && (() => {
                const pb = pointsBalance;
                const pv = redeemPreview;
                const field = { width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 700 };
                const limitText = { voucher_cap: t('單張折扣券上限 NT${n}', 'Per-coupon cap NT${n}').replace('{n}', String(pb?.voucherCapNTD ?? 200)), monthly: t('本月剩餘額度 NT${n}', 'NT${n} left this month').replace('{n}', String(Math.max(0, (pb?.monthlyCapNTD ?? 500) - (pb?.monthlyUsedNTD || 0)))), balance: t('點數只夠折抵這麼多', 'Limited by your points') };
                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget && !redeemBusy) setRedeemPlace(null); }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: '1.3rem 1.4rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>🏪 {t('點數折抵', 'Points discount')}</div>
                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e293b' }}>{redeemPlace.name}</div>
                          <div style={{ color: '#92400e', fontWeight: 700 }}>-{Number(redeemPlace.discountPct) || 0}%</div>
                          {Number(redeemPlace.dailyPerPerson) > 0 && <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{t('每人每天最多 {n} 張', 'Up to {n} per person per day').replace('{n}', String(redeemPlace.dailyPerPerson))}</div>}
                        </div>
                        <button type="button" onClick={() => setRedeemPlace(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
                      </div>
                      {activeVoucher && activeVoucher.status === 'issued' && voucherSecondsLeft > 0 ? (
                        <div style={{ marginTop: '0.9rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '0.7rem 0.9rem', color: '#78350f', fontSize: '0.9rem' }}>
                          {t('你已有一張未使用的折扣券（{place}），請先使用或等它過期。', 'You already have an unused coupon ({place}); use it or let it expire first.').replace('{place}', String(activeVoucher.placeName || ''))}
                          <div><button type="button" onClick={() => setRedeemPlace(null)} style={{ marginTop: 6, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700 }}>{t('查看折扣券', 'Show coupon')}</button></div>
                        </div>
                      ) : pointsBalanceBusy || !pb ? (
                        <div style={{ marginTop: '1rem', color: '#94a3b8' }}>{t('核算中…', 'Checking…')}</div>
                      ) : pb.error ? (
                        <div style={{ marginTop: '1rem', color: '#b45309', fontSize: '0.9rem' }}>
                          {redeemErrorText(pb.error)}
                          {pb.error === 'session_invalid' && <div><button type="button" onClick={() => { setRedeemPlace(null); setShowLoginModal('login'); }} style={{ marginTop: 6, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700 }}>{t('重新登入', 'Sign in again')}</button></div>}
                        </div>
                      ) : !pb.eligible ? (
                        <div style={{ marginTop: '1rem', color: '#b45309', fontSize: '0.9rem', lineHeight: 1.6 }}>
                          {redeemErrorText(['session_invalid', 'not_enough_passed', 'account_too_new', 'no_email'].find(r => (pb.reasons || []).includes(r)) || 'not_eligible')}
                          <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>{t('目前通過 {n} 節', '{n} verses passed so far').replace('{n}', String(pb.passedVerses ?? 0))}</div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.9rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#334155', marginBottom: 6 }}>
                            <span>{t('可用點數', 'Available points')}</span>
                            <b>{(pb.balancePoints || 0).toLocaleString()} {t('點', 'pts')} · {t('最多可折抵 NT${n}', 'up to NT${n} off').replace('{n}', String(pb.balanceNTD || 0))}</b>
                          </div>
                          <label style={{ color: '#64748b', fontSize: '0.82rem' }}>{t('消費金額（NT$）', 'Bill amount (NT$)')}</label>
                          <input type="number" inputMode="numeric" min={1} value={redeemBill} onChange={e => setRedeemBill(e.target.value)} placeholder="500" style={field} autoFocus />
                          {pv && pv.bill > 0 && (
                            <div style={{ marginTop: '0.7rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0.7rem 0.9rem' }}>
                              <div style={{ fontSize: '1.05rem', color: '#166534' }}>{t('折抵 NT${n}（扣 {p} 點）', 'NT${n} off (spend {p} points)').replace('{n}', String(pv.ntd)).replace('{p}', pv.points.toLocaleString())}</div>
                              {pv.limitedBy && <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>{limitText[pv.limitedBy]}</div>}
                              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>{t('實付約 NT${n}', 'You pay about NT${n}').replace('{n}', String(Math.max(0, pv.bill - pv.ntd)))}</div>
                            </div>
                          )}
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.6rem', lineHeight: 1.5 }}>{t('折抵比例：每 1,000 點可折抵 NT$1 的消費折扣（折扣由商家提供；點數無現金價值，不可兌換現金或轉讓）。以目前名字的累計分數計算。折扣券 30 分鐘內有效、只能用一次，請在結帳時出示。', 'Rate: every 1,000 points takes NT$1 off the bill (the discount is the shop’s; points have no cash value and cannot be cashed out or transferred). Based on the score under your current name. The coupon is valid 30 minutes and single-use; show it at checkout.')}</div>
                          <div data-testid="redeem-points-notice" style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.35rem', lineHeight: 1.5 }}>{t('點數聲明：點數是遊戲內無償取得的促銷折抵權益，無現金價值、不可兌換現金、不可轉讓或轉售，亦非儲值或電子支付；折扣由商家自行提供，經文雨不經手任何款項。', 'About points: points are a free in-game promotional discount right with no cash value; they cannot be cashed out, transferred or resold, and are not stored value or e-payment. Discounts are offered by the shops themselves; VerseRain never handles money.')}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setRedeemPlace(null)} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer' }}>{t('取消', 'Cancel')}</button>
                            <button type="button" disabled={redeemBusy || !pv || pv.ntd < 1} onClick={confirmRedeem} style={{ background: (!pv || pv.ntd < 1) ? '#e2e8f0' : '#f59e0b', color: (!pv || pv.ntd < 1) ? '#94a3b8' : '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.1rem', cursor: redeemBusy ? 'wait' : 'pointer', fontWeight: 800 }}>{redeemBusy ? '…' : `🎟️ ${t('產生折扣券', 'Get a coupon')}`}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── 折扣券卡（可跨頁存在，重新整理後仍在） ── */}
              {activeVoucher && !redeemPlace && (() => {
                const v = activeVoucher;
                const live = v.status === 'issued' && voucherSecondsLeft > 0;
                const mm = String(Math.floor(voucherSecondsLeft / 60)).padStart(2, '0'), ss = String(voucherSecondsLeft % 60).padStart(2, '0');
                const statusText = v.status === 'used' ? t('已使用 ✓', 'Used ✓') : (v.status === 'expired' || !live) ? t('已過期', 'Expired') : v.status === 'void' ? t('已作廢', 'Voided') : null;
                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget && !live) saveActiveVoucher(null); }}>
                    <div style={{ background: '#fffbeb', border: '2px dashed #f59e0b', borderRadius: 16, padding: '1.3rem 1.4rem', width: '100%', maxWidth: 380, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
                      <div style={{ color: '#92400e', fontWeight: 700, fontSize: '0.85rem' }}>🎟️ {t('經文雨折扣券', 'VerseRain coupon')}</div>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e293b', marginTop: 4 }}>{v.placeName}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#166534', margin: '0.3rem 0' }}>NT${v.ntd} {t('折抵', 'off')}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{v.kind === 'pool'
                        ? `❤️ ${t('愛心行動：{pool}', 'Love in Action: {pool}').replace('{pool}', String(v.poolName || ''))} · ${t('消費 NT${b}', 'Bill NT${b}').replace('{b}', String(v.billNTD))}`
                        : t('消費 NT${b} · 折扣 {p}% · 扣 {pts} 點', 'Bill NT${b} · {p}% · {pts} pts').replace('{b}', String(v.billNTD)).replace('{p}', String(v.discountPct)).replace('{pts}', Number(v.points || 0).toLocaleString())}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.9rem', fontWeight: 800, letterSpacing: 3, color: '#1e293b', margin: '0.8rem 0 0.4rem' }}>{formatVoucherCode(v.code)}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '0.4rem 0' }}><QRCodeSVG value={`${window.location.origin}/#verify/${v.code}`} size={120} /></div>
                      {statusText ? (
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: v.status === 'used' ? '#166534' : '#991b1b', margin: '0.5rem 0' }}>{statusText}</div>
                      ) : (
                        <div style={{ color: '#b45309', fontWeight: 700, margin: '0.4rem 0' }}>⏳ {t('剩餘 {t}', '{t} left').replace('{t}', `${mm}:${ss}`)}</div>
                      )}
                      <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.5 }}>{t('請店員掃描 QR，或到 verserain.com/#verify 輸入代碼核銷。', 'Ask staff to scan the QR, or enter the code at verserain.com/#verify.')}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => { try { navigator.clipboard.writeText(v.code); toast.success(t('已複製代碼', 'Code copied')); } catch { /* ignore */ } }} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.4rem 0.9rem', cursor: 'pointer', color: '#334155' }}>{t('複製代碼', 'Copy code')}</button>
                        <button type="button" onClick={() => saveActiveVoucher(null)} style={{ background: live ? '#e2e8f0' : '#f59e0b', color: live ? '#334155' : '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: 700 }}>{live ? t('先關閉（稍後可從商家標記再打開）', 'Close for now') : t('關閉', 'Close')}</button>
                      </div>
                      <button type="button" onClick={() => { saveActiveVoucher(null); setMainTab(v.kind === 'pool' ? 'charity' : 'sponsors'); }} style={{ marginTop: '0.6rem', background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>{t('查看我的折抵紀錄', 'See my discounts')} →</button>
                    </div>
                  </div>
                );
              })()}

              {mainTab === 'verify' && <VerifyPage t={t} lookupVoucher={lookupVoucher} setMainTab={setMainTab} setVerifyCodeInput={setVerifyCodeInput} setVerifyResult={setVerifyResult} setVerifyScanOpen={setVerifyScanOpen} useVoucher={useVoucher} verifyBusy={verifyBusy} verifyCodeInput={verifyCodeInput} verifyResult={verifyResult} verifyScanOpen={verifyScanOpen} />}

              {mainTab === 'merchant' && <MerchantPage {...{ t, cancelEditPlace, geocodeMerchant, handleMerchantPhoto, merchantBusy, merchantDraft, merchantFormRef, merchantGeoBusy, merchantPhotoBusy, merchantPhotoInputRef, merchantPhotoPreview, merchantReferrerLookup, merchantScanOpen, merchantSubmitStatus, myPlaceBusyId, myPlaces, ownerPlaceAction, placeLedger, placeLedgerOpen, redeemErrorText, renderMerchantPoolSection, sessionKey, setMainTab, setMerchantDraft, setMerchantScanOpen, setShowLoginModal, startEditPlace, submitMerchant, togglePlaceLedger, useMyLocationForMerchant, userEmail, voucherStatusBadge }} />}

              {mainTab === 'leaderboard' && <LeaderboardPage {...{ t, activeVerseSets, cjkDataFontStack, globalFruitsMap, globalLeaderboardData, globalLeaderboardTab, globalVerseStats, isFetchingGlobalLeaderboard, loadedLangs, pageGlobalLeaderboard, pagePopularSets, pagePopularVerses, playerName, safeActiveSets, setActiveVerse, setGlobalLeaderboardTab, setIsLangsLoading, setLoadedLangs, setMainTab, setPageGlobalLeaderboard, setPagePopularSets, setPagePopularVerses, setSelectedSetId, setShowLevelInfo, setVersion, setViewCounts, setViewingPlayerGarden, startGame, userEmail, VERSES_DB, version, versionBeforeChallenge, viewCounts }} />}
              {mainTab === 'search' && <SearchPage {...{ t, activeVerseSets, searchQuery, searchSetsPage, searchVersesPage, setActiveVerse, setCampaignQueue, setCampaignResults, setEditingCustomSet, setMainTab, setSearchQuery, setSearchSetsPage, setSearchVersesPage, setSelectedSetId, setVerseViewModal, startGame, version }} />}

              {mainTab === 'map' && <MapPage t={t} handleViewPlayerGarden={handleViewPlayerGarden} isGuestJoinRef={isGuestJoinRef} joinRoomTimeoutRef={joinRoomTimeoutRef} mapFocus={mapFocus} mapView={mapView} openRedeem={openRedeem} placesVersion={placesVersion} playerName={playerName} setCharityFocus={setCharityFocus} setContestFocus={setContestFocus} setJoinRoomError={setJoinRoomError} setMainTab={setMainTab} setMapFocus={setMapFocus} setMapView={setMapView} setMultiplayerRoomId={setMultiplayerRoomId} setMultiplayerRoomMode={setMultiplayerRoomMode} setMultiplayerRoomRole={setMultiplayerRoomRole} userEmail={userEmail} />}

                            {mainTab === 'manual' && <ManualPage t={t} manualBodyRef={manualBodyRef} scrollMenuTo={scrollMenuTo} uiLang={uiLang} />}

              {mainTab === 'about' && <AboutPage t={t} />}

            </div>
          </div>
        )}

        {gameState === 'playing' && !isAutoPlay && (isBlindMode || playMode?.startsWith('voice')) && <VoicePlayScreen {...{ t, activePhrases, activeVerse, combo, currentSeqIndex, currentSeqRef, health, healthRef, isDebugMode, isGameTimerPausedRef, playMode, quitGame, score, setCombo, setCurrentSeqIndex, setHealth, setScore, skipReadback, timeLeft, version }} />}

        {gameState === 'playing' && (isAutoPlay || (!isBlindMode && !playMode?.startsWith('voice'))) && <RainPlayScreen {...{ t, activePhrases, activeVerse, armDelete, bestScore, blocks, combo, currentSeqIndex, deleteArmedId, distractionLevel, flyingBlocks, gameState, getRainBlockFontSize, handleAnimationEnd, handleBlockClick, handleGlobalClick, health, hintSeq, hintTimerRef, isAutoPlay, multiplayerRoomId, multiplayerState, myClientId, playMode, quitGame, score, setCombo, setDeleteArmedId, setHintSeq, speakingTitle, squareBlockFontSize, squareGridSize, timeLeft, version }} />}

        {gameState === 'waiting_for_others' && multiplayerState && <WaitingScreen {...{ t, localCampaignListRef, multiplayerSoloActiveRef, multiplayerState, myClientId, restartTeamSoloRun, setGameState, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, setMultiplayerState, socketRef }} />}

        {gameState === 'multiplayer_results' && multiplayerState && <MultiplayerResultsScreen {...{ t, multiplayerSoloActiveRef, multiplayerState, myClientId, setGameState, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, socketRef }} />}

        {gameState === 'intermission' && multiplayerState && <IntermissionScreen {...{ t, intermissionCountdown, localCampaignListRef, localNextVerse, localVerseIndexRef, mpLocalRefFor, mpLocalTextFor, multiplayerRoomId, multiplayerState }} />}

        {gameState === 'gameover' && <GameOverScreen {...{ t, activePhrases, activeVerse, campaignQueue, distractionLevel, isAutoPlayRef, isFailed, isFlawless, isNewHighScore, isSubmittingScore, leaderboard, leaderboardTab, playerName, playMode, pureBaseScore, quitGame, readerReturnRef, score, setActiveVerse, setCampaignQueue, setContinuousRainSet, setGameState, setIsSubmittingScore, setLeaderboard, setLeaderboardTab, setMainTab, setPlayerName, setShowLoginModal, startGame, submitScoreToServer, timeBonus, timeLeft, userEmail, version }} />}

        {gameState === 'campaign-results' && <CampaignResultsScreen {...{ t, campaignResults, setCampaignQueue, setGameState }} />}
        {leaderboardModalVerse && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(5px)' }} onClick={() => setLeaderboardModalVerse(null)}>
            <div className="hud-glass" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', color: '#93c5fd', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={20} /> {t("排行榜", "Leaderboard")}</h2>
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
        {/* Reset-password modal — opened by the ?resetToken= link from the
            忘記密碼 email. The token is single-use and expires in 30 minutes;
            the server never had the old password to send back. */}
        {resetToken && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '1.6rem 1.5rem', width: 'min(420px, 100%)', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <h3 style={{ marginTop: 0, color: '#1e293b', textAlign: 'center' }}>{t("設定新密碼", "Set a new password")}</h3>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
                {t("這個連結只能使用一次，30 分鐘內有效。", "This link works once and is valid for 30 minutes.")}
              </div>
              <input id="resetPw1" type="password" autoComplete="new-password" placeholder={t("新密碼（至少 6 個字元）", "New password (at least 6 characters)")}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '0.6rem', fontSize: '0.95rem' }} />
              <input id="resetPw2" type="password" autoComplete="new-password" placeholder={t("再輸入一次新密碼", "Confirm new password")}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: '0.8rem', fontSize: '0.95rem' }} />
              {resetError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.7rem', fontWeight: 'bold' }}>{resetError}</div>}
              <button
                disabled={resetBusy}
                onClick={async () => {
                  const pw1 = document.getElementById('resetPw1')?.value || '';
                  const pw2 = document.getElementById('resetPw2')?.value || '';
                  if (pw1.length < 6) return setResetError(t("密碼至少需要 6 個字元", "Password must be at least 6 characters"));
                  if (pw1 !== pw2) return setResetError(t("兩次輸入的密碼不一致", "The two passwords do not match"));
                  setResetBusy(true);
                  setResetError("");
                  try {
                    const res = await fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/reset-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token: resetToken, newPassword: pw1 })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setResetToken(null);
                      toast.success(t("密碼已更新，請用新密碼登入。", "Your password has been updated. Please log in with it."));
                      setShowLoginModal('login');
                    } else {
                      setResetError(data.error || t("重設失敗", "Reset failed"));
                    }
                  } catch {
                    setResetError(t("無法連線到伺服器", "Server unreachable"));
                  } finally {
                    setResetBusy(false);
                  }
                }}
                style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: 'none', background: resetBusy ? '#94a3b8' : '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: resetBusy ? 'default' : 'pointer', fontSize: '0.95rem' }}
              >
                {resetBusy ? t("處理中…", "Working…") : t("更新密碼", "Update password")}
              </button>
              <div style={{ textAlign: 'center', marginTop: '0.9rem' }}>
                <span onClick={() => { setResetToken(null); setResetError(""); }} style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>{t("取消", "Cancel")}</span>
              </div>
            </div>
          </div>
        )}
        {/* Login Account Modal */}
        {challengeSetup && (
          <ChallengeSetupModal
            t={t}
            subtitle={challengeSetup.subtitle}
            value={challengeSetup.value}
            onChange={(v) => setChallengeSetup(c => (c ? { ...c, value: v } : c))}
            onStart={confirmChallengeSetup}
            onCancel={() => setChallengeSetup(null)}
          />
        )}

        {showLoginModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }}>
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
                    <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginTop: '-0.5rem' }}>
                      {t("沒收到信？請看看垃圾郵件匣。", "No email? Check your spam folder.")}
                    </div>
                    <input
                      key="modalCodeInput"
                      id="modalCodeInput"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder={t("6位數驗證碼", "6-digit Code")}
                      maxLength={6}
                      style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '1.2rem', outline: 'none', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </>
                ) : (
                  <>
                    <OAuthButtons
                      onGoogleCredential={(accessToken) => handleOAuthSignIn('google', { accessToken })}
                      onAppleCredential={(idToken, extra) => handleOAuthSignIn('apple', { idToken, ...(extra || {}) })}
                      disabled={authLoading}
                      t={t}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                      <span>{t("或", "or")}</span>
                      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    </div>

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

              <button
                disabled={authLoading}
                onClick={async () => {
                  if (showLoginModal === 'verify') {
                    const codeInput = document.getElementById('modalCodeInput');
                    const code = codeInput ? codeInput.value.trim() : '';
                    if (!code) { setAuthError(t("請輸入驗證碼", "Please enter the verification code")); return; }

                    setAuthLoading(true);
                    setAuthError("");
                    try {
                      const res = await fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/verify-email", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: verifyEmail, code, personalCode: localStorage.getItem('verserain_personal_code') || undefined })
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        // The server signs the new account in right away — no
                        // second login with the same e-mail and password.
                        if (data.user) {
                          applyPasswordLogin(data, verifyEmail, { keepLocation: true });
                          setShowLoginModal(null);
                          toast.success(t("驗證成功，已經登入了！", "Verified — you're logged in!"));
                        } else {
                          toast.success(t("驗證成功！請重新登入。", "Verification successful! Please log in."));
                          setShowLoginModal('login');
                        }
                      } else {
                        setAuthError(data.error || t("驗證失敗", "Verification failed"));
                      }
                    } catch (err) {
                      setAuthError(t("連線失敗", "Connection failed"));
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
                    setAuthError(t("請輸入 Email 與密碼", "Please enter your email and password"));
                    return;
                  }

                  setAuthLoading(true);
                  setAuthError("");

                  try {
                    const endpoint = showLoginModal === 'signup' ? '/register' : '/login';
                    const inviter = localStorage.getItem('verserain_inviter') || undefined;
                    // Send this device's local code so the server can bind it as
                    // the account's canonical code on first login/registration.
                    const localCode = localStorage.getItem('verserain_personal_code') || undefined;
                    const payload = { email, password, nickname: nameStr, inviter, personalCode: localCode };

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
                        toast.success(t(
                          "註冊成功！請至您的信箱查看驗證碼。",
                          "Registration successful! Please check your email for the verification code."
                        ));
                      } else {
                        applyPasswordLogin(data, email);
                        setShowLoginModal(null);
                      }
                    } else {
                      if (data.requiresVerification) {
                        setVerifyEmail(email);
                        setShowLoginModal('verify');
                        toast.error(t("請先驗證您的電子郵件", "Please verify your email first"));
                      }
                      setAuthError(data.error || t("連線失敗", "Connection failed"));
                    }
                  } catch (err) {
                    setAuthError(t("無法連線到伺服器", "Can't reach the server"));
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
                        if (!email) return toast.error(t("請先在上方的信箱欄位輸入您的信箱！", "Please enter your email first!"));

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
                            // The server sends a single-use reset LINK now — it
                            // cannot send the password back, because it only
                            // stores a hash of it.
                            setAuthError("");
                            alertDialog({ message: t(
                              "重設密碼的連結已寄到您的信箱，30 分鐘內有效。",
                              "A password reset link has been sent to your email. It is valid for 30 minutes."
                            ) });
                          } else {
                            setAuthError(data.error || t("查詢失敗", "Failed to retrieve password"));
                          }
                        } catch (err) {
                          setAuthError(t("無法連線到伺服器", "Server unreachable"));
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

        {/* Daily Push opt-in Modal */}
        {/* Bind Inviter Modal — manually attach a referrer when the QR auto-bind failed */}
        {showBindInviterModal && (
          <BindInviterModal
            t={t}
            personalCode={personalCode}
            userEmail={userEmail}
            setMyInviterCode={setMyInviterCode}
            onClose={() => setShowBindInviterModal(false)}
          />
        )}
        {deepLinkStartGate && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300, padding: '1rem' }}>
            <button
              onClick={beginDeepLinkStart}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center', color: '#e2e8f0', padding: '2rem' }}
            >
              <div style={{ width: '96px', height: '96px', margin: '0 auto 1.2rem', borderRadius: '50%', background: 'linear-gradient(135deg, #34d399, #10b981)', display: 'grid', placeItems: 'center', boxShadow: '0 12px 40px rgba(16,185,129,0.45)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {t('點一下開始', 'Tap to Start')}
              </div>
              <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
                {t('經文會朗讀出聲 🔊', 'The verse will be read aloud 🔊')}
              </div>
            </button>
          </div>
        )}
        {playOrderChooser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setPlayOrderChooser(null); }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '1.6rem 1.5rem', width: '100%', maxWidth: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 0.3rem', color: '#1e293b' }}>{t('播放方式', 'Play Mode')}</h3>
              <p style={{ margin: '0 0 1.2rem', color: '#64748b', fontSize: '0.9rem' }}>
                {playOrderChooser.title} · {selectedPlayDuration.minutes
                  ? t('{n} 分鐘後停止', 'Stops after {n} min').replace('{n}', selectedPlayDuration.minutes)
                  : t('無限循環播放', 'Loops forever')}
              </p>
              <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                  ⏱️ {t('播放時間', 'Duration')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.45rem' }}>
                  {PLAY_DURATION_OPTIONS.map(option => {
                    const active = option.value === selectedPlayDuration.value;
                    const labelText = option.minutes
                      ? t('{n}分', '{n}m').replace('{n}', option.minutes)
                      : t('無限', '∞');
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPlayDurationChoice(option.value)}
                        style={{
                          padding: '0.52rem 0.35rem',
                          borderRadius: '999px',
                          border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: active ? '#eff6ff' : '#fff',
                          color: active ? '#1d4ed8' : '#475569',
                          fontWeight: active ? 800 : 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {labelText}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Aa {t('字體大小', 'Font size')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.45rem' }}>
                  {PLAY_FONT_OPTIONS.map(option => {
                    const active = option.value === selectedPlayFont.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPlayFontChoice(option.value)}
                        style={{
                          padding: '0.52rem 0.35rem',
                          borderRadius: '999px',
                          border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: active ? '#eff6ff' : '#fff',
                          color: active ? '#1d4ed8' : '#475569',
                          fontWeight: active ? 800 : 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {t(option.label, option.enLabel)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                  🎨 {t('字體顏色', 'Font color')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.45rem' }}>
                  {PLAY_INK_OPTIONS.map(option => {
                    const active = option.value === selectedPlayInk.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPlayInkChoice(option.value)}
                        style={{
                          padding: '0.52rem 0.35rem',
                          borderRadius: '999px',
                          border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: active ? '#eff6ff' : '#fff',
                          color: active ? '#1d4ed8' : '#475569',
                          fontWeight: active ? 800 : 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: '50%', background: option.swatch, border: '1px solid #94a3b8', flex: '0 0 auto' }} />
                        {t(option.label, option.enLabel)}
                      </button>
                    );
                  })}
                </div>
              </div>
              {voiceOptions && (voiceOptions.ownerHasVoice || voiceOptions.contributors.length > 0) && (() => {
                const pill = (active) => ({
                  padding: '0.5rem 0.75rem', borderRadius: '999px', border: active ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
                  background: active ? '#f5f3ff' : '#fff', color: active ? '#6d28d9' : '#475569', fontWeight: active ? 700 : 500,
                  fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                });
                const isSel = (pred) => voiceChoice ? pred(voiceChoice) : false;
                return (
                  <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                      🔊 {t('聲音來源', 'Voice')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {/* Auto = current default (your own › author › TTS). */}
                      <button onClick={() => setVoiceChoice(null)} style={pill(!voiceChoice)}>
                        ✨ {t('自動', 'Auto')}
                      </button>
                      <button onClick={() => setVoiceChoice({ type: 'tts' })} style={pill(isSel(v => v.type === 'tts'))}>
                        💻 {t('電腦語音', 'Computer voice')}
                      </button>
                      {voiceOptions.ownerHasVoice && (
                        <button onClick={() => setVoiceChoice({ type: 'owner' })} style={pill(isSel(v => v.type === 'owner'))}>
                          🎙️ {voiceOptions.ownerName ? t('作者:{n}', 'Author: {n}').replace('{n}', voiceOptions.ownerName) : t('作者錄音', 'Author')}
                        </button>
                      )}
                      {voiceOptions.contributors.map((c) => {
                        const mine = voiceOptions.mineId && c.ownerId === voiceOptions.mineId;
                        const active = isSel(v => v.type === 'personal' && v.ownerId === c.ownerId);
                        return (
                          <button key={c.ownerId} onClick={() => setVoiceChoice({ type: 'personal', ownerId: c.ownerId, label: c.recordedBy })} style={pill(active)}>
                            🎙️ {c.recordedBy || t('某人', 'Someone')}{mine ? ` ${t('(你)', '(you)')}` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  onClick={() => startContinuousPlay(playOrderChooser, 'random')}
                  style={{ flex: 1, padding: '0.9rem 0.5rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                >
                  🔀 {t('隨機', 'Shuffle')}
                </button>
                <button
                  onClick={() => startContinuousPlay(playOrderChooser, 'sequential')}
                  style={{ flex: 1, padding: '0.9rem 0.5rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                >
                  🔁 {t('按序', 'In Order')}
                </button>
              </div>
              <button onClick={() => setPlayOrderChooser(null)} style={{ marginTop: '0.9rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
                {t('取消', 'Cancel')}
              </button>
            </div>
          </div>
        )}
        {translateModal && (() => {
          const tm = translateModal;
          const langLabel = (BIBLE_LANGUAGE_OPTIONS.find(o => o.value === tm.target) || {}).label || tm.target;
          const closeModal = () => setTranslateModal(null);
          const switchAndClose = () => { const target = tm.target; setTranslateModal(null); handleVersionChange(target); };
          return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1500, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget && tm.phase !== 'working') closeModal(); }}>
            <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}><Languages size={20} /> {t('翻譯經文組', 'Translate verse set')}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tm.set?.title}</div>
                </div>
                {(tm.phase !== 'working') && (
                  <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, flexShrink: 0 }}><XCircle size={22} /></button>
                )}
              </div>

              {tm.phase === 'pick' && (
                <div style={{ padding: '1.1rem 1.3rem 1.3rem' }}>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('翻譯成哪一種語言？', 'Translate into which language?')}</label>
                  <select
                    value={tm.target}
                    onChange={(e) => setTranslateModal(m => (m ? { ...m, target: e.target.value } : m))}
                    style={{ width: '100%', padding: '0.6rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', fontSize: '1rem', cursor: 'pointer' }}
                  >
                    <option value="" disabled>{t('請選擇語言…', 'Choose a language…')}</option>
                    {BIBLE_LANGUAGE_OPTIONS.filter(o => o.value !== version).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div style={{ marginTop: '0.8rem', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6, background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 8, padding: '0.6rem 0.7rem' }}>
                    {t('會自動翻譯標題、把每節出處換成該語言的書名、並抓取該語言官方譯本的經文。簡介會留空，請加入後自行以該語言填寫。', "The title is auto-translated, each reference is remapped to that language's book names, and the official verse text in that language is fetched. The description is left blank — write your own in that language after adding.")}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.1rem' }}>
                    <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 600 }}>{t('取消', 'Cancel')}</button>
                    <button onClick={runSetTranslation} disabled={!tm.target} style={{ background: tm.target ? '#0ea5e9' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', cursor: tm.target ? 'pointer' : 'not-allowed', fontWeight: 800 }}>{t('開始翻譯', 'Translate')}</button>
                  </div>
                </div>
              )}

              {tm.phase === 'working' && (
                <div style={{ padding: '1.6rem 1.3rem 1.8rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🌧️</div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{t('翻譯中…', 'Translating…')}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
                    {langLabel} · {(tm.progress?.done || 0)}/{(tm.progress?.total || 0)}
                  </div>
                  <div style={{ marginTop: '0.9rem', height: 8, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${tm.progress?.total ? Math.round((tm.progress.done / tm.progress.total) * 100) : 0}%`, background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}

              {tm.phase === 'exists' && (
                <div style={{ padding: '1.3rem' }}>
                  <div style={{ color: '#334155', lineHeight: 1.6 }}>
                    {t('這個經文組已經有「{lang}」版本了。', 'A {lang} version of this set already exists.').replace('{lang}', langLabel)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.2rem' }}>
                    <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 600 }}>{t('取消', 'Cancel')}</button>
                    <button onClick={switchAndClose} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', cursor: 'pointer', fontWeight: 800 }}>{t('切換到該語言查看', 'Switch to that language')}</button>
                  </div>
                </div>
              )}

              {tm.phase === 'preview' && (
                <>
                  <div style={{ padding: '1rem 1.3rem 0.4rem', overflowY: 'auto' }}>
                    <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontSize: '0.9rem' }}>{t('標題（可修改）', 'Title (editable)')}</label>
                    <input
                      value={tm.title || ''}
                      onChange={(e) => setTranslateModal(m => (m ? { ...m, title: e.target.value } : m))}
                      style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                    <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(tm.verses || []).map((v, i) => (
                        <div key={i} style={{ border: '1px solid #eef2f7', borderRadius: 8, padding: '0.5rem 0.65rem', background: v.failed ? '#fef2f2' : '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{v.reference || t('（無法解析出處）', '(unparsed reference)')}</div>
                            {v.failed && (
                              <button onClick={() => retryTranslateVerse(i)} disabled={v.retrying} style={{ flexShrink: 0, background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 700, cursor: v.retrying ? 'default' : 'pointer' }}>{v.retrying ? t('重試中…', 'Retrying…') : `⚠ ${t('重試', 'Retry')}`}</button>
                            )}
                          </div>
                          <div style={{ color: v.failed ? '#b91c1c' : '#475569', fontSize: '0.85rem', marginTop: 3, lineHeight: 1.5 }}>
                            {v.text ? v.text : t('找不到這節經文，可重試或先加入之後再用「編輯」補上。', 'Verse text not found — retry, or add now and fill it in later via Edit.')}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '0.7rem', fontSize: '0.8rem', color: '#94a3b8' }}>{t('※ 簡介會留空，請加入後自行填寫。', '※ The description is left blank — write your own after adding.')}</div>
                  </div>
                  <div style={{ padding: '0.9rem 1.3rem', borderTop: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      {(() => { const ok = (tm.verses || []).filter(v => v.text).length; const total = (tm.verses || []).length; return `${ok}/${total} ${t('節有內文', 'verses ready')}`; })()}
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 600 }}>{t('取消', 'Cancel')}</button>
                      <button onClick={publishTranslatedSet} disabled={!(tm.title || '').trim()} style={{ background: (tm.title || '').trim() ? '#10b981' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', cursor: (tm.title || '').trim() ? 'pointer' : 'not-allowed', fontWeight: 800 }}>{t('加入並編輯', 'Add & edit')}</button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
          );
        })()}
        {showPushPrompt && !deepLinkStartGate && !showOnboarding && gameState === 'menu' && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) snoozePushPrompt(); }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '1.8rem 1.6rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', textAlign: 'center' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '0.6rem' }}>🌧️</div>
              <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                {t('每天早上 7 點，一節經文開啟你的一天', 'Start each day with a verse at 7am')}
              </h2>
              <p style={{ margin: '0 0 1.4rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.55 }}>
                {t('開啟推播後，每天早上會收到當日經文，點一下就能聆聽。', 'Turn on push and each morning the day\'s verse arrives — tap to listen.')}
              </p>
              <button
                onClick={async () => {
                  const ok = await subscribeMorningPush();
                  setShowPushPrompt(false);
                  if (ok) {
                    toast.success(t('已開啟每日經文推播 🌧️', 'Daily Verse Push is on 🌧️'));
                  } else {
                    // Denied or needs guidance — the full modal explains what to do.
                    setShowPushModal(true);
                  }
                }}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #34d399, #10b981)', color: '#fff', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '0.6rem' }}
              >
                {t('開啟每日經文推播', 'Turn On Daily Verse Push')}
              </button>
              <button
                onClick={snoozePushPrompt}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontSize: '0.95rem', cursor: 'pointer', marginBottom: '0.4rem' }}
              >
                {t('之後再提醒我', 'Remind Me Later')}
              </button>
              <button
                onClick={dismissPushPromptForever}
                style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                {t('不用了，別再詢問', 'No Thanks, Don\'t Ask Again')}
              </button>
            </div>
          </div>
        )}
        {showPushModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowPushModal(false); }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '1.8rem 1.6rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>
                  🌧️ {t('每日經文推播', 'Daily Verse Push')}
                </h2>
                <button onClick={() => setShowPushModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><XCircle size={22} /></button>
              </div>
              {pushStatus === 'unsupported' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '8px', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  {t('此瀏覽器不支援推播。請用桌面 Chrome / Edge / Firefox 或 Android Chrome 來啟用。', 'This browser does not support push. Please use desktop Chrome / Edge / Firefox or Android Chrome.')}
                </div>
              )}
              {pushStatus === 'needs-pwa' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '1rem', borderRadius: '8px', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  <p style={{ margin: '0 0 0.6rem 0', fontWeight: 'bold' }}>
                    {t('iOS 需要先把 VerseRain 加到主畫面', 'On iOS, add VerseRain to your Home Screen first')}
                  </p>
                  <ol style={{ margin: '0 0 0.3rem 1rem', padding: 0 }}>
                    <li>{t('用 Safari 打開 verserain.com（不要用 App）', 'Open verserain.com in Safari (not the App)')}</li>
                    <li>{t('點下方分享圖示 → 加入主畫面', 'Tap Share → Add to Home Screen')}</li>
                    <li>{t('從主畫面點 VerseRain icon 打開', 'Open VerseRain from the Home Screen icon')}</li>
                    <li>{t('再回到這頁開啟推播', 'Come back here and turn on push')}</li>
                  </ol>
                </div>
              )}
              {pushStatus === 'denied' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '8px', fontSize: '0.92rem', lineHeight: 1.5 }}>
                  {hasNativeDailyPush()
                    ? t('通知權限已關閉。請到 iPhone 設定 → VerseRain → 通知 → 允許通知，再回來重試。', 'Notifications are off. Please enable them in iPhone Settings → VerseRain → Notifications, then retry.')
                    : t('瀏覽器已封鎖通知。請到網站設定 → 通知 → 允許，再回來重試。', 'Notifications are blocked. Please allow notifications in your browser site settings, then retry.')}
                </div>
              )}
              {(pushStatus === 'idle' || pushStatus === 'subscribed') && (
                <>
                  <p style={{ margin: '0 0 1.2rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.55 }}>
                    {t('開啟後，每天上午 7 點（你的時區）會收到當日 dailyverses.net 經文推播，點通知一鍵進入「聆聽」。', 'Once enabled, each morning at 7am (your timezone) you\'ll get a push of the day\'s verse from dailyverses.net. Tap to start listening.')}
                  </p>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 0.9rem', fontSize: '0.85rem', color: '#475569', marginBottom: '1.2rem' }}>
                    <strong>{t('時區', 'Timezone')}:</strong> {typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '—'}
                    <br />
                    <strong>{t('語言', 'Language')}:</strong> {BIBLE_LANGUAGE_OPTIONS.find(o => o.value === version)?.label || version}
                  </div>
                  {pushStatus === 'subscribed' ? (
                    <button
                      onClick={async () => { await unsubscribeMorningPush(); }}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {t('關閉推播', 'Disable Push')}
                    </button>
                  ) : (
                    <button
                      onClick={async () => { const ok = await subscribeMorningPush(); if (ok) setShowPushModal(false); }}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #34d399, #10b981)', color: '#fff', border: 'none', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <Volume2 size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                      {t('開啟每日推播', 'Enable Daily Push')}
                    </button>
                  )}
                </>
              )}
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
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Library size={22} /> {qrShareModal.reference}</span>
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
                      toast.success(t("分享連結已複製到剪貼簿！", "Share link copied!"));
                    } catch (err) {
                      alertDialog({ title: t('分享連結', 'Share link'), message: qrShareModal.url });
                    }
                  }}
                  style={{ flex: 1, padding: '0.75rem', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.25)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Share2 size={15} /> {t("複製連結", "Copy Link")}</span>
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
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) { setVerseViewModal(null); stopVerseModalAudio(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #e2e8f0', maxHeight: '85vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.6rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#3b82f6' }}>{verseViewModal.reference}</span>
                  <button
                    onClick={async () => {
                      updateGarden('activity_only', 'listen');
                      const vLang = isEnglishBibleVersion(version) ? 'en-US' : (version === 'ko' ? 'ko-KR' : (version === 'ja' ? 'ja-JP' : (version === 'he' ? 'he-IL' : (version === 'fa' ? 'fa-IR' : 'zh-TW'))));
                      const opts = await gatherVerseVoiceOptions(verseViewModal.setId, verseViewModal.reference);
                      // >1 recording → let the listener choose whose voice to hear.
                      if (opts.length > 1) {
                        setVerseVoicePicker({ setId: verseViewModal.setId, reference: verseViewModal.reference, text: verseViewModal.text, vLang, options: opts });
                        return;
                      }
                      // Exactly one recording → play it; none → TTS.
                      if (opts.length === 1) {
                        const ok = await playVerseVoiceOption(verseViewModal.setId, opts[0]);
                        if (ok) return;
                      }
                      speakText(verseViewModal.text, 1.0, vLang);
                    }}
                    title={t("朗讀經文", "Read aloud")}
                    style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Headphones size={20} />
                  </button>
                  {/* 留言 / 鼓勵 — shown when this verse has any recording. Picks
                      the recording directly when there's one, else lets the
                      viewer choose which recording to comment on. */}
                  {verseViewModal.setId && currentSetVoiceRefs.has(verseViewModal.reference) && (
                    <button
                      onClick={async () => {
                        const opts = await gatherVerseVoiceOptions(verseViewModal.setId, verseViewModal.reference);
                        const withOwner = opts.filter(o => o.ownerId);
                        if (withOwner.length === 0) { toast.info(t('這節還沒有錄音可留言', 'No recording to comment on yet')); return; }
                        if (withOwner.length === 1) {
                          openVoiceComments(verseViewModal.setId, verseViewModal.reference, withOwner[0]);
                        } else {
                          const vLang = isEnglishBibleVersion(version) ? 'en-US' : (version === 'ko' ? 'ko-KR' : (version === 'ja' ? 'ja-JP' : (version === 'he' ? 'he-IL' : (version === 'fa' ? 'fa-IR' : 'zh-TW'))));
                          setVerseVoicePicker({ setId: verseViewModal.setId, reference: verseViewModal.reference, text: verseViewModal.text, vLang, options: opts });
                        }
                      }}
                      title={t('留言 / 鼓勵', 'Comment / encourage')}
                      style={{ background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >💬</button>
                  )}
                </h2>
                <button
                  onClick={() => {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    stopVerseModalAudio();
                    setVerseViewModal(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  <XCircle size={26} />
                </button>
              </div>

              {/* flex:1 + minHeight:0 — without them a flex child never shrinks
                  below its content, so long passages overflowed past 85vh with
                  no scrollbar and the tail of the verse was unreachable. */}
              <div style={{ color: '#475569', fontSize: '1.2rem', lineHeight: '1.8', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingRight: '1rem', fontWeight: '500', fontFamily: 'var(--app-font-family)', wordBreak: 'break-word' }}>
                {verseViewModal.text}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', gap: '1rem' }}>
                <button
                  onClick={() => {
                    setVerseViewModal(null);
                    stopVerseModalAudio();
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
                  <Play size={16} fill="white" /> {t("立刻挑戰", "Challenge now")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 單節錄音選擇 — 同一節有多個錄音時,選擇要聽誰的聲音 */}
        {verseVoicePicker && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setVerseVoicePicker(null); }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem 1.4rem', width: '100%', maxWidth: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <h3 style={{ margin: '0 0 0.3rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Headphones size={20} color="#10b981" /> {t('選擇聲音', 'Choose a voice')}
              </h3>
              <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>{verseVoicePicker.reference}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {verseVoicePicker.options.map((opt, i) => {
                  const cnt = opt.ownerId ? voiceCommentCounts[`${verseVoicePicker.reference}||${opt.ownerId}`] : null;
                  return (
                  <div key={opt.voiceId || i} style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
                    <button
                      onClick={async () => {
                        const pk = verseVoicePicker;
                        setVerseVoicePicker(null);
                        const ok = await playVerseVoiceOption(pk.setId, opt);
                        if (!ok) speakText(pk.text, 1.0, pk.vLang);
                      }}
                      style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <span aria-hidden="true">🎙️</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.kind === 'owner'
                          ? (opt.recordedBy ? t('作者:{n}', 'Author: {n}').replace('{n}', opt.recordedBy) : t('作者錄音', 'Author'))
                          : `${opt.recordedBy || t('某人', 'Someone')}${opt.mine ? ` ${t('(你)', '(you)')}` : ''}`}
                        {cnt && (cnt.comments > 0 || cnt.likes > 0) && (
                          <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                            {cnt.likes > 0 ? `❤️${cnt.likes} ` : ''}{cnt.comments > 0 ? `💬${cnt.comments}` : ''}
                          </span>
                        )}
                      </span>
                      <Play size={15} color="#8b5cf6" fill="#8b5cf6" />
                    </button>
                    {opt.ownerId && (
                      <button
                        title={t('留言 / 鼓勵', 'Comments')}
                        onClick={() => openVoiceComments(verseVoicePicker.setId, verseVoicePicker.reference, opt)}
                        style={{ flexShrink: 0, width: 44, borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}
                      >💬</button>
                    )}
                  </div>
                  );
                })}
                {/* 電腦語音 fallback — always offered as the last option. */}
                <button
                  onClick={() => {
                    const pk = verseVoicePicker;
                    setVerseVoicePicker(null);
                    stopVerseModalAudio();
                    speakText(pk.text, 1.0, pk.vLang);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px dashed #cbd5e1', background: '#fff', color: '#64748b', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span aria-hidden="true">💻</span>
                  <span style={{ flex: 1 }}>{t('電腦語音', 'Computer voice')}</span>
                  <Play size={15} color="#94a3b8" fill="#94a3b8" />
                </button>
              </div>
              <button onClick={() => setVerseVoicePicker(null)} style={{ marginTop: '1rem', width: '100%', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
                {t('取消', 'Cancel')}
              </button>
            </div>
          </div>
        )}

        {/* 錄音留言面板 — comments + likes on ONE recording */}
        {voiceCommentPanel && (() => {
          const meLc = (userEmail || '').toLowerCase();
          const isAdminEmail = ['samhsiung@gmail.com', 'davidhwang1125@gmail.com', 'hsiungsam@gmail.com', 'hungry4grace@gmail.com', 'verserain.admin@gmail.com'].includes(meLc);
          const canModerate = isAdminEmail || voiceCommentPanel.mine || (currentSet?.ownerEmail && String(currentSet.ownerEmail).toLowerCase() === meLc && currentSet.id === voiceCommentPanel.setId);
          const recRx = voiceCommentData?.recordingReactions || [];
          const myLiked = recRx.some(r => r.from === meLc && r.emoji === '❤️');
          const commentEmojis = ['❤️', '🙏'];
          return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2700, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setVoiceCommentPanel(null); }}>
            <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '440px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              {/* Header */}
              <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #eef2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>💬 {t('留言 / 鼓勵', 'Comments')}</div>
                    <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {voiceCommentPanel.reference} · 🎙️ {voiceCommentPanel.recordedBy || t('某人', 'Someone')}{voiceCommentPanel.mine ? ` ${t('(你)', '(you)')}` : ''}
                    </div>
                  </div>
                  <button onClick={() => setVoiceCommentPanel(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, flexShrink: 0 }}><XCircle size={22} /></button>
                </div>
                {/* Recording-level like */}
                <button
                  onClick={() => { if (!userEmail) { setShowLoginModal('login'); return; } likeRecording('❤️'); }}
                  title={t('為這個錄音按讚', 'Like this recording')}
                  style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem', borderRadius: 999, border: myLiked ? '1px solid #fecaca' : '1px solid #e2e8f0', background: myLiked ? '#fef2f2' : '#f8fafc', color: myLiked ? '#dc2626' : '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  ❤️ {t('讚', 'Like')}{recRx.filter(r => r.emoji === '❤️').length > 0 ? ` · ${recRx.filter(r => r.emoji === '❤️').length}` : ''}
                </button>
              </div>
              {/* Comment list */}
              <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0.9rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {voiceCommentData === null && <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>{t('載入中…', 'Loading…')}</div>}
                {voiceCommentData && voiceCommentData.comments.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>{t('還沒有留言。留下第一句鼓勵吧！', 'No comments yet — leave the first word of encouragement!')}</div>
                )}
                {voiceCommentData && voiceCommentData.comments.map((c) => {
                  const canDelete = c.author === meLc || canModerate;
                  return (
                    <div key={c.cid} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>{c.authorName || t('某人', 'Someone')}</span>
                        <span style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>{new Date(c.at).toLocaleDateString()}</span>
                        {canDelete && (
                          <button onClick={() => deleteVoiceComment(c.cid)} title={t('刪除', 'Delete')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}>✕</button>
                        )}
                      </div>
                      {c.type === 'voice' ? (
                        <button onClick={() => playCommentAudio(voiceCommentPanel.setId, c.voiceId, c.voiceMime)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                          ▶ {t('語音留言', 'Voice comment')}{c.voiceDur ? ` · ${Math.round(c.voiceDur)}s` : ''}
                        </button>
                      ) : (
                        <div style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.text}</div>
                      )}
                      {/* Per-comment reactions */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        {commentEmojis.map((em) => {
                          const n = (c.reactions || []).filter(r => r.emoji === em).length;
                          const mine = (c.reactions || []).some(r => r.from === meLc && r.emoji === em);
                          return (
                            <button key={em} onClick={() => { if (!userEmail) { setShowLoginModal('login'); return; } reactVoiceComment(c.cid, em); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.15rem 0.5rem', borderRadius: 999, border: mine ? '1px solid #c7d2fe' : '1px solid #e2e8f0', background: mine ? '#eef2ff' : '#fff', color: '#475569', fontSize: '0.78rem', cursor: 'pointer' }}>
                              {em}{n > 0 ? ` ${n}` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Composer */}
              <div style={{ borderTop: '1px solid #eef2f7', padding: '0.8rem 1.3rem 1rem' }}>
                {userEmail ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <textarea
                      value={voiceCommentText}
                      onChange={(e) => setVoiceCommentText(e.target.value.slice(0, 1000))}
                      placeholder={t('留一句鼓勵…', 'Leave an encouragement…')}
                      rows={1}
                      style={{ flex: 1, resize: 'none', minHeight: 40, maxHeight: 120, padding: '0.55rem 0.7rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.92rem', fontFamily: 'inherit', color: '#334155' }}
                    />
                    <button onClick={() => setCommentRecTarget(voiceCommentPanel)} title={t('錄語音留言', 'Record a voice comment')} style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#dc2626', cursor: 'pointer', fontSize: '1.2rem' }}>🎙️</button>
                    <button onClick={submitTextComment} disabled={voiceCommentBusy || !voiceCommentText.trim()} style={{ flexShrink: 0, height: 42, padding: '0 1rem', borderRadius: 10, border: 'none', background: voiceCommentText.trim() ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#e2e8f0', color: '#fff', fontWeight: 700, cursor: voiceCommentText.trim() ? 'pointer' : 'default' }}>{t('送出', 'Send')}</button>
                  </div>
                ) : (
                  <button onClick={() => setShowLoginModal('login')} style={{ width: '100%', padding: '0.7rem', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                    {t('登入後即可留言 / 鼓勵', 'Sign in to comment')}
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })()}

        {/* 語音留言錄音器 — records an audio comment on a recording */}
        {commentRecTarget && (
          <VerseVoiceRecorder
            t={t}
            reference={commentRecTarget.reference}
            verseText={t('留一段話,鼓勵 {n} 🎙️', 'Leave a spoken word of encouragement for {n} 🎙️').replace('{n}', commentRecTarget.recordedBy || t('這位錄音者', 'this reader'))}
            onUpload={({ blob, mime, dur }) => {
              const target = commentRecTarget;
              setCommentRecTarget(null);
              (async () => {
                try {
                  await uploadVoiceComment({ email: userEmail, name: recordedByNameApp(), setId: target.setId, reference: target.reference, targetOwnerId: target.targetOwnerId, blob, mime, dur });
                  await refreshVoiceComments(target);
                } catch (e) { console.error('voice comment failed', e); }
              })();
            }}
            onCancel={() => setCommentRecTarget(null)}
            onDone={() => setCommentRecTarget(null)}
            zIndex={2720}
          />
        )}

        {/* 鼓勵收件匣 — encouragement I've received on my recordings */}
        {showEncouragePanel && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1360, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowEncouragePanel(false); }}>
            <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>🔔 {t('收到的鼓勵', 'Encouragement received')}</div>
                <button onClick={() => setShowEncouragePanel(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}><XCircle size={22} /></button>
              </div>
              <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0.6rem 0' }}>
                {isSuperAdmin && adminPending && (adminPending.pools > 0 || adminPending.places > 0 || adminPending.contests > 0) && (
                  <div data-testid="admin-pending-banner" style={{ margin: '0 0.9rem 0.5rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '0.6rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#9f1239', fontWeight: 700, fontSize: '0.88rem' }}>{t('待審核：{a} 個愛心行動、{b} 個地圖標記、{c} 個讀經比賽', 'Awaiting review: {a} Love in Action projects, {b} map markers, {c} reading contests').replace('{a}', String(adminPending.pools)).replace('{b}', String(adminPending.places)).replace('{c}', String(adminPending.contests || 0))}</span>
                    <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ background: '#be123c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.3rem 0.8rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('去審核', 'Review it')} →</button>
                  </div>
                )}
                {combinedInbox.all.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 1rem' }}>{t('還沒有任何通知。邀請朋友、錄下你的聲音分享給大家吧！', 'No notifications yet — invite friends and share your voice!')}</div>
                )}
                {combinedInbox.all.map((it, i) => {
                  // Referral milestone (I'm the inviter) — the invited friend hit a garden milestone.
                  if (it.kind === 'milestone') {
                    const name = it.refereeName || t('你邀請的朋友', 'the friend you invited');
                    const icon = it.milestone >= 100 ? '🏞️' : (it.milestone >= 10 ? '🌳' : '🌱');
                    const msg = it.milestone >= 100
                      ? t('{n} 種滿了一整塊 10×10 田地（100 個經文）！', '{n} filled a whole 10×10 field (100 verses)!').replace('{n}', name)
                      : it.milestone >= 10
                        ? t('{n} 已種下 10 棵樹（完成 10 個經文）！', '{n} planted 10 trees (10 verses)!').replace('{n}', name)
                        : t('{n} 種下了第一棵樹（完成第一個經文）！', '{n} planted their first tree (first verse)!').replace('{n}', name);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>{msg}</div>
                          <div style={{ marginTop: 6 }}>
                            {it.cheered ? (
                              <span style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>{t('已鼓勵 👍', 'Cheered 👍')}</span>
                            ) : it.refereeCode ? (
                              <button onClick={() => sendReferralCheer(it)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('給他一個讚 👍', 'Send a cheer 👍')}</button>
                            ) : null}
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // Nudge received (I'm the invited friend) — my inviter asks me to start.
                  if (it.kind === 'nudge') {
                    return (
                      <div key={i} data-testid="inbox-nudge" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🌧️</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            <b>{it.fromName || t('邀請你的人', 'the one who invited you')}</b>{' '}
                            {t('邀你來玩一節經文，種下第一棵樹！', 'invites you to play a verse and plant your first tree!')}
                          </div>
                          <button type="button" onClick={() => { setShowEncouragePanel(false); changeDailyVerseDate(formatLocalDate(new Date())); setDailySharedVoiceOwner(null); setContinuousRainSet(null); setMainTab('daily_verse'); }} style={{ marginTop: 6, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                            ▶ {t('開始', 'Start')}
                          </button>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // Cheer received (I'm the invited friend) — my inviter cheered me.
                  if (it.kind === 'cheer') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>👍</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            <b>{it.fromName || t('邀請你的人', 'the one who invited you')}</b>{' '}
                            {t('給你一個讚，鼓勵你繼續加油！', 'sent you a cheer — keep going!')}
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // Reward earned (me) — confirm an email so the admin can send it.
                  if (it.kind === 'reward') {
                    const claimed = isRewardClaimed(it.rewardId);
                    const f = claimFormFor(it.rewardId);
                    const chip = (on) => ({ padding: '0.25rem 0.7rem', borderRadius: 999, border: `1px solid ${on ? '#f59e0b' : '#cbd5e1'}`, background: on ? '#fef3c7' : '#fff', color: '#334155', fontSize: '0.8rem', fontWeight: on ? 700 : 500, cursor: 'pointer' });
                    const field = { width: '100%', boxSizing: 'border-box', padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' };
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: claimed ? 'transparent' : '#fffbeb' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎁</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            <b>{t('恭喜！你{what}，獲得一份獎勵！', 'Congrats! You {what} — you earned a reward!').replace('{what}', rewardLabel(it.rewardKind, it.milestone))}</b>
                          </div>
                          {claimed ? (
                            <div style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 600, marginTop: 6 }}>{t('已登記，管理員會盡快把獎勵寄給你 ✓', 'Registered — the admin will send it soon ✓')}</div>
                          ) : !userEmail ? (
                            <div style={{ color: '#b45309', fontSize: '0.82rem', marginTop: 6 }}>{t('請先登入才能領取獎勵', 'Sign in to claim this reward')}</div>
                          ) : (
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('所在地區：', 'Region:')}</span>
                                {[['tw', t('台灣', 'Taiwan')], ['intl', t('海外', 'Overseas')]].map(([id, label]) => (
                                  <button key={id} type="button" onClick={() => setClaimField(it.rewardId, 'region', id)} style={chip(f.region === id)}>{label}</button>
                                ))}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('請確認要收獎勵的 Email：', 'Confirm the email to send it to:')}</div>
                              <input type="email" value={f.email} onChange={e => setClaimField(it.rewardId, 'email', e.target.value)} placeholder="you@example.com" style={field} />
                              <input type="text" value={f.lineId} onChange={e => setClaimField(it.rewardId, 'lineId', e.target.value)} placeholder={t('LINE ID（選填，方便傳禮券）', 'LINE ID (optional, for sending the voucher)')} maxLength={40} style={field} />
                              <input type="text" value={f.church} onChange={e => setClaimField(it.rewardId, 'church', e.target.value.toUpperCase())} placeholder={t('教會代碼（選填，會友可從教會專屬池領取）', 'Church code (optional, for your church’s own pool)')} maxLength={20} style={field} />
                              <select value={f.voucher} onChange={e => setClaimField(it.rewardId, 'voucher', e.target.value)} style={field}>
                                <option value="">{t('偏好的禮券（選填）', 'Preferred voucher (optional)')}</option>
                                {(VOUCHER_CATALOG[f.region] || []).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                              </select>
                              <button onClick={() => claimReward(it)} style={{ alignSelf: 'flex-start', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                                {t('領取 🎁', 'Claim 🎁')}
                              </button>
                            </div>
                          )}
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // A shop I introduced had a redemption → my 2.5% arrived.
                  if (it.kind === 'merchant_referral') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#fffbeb' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🏪</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            {t('{place}：{who} 使用 {points} 點，因此你也獲得 {bonus} 點 🎉', '{place}: {who} used {points} pts, so you also earned {bonus} pts 🎉').replace('{place}', String(it.placeName || '')).replace('{who}', String(it.playerName || '')).replace('{points}', Number(it.points || 0).toLocaleString()).replace('{bonus}', Number(it.bonus || 0).toLocaleString())}
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // 愛心行動: contributions and pool vouchers (organisation), new pools (admin).
                  if (['pool_contribution', 'pool_voucher_used', 'pool_approved', 'pool_rejected', 'pool_merchant_joined'].includes(it.kind)) {
                    const text = it.kind === 'pool_contribution'
                      ? t('{who} 投入 {points} 點到「{pool}」，折抵額度 +NT${n}', '{who} contributed {points} pts to “{pool}” — NT${n} added to the allowance').replace('{who}', String(it.who || '')).replace('{points}', Number(it.points || 0).toLocaleString()).replace('{pool}', String(it.poolName || '')).replace('{n}', String(it.ntd ?? ''))
                      : it.kind === 'pool_voucher_used'
                        ? t('「{pool}」在 {place} 的折扣券已核銷，折抵 NT${n}', 'The “{pool}” coupon at {place} was used — NT${n} off').replace('{pool}', String(it.poolName || '')).replace('{place}', String(it.placeName || '')).replace('{n}', String(it.ntd ?? ''))
                        : it.kind === 'pool_approved'
                          ? t('你的愛心行動「{name}」已通過審核，現在可以接受投入了 ❤️', 'Your Love in Action project “{name}” was approved and can now receive contributions ❤️').replace('{name}', String(it.name || ''))
                          : it.kind === 'pool_rejected'
                            ? t('你的愛心行動「{name}」未通過審核，請聯絡管理員了解原因', 'Your Love in Action project “{name}” was not approved; please contact an admin').replace('{name}', String(it.name || ''))
                            : t('{place} 加入了「{pool}」：單筆最高 NT${a}、每月最高 NT${b}', '{place} joined “{pool}”: up to NT${a} per order, NT${b} a month').replace('{place}', String(it.placeName || '')).replace('{pool}', String(it.poolName || '')).replace('{a}', String(it.perOrderMaxNTD ?? '')).replace('{b}', String(it.monthlyMaxNTD ?? ''));
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#fff7f8' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'pool_voucher_used' ? '🎟️' : it.kind === 'pool_merchant_joined' ? '🏪' : it.kind === 'pool_rejected' ? '⚠️' : '❤️'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>{text}</div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  if (it.kind === 'pool_submitted') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#fff7f8' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>❤️</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            {(it.cash
                              ? t('{who} 為愛心行動「{name}」送出現金捐款資訊（{org}），請確認勸募許可與帳戶戶名', '{who} submitted cash donation details for “{name}” ({org}) — check the permit and account name')
                              : t('{who} 為「{org}」建立了愛心行動「{name}」，等你審核', '{who} opened the Love in Action project “{name}” for “{org}” — awaiting your review')).replace('{who}', String(it.by || '')).replace('{org}', String(it.orgPlaceName || '')).replace('{name}', String(it.name || ''))}
                          </div>
                          {isSuperAdmin && (
                            <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ marginTop: 6, background: '#be123c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('去審核', 'Review it')} →</button>
                          )}
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // 讀經比賽: someone joined or completed (organisation), review outcome (organisation).
                  if (['contest_joined', 'contest_completed', 'contest_approved', 'contest_rejected'].includes(it.kind)) {
                    const text = it.kind === 'contest_joined'
                      ? t('{who} 加入了「{name}」讀經比賽', '{who} joined the reading contest “{name}”').replace('{who}', String(it.who || '')).replace('{name}', String(it.name || ''))
                      : it.kind === 'contest_completed'
                        ? t('🎉 {who} 完成了「{name}」讀經比賽，記得安排獎勵！', '🎉 {who} finished “{name}” — remember to arrange the reward!').replace('{who}', String(it.who || '')).replace('{name}', String(it.name || ''))
                        : it.kind === 'contest_approved'
                          ? t('你的讀經比賽「{name}」已通過審核，現在可以邀請大家參加了 📖', 'Your reading contest “{name}” was approved and can now take participants 📖').replace('{name}', String(it.name || ''))
                          : t('你的讀經比賽「{name}」未通過審核，請聯絡管理員了解原因', 'Your reading contest “{name}” was not approved; please contact an admin').replace('{name}', String(it.name || ''));
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#eff6ff' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'contest_completed' ? '🎉' : it.kind === 'contest_rejected' ? '⚠️' : '📖'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>{text}</div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  if (it.kind === 'contest_submitted') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#eff6ff' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📖</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            {t('{who} 為「{org}」建立了讀經比賽「{name}」，等你審核', '{who} opened the reading contest “{name}” for “{org}” — awaiting your review').replace('{who}', String(it.by || '')).replace('{org}', String(it.orgPlaceName || '')).replace('{name}', String(it.name || ''))}
                          </div>
                          {isSuperAdmin && (
                            <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ marginTop: 6, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('去審核', 'Review it')} →</button>
                          )}
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  if (it.kind === 'voucher_used' || it.kind === 'place_approved') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'voucher_used' ? '🎟️' : '🏪'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            {it.kind === 'voucher_used'
                              ? t('你在 {place} 的折扣券已核銷，折抵 NT${n} 🎉', 'Your coupon at {place} was used — NT${n} off 🎉').replace('{place}', String(it.placeName || '')).replace('{n}', String(it.ntd ?? ''))
                              : t('你的地圖標記「{name}」已通過審核，現在出現在「誰在玩」地圖上了 🗺️', 'Your map marker “{name}” was approved and is now on the map 🗺️').replace('{name}', String(it.name || ''))}
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // New map place submitted (I'm an admin) — go review it.
                  if (it.kind === 'place_submitted') {
                    const kindText = it.placeKind === 'church' ? t('教會', 'Church') : it.placeKind === 'org' ? t('機構', 'Organisation') : t('商家', 'Shop');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#f0fdfa' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🏪</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            {t('{who} 登記了「{name}」（{kind}），等你審核', '{who} registered “{name}” ({kind}) — awaiting your review').replace('{who}', String(it.by || '')).replace('{name}', String(it.name || '')).replace('{kind}', kindText)}
                          </div>
                          {isSuperAdmin && (
                            <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ marginTop: 6, background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>{t('去審核', 'Review')}</button>
                          )}
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // Reward sent (me) — the admin has sent it.
                  if (it.kind === 'reward_sent') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📬</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            {t('你{what}的獎勵已經寄出了！請查看 Email 或訊息 🎁', 'Your reward for having {what} is on its way — check your email or messages 🎁').replace('{what}', rewardLabel(it.rewardKind, it.milestone))}
                          </div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  // Voice encouragement (existing): a like/comment on my recording.
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'like' ? (it.emoji || '❤️') : '💬'}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                          <b>{it.fromName || t('某人', 'Someone')}</b>{' '}
                          {it.kind === 'like'
                            ? t('喜歡你在〈{ref}〉的錄音', 'liked your recording of {ref}').replace('{ref}', it.reference || '')
                            : t('在〈{ref}〉留言鼓勵你', 'commented on your recording of {ref}').replace('{ref}', it.reference || '')}
                        </div>
                        {it.preview && it.kind === 'comment' && <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.preview}</div>}
                        <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* Offline / Reconnecting Banner */}
        {!isOnline && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: '#dc2626', color: 'white', padding: '6px 16px', textAlign: 'center', zIndex: 10000, fontSize: '0.85rem', fontWeight: 600 }}>
            {t('網路已斷開，部分功能暫時無法使用', 'Offline — some features are unavailable')}
          </div>
        )}
        {isOnline && multiplayerRoomId && !wsConnected && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: '#f59e0b', color: '#1e293b', padding: '6px 16px', textAlign: 'center', zIndex: 10000, fontSize: '0.85rem', fontWeight: 600 }}>
            {t('重新連線中…', 'Reconnecting…')}
          </div>
        )}

        {showOnboarding && gameState === 'menu' && (
          <Onboarding
            t={t}
            versions={BIBLE_LANGUAGE_OPTIONS}
            version={version}
            onVersion={(v) => handleVersionChange(v)}
            elderMode={elderMode}
            onElderMode={setElderMode}
            verse={displayedDailyVerse}
            onListen={(v) => { if (v?.text) speakText(v.text, 1.0, getVoiceLangForVersion(version)); }}
            onChallenge={(v) => {
              if (!v) return;
              stopSpeechIfActive();
              finishOnboarding();
              // The easiest game, no mode / difficulty questions first.
              playModeRef.current = 'square_solo';
              distractionLevelRef.current = 0;
              challengeVerseFromReader(v, { mode: 'square_solo', difficulty: 0 });
            }}
            onFinish={() => { stopSpeechIfActive(); finishOnboarding(); }}
          />
        )}

        {/* Toasts and confirm dialogs (src/ui) */}
        <UiHost t={t} />

        {/* Fruit Info Modal */}
        {showFruitInfo && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowFruitInfo(false)}>
            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
                <h3 style={{ margin: 0, color: '#b45309', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Apple size={22} /> {t("果子數量怎麼算？", "How are fruits counted?")}
                </h3>
                <button onClick={() => setShowFruitInfo(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, color: '#475569', lineHeight: '1.7', fontSize: '0.97rem' }}>
                  {t("你的總果子數量由兩部分組成：", "Your total fruit count has two components:")}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#f0fdf4', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #bbf7d0' }}>
                    <TreePine size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '0.2rem' }}>
                        {t("遊戲果子", "Game Fruits")} — <span style={{ color: '#d97706' }}>{localFruits}</span>
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {t("每次挑戰一節已「過關」的經文並創下個人最高分，這棵樹就會結出一顆果子。果子數量就是你在「我的園子」裡所有樹上果子的總和。", "Each time you beat your personal best on a verse you've already cleared, that tree bears a fruit. This total counts all fruits across every tree in your garden.")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#eff6ff', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #bfdbfe' }}>
                    <Share2 size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.2rem' }}>
                        {t("推廣點數", "Referral Points")} — <span style={{ color: '#d97706' }}>{creatorPoints}</span>
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {t("當你分享的邀請連結帶來新玩家，或你創作了廣受歡迎的自訂經文組，系統會自動為你累積推廣點數。", "When your invite link brings in new players, or your custom verse sets are widely used, the system automatically adds referral points to your total.")}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '10px', padding: '0.9rem 1rem', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ color: '#92400e', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    <Apple size={18} /> {t("遊戲果子", "Game")} {localFruits} + {t("推廣點數", "Referral")} {creatorPoints}
                  </span>
                  <span style={{ color: '#b45309', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    = {totalFruits}
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
                  <Trophy size={24} /> {t("互惠階級說明", "Level System")}
                </h3>
                <button onClick={() => setShowLevelInfo(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
              </div>

              <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                <p style={{ color: '#475569', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  {t("在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！", "Bear fruits in your garden to level up!")}
                  {t("（建立專屬經文組不需要階級 —— 登入就可以。）", " Creating custom verse sets needs no level — just sign in.")}
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
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '12px', fontWeight: 'bold', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Users size={14} /> {levelCounts[levelObj.level] || 0} {t("人", "players")} ({levelCounts._total > 0 ? Math.round(((levelCounts[levelObj.level] || 0) / levelCounts._total) * 100) : 0}%)
                                </span>
                              )}

                              {isCurrent && <span style={{ fontSize: '0.9rem', color: '#059669', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Info size={14} /> {t("目前階級", "You are here")}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: isUnlocked ? '#d97706' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Apple size={18} /> {levelObj.points}
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
          const vgEntries = Object.entries(vgData).filter(([k]) => k !== '_activity');
          const vgTreeCount = vgEntries.length;
          const vgGameFruits = vgEntries.reduce((sum, [, d]) => sum + (d.fruits || 0), 0);
          const vgCreatorFruits = viewingPlayerGarden.creatorPoints || 0;
          const vgReferralFruits = viewingPlayerGarden.referralPoints || 0;
          const vgTotalFruits = vgGameFruits + vgCreatorFruits + vgReferralFruits;
          return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setViewingPlayerGarden(null)}>
              <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '1.2rem 1.5rem', background: 'linear-gradient(135deg, #065f46, #047857)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Leaf size={24} /> {viewingPlayerGarden.playerName} {t('的園地', "'s Garden")}
                    </h3>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        {vgTreeCount} {t('棵植物', 'plants')} · {t('點一下格子查看經文並挑戰', 'Tap a cell to read and challenge')}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Apple size={16} /> {t('總果子', 'Total Fruits')}: <strong>{vgTotalFruits}</strong></span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          ( {t('經文', 'Verses')} {vgGameFruits} | {t('推薦', 'Referral')} {vgReferralFruits} | {t('經文組分享', 'Sets Shared')} {vgCreatorFruits} )
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setViewingPlayerGarden(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={22} /></button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem' }}>
                  {viewingPlayerGarden.loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Hourglass size={20} /> {t('載入中...', 'Loading...')}</div>
                  ) : viewingPlayerGarden.error ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#f43f5e', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Frown size={20} /> {viewingPlayerGarden.error}</div>
                  ) : vgTreeCount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Sprout size={20} /> {t('這個玩家的園地還是空的！', 'This player\'s garden is empty!')}</div>
                  ) : (
                    <>
                      <GardenView
                        idPrefix="guest-garden"
                        variant="guest"
                        showStats={false}
                        gardenData={vgData}
                        t={t}
                        version={version}
                        refKey={verseRefKey}
                        resolveVerse={resolveGardenVerse}
                        onChallenge={(p) => { setViewingPlayerGarden(null); challengeGardenVerse({ ...p, setId: null }); }}
                        isNarrow={isNarrowEditor}
                        bleed={isNarrowEditor ? '0.6rem' : 0}
                      />
                      <div style={{ marginTop: '1.5rem' }}>
                        <ActivityHeatmap t={t} activityMap={vgData?._activity || {}} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {authorSetsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.52)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '760px', maxHeight: '88vh', overflow: 'hidden', position: 'relative', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)', border: '1px solid #dbeafe' }}>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#64748b', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.35rem' }}>{t("作者的經文組", "Author's Verse Sets")}</div>
                <h2 style={{ color: '#1e293b', margin: 0, fontSize: '1.35rem', lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                  {authorSetsModal.authorName === '匿名玩家' ? t('匿名玩家', 'Anonymous') : authorSetsModal.authorName === 'Verserain 官方' ? t('Verserain 官方', 'Official') : authorSetsModal.authorName}
                </h2>
              </div>
              <button
                onClick={() => setAuthorSetsModal(null)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, flexShrink: 0 }}
                title={t("關閉", "Close")}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1rem 1.75rem 1.5rem', overflowY: 'auto', maxHeight: 'calc(88vh - 104px)' }}>
              {authorVerseSets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontWeight: 'bold' }}>{t("目前沒有經文組", "No verse sets found")}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {authorVerseSets.map((set) => (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => {
                        setSelectedSetId(set.id);
                        setAuthorSetsModal(null);
                        setMainTab('versesets');
                        fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id, adminEmail: userEmail, adminName: playerName }) }).catch(e => e);
                        setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                      }}
                      style={{ width: '100%', textAlign: 'left', background: set.id === currentSet?.id ? '#eff6ff' : '#ffffff', border: set.id === currentSet?.id ? '1px solid #93c5fd' : '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = set.id === currentSet?.id ? '#93c5fd' : '#e2e8f0'; e.currentTarget.style.backgroundColor = set.id === currentSet?.id ? '#eff6ff' : '#ffffff'; }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', color: '#1e293b', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{set.title}</span>
                        <span style={{ display: 'block', color: '#64748b', fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(set.verses?.length || 0)} {t("節經文", "verses")} · {(viewCounts[set.id] || 0)} {t("點閱次數", "views")}
                        </span>
                      </span>
                      <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {set.id === currentSet?.id ? t("目前選擇", "Current") : t("查看", "Open")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSetLeaderboard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <button onClick={() => { setShowSetLeaderboard(false); setLeaderboardPage(0); setLeaderboardSetId(null); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
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
