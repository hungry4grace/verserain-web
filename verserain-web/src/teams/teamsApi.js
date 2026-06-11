// Tiny client for the /teams/* PartyKit endpoints. Identity is always email
// (lowercased server-side); display names are resolved on read because
// playerName is mutable (see project_playername_evolution memory).

const HOST = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db';

async function jpost(path, body) {
  const res = await fetch(`${HOST}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status}`);
  return data;
}

async function jget(path) {
  const res = await fetch(`${HOST}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status}`);
  return data;
}

export const teamsApi = {
  myTeams: (email) =>
    jget(`/my-teams?email=${encodeURIComponent(email)}`),
  markRead: (email, teamId) =>
    jpost('/teams/mark-read', { email, teamId }),
  create: (email, name, description) =>
    jpost('/teams/create', { email, name, description }),
  get: (email, teamId) =>
    jget(`/teams/get?id=${encodeURIComponent(teamId)}&email=${encodeURIComponent(email)}`),
  update: (email, teamId, patch) =>
    jpost('/teams/update', { email, teamId, ...patch }),
  regenInvite: (email, teamId) =>
    jpost('/teams/regen-invite', { email, teamId }),
  join: (email, inviteCode) =>
    jpost('/teams/join', { email, inviteCode }),
  leave: (email, teamId) =>
    jpost('/teams/leave', { email, teamId }),
  promote: (email, teamId, targetEmail) =>
    jpost('/teams/promote', { email, teamId, targetEmail }),
  demote: (email, teamId, targetEmail) =>
    jpost('/teams/demote', { email, teamId, targetEmail }),
  disband: (email, teamId) =>
    jpost('/teams/disband', { email, teamId }),
  getSchedule: (email, teamId) =>
    jget(`/teams/schedule?id=${encodeURIComponent(teamId)}&email=${encodeURIComponent(email)}`),
  saveSchedule: (email, teamId, schedule) =>
    jpost('/teams/schedule', { email, teamId, schedule }),
  getProgress: (email, teamId) =>
    jget(`/teams/progress?id=${encodeURIComponent(teamId)}&email=${encodeURIComponent(email)}`),
  // New: verified completion derived from VerseRain campaign scores.
  // Returns { setStatus: { setId: { email: { status, passedCount, totalCount } } } }.
  getTeamSetProgress: (email, teamId) =>
    jget(`/teams/team-set-progress?id=${encodeURIComponent(teamId)}&email=${encodeURIComponent(email)}`),
  cheer: (email, teamId, targetEmail, emoji, text) =>
    jpost('/teams/cheer', { email, teamId, targetEmail, emoji, text: text || '' }),
  getCheers: (email, teamId) =>
    jget(`/teams/cheers?id=${encodeURIComponent(teamId)}&email=${encodeURIComponent(email)}`),
  listReflections: (email, teamId, itemId) => {
    const q = `id=${encodeURIComponent(teamId)}&email=${encodeURIComponent(email)}` +
      (itemId ? `&itemId=${encodeURIComponent(itemId)}` : '');
    return jget(`/teams/reflections?${q}`);
  },
  createReflection: (email, teamId, itemId, type, text, verseRef = '') =>
    jpost('/teams/reflections/create', { email, teamId, itemId, type, text, verseRef }),
  deleteReflection: (email, teamId, itemId, reflectionId) =>
    jpost('/teams/reflections/delete', { email, teamId, itemId, reflectionId }),
  reactReflection: (email, teamId, itemId, reflectionId, emoji) =>
    jpost('/teams/reflections/react', { email, teamId, itemId, reflectionId, emoji }),
  getStats: (email, teamId) =>
    jget(`/teams/stats?id=${encodeURIComponent(teamId)}&email=${encodeURIComponent(email)}`),
};

export const CHEER_EMOJIS = ['❤️', '🙏', '✨', '🌧️'];
