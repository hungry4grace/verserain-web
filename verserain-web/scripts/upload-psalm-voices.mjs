#!/usr/bin/env node
// Upload human-narrated Psalm recordings as the "creator voice" of the
// Psalms verse sets, so the player uses them instead of TTS.
//
// Recordings are keyed by (set id, reference) in PartyKit — the same store
// the in-app 🎙️ recorder writes — so nothing in the bundled verse data
// changes. Each Psalm N goes to the book set that contains it
// (Psalm 1–41 → Book I, …) under the reference "Psalm N", credited to the
// narrator you pass (default "Melody Hwang").
//
// Usage (run on your own machine, not in the cloud sandbox):
//   node scripts/upload-psalm-voices.mjs <folder> [--only 1,23,119] [--version esv|kjv|niv|all]
//        [--narrator "Melody Hwang"] [--email you@example.com] [--bitrate 64k] [--force] [--dry-run]
//
// <folder> holds files named like Bible_19_Psalms_1.wav (or .mp3). WAV/other
// formats are converted to mono MP3 with ffmpeg (brew install ffmpeg, or
// npm i -D ffmpeg-static). MP3 inputs are sent as they are.
//
// --version   which set family gets the recording (default esv; "all" = esv+kjv+niv)
// --email     the account that owns the recordings (must be an admin or the
//             first recorder; default hungry4grace@gmail.com)
// --force     replace a recording that already exists for that Psalm
// --dry-run   convert + report, but do not upload
//
// Limits (server side): ≤ 120 chunks ≈ 9 MB per recording, duration clamp
// 30 min. A 15-minute Psalm at 64 kbps mono is ≈ 7 MB; the script drops to
// 48 kbps automatically for anything longer than 14 minutes.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const HOST = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db';
const CHUNK = 100000; // base64 chars per chunk (server cap 110000)
const MAX_CHUNKS = 120;
const MAX_DUR = 1800; // seconds — must match the server clamp

const BOOKS = [
  { from: 1, to: 41, esv: 'psalms-book-i-esv', kjv: 'psalms-1-41-kjv', niv: 'psalms-1-41-niv' },
  { from: 42, to: 72, esv: 'psalms-book-ii-esv', kjv: 'psalms-42-72-kjv', niv: 'psalms-42-72-niv' },
  { from: 73, to: 89, esv: 'psalms-book-iii-esv', kjv: 'psalms-73-89-kjv', niv: 'psalms-73-89-niv' },
  { from: 90, to: 106, esv: 'psalms-book-iv-esv', kjv: 'psalms-90-106-kjv', niv: 'psalms-90-106-niv' },
  { from: 107, to: 150, esv: 'psalms-book-v-esv', kjv: 'psalms-107-150-kjv', niv: 'psalms-107-150-niv' },
];
export function setIdFor(psalm, version) {
  const b = BOOKS.find((x) => psalm >= x.from && psalm <= x.to);
  return b ? b[version] : null;
}
export function psalmNumberOf(filename) {
  const m = /Psalms?[ _-]*(\d{1,3})(?!\d)/i.exec(path.basename(filename));
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 150 ? n : null;
}

// ---------- args ----------
function parseArgs(argv) {
  const a = { folder: null, only: null, version: 'esv', narrator: 'Melody Hwang', email: 'hungry4grace@gmail.com', bitrate: '64k', force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--only') a.only = new Set(String(argv[++i]).split(',').map((s) => Number(s.trim())).filter(Boolean));
    else if (v === '--version') a.version = String(argv[++i]).toLowerCase();
    else if (v === '--narrator') a.narrator = String(argv[++i]);
    else if (v === '--email') a.email = String(argv[++i]).toLowerCase();
    else if (v === '--bitrate') a.bitrate = String(argv[++i]);
    else if (v === '--force') a.force = true;
    else if (v === '--dry-run') a.dryRun = true;
    else if (!a.folder) a.folder = v;
  }
  return a;
}

// ---------- audio helpers ----------
async function findFfmpeg() {
  try { const m = await import('ffmpeg-static'); if (m.default && fs.existsSync(m.default)) return m.default; } catch { /* not installed */ }
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return probe.status === 0 ? 'ffmpeg' : null;
}
function ffDuration(ffmpeg, file) {
  const r = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' });
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(r.stderr || '');
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}
function wavDuration(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(4096); fs.readSync(fd, head, 0, 4096, 0);
    if (head.toString('ascii', 0, 4) !== 'RIFF') return 0;
    let p = 12, byteRate = 0, dataLen = 0;
    while (p + 8 <= head.length) {
      const id = head.toString('ascii', p, p + 4); const len = head.readUInt32LE(p + 4);
      if (id === 'fmt ') byteRate = head.readUInt32LE(p + 16);
      if (id === 'data') { dataLen = len; break; }
      p += 8 + len + (len % 2);
    }
    return byteRate ? dataLen / byteRate : 0;
  } finally { fs.closeSync(fd); }
}
// Frame-walk an MP3 so the duration is right for CBR and VBR alike.
export function mp3Duration(buf) {
  const BR = { 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
  const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  let p = 0;
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'ID3') p = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
  let samples = 0, rate = 0;
  while (p + 4 <= buf.length) {
    if (buf[p] === 0xff && (buf[p + 1] & 0xe0) === 0xe0) {
      const ver = (buf[p + 1] >> 3) & 3; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
      const layer = (buf[p + 1] >> 1) & 3; // 1 = Layer III
      const bri = buf[p + 2] >> 4, sri = (buf[p + 2] >> 2) & 3, pad = (buf[p + 2] >> 1) & 1;
      if (ver !== 1 && layer === 1 && bri > 0 && bri < 15 && sri < 3) {
        const mpeg1 = ver === 3;
        const kbps = BR[mpeg1 ? 1 : 2][bri]; const sr = SR[ver][sri];
        const frameLen = Math.floor((mpeg1 ? 144000 : 72000) * kbps / sr) + pad;
        if (frameLen > 4) { samples += mpeg1 ? 1152 : 576; rate = sr; p += frameLen; continue; }
      }
    }
    p += 1;
  }
  return rate ? samples / rate : 0;
}

