// 題庫創作者親聲朗讀 — client API for per-verse creator recordings on
// custom verse sets. Keyed by (setId, reference): the same verse in two
// different sets carries two independent recordings. One recording per
// (set, verse); re-recording replaces (server enforces same-email).
//
// Audio rides the same chunked-base64 pattern as team voice messages:
// upload slices → register the pointer → listeners fetch + reassemble.

const HOST = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db';

async function jpost(path, body) {
  const res = await fetch(`${HOST}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

async function jget(path) {
  const res = await fetch(`${HOST}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const setVoiceApi = {
  uploadChunk: (email, setId, voiceId, index, total, data) =>
    jpost('/sets/verse-voice/chunk', { email, setId, voiceId, index, total, data }),
  register: (email, setId, reference, { voiceId, voiceMime, voiceDur, recordedBy }) =>
    jpost('/sets/verse-voice/set', { email, setId, reference, voiceId, voiceMime, voiceDur, recordedBy }),
  // { voices: { [reference]: { voiceId, voiceMime, voiceDur, recordedBy, at } } }
  getAll: (setId) =>
    jget(`/sets/verse-voices?setId=${encodeURIComponent(setId)}`),
  getAudio: (setId, voiceId) =>
    jget(`/sets/voice?setId=${encodeURIComponent(setId)}&voiceId=${encodeURIComponent(voiceId)}`),
};

// Convenience: record-blob → chunk upload → register, in one call.
// Returns the registered meta. Throws with a readable message on failure
// (including the 403 "someone else recorded this" case).
export async function uploadVerseVoice({ email, setId, reference, blob, mime, dur, recordedBy }) {
  const base64 = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
  const CHUNK = 100000; // chars — under the backend's 110000 cap
  const total = Math.ceil(base64.length / CHUNK);
  if (total > 6) throw new Error('Recording too long — keep it under 2 minutes.');
  const voiceId = 'v_' + Math.random().toString(36).slice(2, 12);
  for (let i = 0; i < total; i++) {
    await setVoiceApi.uploadChunk(email, setId, voiceId, i, total, base64.slice(i * CHUNK, (i + 1) * CHUNK));
  }
  const res = await setVoiceApi.register(email, setId, reference, {
    voiceId, voiceMime: mime, voiceDur: dur, recordedBy,
  });
  return res.verseVoice;
}
