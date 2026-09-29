// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { ArrowRightLeft, ArrowUpDown, CloudRain, MessageCircle, Mic, Pause, Play, Share2, Star, X, XCircle, Zap } from 'lucide-react';
import { BIBLE_LANGUAGE_OPTIONS, DEFAULT_PLAY_FONT_CHOICE, DEFAULT_PLAY_INK_CHOICE, PLAY_INK_OPTIONS, areLikelyParallelVerseSets, fetchBibleVerseFromAPI, fetchVerseFromBolls, fetchVerseFromGetBible, fetchVerseFromTaibible, findMatchingVerse, getCachedBibleVerse, getDailyVerseImageUrls, getEnglishReferenceFromKey, getSecondaryPhrasesForIndex, getStableNumber, getVoiceLangForVersion, isTextLikelyForVersion, pickRandomVerse, setCachedBibleVerse } from '../lib/bible.js';
import ChallengeSetupModal, { loadChallengeSetup } from '../ChallengeSetupModal';
import { DAILY_RAIN_DROPS, RAIN_FONT_LEVELS } from './rainConstants';
import { PERSONAL_LOOSE_SET_ID } from '../lib/sets';
import { PRESET_BGM, initAudio, pickPresetBgmFile, startLoopingBgm } from '../lib/audio.js';
import { startYouTubeBgm, youtubeBgmId } from '../lib/youtube.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import VerseVoiceRecorder from '../VerseVoiceRecorder';
import { bakeBeautifiedBlob } from '../voiceBeautify';
import { getSetBackgroundUrl, getSetBackgroundVideoUrl } from '../setBackgrounds';
import { buildVoiceOptions, dedupeVoices, voiceId, voiceMatchesSavedKey } from '../lib/voicePicker.js';
import { estimateSpeechDuration, speakTextTimed, stopSpeechIfActive } from '../lib/speech.js';
import { formatVerseReferenceForDisplay, formatVerseReferenceForSpeech, stripTopicPrefixLabel } from '../lib/verseDisplay.js';
import { getSetAssetDataUrl, setVoiceApi, uploadUserVerseVoice, userVoiceApi, voiceOwnerId } from '../setVoiceApi';
import { normalizeVerseReferenceKey } from '../lib/verseRef.js';
import { splitVersePhrases } from '../lib/phraseSplitter.js';

// How long playback waits for the "which verses have a recording" lists before
// giving up and reading with TTS.
//
// This is NOT the audio download — that has no cap, and never needed one. It is
// only the small JSON that says whether a recording exists at all. The decision
// is therefore: find out first, then wait for the audio as long as it takes.
//
// It used to be 3s, which is fine on wifi and wrong on a phone: the list hadn't
// landed yet, the verse looked like it had no recording, and the listener got
// TTS even though the creator's voice existed. Someone opening a shared listen
// link came specifically for that voice, so a few seconds of quiet is much
// cheaper than silently substituting the robot. The lists resolve on failure
// too, so a dead request still falls through immediately rather than burning
// the whole budget.
const VOICE_LIST_WAIT_MS = 12000;