// ---------- PartyKit ----------
async function jpost(p, body) {
  const res = await fetch(`${HOST}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
async function existingVoices(setId) {
  const res = await fetch(`${HOST}/sets/verse-voices?setId=${encodeURIComponent(setId)}`);
  const data = await res.json().catch(() => ({}));
  return (data && data.voices) || {};
}
async function upload({ email, setId, reference, base64, mime, dur, recordedBy }) {
  const total = Math.ceil(base64.length / CHUNK);
  if (total > MAX_CHUNKS) throw new Error(`too big: ${total} chunks (max ${MAX_CHUNKS}) — lower --bitrate`);
  const voiceId = 'v_' + Math.random().toString(36).slice(2, 12);
  for (let i = 0; i < total; i++) {
    await jpost('/sets/verse-voice/chunk', { email, setId, voiceId, index: i, total, data: base64.slice(i * CHUNK, (i + 1) * CHUNK) });
    process.stdout.write(`\r    chunk ${i + 1}/${total}`);
  }
  process.stdout.write('\n');
  const res = await jpost('/sets/verse-voice/set', { email, setId, reference, voiceId, voiceMime: mime, voiceDur: dur, recordedBy });
  return res.verseVoice;
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.folder || !fs.existsSync(args.folder)) {
    console.error('Usage: node scripts/upload-psalm-voices.mjs <folder with Bible_19_Psalms_N.wav|mp3> [--only 1,23] [--version esv|kjv|niv|all] [--narrator "Melody Hwang"] [--dry-run]');
    process.exit(1);
  }
  const versions = args.version === 'all' ? ['esv', 'kjv', 'niv'] : [args.version];
  for (const v of versions) if (!['esv', 'kjv', 'niv'].includes(v)) { console.error(`unknown --version ${v}`); process.exit(1); }

  const files = fs.readdirSync(args.folder)
    .filter((f) => /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(f))
    .map((f) => ({ file: path.join(args.folder, f), psalm: psalmNumberOf(f) }))
    .filter((x) => x.psalm && (!args.only || args.only.has(x.psalm)))
    .sort((a, b) => a.psalm - b.psalm);
  if (!files.length) { console.error('No Psalm files matched (expected names like Bible_19_Psalms_1.wav).'); process.exit(1); }

  const ffmpeg = await findFfmpeg();
  const needsFf = files.some((x) => !/\.mp3$/i.test(x.file));
  if (needsFf && !ffmpeg) { console.error('ffmpeg not found. Install it (brew install ffmpeg) or run: npm i -D ffmpeg-static'); process.exit(1); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'psalm-voices-'));

  const known = {};
  if (!args.dryRun) for (const v of versions) for (const b of BOOKS) known[b[v]] = await existingVoices(b[v]);

  let ok = 0, skipped = 0, failed = 0;
  for (const { file, psalm } of files) {
    const reference = `Psalm ${psalm}`;
    let mp3 = file;
    let dur = 0;
    try {
      if (!/\.mp3$/i.test(file)) {
        const srcDur = ffmpeg ? ffDuration(ffmpeg, file) : wavDuration(file);
        const bitrate = srcDur > 14 * 60 ? '48k' : args.bitrate;
        mp3 = path.join(tmp, `psalm-${psalm}.mp3`);
        const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '44100', '-b:a', bitrate, mp3], { stdio: 'inherit' });
        if (r.status !== 0) throw new Error('ffmpeg conversion failed');
      }
      const buf = fs.readFileSync(mp3);
      dur = Math.round(ffmpeg ? ffDuration(ffmpeg, mp3) : mp3Duration(buf));
      if (!dur) dur = Math.round(mp3Duration(buf));
      if (dur > MAX_DUR) throw new Error(`recording is ${dur}s, over the ${MAX_DUR}s server limit`);
      const base64 = buf.toString('base64');
      const chunks = Math.ceil(base64.length / CHUNK);
      console.log(`${reference}: ${(buf.length / 1e6).toFixed(2)} MB, ${Math.floor(dur / 60)}m${String(dur % 60).padStart(2, '0')}s, ${chunks} chunks`);
      if (chunks > MAX_CHUNKS) throw new Error(`too big (${chunks} chunks > ${MAX_CHUNKS}) — use --bitrate 48k or 32k`);
      for (const v of versions) {
        const setId = setIdFor(psalm, v);
        const cur = known[setId] && known[setId][reference];
        if (cur && !args.force) { console.log(`  ${setId}: already has a recording by ${cur.recordedBy || '?'} (${cur.at}) — skipped (use --force)`); skipped += 1; continue; }
        if (args.dryRun) { console.log(`  ${setId}: would upload as "${args.narrator}"`); ok += 1; continue; }
        const meta = await upload({ email: args.email, setId, reference, base64, mime: 'audio/mpeg', dur, recordedBy: args.narrator });
        console.log(`  ${setId}: uploaded ${meta.voiceId} (${meta.voiceDur}s, by ${meta.recordedBy})`);
        ok += 1;
      }
    } catch (e) {
      failed += 1;
      console.error(`  ${reference}: FAILED — ${e.message}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nDone: ${ok} uploaded${args.dryRun ? ' (dry run)' : ''}, ${skipped} skipped, ${failed} failed.`);
  if (failed) process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