export function VerseSetContinuousRainPlayer({
  verseSet,
  topicSets = [],
  favoriteVerseSets = [],
  version,
  secondaryVerseSet = null,
  secondaryVersion = null,
  onSecondaryVersionChange = null,
  t,
  onStop,
  onListenLogged,
  playDurationMinutes = null,
  initialFontSizeLevel = DEFAULT_PLAY_FONT_CHOICE,
  initialInkColor = DEFAULT_PLAY_INK_CHOICE,
  playOnce = false,
  onComplete,
  label,
  showNav = true,
  startVerse = null,
  onPrevious = null,
  onNext = null,
  nextDisabled = false,
  prevDisabled = false,
  onChallengeVerse = null,
  onShareVerse = null,
  onSelectTopicSet = null,
  allSecondaryVerses = [],
  userEmail = '',
  playerName = '',
  onRequestLogin = null,
  onOpenVoiceComments = null,
  onVoiceRecorded = null,
  isFavoriteSet = false,
  onToggleFavoriteSet = null,
  onSelectDailyVerse = null,
  autoOpenPicker = false,
  onAutoPickerOpened = null,
  // Returned from a challenge: mount held (no narration) and paused, showing the
  // verse we came back to. Playback starts when the listener taps Play or ‹ ›.
  startPaused = false
}) {
  const verses = useMemo(() => verseSet?.verses?.filter(Boolean) || [], [verseSet]);
  // Opened from a share link carrying vo= → play the sender's personal voice.
  // Scoped to this playback (rides on the set object), so a later non-shared
  // play naturally clears it. See the /lc → listenSet deep-link handler.
  const sharedVoiceOwner = verseSet?.sharedVoiceOwner || null;
  // vv= from the same link: the exact recording that was shared. Private
  // recordings are unlisted rather than locked, so quoting their voiceId is
  // what lets the recipient hear one the picker would never show them.
  const sharedVoiceId = verseSet?.sharedVoiceId || null;
  // Play-time voice source overrides (from the 播放方式 picker). forceTTS =
  // computer voice only (skip every recording); forceOwnerLayer = the set
  // author's recording only (ignore the listener's own personal voice). A
  // contributor pick instead rides sharedVoiceOwner above.
  const forceTTS = verseSet?.forceTTS || false;
  const forceOwnerLayer = verseSet?.forceOwnerLayer || false;
  // Single-verse card (opened via a row's 播放): ‹ › walk the source set but
  // clamp at the ends (no wrap), and a finished verse loops instead of moving
  // on — so the card stays put until the listener taps ‹ ›.
  const clampNav = verseSet?.clampNav || false;
  const loopCurrent = verseSet?.loopCurrent || false;
  const [currentVerse, setCurrentVerse] = useState(() => startVerse || pickRandomVerse(verses));

  // 創作者親聲朗讀 — recordings for this set, keyed by verse reference.
  // When present for the current verse, the creator's audio replaces TTS
  // and the phrase blocks advance proportionally to the recording length.
  // voiceSetId lets synthetic single-verse wrappers point back at the real
  // originating set where the recordings actually live.
  const voiceSetId = verseSet?.voiceSetId || verseSet?.id || null;
  // Where MY personal recordings live. Real curated sets (topic slugs like
  // "gospel-of-john", random-base36 custom ids) use their own bucket. Ephemeral
  // wrappers — no id, or a synthetic `single-<ref>` / `daily-<date>` — aren't
  // real collections, so their recordings go to one shared personal "loose"
  // bucket, keyed by reference. That keeps the record button always present and
  // lets a loose recording surface wherever the verse reappears. Always truthy.
  const isEphemeralSetId = (id) => !id || /^(single|daily)-/.test(String(id));
  const personalVoiceSetId = isEphemeralSetId(voiceSetId) ? PERSONAL_LOOSE_SET_ID : voiceSetId;
  const verseVoicesRef = useRef({});
  // 最新公開人聲 — the newest public recording per verse across the author AND
  // every contributor (from /sets/voice-latest). When there's no personal/shared
  // override, the player defaults to this real voice instead of TTS whenever
  // anyone has recorded the verse — not just when the set author did. Each entry
  // is tagged voiceBucket=voiceSetId (both layers' audio lives in that store).
  const latestVoicesRef = useRef({});
  // Resolves once the voices list has loaded — playVerse awaits this (with
  // a cap) so the FIRST verse doesn't race the fetch on slow mobile
  // networks and wrongly fall back to TTS.
  const verseVoicesReadyRef = useRef(Promise.resolve());
  const creatorAudioRef = useRef(null);
  // True while a voice recording is paused mid-playback (Pause button), so
  // Resume continues from the same position instead of replaying the verse.
  const pausedRecordingRef = useRef(false);
  const voiceAudioCacheRef = useRef(new globalThis.Map()); // voiceId → data URL
  const [creatorVoiceName, setCreatorVoiceName] = useState('');
  // 換聲音 — a runtime voice override the listener can switch mid-playback via
  // the reader selector. null = follow the set's configured behavior. Otherwise
  // { type:'tts'|'owner'|'personal', ownerId?, recordedBy?, voices? }.
  const manualVoiceRef = useRef(null);
  const [activeVoiceLabel, setActiveVoiceLabel] = useState(''); // shown in the selector
  const [voiceMenu, setVoiceMenu] = useState(null);   // { options } while the switch menu is open
  const [voiceMenuLoading, setVoiceMenuLoading] = useState(false);
  // ⚡ 挑戰 chooser — lets the player pick game mode + difficulty before the
  // challenge starts, instead of silently inheriting whatever was last set on
  // the set-detail page. Last choice remembered per device.
  const [challengeChooser, setChallengeChooser] = useState(null); // { mode, difficulty } while open
  // Shown while we're finding out whether this verse has a recording, and then
  // while its audio downloads. Without it a slow connection is just silence and
  // the listener has no idea anything is coming.
  const [voiceLoading, setVoiceLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    verseVoicesRef.current = {};
    latestVoicesRef.current = {};
    if (!voiceSetId) { verseVoicesReadyRef.current = Promise.resolve(); return undefined; }
    const ownerJob = setVoiceApi.getAll(voiceSetId)
      .then(res => { if (!cancelled) verseVoicesRef.current = res?.voices || {}; })
      .catch(() => { /* no recordings — TTS as usual */ });
    // Newest public human voice per verse (author + all contributors). Tag each
    // with the bucket its audio lives in so playCreatorRecording fetches it.
    const latestJob = setVoiceApi.getLatest(voiceSetId)
      .then(res => {
        if (cancelled) return;
        const map = res?.latest || {};
        for (const ref of Object.keys(map)) map[ref] = { ...map[ref], voiceBucket: voiceSetId };
        latestVoicesRef.current = map;
      })
      .catch(() => { /* fall back to the author layer / TTS */ });
    verseVoicesReadyRef.current = Promise.all([ownerJob, latestJob]);
    return () => { cancelled = true; };
  }, [voiceSetId]);

  // 個人親聲朗讀 (personal voice) — a per-listener layer that overrides the
  // set owner's recording. personalVoicesRef = MY recordings (badge/delete);
  // overrideVoicesRef = whichever voice wins playback: a share's sender voice
  // (sharedVoiceOwner) if opened from a link, else my own. Priority in
  // playVerse: override › owner (verseVoicesRef) › TTS.
  const personalVoicesRef = useRef({});
  const overrideVoicesRef = useRef({});
  const forceTTSRef = useRef(false); // picker chose 電腦語音 → skip all recordings
  const personalVoicesReadyRef = useRef(Promise.resolve());
  const myOwnerIdRef = useRef(null);
  const [voiceRecTarget, setVoiceRecTarget] = useState(null); // { reference, text }
  const [personalBusy, setPersonalBusy] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState({}); // reference → 'processing' | 'error'
  const uploadPromisesRef = useRef({});               // reference → in-flight upload Promise
  const [shareBusy, setShareBusy] = useState(false);
  const [, setPersonalVoiceVersion] = useState(0);
  const bumpPersonalVoices = () => setPersonalVoiceVersion(v => v + 1);
  useEffect(() => {
    let cancelled = false;
    personalVoicesRef.current = {};
    overrideVoicesRef.current = {};
    forceTTSRef.current = forceTTS;
    myOwnerIdRef.current = null;
    // Cross-context merge: inside a real set, also surface any recording the
    // user made on this verse as a LOOSE verse (random/search/single). The set's
    // own bucket wins per-reference. Each recording is tagged with the bucket
    // its audio actually lives in, so playback fetches from the right place.
    const buckets = personalVoiceSetId !== PERSONAL_LOOSE_SET_ID
      ? [PERSONAL_LOOSE_SET_ID, personalVoiceSetId]   // loose first, real set overwrites
      : [PERSONAL_LOOSE_SET_ID];
    // The server hides an owner's private recordings from everyone else, so
    // say who's asking: `email` when loading my own (otherwise I'd lose my own
    // unshared readings), and the share link's voiceId when loading someone
    // else's — that one id is what makes a private recording playable for the
    // person it was handed to, without listing it for anyone else.
    const loadMerged = async (owner, { own = false } = {}) => {
      const out = {};
      const auth = own ? { email: userEmail } : (sharedVoiceId ? { unlisted: sharedVoiceId } : undefined);
      for (const bucket of buckets) {
        const res = await userVoiceApi.getAll(bucket, owner, auth).catch(() => null);
        if (res?.voices) {
          for (const [ref, meta] of Object.entries(res.voices)) {
            out[ref] = { ...meta, voiceBucket: bucket };
          }
        }
      }
      return out;
    };
    personalVoicesReadyRef.current = (async () => {
      try {
        const mine = userEmail ? await voiceOwnerId(userEmail) : null;
        if (cancelled) return;
        myOwnerIdRef.current = mine;
        if (mine) {
          const merged = await loadMerged(mine, { own: true });
          if (!cancelled) personalVoicesRef.current = merged; // keep for badges
        }
        // Picker forced 電腦語音 or 作者錄音 → leave override empty: forceTTS is
        // honored at the decision point (skips the owner layer too); forceOwnerLayer
        // simply lets the owner layer (verseVoicesRef) win over the listener's own.
        if (forceTTS || forceOwnerLayer) {
          overrideVoicesRef.current = {};
        } else {
          // A shared link's / picked contributor's voice wins over the viewer's own.
          const activeOwner = sharedVoiceOwner || mine;
          if (activeOwner && activeOwner === mine) {
            overrideVoicesRef.current = personalVoicesRef.current;
          } else if (activeOwner) {
            const merged = await loadMerged(activeOwner, { own: false });
            if (!cancelled) overrideVoicesRef.current = merged;
          }
        }
      } catch { /* personal voice is optional */ }
      if (!cancelled) bumpPersonalVoices();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalVoiceSetId, userEmail, sharedVoiceOwner, sharedVoiceId, forceTTS, forceOwnerLayer]);

  // Record / re-record my voice for the current verse, then refresh caches.
  const recordedByName = playerName || (userEmail || '').split('@')[0] || 'Anonymous';
  // Per-reference save generation. Bake + upload run in the BACKGROUND (so the
  // user can move straight on), which means re-recording the SAME verse fires a
  // new upload before the previous one has finished. Without ordering, whichever
  // upload's register call happened to land LAST would win — so an earlier take
  // could silently overwrite a later one, and the recorder would keep playing
  // the first take no matter how many times you re-recorded ("重錄了還是聽到第一次").
  // We stamp each save with a monotonic seq per reference, chain saves of the
  // same verse so their registers land in recording order, and drop any take a
  // newer one has already superseded. Different verses still upload concurrently.
  const saveSeqRef = useRef({}); // reference → latest issued seq
  const saveMyVoice = ({ blob, mime, dur, beautify, public: isPublic = true }) => {
    if (!userEmail) return;
    const ref = voiceRecTarget?.reference || currentVerse.reference;
    const seq = (saveSeqRef.current[ref] || 0) + 1;
    saveSeqRef.current[ref] = seq;
    const isLatest = () => saveSeqRef.current[ref] === seq;
    // The promise is tracked so a share of this verse can await it (otherwise
    // the link would go out before the recording lands on the server).
    const prevJob = uploadPromisesRef.current[ref];
    setVoiceStatus(prev => ({ ...prev, [ref]: 'processing' }));
    const job = (async () => {
      // Wait for any in-flight save of THIS verse so registers land in the order
      // the takes were made — the last take must win on the server, not just in
      // memory. (Only same-verse re-records serialize; other verses are unaffected.)
      if (prevJob) { try { await prevJob; } catch { /* prior take failed — still record this one */ } }
      // A newer take was started while we waited → this one is already stale.
      if (!isLatest()) return null;
      const finalBlob = beautify ? await bakeBeautifiedBlob(blob, mime) : blob;
      if (!isLatest()) return null; // superseded during the bake
      const uploaded = await uploadUserVerseVoice({ email: userEmail, setId: personalVoiceSetId, reference: ref, blob: finalBlob, mime, dur, recordedBy: recordedByName, public: isPublic });
      // Superseded while uploading → don't touch the caches, so the newer take's
      // recording is what plays back.
      if (!isLatest()) return null;
      // Tag with the bucket it was stored under so playback/delete resolve it
      // even when this recording later surfaces in a different context.
      const meta = { ...uploaded, voiceBucket: personalVoiceSetId };
      personalVoicesRef.current = { ...personalVoicesRef.current, [ref]: meta };
      // When I'm listening to my own voice (no foreign share), my new take
      // becomes the active override immediately.
      if (!sharedVoiceOwner || sharedVoiceOwner === myOwnerIdRef.current) {
        overrideVoicesRef.current = { ...overrideVoicesRef.current, [ref]: meta };
      }
      voiceAudioCacheRef.current.delete(meta.voiceId);
      return meta;
    })();
    uploadPromisesRef.current[ref] = job;
    job.then(() => {
      // Only the latest take clears the spinner / signals completion; a
      // superseded take resolving must not pull the UI out from under the take
      // that replaced it.
      if (!isLatest()) return;
      setVoiceStatus(prev => { const n = { ...prev }; delete n[ref]; return n; });
      bumpPersonalVoices();
      // Tell the parent a recording landed, so the set-detail ⭐ refreshes
      // without a manual page reload when the listener returns to the list.
      onVoiceRecorded?.();
    }).catch((e) => {
      console.error('personal voice upload failed', e);
      if (isLatest()) setVoiceStatus(prev => ({ ...prev, [ref]: 'error' }));
    }).finally(() => {
      if (uploadPromisesRef.current[ref] === job) delete uploadPromisesRef.current[ref];
    });
  };
  const deleteMyVoice = async (ref) => {
    if (!userEmail || !ref) return;
    setPersonalBusy(true);
    try {
      // Delete from the bucket the recording actually lives in — a loose
      // recording surfaced inside a real set still belongs to the loose bucket.
      const bucket = personalVoicesRef.current?.[ref]?.voiceBucket || personalVoiceSetId;
      await userVoiceApi.remove(userEmail, bucket, ref);
      const nextPersonal = { ...personalVoicesRef.current }; delete nextPersonal[ref];
      personalVoicesRef.current = nextPersonal;
      if (!sharedVoiceOwner || sharedVoiceOwner === myOwnerIdRef.current) {
        const nextOverride = { ...overrideVoicesRef.current }; delete nextOverride[ref];
        overrideVoicesRef.current = nextOverride;
      }
      bumpPersonalVoices();
      // Same reason saving does this: the set-detail list caches which verses
      // have recordings, so without it a deleted recording keeps its ⭐ and its
      // 🎙️ badge until a full page reload.
      onVoiceRecorded?.();
    } catch (e) {
      console.error('personal voice delete failed', e);
    }
    setPersonalBusy(false);
  };
  // Flip my own recording on this verse between listed (public) and unlisted.
  const toggleMyVoicePublic = async (ref) => {
    if (!userEmail || !ref) return;
    const rec = personalVoicesRef.current?.[ref];
    if (!rec) return;
    const next = rec.public === false; // currently private → make it public
    setPersonalBusy(true);
    try {
      const bucket = rec.voiceBucket || personalVoiceSetId;
      await userVoiceApi.setVisibility(userEmail, bucket, ref, next);
      personalVoicesRef.current = { ...personalVoicesRef.current, [ref]: { ...rec, public: next } };
      if (!sharedVoiceOwner || sharedVoiceOwner === myOwnerIdRef.current) {
        const over = overrideVoicesRef.current?.[ref];
        if (over) overrideVoicesRef.current = { ...overrideVoicesRef.current, [ref]: { ...over, public: next } };
      }
      bumpPersonalVoices();
      // Others' view of this set changed (the ⭐ and the picker), so let the
      // set-detail list refetch when the listener goes back to it.
      onVoiceRecorded?.();
    } catch (e) {
      console.error('personal voice visibility toggle failed', e);
    }
    setPersonalBusy(false);
  };
  const myVoiceForCurrent = personalVoicesRef.current?.[currentVerse.reference] || null;

  // ── 換聲音 / 留言 (reader selector) ─────────────────────────────────
  // Gather the recordings available for the CURRENT verse, for the switch menu.
  const gatherCurrentVoiceOptions = async () => {
    const ref = currentVerse.reference;
    const opts = [];
    const ownerRec = verseVoicesRef.current?.[ref];
    if (ownerRec?.voiceId) opts.push({ type: 'owner', ownerId: ownerRec.byOwnerId || null, recordedBy: ownerRec.recordedBy || '' });
    try {
      const cres = voiceSetId ? await userVoiceApi.getContributors(voiceSetId).catch(() => null) : null;
      const contributors = cres?.contributors || [];
      const mineId = myOwnerIdRef.current;
      for (const c of contributors) {
        const vres = await userVoiceApi.getAll(voiceSetId, c.ownerId).catch(() => null);
        const rec = vres?.voices?.[ref];
        if (rec?.voiceId) opts.push({ type: 'personal', ownerId: c.ownerId, recordedBy: c.recordedBy || rec.recordedBy || '', mine: !!(mineId && c.ownerId === mineId) });
      }
    } catch { /* best-effort */ }
    return opts;
  };
  const openVoiceSwitchMenu = async () => {
    if (!voiceSetId) return;
    setVoiceMenuLoading(true);
    setVoiceMenu({ options: [] });
    const opts = await gatherCurrentVoiceOptions();
    setVoiceMenu({ options: opts });
    setVoiceMenuLoading(false);
  };
  const applyVoiceChoice = async (choice) => {
    setVoiceMenu(null);
    if (choice.type === 'tts') {
      manualVoiceRef.current = { type: 'tts' };
    } else if (choice.type === 'silent') {
      // 無聲音 — no TTS and no recordings; blocks still appear (paced by the
      // usual per-phrase timing) while only the background music plays.
      manualVoiceRef.current = { type: 'silent' };
    } else if (choice.type === 'owner') {
      manualVoiceRef.current = { type: 'owner', ownerId: choice.ownerId, recordedBy: choice.recordedBy };
    } else {
      // Load that contributor's recordings for the whole set so subsequent
      // verses use them too; verses they didn't record fall back to TTS.
      let voices = {};
      try { const res = await userVoiceApi.getAll(voiceSetId, choice.ownerId); voices = res?.voices || {}; } catch { /* keep empty */ }
      manualVoiceRef.current = { type: 'personal', ownerId: choice.ownerId, recordedBy: choice.recordedBy, voices };
    }
    // Replay the current verse immediately with the newly-chosen voice.
    resumeFromPhraseRef.current = 0;
    setPlayKey(k => k + 1);
  };
  // The ownerId of the recording currently targeted — for comments AND for the
  // share button (so a link carries the exact voice the sharer is hearing). Must
  // mirror playVerse's default priority: my/shared override › newest public human
  // (latestVoicesRef) › author layer › TTS (null). A live manual switch wins.
  // Returns { ownerId, voiceId, personal } for the voice that would play now.
  // `voiceId` is only meaningful for the personal layer — that's the one with a
  // public/private flag, so it's the only one a share link needs to quote in
  // order to stay playable if the recording is (or later becomes) unlisted.
  const currentTargetVoice = () => {
    const ref = currentVerse.reference;
    const m = manualVoiceRef.current;
    if (m) {
      if (m.type === 'tts' || m.type === 'silent') return { ownerId: null, voiceId: null, personal: false };
      if (m.type === 'owner') return { ownerId: verseVoicesRef.current?.[ref]?.byOwnerId || null, voiceId: null, personal: false };
      return { ownerId: m.ownerId || null, voiceId: m.voices?.[ref]?.voiceId || null, personal: true };
    }
    if (forceTTSRef.current) return { ownerId: null, voiceId: null, personal: false };
    const over = overrideVoicesRef.current?.[ref];
    if (over) return { ownerId: sharedVoiceOwner || myOwnerIdRef.current || null, voiceId: over.voiceId || null, personal: true };
    const latest = latestVoicesRef.current?.[ref];
    if (latest?.voiceId) {
      const author = verseVoicesRef.current?.[ref];
      const isAuthorLayer = author?.voiceId === latest.voiceId;
      if (latest.ownerId) return { ownerId: latest.ownerId, voiceId: isAuthorLayer ? null : latest.voiceId, personal: !isAuthorLayer };
      // Older author-layer recordings can arrive without an ownerId from
      // /voice-latest; the author layer carries the backfilled byOwnerId.
      return { ownerId: (isAuthorLayer && author?.byOwnerId) || null, voiceId: null, personal: false };
    }
    return { ownerId: verseVoicesRef.current?.[ref]?.byOwnerId || null, voiceId: null, personal: false };
  };
  const currentTargetOwnerId = () => currentTargetVoice().ownerId;
  const openCommentsForCurrent = () => {
    const ownerId = currentTargetOwnerId();
    if (!ownerId || !voiceSetId) return;
    const ref = currentVerse.reference;
    const m = manualVoiceRef.current;
    const recordedBy = m?.recordedBy || verseVoicesRef.current?.[ref]?.recordedBy || overrideVoicesRef.current?.[ref]?.recordedBy || '';
    onOpenVoiceComments?.({ setId: voiceSetId, reference: ref, targetOwnerId: ownerId, recordedBy, mine: ownerId === myOwnerIdRef.current });
  };

  const playCreatorRecording = async (rec, phrasesArr, onPhrase, displayName, onAudioStart) => {
    try {
      let dataUrl = voiceAudioCacheRef.current.get(rec.voiceId);
      if (!dataUrl) {
        const res = await setVoiceApi.getAudio(rec.voiceBucket || personalVoiceSetId, rec.voiceId);
        if (!res?.data) return false;
        dataUrl = `data:${rec.voiceMime || 'audio/webm'};base64,${res.data}`;
        voiceAudioCacheRef.current.set(rec.voiceId, dataUrl);
      }
      // iOS Safari blocks .play() on Audio elements CREATED outside a user
      // gesture — verse 1 (right after the start tap) would play but verse
      // 2+ (created seconds later) would be rejected and fall back to TTS.
      // Reusing one persistent element keeps the gesture "blessing": once
      // it has played, later src swaps on the SAME element are allowed.
      if (!creatorAudioRef.current) creatorAudioRef.current = new Audio();
      const audio = creatorAudioRef.current;
      try { audio.pause(); } catch { /* noop */ }
      audio.src = dataUrl;
      try { audio.currentTime = 0; } catch { /* not loaded yet */ }
      // displayName === '' → hide the badge (listener's own voice). undefined
      // (legacy callers) → fall back to the recording's stored name.
      setCreatorVoiceName(displayName !== undefined ? displayName : (rec.recordedBy || ''));
      // Audio is in hand — drop the "loading the reading" hint.
      onAudioStart?.();
      const durMs = rec.voiceDur > 0 ? rec.voiceDur * 1000 : 8000;
      // Advance phrase highlights proportionally to each phrase's length,
      // driven by the audio's ACTUAL position (timeupdate) — wall-clock
      // timers kept marching while the user paused the clip, so the verse
      // display ran ahead of the silent audio.
      const totalLen = phrasesArr.reduce((a, p) => a + p.length, 0) || 1;
      let acc = 0;
      const thresholds = phrasesArr.map((p) => {
        const startAt = Math.round(durMs * acc / totalLen) + 200;
        acc += p.length;
        return startAt;
      });
      let nextPhraseIdx = 0;
      const timeHandler = () => {
        const ms = audio.currentTime * 1000;
        while (nextPhraseIdx < thresholds.length && ms >= thresholds[nextPhraseIdx]) {
          onPhrase(nextPhraseIdx);
          nextPhraseIdx += 1;
        }
      };
      audio.ontimeupdate = timeHandler;
      let endHandler = null;
      let errHandler = null;
      const finished = await new Promise((resolve) => {
        let done = false;
        const fin = (ok) => { if (!done) { done = true; resolve(ok); } };
        endHandler = () => fin(true);
        errHandler = () => fin(false);
        audio.onended = endHandler;
        audio.onerror = errHandler;
        audio.play().catch(() => fin(false));
        // Hard cap so a stuck clip can't hang the run — but never fire it
        // while the user has paused mid-clip (Resume will play to the end,
        // and onended then advances).
        window.setTimeout(() => { if (!pausedRecordingRef.current) fin(true); }, durMs + 15000);
      });
      setCreatorVoiceName('');
      // Keep the element alive (see gesture note above) — detach OUR handlers
      // only. Runs overlap (a cancelled run resolves after its successor
      // already attached new handlers); unconditional nulling here used to
      // strip the live run's ontimeupdate and freeze the verse display.
      if (audio.ontimeupdate === timeHandler) audio.ontimeupdate = null;
      if (audio.onended === endHandler) audio.onended = null;
      if (audio.onerror === errHandler) audio.onerror = null;
      return finished;
    } catch {
      setCreatorVoiceName('');
      return false;
    }
  };
  // In bilingual mode the primary blocks pair with the secondary line by index,
  // so keep Chinese on punctuation splitting (semantic:false) to stay aligned;
  // monolingual reading gets the semantic segmenter.
  const phrases = useMemo(
    () => splitVersePhrases(currentVerse?.text || '', { semantic: !secondaryVersion }),
    [currentVerse, secondaryVersion]
  );
  const secondaryVerse = useMemo(() => {
    const secondaryVerses = secondaryVerseSet?.verses?.filter(Boolean) || [];
    return findMatchingVerse(currentVerse, verses, secondaryVerses, {
      allowIndexFallback: areLikelyParallelVerseSets(verseSet, secondaryVerseSet)
    });
  }, [currentVerse, secondaryVerseSet, verseSet, verses]);
  // Secondary line is only shown in bilingual mode and pairs by index, so it
  // stays on punctuation splitting (semantic:false) to match the primary.
  const secondaryPhrases = useMemo(
    () => splitVersePhrases(secondaryVerse?.text || '', { semantic: false }),
    [secondaryVerse]
  );

  // --- Cross-language verse lookup ---
  // Build a fast lookup map: normalizedKey → verse for all loaded secondary-language verses
  const secondaryVerseByRef = useMemo(() => {
    const map = new globalThis.Map();
    for (const v of allSecondaryVerses) {
      const key = normalizeVerseReferenceKey(v.reference);
      if (key && !map.has(key)) map.set(key, v);
    }
    return map;
  }, [allSecondaryVerses]);

  const [lookedUpText, setLookedUpText] = useState('');
  const [lookedUpRef, setLookedUpRef] = useState('');

  useEffect(() => {
    // Already have a match from the paired secondary set → nothing to look up
    if (secondaryVerse || !secondaryVersion || !currentVerse?.reference) {
      setLookedUpText('');
      setLookedUpRef('');
      return;
    }

    let cancelled = false;
    const normalizedKey = normalizeVerseReferenceKey(currentVerse.reference);
    if (!normalizedKey) return;

    // 1) Search all loaded verse sets in the secondary language (instant, real Bible text).
    //    Validate that the text is actually in the expected script — verse sets sometimes contain
    //    wrong-language text (e.g. KJV English stored in a Hebrew-labelled set).
    const localMatch = secondaryVerseByRef.get(normalizedKey);
    if (localMatch && isTextLikelyForVersion(localMatch.text, secondaryVersion)) {
      setLookedUpText(localMatch.text);
      setLookedUpRef(localMatch.reference);
      // Also persist to localStorage for future sessions
      setCachedBibleVerse(secondaryVersion, normalizedKey, localMatch.text);
      return;
    }

    // 2) Check localStorage cache (previously found verses) — validate script too
    const cached = getCachedBibleVerse(secondaryVersion, normalizedKey);
    if (cached && isTextLikelyForVersion(cached, secondaryVersion)) {
      setLookedUpText(cached);
      setLookedUpRef(formatVerseReferenceForDisplay(currentVerse.reference, secondaryVersion));
      return;
    }

    // 3) Fetch from external Bible API — ESV/KJV via dedicated endpoints,
    //    all other languages via bolls.life free API (real Bible text, not translation)
    setLookedUpText('');
    setLookedUpRef('');
    const englishRef = getEnglishReferenceFromKey(normalizedKey);

    (async () => {
      let text = null;
      let ref = englishRef || currentVerse.reference;

      if (secondaryVersion === 'esv' || secondaryVersion === 'kjv' || secondaryVersion === 'niv') {
        if (englishRef) text = await fetchBibleVerseFromAPI(englishRef, secondaryVersion);
      } else if (secondaryVersion === 'tr' || secondaryVersion === 'my') {
        // bolls.life doesn't carry Turkish or Myanmar/Burmese; use the
        // getbible.net Kutsal Kitap / Judson editions instead. Same input
        // shape (normalizedKey) and output shape (joined verse text).
        text = await fetchVerseFromGetBible(normalizedKey, secondaryVersion);
      } else if (secondaryVersion === 'tw') {
        // 台語漢字本 — served by our own PartyKit proxy.
        text = await fetchVerseFromTaibible(normalizedKey);
      } else {
        text = await fetchVerseFromBolls(normalizedKey, secondaryVersion);
      }

      if (cancelled || !text) return;
      setCachedBibleVerse(secondaryVersion, normalizedKey, text);
      setLookedUpText(text);
      setLookedUpRef(ref);
    })();

    return () => { cancelled = true; };
  }, [currentVerse, secondaryVerse, secondaryVersion, secondaryVerseByRef]);

  const effectiveSecondaryPhrases = useMemo(() => {
    let phrases = [];
    // Only trust secondaryVerse if its text is in the correct script for the version
    if (secondaryVerse && secondaryPhrases.length && isTextLikelyForVersion(secondaryVerse.text, secondaryVersion)) {
      phrases = secondaryPhrases;
    } else if (lookedUpText) {
      phrases = splitVersePhrases(lookedUpText, { semantic: false });
    }
    // Per-phrase validation: replace any phrase in the wrong script with '' so it
    // doesn't render. This handles stored verse texts that mix Hebrew with embedded
    // KJV English (or similar cross-language contamination).
    return phrases.map(p => isTextLikelyForVersion(p, secondaryVersion) ? p : '');
  }, [secondaryPhrases, secondaryVerse, lookedUpText, secondaryVersion]);

  const rawSecondaryRef = useMemo(() => {
    if (secondaryVerse) return secondaryVerse.reference;
    if (lookedUpRef) return lookedUpRef;
    return null;
  }, [secondaryVerse, lookedUpRef]);

  // 「雙語對調」：讀經時暫時把第一/第二語言互換,主畫面改用第二語言落字＋朗讀,原第一語言退到
  // 下方小字。純本地狀態(不寫 localStorage、不動 App 全域 version/secondaryVersion)→ 離開讀經頁
  // 元件卸載即自然還原。已確認:對調後一律走電腦語音 TTS,且對調維持整個讀經階段。
  const [swapped, setSwapped] = useState(false);
  const swappedRef = useRef(false);
  useEffect(() => { swappedRef.current = swapped; }, [swapped]);
  // 對調時朗讀第二語言用的 TTS 語音(玩家在「朗讀第二語言」時選的)。純本地、會話性:
  // 不寫入 App 的 verseRain_voiceByVersion,離開讀經頁即消失,不影響 App 語音設定。
  const [swapVoice, setSwapVoice] = useState(null);
  const swapVoiceRef = useRef(null);
  useEffect(() => { swapVoiceRef.current = swapVoice; }, [swapVoice]);
  // 「朗讀第二語言」的語音選單(挑好語音才開始播放)。null = 未開;陣列 = 可選語音清單。
  const [swapVoiceMenu, setSwapVoiceMenu] = useState(null);
  // 系統可用的 TTS 語音清單(voiceschanged 後才會齊全);用來為第二語言列出可選語音。
  const [availableVoices, setAvailableVoices] = useState(() =>
    (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis.getVoices() : []);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    const load = () => setAvailableVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  // 為第二語言(對調後要朗讀的語言)算可選語音。用「當下」的 getVoices()(iOS 會延後載入,
  // 首次進讀經頁時 React state 可能還沒收到 voiceschanged → 選單列不出日文語音),並沿用
  // 使用者對該語言已存的偏好語音(verseRain_voiceByVersion[secondaryVersion])當預設。
  const liveSecondaryVoiceOptions = () => {
    const live = (typeof window !== 'undefined' && window.speechSynthesis)
      ? (window.speechSynthesis.getVoices() || []) : availableVoices;
    if (live.length) setAvailableVoices(live); // 順手更新 state
    if (!secondaryVersion) return { options: [], preferred: null };
    const prefix = String(getVoiceLangForVersion(secondaryVersion) || '').toLowerCase().split('-')[0];
    if (!prefix) return { options: [], preferred: null };
    const matched = live.filter(vc => String(vc.lang || '').toLowerCase().startsWith(prefix));
    const options = buildVoiceOptions(dedupeVoices(matched), { cloudLabel: '☁️' });
    let preferred = null;
    try {
      const byVersion = JSON.parse(localStorage.getItem('verseRain_voiceByVersion') || '{}');
      const savedKey = byVersion?.[secondaryVersion];
      if (savedKey) preferred = matched.find(v => voiceMatchesSavedKey(v, savedKey)) || null;
    } catch { /* ignore */ }
    return { options, preferred };
  };
  // 進入對調並(可選)指定語音,然後由 readingKey effect 重新從頭朗讀。
  const startSwapWithVoice = (voice) => {
    setSwapVoice(voice || null);
    setSwapVoiceMenu(null);
    setSwapped(true);
  };
  const stopSwap = () => {
    setSwapVoiceMenu(null);
    setSwapVoice(null);
    setSwapped(false);
  };
  // 對調後的「有效」語言與片語。currentVerse/導覽/錄音鍵完全不動,只換「哪個語言當主片語」。
  const activePrimaryVersion = swapped ? secondaryVersion : version;
  const activeSecondaryVersion = swapped ? version : secondaryVersion;
  const primaryPhrases = swapped ? effectiveSecondaryPhrases : phrases;
  const secondaryDisplayPhrases = swapped ? phrases : effectiveSecondaryPhrases;
  // 對調時需要的第二語言文字是否已備妥(外部抓取可能還沒回來)→ 決定對調鈕可否按。
  const canSwapToSecondary = effectiveSecondaryPhrases.length > 0;
  const hasSecondaryPhrases = Boolean(activeSecondaryVersion && secondaryDisplayPhrases.length);
  // 下方參考節號:對調時顯示原第一語言的節號(格式用原 version);未對調沿用既有的第二語言查得節號。
  const secondaryHeadingText = swapped
    ? formatVerseReferenceForDisplay(currentVerse?.reference, version)
    : (rawSecondaryRef ? formatVerseReferenceForDisplay(rawSecondaryRef, secondaryVersion) : null);
  // 何時該從頭重讀:對調開/關、對調中換第二語言、或對調中第二語言文字晚到(片語數 0→N)。
  // 未對調時固定 'P'(主語言本身變動由既有 play effect 的 version 依賴處理,避免重複重讀)。
  const readingKey = swapped
    ? `S|${secondaryVersion || ''}|${effectiveSecondaryPhrases.length}|${voiceId(swapVoice)}`
    : 'P';

  const imageDateLabel = useMemo(() => {
    const day = (getStableNumber(`${verseSet?.id || verseSet?.title}-${currentVerse?.reference || ''}`) % 31) + 1;
    return `2026-05-${String(day).padStart(2, '0')}`;
  }, [verseSet?.id, verseSet?.title, currentVerse?.reference]);
  // Creator-uploaded custom background (fetched lazily, session-cached).
  const [customBgUrl, setCustomBgUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setCustomBgUrl(null);
    const bg = String(verseSet?.background || '');
    if (!bg.startsWith('custom:')) return undefined;
    getSetAssetDataUrl(verseSet?.voiceSetId || verseSet?.id, bg.slice('custom:'.length), verseSet?.backgroundMime || 'image/webp')
      .then(url => { if (!cancelled) setCustomBgUrl(url); })
      .catch(() => { /* missing asset — default backgrounds show */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseSet?.background]);

  const backgroundImageUrls = useMemo(() => {
    // Creator-chosen background wins (custom upload, then preset theme);
    // fall back to the default rotating AI backgrounds otherwise.
    if (customBgUrl) return [customBgUrl];
    const preset = getSetBackgroundUrl(verseSet?.background);
    if (preset) return [preset, ...getDailyVerseImageUrls(currentVerse, imageDateLabel, version)];
    return getDailyVerseImageUrls(currentVerse, imageDateLabel, version);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVerse, imageDateLabel, version, verseSet?.background, customBgUrl]);
  // Video-preset backgrounds: a short muted loop layered over the poster
  // image. Skipped entirely in performance mode and for users who prefer
  // reduced motion — the poster (backgroundImageUrls[0]) shows instead.
  const backgroundVideoUrl = useMemo(() => {
    if (localStorage.getItem('verseRainPerformanceMode') === 'true') return null;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
    return getSetBackgroundVideoUrl(verseSet?.background);
  }, [verseSet?.background]);
  const [videoOk, setVideoOk] = useState(true);
  useEffect(() => { setVideoOk(true); }, [backgroundVideoUrl]);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageOk, setImageOk] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [isPaused, setIsPaused] = useState(startPaused);
  // Where Play should pick the verse back up. A creator recording can be truly
  // paused mid-audio, but TTS can't be held, so pausing tears the run down and
  // Play restarts the effect — this ref is what stops that restart from going
  // back to the first phrase. 0 means "from the top".
  const resumeFromPhraseRef = useRef(0);
  const [activePhrase, setActivePhrase] = useState(-1);
  const [phrasePageStart, setPhrasePageStart] = useState(0);
  const [isSettled, setIsSettled] = useState(false);
  // Page-flip transition: while true, the outgoing page's phrases fade out
  // (~0.3s) before phrasePageStart advances, so the reader never shows the
  // old「掉到底→跳到頂」flicker. The ref mirrors it for the reactive
  // paginator effect (which must stand down during a fade).
  const [isPageFading, setIsPageFading] = useState(false);
  const isPageFadingRef = useRef(false);
  useEffect(() => { isPageFadingRef.current = isPageFading; }, [isPageFading]);
  // 預算版位:一頁的最後一句索引(整頁一次擺好,逐句就地淡入,不再逐句 mount 造成右擠)。
  const [phrasePageEnd, setPhrasePageEnd] = useState(0);
  const phrasePageStartRef = useRef(0);
  const phrasePageEndRef = useRef(0);
  useEffect(() => { phrasePageStartRef.current = phrasePageStart; }, [phrasePageStart]);
  useEffect(() => { phrasePageEndRef.current = phrasePageEnd; }, [phrasePageEnd]);
  // 預先量測算好的分頁:[{start,end}]（inclusive）。由隱藏鏡像量測產生。
  const pagesRef = useRef([]);
  const phraseMirrorRef = useRef(null);
  const [phraseContainerWidth, setPhraseContainerWidth] = useState(0);
  const [fontSizeLevel, setFontSizeLevel] = useState(
    RAIN_FONT_LEVELS.includes(initialFontSizeLevel) ? initialFontSizeLevel : DEFAULT_PLAY_FONT_CHOICE
  );
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  // When entered from the lobby's 話語甘霖 card we open the picker AND hold
  // playback: the listener first chooses 每日經文 / 我的最愛 / 主題經文, and only
  // that choice starts the reading (initialized from the prop so the very first
  // play effect on mount already sees it — no race with effect ordering).
  const deferInitialPlayRef = useRef(autoOpenPicker || startPaused);
  const pickerOpenedOnceRef = useRef(false);
  // Auto-open the picker when the player is entered from the lobby's 話語甘霖
  // card, so the listener lands straight on the 每日經文 / 我的最愛 / 主題經文
  // chooser. The parent clears its flag via onAutoPickerOpened so it fires once.
  useEffect(() => {
    if (!autoOpenPicker) return;
    setShowTopicPicker(true);
    onAutoPickerOpened?.();
  }, [autoOpenPicker]); // eslint-disable-line react-hooks/exhaustive-deps
  // When playback is held for a lobby entry, start the default (today's daily
  // verse) once the picker actually closes — an explicit 每日經文 pick or a
  // plain dismiss both land here. A 我的最愛 / 主題經文 pick clears the flag
  // first (it navigates away), so it never auto-starts the daily verse.
  useEffect(() => {
    if (showTopicPicker) { pickerOpenedOnceRef.current = true; return; }
    if (deferInitialPlayRef.current && pickerOpenedOnceRef.current) {
      deferInitialPlayRef.current = false;
      setPlayKey(k => k + 1);
    }
  }, [showTopicPicker]);
  const bgmRef = useRef(null);
  // YouTube background music plays in YouTube's own player, which has to stay
  // visible — a small dock in a corner (see lib/youtube.js).
  const ytBgmId = youtubeBgmId(verseSet?.bgMusic);
  const ytHostRef = useRef(null);
  const [ytState, setYtState] = useState(null);
  const [ytSide, setYtSide] = useState('top');
  const [ytClosed, setYtClosed] = useState(false);
  const runRef = useRef(0);
  const topicPickerRef = useRef(null);
  const verseSetIdRef = useRef(verseSet?.id);
  const verseSourceRef = useRef(`${verseSet?.id || ''}-${startVerse?.reference || ''}-${startVerse?.text || ''}`);
  const onListenLoggedRef = useRef(onListenLogged);
  const onStopRef = useRef(onStop);
  const playDurationMinutesRef = useRef(playDurationMinutes);
  const playbackStartedAtRef = useRef(Date.now());
  const phraseContainerRef = useRef(null);
  const phraseNodeRefs = useRef([]);
  // Refs for values used inside the auto-play effect but that should NOT re-trigger it
  const phrasesRef = useRef(primaryPhrases);
  const versesRef = useRef(verses);
  const playOnceRef = useRef(playOnce);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onListenLoggedRef.current = onListenLogged; }, [onListenLogged]);
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);
  useEffect(() => { playDurationMinutesRef.current = playDurationMinutes; }, [playDurationMinutes]);
  useEffect(() => { phrasesRef.current = primaryPhrases; }, [primaryPhrases]);
  useEffect(() => { versesRef.current = verses; }, [verses]);
  useEffect(() => { playOnceRef.current = playOnce; }, [playOnce]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    playbackStartedAtRef.current = Date.now();
  }, [verseSet?.id, startVerse?.reference, playDurationMinutes]);

  // 雙語對調的重讀觸發:readingKey 變動就 bump playKey → play effect(依賴 playKey)從頭重讀
  // 現在的第一語言。跳過首次掛載(初始播放由既有流程負責,不要多重讀一次)。
  const readingKeyInitRef = useRef(true);
  useEffect(() => {
    if (readingKeyInitRef.current) { readingKeyInitRef.current = false; return; }
    setPlayKey(k => k + 1);
  }, [readingKey]);

  useEffect(() => {
    if (!showTopicPicker) return undefined;

    const closeTopicPickerOnOutsideClick = (event) => {
      if (topicPickerRef.current?.contains(event.target)) return;
      setShowTopicPicker(false);
    };

    document.addEventListener('pointerdown', closeTopicPickerOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeTopicPickerOnOutsideClick);
  }, [showTopicPicker]);

  useEffect(() => {
    const sourceKey = `${verseSet?.id || ''}-${startVerse?.reference || ''}-${startVerse?.text || ''}`;
    if (verseSetIdRef.current === verseSet?.id && verseSourceRef.current === sourceKey) return;
    verseSetIdRef.current = verseSet?.id;
    verseSourceRef.current = sourceKey;
    setCurrentVerse(startVerse || pickRandomVerse(verses));
  }, [verseSet?.id, verses, startVerse]);

  useEffect(() => {
    // Background music source: creator's custom upload > chosen preset
    // (PRESET_BGM; '' or 'preset:random' = shuffle); bgMusic==='none' disables music.
    let cancelled = false;
    const setup = async () => {
      const choice = String(verseSet?.bgMusic || '');
      if (ytBgmId) {
        bgmRef.current?.pause();
        bgmRef.current?._bgmDisconnect?.();
        bgmRef.current = null;
        setYtState(null);
        setYtClosed(false);
        if (!ytHostRef.current) return;
        bgmRef.current = startYouTubeBgm(ytBgmId, verseSet?.bgMusicVolume ?? 0.18, ytHostRef.current, {
          onState: (st) => setYtState(st),
        });
        return;
      }
      let src = pickPresetBgmFile(choice);
      if (choice === 'none') src = null;
      else if (choice.startsWith('custom:')) {
        try {
          src = await getSetAssetDataUrl(
            verseSet?.voiceSetId || verseSet?.id,
            choice.slice('custom:'.length),
            verseSet?.bgMusicMime || 'audio/mpeg'
          );
        } catch { src = PRESET_BGM[0].file; /* asset missing — fall back */ }
      }
      if (cancelled) return;
      bgmRef.current?.pause();
      bgmRef.current?._bgmDisconnect?.();
      if (!src) { bgmRef.current = null; return; }
      // The player only mounts after the start tap, so autoplay is allowed;
      // custom music may finish downloading mid-verse and joins right away.
      // startLoopingBgm honours the per-set volume on iOS too (Web Audio gain).
      bgmRef.current = startLoopingBgm(src, verseSet?.bgMusicVolume ?? 0.18);
    };
    setup();

    return () => {
      cancelled = true;
      runRef.current += 1;
      bgmRef.current?.pause();
      bgmRef.current?._bgmDisconnect?.();
      stopSpeechIfActive();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseSet?.bgMusic, verseSet?.bgMusicVolume]);

  // useLayoutEffect (not useEffect) so the outgoing verse's revealed/settled
  // phrases are cleared BEFORE the browser paints the new verse. With a plain
  // useEffect the new scene first paints while isSettled/activePhrase still
  // held the previous verse's "all revealed" state, so the last page lingered
  // and then faded out (via the 0.45s opacity transition) before re-revealing.
  // Resetting pre-paint makes the last page disappear immediately — a clean cut
  // between verses instead of a cross-fade.
  React.useLayoutEffect(() => {
    // A different verse always starts from the top, never from a stale
    // resume point left behind by a pause on the previous verse.
    resumeFromPhraseRef.current = 0;
    setPlayKey(k => k + 1);
    setActivePhrase(-1);
    setPhrasePageStart(0);
    setPhrasePageEnd(0);
    phrasePageStartRef.current = 0;
    phrasePageEndRef.current = 0;
    setIsPageFading(false);
    phraseNodeRefs.current = [];
    setIsSettled(false);
    setImageIndex(0);
    setImageOk(true);
    setImageLoaded(false);
  }, [currentVerse?.reference]);

  // Reset animation state for single-verse repeat (playKey changes but reference stays the same)
  useEffect(() => {
    // …but NOT when Play is resuming a paused verse: wiping activePhrase here
    // is what made the blocks vanish and the reading start over.
    if (resumeFromPhraseRef.current > 0) return;
    setActivePhrase(-1);
    setPhrasePageStart(0);
    setPhrasePageEnd(0);
    phrasePageStartRef.current = 0;
    phrasePageEndRef.current = 0;
    setIsPageFading(false);
    setIsSettled(false);
  }, [playKey]);

  useEffect(() => {
    if (imageLoaded || !imageOk || backgroundImageUrls[imageIndex]?.startsWith('data:')) return undefined;
    const timeout = window.setTimeout(() => {
      setImageIndex(current => current < backgroundImageUrls.length - 1 ? current + 1 : current);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [backgroundImageUrls, imageIndex, imageLoaded, imageOk]);

  // How long the outgoing page fades before the next phrase takes the top.
  // 換頁:舊頁瞬間清掉(不漸變),只留極短一格讓 DOM 換到新頁,近似硬切。
  const FLIP_FADE_MS = 60;

  // 依「隱藏鏡像」預先量測,把所有 phrases 切成一頁頁(每頁容納到 visualBottomLimit)。
  // 產生 pagesRef.current = [{start,end}]（inclusive）。量測在離屏鏡像上進行,使用者
  // 看不到任何 reflow;真正顯示時整頁一次擺好、逐句就地淡入(不掉落、不右擠、不跳頁)。
  const recomputePages = React.useCallback(() => {
    const mirror = phraseMirrorRef.current;
    const container = phraseContainerRef.current;
    if (!mirror || !container) return;
    // 每次都用真實容器「當下」的寬度餵鏡像(別用可能過期的 state:曾量到動畫過程中的
    // 暫時窄值 → 鏡像太窄、句子換行變多、每句量得過高 → 分頁過度保守,一頁只放一句)。
    const w = container.clientWidth;
    if (w && Math.abs(parseFloat(mirror.style.width) - w) > 1) mirror.style.width = w + 'px';
    const spans = mirror.children;
    if (!spans || spans.length === 0 || !w) { pagesRef.current = []; return; }
    const containerRect = container.getBoundingClientRect();
    const cstyle = getComputedStyle(container);
    const padTop = parseFloat(cstyle.paddingTop) || 0;
    const actionControls = document.querySelector('.continuous-rain-action-controls:not(.continuous-rain-close-topleft)');
    const actionControlsTop = actionControls ? actionControls.getBoundingClientRect().top : window.innerHeight;
    // 真正的視覺底部 = 動作列頂端(播放/分享/麥克風)。填到那裡才不浪費空間。容器已把
    // 下方 padding 縮到很小、border box 會延伸到動作列之下,所以直接用動作列當底,不再被
    // containerRect.bottom 提早卡住(那會讓一頁少放一句)。
    const bottomLimit = actionControlsTop - 12;
    // 保守留邊,避免臨界溢出被 overflow:hidden 裁字。
    const pageHeight = Math.max(1, bottomLimit - (containerRect.top + padTop) - 4);
    const pages = [];
    let start = 0;
    let pageTop = spans[0].offsetTop;
    for (let i = 0; i < spans.length; i += 1) {
      const el = spans[i];
      const bottom = el.offsetTop + el.offsetHeight;
      if (i > start && (bottom - pageTop) > pageHeight) {
        pages.push({ start, end: i - 1 });
        start = i;
        pageTop = el.offsetTop;
      }
    }
    pages.push({ start, end: spans.length - 1 });
    pagesRef.current = pages;
  }, []);

  // 某 phrase 屬於哪一頁(還沒算好時退化成單句一頁,保底不當機)。
  const pageForIndex = React.useCallback((i) => {
    const pages = pagesRef.current;
    if (pages && pages.length) {
      const p = pages.find(pg => i >= pg.start && i <= pg.end);
      if (p) return p;
    }
    return { start: i, end: i };
  }, []);

  // 真實容器寬度變動(視窗/轉向)→ 記錄並重算分頁。ResizeObserver 直接重算,
  // 不完全依賴 state(避免量到動畫暫時窄值後就卡住)。
  useEffect(() => {
    const container = phraseContainerRef.current;
    if (!container) return undefined;
    const sync = () => {
      const w = container.clientWidth;
      if (w) setPhraseContainerWidth(prev => (Math.abs(prev - w) > 1 ? w : prev));
      recomputePages();
    };
    sync();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(sync);
      ro.observe(container);
    }
    window.addEventListener('resize', sync);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', sync); };
  }, [recomputePages]);

  // 鏡像量測(尺寸/字級/雙語/內容變動)→ 繪製前重算分頁;並在版面沉澱後補算幾次
  // (rAF + 短延遲),避免開場動畫期間量到暫時尺寸。
  React.useLayoutEffect(() => {
    recomputePages();
    const raf = requestAnimationFrame(recomputePages);
    const t1 = window.setTimeout(recomputePages, 180);
    const t2 = window.setTimeout(recomputePages, 520);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [recomputePages, phraseContainerWidth, primaryPhrases, secondaryDisplayPhrases, hasSecondaryPhrases, fontSizeLevel, currentVerse?.reference]);

  // (舊的事後量測/修剪 measureAndTrim / trimOnResize 已移除 —— 分頁改由上方
  //  隱藏鏡像預先算好 pagesRef,顯示時不再需要事後修正,故不會再有「跳頁」。)

  useEffect(() => {
    if (!currentVerse) return undefined;
    // Held after a lobby 話語甘霖 entry until the listener picks from the auto-
    // opened chooser. handlePickDailyVerse lifts this and bumps playKey to start.
    if (deferInitialPlayRef.current) return undefined;
    let cancelled = false;
    const runId = runRef.current + 1;
    runRef.current = runId;
    // Clear the 朗讀者 badge from the PREVIOUS verse right away. If that
    // verse's recording was interrupted (‹ › navigation), its clear only
    // fires when the hung playback promise hits the hard cap — leaving a
    // stale name on verses that then play plain TTS.
    setCreatorVoiceName('');

    const wait = (ms) => new Promise(resolve => window.setTimeout(resolve, ms));

    const playVerse = async () => {
      await wait(350);
      if (cancelled || runRef.current !== runId) return;

      initAudio();
      window.speechSynthesis?.resume?.();
      bgmRef.current?.play().catch(() => {});

      const lang = getVoiceLangForVersion(swappedRef.current ? secondaryVersion : version);
      const currentPhrases = phrasesRef.current;

      // 創作者親聲朗讀 — play the creator's recording instead of TTS when one
      // exists for this verse; falls back to TTS on any failure. Find out FIRST
      // (see VOICE_LIST_WAIT_MS) rather than racing a short timer, so a slow
      // connection doesn't turn a real recording into robot speech.
      const loadingTimer = window.setTimeout(() => {
        if (!cancelled && runRef.current === runId) setVoiceLoading(true);
      }, 900);
      const stopLoadingHint = () => { window.clearTimeout(loadingTimer); setVoiceLoading(false); };
      await Promise.race([Promise.all([verseVoicesReadyRef.current, personalVoicesReadyRef.current]), wait(VOICE_LIST_WAIT_MS)]);
      if (cancelled || runRef.current !== runId) { stopLoadingHint(); return; }
      let creatorPlayed = false;
      // Priority: my (or the share sender's / picked contributor's) personal
      // voice › set owner's › TTS. forceTTS (picker: 電腦語音) skips both layers.
      // A live manual switch (manualVoiceRef, set by the reader selector) wins
      // over everything for as long as it's set.
      const mv = manualVoiceRef.current;
      let personalRec, ownerRec;
      if (mv) {
        if (mv.type === 'tts' || mv.type === 'silent') { personalRec = null; ownerRec = null; }
        else if (mv.type === 'owner') { personalRec = null; ownerRec = voiceSetId ? (verseVoicesRef.current?.[currentVerse.reference] || null) : null; }
        else { personalRec = mv.voices?.[currentVerse.reference] || null; ownerRec = null; }
      } else {
        personalRec = forceTTSRef.current ? null : (overrideVoicesRef.current?.[currentVerse.reference] || null);
        // Default: my/shared voice › newest public human (author or any
        // contributor) › author layer › TTS. latestVoicesRef already picked the
        // most-recent recording across everyone, so a verse with any human voice
        // never falls back to TTS. Author layer stays as a fallback if /voice-latest
        // hasn't resolved.
        const latestRec = (forceTTSRef.current || !voiceSetId) ? null : (latestVoicesRef.current?.[currentVerse.reference] || null);
        const authorRec = (forceTTSRef.current || !voiceSetId) ? null : (verseVoicesRef.current?.[currentVerse.reference] || null);
        // A share link pinned to the set author's OWN voice (vo=author): the
        // author layer lives in verseVoicesRef, not the personal-override bucket
        // loadMerged() reads — so match it here so the recipient hears exactly
        // the voice that was shared instead of the newest-public default.
        if (!personalRec && sharedVoiceOwner && authorRec?.byOwnerId === sharedVoiceOwner) {
          personalRec = authorRec;
        }
        ownerRec = latestRec || authorRec || null;
      }
      // 雙語對調中一律走電腦語音 TTS:親聲/作者錄音都是用原第一語言錄的,不適用於現在朗讀的第二語言。
      if (swappedRef.current) { personalRec = null; ownerRec = null; }
      const creatorRec = personalRec || ownerRec;
      if (creatorRec?.voiceId) {
        // Attribution for the green「{name} 親聲朗讀」badge. When it's the
        // listener's OWN voice, show nothing — the blue「這節有你的親聲」badge
        // already covers it, and its stored recordedBy can be a stale
        // playerName (e.g. an earlier "hungry@G"). Set-owner / shared-sender
        // recordings keep their name.
        const isOwnVoice = creatorRec === personalRec
          && (!sharedVoiceOwner || sharedVoiceOwner === myOwnerIdRef.current) && !mv;
        const voiceLabel = isOwnVoice ? '' : (creatorRec.recordedBy || '');
        // Reader-selector label: name it even when it's my own recording, so the
        // switcher shows the current voice clearly.
        setActiveVoiceLabel(isOwnVoice ? t('我的錄音', 'My recording') : (creatorRec.recordedBy || t('錄音', 'Recording')));
        // The hint stays up through the audio download — that is the slow part
        // on a phone — and playCreatorRecording drops it the moment sound
        // actually starts.
        // 版面此時已沉澱(尺寸不再受開場動畫影響)→ 用當下正確寬度重算分頁,
        // 避免用到動畫過程中的暫時窄值(那會讓句子量得過高、一頁少放一句)。
        recomputePages();
        creatorPlayed = await playCreatorRecording(creatorRec, currentPhrases, (i) => {
          if (cancelled || runRef.current !== runId) return;
          recomputePages(); // 每句決定前用當下寬度重算(見 TTS 路徑說明)
          // 逐句就地淡入。頁面預先算好:同頁只淡入(鄰句不動);跨到新頁才整頁淡出→換頁,
          // 絕不「落底→跳頂」。
          const pg = pageForIndex(i);
          if (pg.start !== phrasePageStartRef.current) {
            setIsPageFading(true);
            window.setTimeout(() => {
              if (cancelled || runRef.current !== runId) return;
              setPhrasePageStart(pg.start); setPhrasePageEnd(pg.end);
              phrasePageStartRef.current = pg.start; phrasePageEndRef.current = pg.end;
              setIsPageFading(false);
              setActivePhrase(i);
            }, FLIP_FADE_MS);
          } else {
            if (phrasePageEndRef.current !== pg.end) { setPhrasePageEnd(pg.end); phrasePageEndRef.current = pg.end; }
            setActivePhrase(i);
          }
        }, voiceLabel, stopLoadingHint);
        if (cancelled || runRef.current !== runId) { stopLoadingHint(); return; }
      }
      stopLoadingHint();

      if (!creatorPlayed) {
      // 無聲音 (silent) — same paced block reveal as the TTS path, but speak
      // nothing: just hold each phrase for its estimated duration so the
      // background music carries the reading.
      const silent = mv?.type === 'silent';
      const readAloud = (text, rate, lng, override) =>
        silent ? wait(estimateSpeechDuration(text, lng)) : speakTextTimed(text, rate, lng, override);
      // TTS path — reflect it in the reader selector.
      if (!cancelled && runRef.current === runId) setActiveVoiceLabel(silent ? t('無聲音', 'No voice') : t('電腦語音', 'Computer voice'));
      // Resuming mid-verse: skip re-announcing the reference and pick the
      // reading up at the phrase we were on. A resume point at or past the end
      // (the verse had already finished) falls back to a normal replay.
      const resumeAt = resumeFromPhraseRef.current > 0 && resumeFromPhraseRef.current < currentPhrases.length
        ? resumeFromPhraseRef.current
        : 0;
      resumeFromPhraseRef.current = 0;

      if (resumeAt === 0) {
        await readAloud(formatVerseReferenceForSpeech(currentVerse.reference, swappedRef.current ? secondaryVersion : version), 0.9, lang, swappedRef.current ? swapVoiceRef.current : null);
        if (cancelled || runRef.current !== runId) return;
        await wait(500);
      }

      // 版面已沉澱 → 用當下正確寬度重算分頁(見上方說明)。
      recomputePages();
      for (let i = resumeAt; i < currentPhrases.length; i++) {
        if (cancelled || runRef.current !== runId) return;
        // 每句決定前用「當下」寬度重算分頁,徹底避免鏡像寬度過期(某些裝置版面沉澱較慢
        // → 一頁少放一句)。同尺寸下結果不變,不會抖動。
        recomputePages();
        // 頁面預先算好:同頁只就地淡入(鄰句不動);跨到新頁才整頁淡出→換頁,
        // 絕不「落底→跳頂」。
        const pg = pageForIndex(i);
        if (pg.start !== phrasePageStartRef.current) {
          setIsPageFading(true);
          await wait(FLIP_FADE_MS);
          if (cancelled || runRef.current !== runId) return;
          setPhrasePageStart(pg.start); setPhrasePageEnd(pg.end);
          phrasePageStartRef.current = pg.start; phrasePageEndRef.current = pg.end;
          setIsPageFading(false);
          await wait(40);
        } else if (phrasePageEndRef.current !== pg.end) {
          setPhrasePageEnd(pg.end); phrasePageEndRef.current = pg.end;
        }
        setActivePhrase(i);
        await readAloud(currentPhrases[i], 0.86, lang, swappedRef.current ? swapVoiceRef.current : null);
        if (cancelled || runRef.current !== runId) return;
        await wait(180);
      }
      } // end !creatorPlayed (TTS path)

      if (cancelled || runRef.current !== runId) return;
      setActivePhrase(currentPhrases.length);
      setIsSettled(true);
      onListenLoggedRef.current?.(currentVerse);
      const durationLimit = playDurationMinutesRef.current;
      if (durationLimit && Date.now() - playbackStartedAtRef.current >= durationLimit * 60 * 1000) {
        bgmRef.current?.pause();
        onCompleteRef.current?.();
        onStopRef.current?.();
        return;
      }
      await wait(4300);
      if (cancelled || runRef.current !== runId) return;
      if (playOnceRef.current) {
        bgmRef.current?.pause();
        onCompleteRef.current?.();
        return;
      }
      // Single-verse card: a finished verse just replays — moving only happens
      // when the listener taps ‹ ›.
      if (loopCurrent) { setPlayKey(k => k + 1); return; }
      // 按序模式 loops through the set in order; 隨機 (default) shuffles.
      const list = versesRef.current || [];
      const nextVerse = verseSet?.playOrder === 'sequential'
        ? (() => {
            const at = list.findIndex(v => v?.reference === currentVerse.reference);
            return list[(at + 1) % Math.max(1, list.length)] || null;
          })()
        : pickRandomVerse(list, currentVerse.reference);
      if (!nextVerse || nextVerse.reference === currentVerse.reference) {
        // Single-verse set — bump playKey to force replay
        setPlayKey(k => k + 1);
      } else {
        setCurrentVerse(nextVerse);
      }
    };

    playVerse();

    return () => {
      cancelled = true;
      runRef.current += 1;
      stopSpeechIfActive();
      // Pause (but never destroy) the shared creator-audio element — it
      // must stay alive to keep iOS's user-gesture blessing for later verses.
      try { creatorAudioRef.current?.pause(); } catch { /* noop */ }
    };
  // playKey is included so single-verse sets can loop via setPlayKey.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVerse?.reference, version, playKey]);

  const haltPlayback = () => {
    runRef.current += 1;
    pausedRecordingRef.current = false;
    // Any halt that isn't a pause (navigation, close, recording) starts the
    // next play from the top. togglePause re-sets this straight after.
    resumeFromPhraseRef.current = 0;
    bgmRef.current?.pause();
    stopSpeechIfActive();
    // Also silence the creator/personal recording — it plays through a
    // persistent <audio> element that stopSpeechIfActive() doesn't touch, so
    // without this Pause / the 🎙️ record button wouldn't actually stop the
    // voice (you can't record over it).
    try { creatorAudioRef.current?.pause(); } catch { /* noop */ }
  };

  const togglePause = () => {
    const audio = creatorAudioRef.current;
    if (isPaused) {
      setIsPaused(false);
      // First Play after a paused challenge-return lifts the initial-play hold
      // so the reading actually starts.
      deferInitialPlayRef.current = false;
      if (pausedRecordingRef.current && audio) {
        // Resume the recording from exactly where it was paused.
        pausedRecordingRef.current = false;
        try { bgmRef.current?.play?.(); } catch { /* noop */ }
        audio.play().catch(() => setPlayKey(k => k + 1));
      } else {
        // TTS → restart the run, but resumeFromPhraseRef (set when we paused)
        // makes it continue from that phrase rather than the top.
        setPlayKey(k => k + 1);
      }
    } else {
      setIsPaused(true);
      if (audio && audio.src && !audio.paused && !audio.ended) {
        // A voice recording is mid-playback → truly pause it (hold position),
        // WITHOUT killing the run, so Resume continues from here.
        pausedRecordingRef.current = true;
        try { audio.pause(); } catch { /* noop */ }
        try { bgmRef.current?.pause(); } catch { /* noop */ }
      } else {
        // TTS can't be held mid-utterance, so stop the run — but remember the
        // phrase we were on so Play continues from there instead of starting
        // the verse over. Set AFTER haltPlayback, which clears it.
        const resumePoint = activePhrase;
        haltPlayback();
        resumeFromPhraseRef.current = Math.max(0, resumePoint);
      }
    }
  };

  const navigateVerse = (direction) => {
    if (!showNav) return;
    // Moving off the returned-to verse resumes normal auto-play behavior.
    deferInitialPlayRef.current = false;
    setIsPaused(false);
    haltPlayback();
    const len = verses.length;
    if (!len) return;
    if (len === 1) { setPlayKey(k => k + 1); return; }
    let idx = verses.findIndex(v =>
      v.reference === currentVerse?.reference && v.text === currentVerse?.text
    );
    // The exact object may differ (deep-linked copies, edited text) — fall
    // back to reference-only so ‹ › never restart from a wrong position.
    if (idx < 0) idx = verses.findIndex(v => v.reference === currentVerse?.reference);
    if (idx < 0) idx = direction > 0 ? -1 : 0;
    let nextIdx;
    if (clampNav) {
      // Single-verse card: stop at the ends instead of wrapping.
      nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= len) return;
    } else {
      // Wrap around at both ends — the old boundary behavior replayed the
      // last verse forever, which read as「按 › 卡住」.
      nextIdx = ((idx + direction) % len + len) % len;
    }
    const next = verses[nextIdx];
    setCurrentVerse(next);
    // Same reference as the current verse (duplicate refs in a set) would
    // not retrigger the playback effect — force it via playKey.
    if (next?.reference === currentVerse?.reference) setPlayKey(k => k + 1);
  };

  const handlePrevious = () => {
    if (prevDisabled || navAtFirst) return;
    haltPlayback();
    if (onPrevious) {
      onPrevious();
      return;
    }
    navigateVerse(-1);
  };

  const handleNext = () => {
    if (nextDisabled || navAtLast) return;
    haltPlayback();
    if (onNext) {
      onNext();
      return;
    }
    navigateVerse(1);
  };
  // Disable ‹ › at the ends of a single-verse card (clampNav).
  const clampIdx = clampNav
    ? verses.findIndex(v => v.reference === currentVerse?.reference && v.text === currentVerse?.text)
    : -1;
  const navAtFirst = clampNav && clampIdx <= 0;
  const navAtLast = clampNav && clampIdx >= 0 && clampIdx >= verses.length - 1;

  const handleSelectTopicSet = (set) => {
    if (!set?.id || !onSelectTopicSet) return;
    // Navigating to another set — don't let the picker-close effect start the
    // held daily verse; the target set's own player will start playing.
    deferInitialPlayRef.current = false;
    haltPlayback();
    setShowTopicPicker(false);
    onSelectTopicSet(set);
  };
  const handlePickDailyVerse = () => {
    // While held (lobby entry) closing the picker starts today's daily verse
    // via the picker-close effect. Otherwise this jumps to the daily verse.
    if (deferInitialPlayRef.current) { setShowTopicPicker(false); return; }
    setShowTopicPicker(false);
    onSelectDailyVerse?.();
  };
  const stripTopicPrefix = (title = '') => stripTopicPrefixLabel(title);
  const currentTopicLabel = (label || verseSet?.title || t('經文組', 'Verse Set'));
  const normalizedTopicButtonLabel = stripTopicPrefix(currentTopicLabel);

  if (!currentVerse) {
    return (
      <div className="continuous-rain-overlay">
        <div className="daily-verse-rain-shell daily-verse-rain-empty">
          {t('這個經文組目前沒有可播放的經文', 'This verse set has no verses to play.')}
        </div>
      </div>
    );
  }

  return (
    <div className="continuous-rain-overlay">
      <div className={`daily-verse-rain-shell continuous-rain-shell rain-font-${fontSizeLevel} rain-ink-${PLAY_INK_OPTIONS.some(o => o.value === initialInkColor) ? initialInkColor : DEFAULT_PLAY_INK_CHOICE}`}>
        <div
          className="daily-verse-rain-scene continuous-rain-scene"
          key={`${currentVerse.reference}-${playKey}`}
        >
          {imageOk && (
            <img
              className="daily-verse-rain-image"
              src={backgroundImageUrls[imageIndex]}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(false);
                setImageIndex(current => {
                  if (current < backgroundImageUrls.length - 1) return current + 1;
                  setImageOk(false);
                  return current;
                });
              }}
            />
          )}
          {backgroundVideoUrl && videoOk && (
            <video
              className="daily-verse-rain-image"
              src={backgroundVideoUrl}
              muted
              loop
              autoPlay
              playsInline
              disablePictureInPicture
              aria-hidden="true"
              style={{ objectFit: 'cover' }}
              // A broken/unsupported clip silently drops this layer — the
              // poster <img> above keeps the scene intact.
              onError={() => setVideoOk(false)}
              onCanPlay={() => setImageLoaded(true)}
            />
          )}
          <div className={`daily-verse-rain-sky ${imageLoaded ? 'has-ai-image' : ''}`} />
          <div className="daily-verse-rain-glow" />
          <div className="daily-verse-rain-drops">
            {DAILY_RAIN_DROPS.map((drop, index) => (
              <span
                key={index}
                className={`depth-${drop.depth}`}
                style={{
                  '--x': drop.left,
                  '--y': drop.top,
                  '--drop-length': drop.length,
                  '--drop-width': drop.width,
                  '--drop-opacity': drop.opacity,
                  '--drop-duration': drop.duration,
                  '--drop-delay': drop.delay,
                  '--drop-drift': drop.drift,
                  '--drop-blur': drop.blur
                }}
              />
            ))}
          </div>
          <div className="daily-verse-rain-content continuous-rain-content">
            <div className="daily-verse-rain-topbar continuous-rain-topbar">
              {showNav && <button type="button" onClick={handlePrevious} disabled={prevDisabled || navAtFirst} aria-label={t('上一節', 'Previous verse')}>‹</button>}
              <div ref={topicPickerRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowTopicPicker(prev => !prev)}
                  className="daily-verse-rain-date continuous-rain-set-title"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15, 23, 42, 0.35)', color: 'inherit', borderRadius: '12px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 800, fontSize: '1.08rem', maxWidth: '70vw', minWidth: '150px', lineHeight: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{normalizedTopicButtonLabel}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{t('【更多的主題經文】', 'More topic verses')}</span>
                </button>
                {showTopicPicker && (() => {
                  const compareByLabel = (a, b) => {
                    const ta = stripTopicPrefix(a.title) || '';
                    const tb = stripTopicPrefix(b.title) || '';
                    try {
                      return new Intl.Collator('zh-Hant', { collation: 'stroke' }).compare(ta, tb);
                    } catch {
                      return ta.localeCompare(tb, 'zh-Hant');
                    }
                  };
                  const favorites = [...favoriteVerseSets].filter(set => set?.id).sort(compareByLabel);
                  const favoriteIds = new Set(favorites.map(set => set.id));
                  const topics = [...topicSets].filter(set => !favoriteIds.has(set?.id)).sort(compareByLabel);
                  // Anchor the popover just below the title button but center it on the
                  // viewport, not on the (off-centre) button wrapper — otherwise on a phone
                  // its right edge spills off-screen. The whole player is a fixed full-screen
                  // overlay, so position:fixed here is safe and non-scrolling.
                  const anchorRect = topicPickerRef.current?.getBoundingClientRect();
                  const dropTop = anchorRect ? Math.round(anchorRect.bottom + 8) : 72;
                  const renderSetButton = (set, isFavorite = false) => (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => handleSelectTopicSet(set)}
                      style={{ width: '100%', textAlign: 'center', border: isFavorite ? '1px solid rgba(250, 204, 21, 0.45)' : 'none', borderRadius: '8px', background: set.id === verseSet?.id ? 'rgba(59,130,246,.32)' : (isFavorite ? 'rgba(250,204,21,0.12)' : 'rgba(148,163,184,0.08)'), color: '#e2e8f0', padding: '0.5rem 0.4rem', fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.28rem' }}
                    >
                      {isFavorite && <Star size={13} fill="#facc15" color="#facc15" />}
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{stripTopicPrefix(set.title)}</span>
                    </button>
                  );
                  return (
                    <div style={{ position: 'fixed', top: dropTop, left: '50%', transform: 'translateX(-50%)', width: 'min(92vw, 560px)', maxHeight: '60vh', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.94)', border: '1px solid rgba(148, 163, 184, 0.45)', borderRadius: '14px', boxShadow: '0 16px 36px rgba(2,6,23,.45)', zIndex: 30, padding: '0.55rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {onSelectDailyVerse && (
                        <section>
                          <button
                            type="button"
                            onClick={handlePickDailyVerse}
                            style={{ width: '100%', textAlign: 'center', border: '1px solid rgba(129,140,248,0.55)', borderRadius: '8px', background: 'linear-gradient(135deg, rgba(129,140,248,0.30), rgba(99,102,241,0.22))', color: '#e2e8f0', padding: '0.6rem 0.4rem', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                          >
                            <CloudRain size={16} /> {t('每日經文', 'Daily Verse')}
                          </button>
                        </section>
                      )}
                      <section>
                        <div style={{ color: '#fde68a', fontSize: '0.78rem', fontWeight: 900, margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', width: '100%', textAlign: 'center' }}>
                          <Star size={14} fill="currentColor" /> {t('我的最愛', 'Favorites')}
                        </div>
                        {favorites.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.35rem' }}>
                            {favorites.map(set => renderSetButton(set, true))}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.45rem 0.35rem', textAlign: 'center', border: '1px dashed rgba(148,163,184,0.35)', borderRadius: '8px' }}>
                            {userEmail ? t('到經文組按星號加入', 'Star sets in Scripture Sets') : t('登入後可加入我的最愛', 'Log in to save favorites')}
                          </div>
                        )}
                      </section>
                      <section>
                        <div style={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 900, margin: '0 0 0.35rem 0.1rem' }}>
                          {t('主題經文', 'Topic verses')}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.35rem' }}>
                          {topics.map(set => renderSetButton(set))}
                        </div>
                      </section>
                    </div>
                  );
                })()}
              </div>
              {showNav && <button type="button" onClick={handleNext} disabled={nextDisabled || navAtLast} aria-label={t('下一節', 'Next verse')}>›</button>}
            </div>
            {/* Reference, its secondary-language twin and the reader credit all
                share one baseline-aligned row. They used to stack three deep
                above the verse, which is space the falling phrases need more. */}
            <div className="continuous-rain-heading">
              <h2>{formatVerseReferenceForDisplay(currentVerse.reference, activePrimaryVersion)}</h2>
              {secondaryHeadingText && (
                <span className="continuous-rain-secondary-reference">
                  {secondaryHeadingText}
                </span>
              )}
            </div>
            {voiceLoading && (
              <div style={{ textAlign: 'center', margin: '-0.1rem 0 0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>⏳ {t('正在載入朗讀…', 'Loading the reading…')}</span>
              </div>
            )}
            {voiceStatus[currentVerse.reference] === 'processing' ? (
              <div style={{ textAlign: 'center', margin: '-0.1rem 0 0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>⏳ {t('親聲處理中…（可繼續錄下一節）', 'Processing your voice… (you can record the next verse)')}</span>
              </div>
            ) : voiceStatus[currentVerse.reference] === 'error' ? (
              <div style={{ textAlign: 'center', margin: '-0.1rem 0 0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#fca5a5', fontWeight: 600 }}>⚠️ {t('親聲上傳失敗,請重錄', 'Voice upload failed — please re-record')}</span>
              </div>
            ) : myVoiceForCurrent ? (
              <div style={{ textAlign: 'center', margin: '-0.1rem 0 0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#000000', fontWeight: 600, textShadow: '0.06em 0.08em 2px rgba(255, 255, 255, 0.95), 0.12em 0.16em 8px rgba(255, 255, 255, 0.65)' }}>🎙️ {t('我的錄音', 'My recording')}</span>
                <button
                  type="button"
                  onClick={() => toggleMyVoicePublic(currentVerse.reference)}
                  disabled={personalBusy}
                  title={myVoiceForCurrent.public === false
                    ? t('不公開:只有你聽得到(拿到分享連結的人也可以)。點一下改為公開。', 'Private: only you can hear it (plus anyone you send the link to). Tap to make it public.')
                    : t('已公開:別人在這個經文組的語音選單裡可以選擇聽你的聲音。點一下改為不公開。', 'Public: others can pick your voice in this set. Tap to make it private.')}
                  style={{ marginLeft: 8, background: 'transparent', border: `1px solid ${myVoiceForCurrent.public === false ? 'rgba(100,116,139,0.8)' : 'rgba(22,163,74,0.8)'}`, color: myVoiceForCurrent.public === false ? '#475569' : '#16a34a', borderRadius: 6, padding: '1px 8px', cursor: personalBusy ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: personalBusy ? 0.5 : 1, textShadow: '0.06em 0.08em 2px rgba(255, 255, 255, 0.85)' }}
                >
                  {myVoiceForCurrent.public === false ? `🔒 ${t('不公開', 'Private')}` : `🌐 ${t('已公開', 'Public')}`}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMyVoice(currentVerse.reference)}
                  disabled={personalBusy}
                  style={{ marginLeft: 8, background: 'transparent', border: '1px solid rgba(220,38,38,0.7)', color: '#dc2626', borderRadius: 6, padding: '1px 8px', cursor: personalBusy ? 'default' : 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: personalBusy ? 0.5 : 1, textShadow: '0.06em 0.08em 2px rgba(255, 255, 255, 0.85)' }}
                >
                  {t('刪除', 'Delete')} ✕
                </button>
              </div>
            ) : null}
            <div
              ref={phraseContainerRef}
              className={`daily-verse-rain-phrases continuous-rain-phrases ${hasSecondaryPhrases ? 'has-secondary' : ''} ${isSettled ? 'is-settled' : ''} ${isPageFading ? 'is-page-fading' : ''}`}
              aria-live="polite"
            >
              {/* 整頁一次擺好(index 落在 [phrasePageStart..phrasePageEnd] 都在 DOM、占好
                  最終版位),已讀到的句子才淡入(is-revealed);未讀的占位不顯示。→ 逐句
                  就地淡入、鄰句不位移(no drop / no squeeze / no jump)。 */}
              {primaryPhrases.map((phrase, index) => {
                if (index < phrasePageStart || index > phrasePageEnd) return null;
                const secondaryPhrase = hasSecondaryPhrases
                  ? getSecondaryPhrasesForIndex(index, primaryPhrases.length, secondaryDisplayPhrases)
                  : '';
                const revealed = isSettled || index <= activePhrase;
                return (
                <span
                  key={`${phrase}-${index}`}
                  ref={node => {
                    phraseNodeRefs.current[index] = node;
                  }}
                  className={`${index === activePhrase ? 'is-active' : ''} ${revealed ? 'is-revealed' : ''}`}
                >
                  <b>{phrase}</b>
                  {secondaryPhrase && <small>{secondaryPhrase}</small>}
                </span>
                );
              })}
            </div>
            {/* 隱藏量測鏡像:寬度對齊真實容器,含全部句子,用來預先算好分頁(pagesRef)。
                離屏不可見,使用者不會看到任何 reflow。 */}
            <div
              ref={phraseMirrorRef}
              aria-hidden="true"
              className={`daily-verse-rain-phrases continuous-rain-phrases ${hasSecondaryPhrases ? 'has-secondary' : ''}`}
              style={{
                position: 'absolute',
                left: '-99999px',
                top: 0,
                visibility: 'hidden',
                pointerEvents: 'none',
                width: phraseContainerWidth ? `${phraseContainerWidth}px` : undefined,
                height: 'auto',
                maxHeight: 'none',
                minHeight: 0,
                overflow: 'visible',
              }}
            >
              {primaryPhrases.map((phrase, index) => {
                const secondaryPhrase = hasSecondaryPhrases
                  ? getSecondaryPhrasesForIndex(index, primaryPhrases.length, secondaryDisplayPhrases)
                  : '';
                return (
                  <span key={`m-${phrase}-${index}`}>
                    <b>{phrase}</b>
                    {secondaryPhrase && <small>{secondaryPhrase}</small>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* 關閉鈕獨立放在左上角（好找）；沿用 action-controls 的按鈕樣式。 */}
      <div className="continuous-rain-action-controls continuous-rain-close-topleft">
        <button
          type="button"
          className="is-icon is-stop"
          title={t('關閉', 'Close')}
          data-tip={t('關閉', 'Close')}
          onClick={() => {
            haltPlayback();
            onStop?.();
          }}
        >
          <XCircle size={22} />
        </button>
      </div>
      <div className="continuous-rain-action-controls" aria-label={t('播放操作', 'Playback actions')}>
        <span className="continuous-rain-primary-actions">
          <button
            type="button"
            className="is-icon is-play-pause"
            title={isPaused ? t('播放', 'Play') : t('暫停', 'Pause')}
            data-tip={isPaused ? t('播放', 'Play') : t('暫停', 'Pause')}
            onClick={togglePause}
          >
            {isPaused ? <Play size={22} fill="currentColor" /> : <Pause size={22} />}
          </button>
          {onChallengeVerse && (
            <button
              type="button"
              className="is-icon"
              title={t('挑戰', 'Challenge')}
              data-tip={t('挑戰', 'Challenge')}
              onClick={() => {
                haltPlayback();
                // Open the mode/difficulty chooser instead of launching straight
                // into whatever mode was last configured elsewhere.
                setChallengeChooser(loadChallengeSetup());
              }}
            >
              <Zap size={22} />
            </button>
          )}
          {onShareVerse && (
            <button
              type="button"
              className="is-icon"
              disabled={shareBusy}
              title={shareBusy
                ? t('親聲上傳中,請稍候…', 'Uploading your voice…')
                : (myVoiceForCurrent ? t('分享（附上你的親聲）', 'Share (with your voice)') : t('分享', 'Share'))}
              data-tip={shareBusy
                ? t('親聲上傳中…', 'Uploading…')
                : (myVoiceForCurrent ? t('分享（附上你的親聲）', 'Share (with your voice)') : t('分享', 'Share'))}
              onClick={async () => {
                const ref = currentVerse.reference;
                // If this verse's recording is still baking/uploading, wait for it
                // so the shared link actually carries the voice (not owner/TTS).
                const pending = uploadPromisesRef.current[ref];
                if (pending) {
                  setShareBusy(true);
                  try { await pending; } catch { /* share without the voice */ }
                  setShareBusy(false);
                }
                // Carry the voice the sharer is actually hearing (a contributor
                // like Bene, my own, or the author) so the recipient opens
                // straight into that recording. null = TTS → recipient gets the
                // set's own default (newest public voice). currentTargetOwnerId
                // mirrors playVerse's live selection, so it already accounts for
                // "my own wins" and the newest-public-voice default. The voiceId
                // rides along for personal recordings so the link keeps working
                // even if that recording is (or later becomes) unlisted.
                const tv = currentTargetVoice();
                onShareVerse(currentVerse, { voiceOwner: tv.ownerId, voiceId: tv.personal ? tv.voiceId : null });
              }}
            >
              <Share2 size={22} />
            </button>
          )}
          {onToggleFavoriteSet && (
            <button
              type="button"
              className="is-icon"
              style={isFavoriteSet
                ? { borderColor: 'rgba(250,204,21,0.9)', background: 'rgba(250,204,21,0.18)', color: '#facc15' }
                : undefined}
              title={isFavoriteSet
                ? t('從我的最愛移除', 'Remove from favorites')
                : (userEmail ? t('加入我的最愛', 'Add to favorites') : t('登入後可加入我的最愛', 'Log in to save favorites'))}
              data-tip={isFavoriteSet ? t('已在我的最愛', 'In favorites') : t('我的最愛', 'Favorites')}
              onClick={() => onToggleFavoriteSet()}
            >
              <Star size={22} fill={isFavoriteSet ? 'currentColor' : 'none'} />
            </button>
          )}
          {personalVoiceSetId && userEmail && (
            <button
              type="button"
              className={`is-icon ${myVoiceForCurrent ? 'is-primary' : ''}`}
              disabled={swapped}
              title={swapped
                ? t('對調中無法錄音，請先按還原', 'Recording is off while swapped — restore first')
                : (myVoiceForCurrent ? t('重錄我的親聲', 'Re-record my voice') : t('錄我的親聲', 'Record my voice'))}
              data-tip={swapped
                ? t('對調中無法錄音', 'Off while swapped')
                : (myVoiceForCurrent ? t('重錄', 'Re-record') : t('錄音', 'Record'))}
              onClick={() => {
                // 對調中錄音會錄到原第一語言、且以節數為 key 覆蓋該節錄音 → 停用,請先還原。
                if (swapped) return;
                haltPlayback();
                setVoiceRecTarget({ reference: currentVerse.reference, text: currentVerse.text });
              }}
            >
              <Mic size={22} />
            </button>
          )}
        </span>
        <span className="continuous-rain-language-actions">
        {voiceSetId && (activeVoiceLabel || creatorVoiceName) && (
          <span className="continuous-rain-reader" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', flexWrap: 'wrap', minWidth: 0 }}>
            <button
              type="button"
              onClick={openVoiceSwitchMenu}
              title={t('切換聲音', 'Switch voice')}
              data-tip={t('切換聲音', 'Switch voice')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.68rem', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(15,23,42,0.6)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 'min(150px, 30vw)' }}
            >
              <Mic size={16} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(activeVoiceLabel || creatorVoiceName)}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>▾</span>
            </button>
            {currentTargetOwnerId() && (
              <button
                type="button"
                onClick={openCommentsForCurrent}
                title={t('鼓勵這位朗讀者', 'Encourage this reader')}
                data-tip={t('鼓勵這位朗讀者', 'Encourage this reader')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  minWidth: 0,
                  height: 36,
                  padding: '0 0.72rem',
                  borderRadius: 999,
                  border: '1px solid rgba(250,204,21,0.72)',
                  background: 'linear-gradient(135deg, rgba(250,204,21,0.95), rgba(245,158,11,0.9))',
                  color: '#422006',
                  boxShadow: '0 8px 20px rgba(245,158,11,0.28)',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <MessageCircle size={16} />
                <span>{t('鼓勵', 'Encourage')}</span>
              </button>
            )}
          </span>
        )}
        {onSecondaryVersionChange && (
          // Tooltip lives on a wrapper span — ::after doesn't render on <select>.
          <span data-tip={t('選擇第二語言', 'Second language')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.32rem' }}>
            <select
              value={secondaryVersion || ''}
              onChange={(event) => onSecondaryVersionChange(event.target.value)}
              title={swapped ? t('正在朗讀第二語言', 'Reading the second language') : t('選擇第二語言', 'Second language')}
              style={{ minWidth: 0, flex: '0 1 142px', maxWidth: '34vw', padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {BIBLE_LANGUAGE_OPTIONS.filter(option => option.value !== version).map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </span>
        )}
        {secondaryVersion && (
          // 放在「第二語言：…」之後,用文字說明用途:一鍵改用第二語言朗讀,再按還原第一語言。
          <button
            type="button"
            disabled={!swapped && !canSwapToSecondary}
            aria-pressed={swapped}
            title={swapped
              ? t('改回第一語言朗讀', 'Back to reading the 1st language')
              : t('暫時改用第二語言朗讀（不改變 App 語言）', 'Temporarily read in the 2nd language (does not change the app language)')}
            onClick={() => {
              // 已對調 → 還原第一語言。未對調 → 讓玩家先選第二語言的朗讀語音再開始播放:
              // 有多個可選語音時開選單;只有一個或沒有就直接用它開始。純本地,不動 App 語言。
              if (swapped) { stopSwap(); return; }
              const { options, preferred } = liveSecondaryVoiceOptions();
              if (options.length > 1) {
                setSwapVoice(preferred || null); // 預先高亮偏好語音
                setSwapVoiceMenu(options);
              } else {
                startSwapWithVoice(preferred || options[0]?.voice || null);
              }
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap',
              padding: '0.45rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700,
              cursor: (!swapped && !canSwapToSecondary) ? 'not-allowed' : 'pointer',
              opacity: (!swapped && !canSwapToSecondary) ? 0.5 : 1,
              border: swapped ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.25)',
              background: swapped ? '#2563eb' : 'rgba(15,23,42,0.6)',
              color: '#fff',
            }}
          >
            <ArrowRightLeft size={16} />
            {swapped ? t('還原', 'Back') : t('朗讀', 'Read')}
          </button>
        )}
        </span>
      </div>
      {ytBgmId && !ytClosed && (
        <div className={`yt-bgm-dock is-${ytSide}`} data-testid="yt-bgm-dock">
          <div className="yt-bgm-dock__bar">
            <span className="yt-bgm-dock__title">🎵 {t('YouTube 音樂', 'YouTube music')}</span>
            <button type="button" className="yt-bgm-dock__btn" onClick={() => setYtSide(s => (s === 'top' ? 'bottom' : 'top'))} aria-label={t('移到另一邊', 'Move to the other side')} title={t('移到另一邊', 'Move to the other side')}>
              <ArrowUpDown size={16} />
            </button>
            <button
              type="button"
              className="yt-bgm-dock__btn"
              data-testid="yt-bgm-close"
              onClick={() => { bgmRef.current?.pause(); bgmRef.current?._bgmDisconnect?.(); bgmRef.current = null; setYtClosed(true); }}
              aria-label={t('關閉背景音樂', 'Turn off the music')}
              title={t('關閉背景音樂', 'Turn off the music')}
            >
              <X size={16} />
            </button>
          </div>
          <div ref={ytHostRef} className="yt-bgm-dock__player" />
          {ytState === 'error' && <p className="yt-bgm-dock__note">{t('這部影片不允許在其他網站播放，請換一部', 'This video can’t play outside YouTube — try another one')}</p>}
          {(ytState === -1 || ytState === 5) && <p className="yt-bgm-dock__note is-delayed">{t('點一下影片開始播放音樂', 'Tap the video to start the music')}</p>}
        </div>
      )}
      {voiceRecTarget && (
        <VerseVoiceRecorder
          t={t}
          reference={formatVerseReferenceForDisplay(voiceRecTarget.reference, version)}
          verseText={voiceRecTarget.text}
          onUpload={saveMyVoice}
          onCancel={() => setVoiceRecTarget(null)}
          onDone={() => setVoiceRecTarget(null)}
          showShareToggle
          zIndex={3000}
        />
      )}

      {/* 切換聲音 menu — pick which recording (or TTS) reads the set from here on */}
      {voiceMenu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setVoiceMenu(null); }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.4rem 1.3rem', width: '100%', maxWidth: 340, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 0.3rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>🎙️ {t('切換聲音', 'Switch voice')}</h3>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.82rem' }}>{formatVerseReferenceForDisplay(currentVerse.reference, version)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {voiceMenuLoading && <div style={{ color: '#94a3b8', fontSize: '0.88rem', textAlign: 'center' }}>{t('載入中…', 'Loading…')}</div>}
              {voiceMenu.options.map((opt, i) => {
                const active = manualVoiceRef.current?.type === opt.type && (opt.type === 'owner' || manualVoiceRef.current?.ownerId === opt.ownerId);
                return (
                  <button key={i} onClick={() => applyVoiceChoice(opt)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 0.85rem', borderRadius: 10, border: active ? '2px solid #8b5cf6' : '1px solid #e2e8f0', background: active ? '#f5f3ff' : '#f8fafc', color: active ? '#6d28d9' : '#334155', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    <span>🎙️</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.type === 'owner'
                        ? (opt.recordedBy ? t('作者:{n}', 'Author: {n}').replace('{n}', opt.recordedBy) : t('作者錄音', 'Author'))
                        : `${opt.recordedBy || t('某人', 'Someone')}${opt.mine ? ` ${t('(你)', '(you)')}` : ''}`}
                    </span>
                  </button>
                );
              })}
              {!voiceMenuLoading && voiceMenu.options.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '0.3rem 0' }}>{t('此節目前只有電腦語音', 'Only the computer voice for this verse')}</div>
              )}
              <button onClick={() => applyVoiceChoice({ type: 'tts' })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 0.85rem', borderRadius: 10, border: manualVoiceRef.current?.type === 'tts' ? '2px solid #8b5cf6' : '1px dashed #cbd5e1', background: '#fff', color: '#64748b', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                <span>💻</span><span style={{ flex: 1 }}>{t('電腦語音', 'Computer voice')}</span>
              </button>
              {/* 無聲音 — only background music + blocks, no TTS or recordings. */}
              <button onClick={() => applyVoiceChoice({ type: 'silent' })}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 0.85rem', borderRadius: 10, border: manualVoiceRef.current?.type === 'silent' ? '2px solid #8b5cf6' : '1px dashed #cbd5e1', background: '#fff', color: '#64748b', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                <span>🔇</span><span style={{ flex: 1 }}>{t('無聲音', 'No voice')}</span>
              </button>
            </div>
            <button onClick={() => setVoiceMenu(null)} style={{ marginTop: '1rem', width: '100%', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>{t('取消', 'Cancel')}</button>
          </div>
        </div>
      )}

      {/* 朗讀第二語言 — 先選 TTS 語音,再開始播放(挑好即進入對調並從頭朗讀)。 */}
      {swapVoiceMenu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setSwapVoiceMenu(null); }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.4rem 1.3rem', width: '100%', maxWidth: 340, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 0.3rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>🔊 {t('選擇朗讀語音', 'Choose a voice')}</h3>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.82rem' }}>
              {t('選好語音就開始用第二語言朗讀。', 'Pick a voice to start reading in the 2nd language.')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {swapVoiceMenu.map((opt) => {
                const active = voiceId(swapVoice) === opt.id;
                return (
                  <button key={opt.id} onClick={() => startSwapWithVoice(opt.voice)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 0.85rem', borderRadius: 10, border: active ? '2px solid #2563eb' : '1px solid #e2e8f0', background: active ? '#eff6ff' : '#f8fafc', color: active ? '#1d4ed8' : '#334155', fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    <span>🔊</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSwapVoiceMenu(null)} style={{ marginTop: '1rem', width: '100%', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>{t('取消', 'Cancel')}</button>
          </div>
        </div>
      )}

      {/* ⚡ 挑戰 chooser — pick mode + difficulty, then launch */}
      {challengeChooser && (
        <ChallengeSetupModal
          t={t}
          subtitle={formatVerseReferenceForDisplay(currentVerse.reference, version)}
          value={challengeChooser}
          onChange={setChallengeChooser}
          onStart={(v) => { setChallengeChooser(null); onChallengeVerse(currentVerse, v); }}
          onCancel={() => setChallengeChooser(null)}
        />
      )}
    </div>
  );
}

const Tooltip = ({ text, children }) => (
  <div className="fancy-tooltip-container">
    {children}
    <div className="fancy-tooltip-text">{text}</div>
  </div>
);
