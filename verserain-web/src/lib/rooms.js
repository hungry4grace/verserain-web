// Multiplayer room codes, teams and levels — moved out of App.jsx (UI/UX 第 4 階段).

export const ROOM_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
export const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export function createRoomCode(length = 4) {
  return Array.from({ length }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join('');
}

export function sanitizeRoomCode(value) {
  return String(value || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
}

export const TEAM_OPTIONS = [
  { id: 'love', name: '仁愛隊', enName: 'Love Team', color: '#ef4444' },
  { id: 'joy', name: '喜樂隊', enName: 'Joy Team', color: '#f59e0b' },
  { id: 'peace', name: '和平隊', enName: 'Peace Team', color: '#0ea5e9' },
  { id: 'patience', name: '忍耐隊', enName: 'Patience Team', color: '#8b5cf6' },
  { id: 'kindness', name: '恩慈隊', enName: 'Kindness Team', color: '#ec4899' },
  { id: 'goodness', name: '良善隊', enName: 'Goodness Team', color: '#22c55e' },
  { id: 'faithfulness', name: '信實隊', enName: 'Faithfulness Team', color: '#14b8a6' },
  { id: 'gentleness', name: '溫柔隊', enName: 'Gentleness Team', color: '#a855f7' },
  { id: 'self-control', name: '節制隊', enName: 'Self-Control Team', color: '#64748b' }
];

export const getTeamById = (teamId, stateTeams = TEAM_OPTIONS) => {
  return (stateTeams || TEAM_OPTIONS).find(team => team.id === teamId) || TEAM_OPTIONS.find(team => team.id === teamId);
};

export const getTeamResultsFromState = (state) => {
  if (!state) return [];
  if (Array.isArray(state.teamResults) && state.teamResults.length > 0) return state.teamResults;
  const teams = state.teams || TEAM_OPTIONS;
  return teams.map(team => {
    const members = Object.values(state.players || {}).filter(p => p.connected && p.teamId === team.id);
    const membersWithScores = members.map(player => {
      const scoreFromRounds = (state.campaignResults || []).reduce((roundSum, round) => {
        return roundSum + Math.max(0, round.scores?.[player.id] || 0);
      }, 0);
      return { ...player, totalScore: Math.max(scoreFromRounds, player.bestScore || 0, player.score || 0) };
    });
    const scoringMembers = membersWithScores.filter(p => (p.versesCompleted || 0) > 0 || p.isFinished || p.totalScore > 0);
    const totalScore = scoringMembers.reduce((sum, player) => sum + player.totalScore, 0);
    return {
      ...team,
      playerCount: members.length,
      scoringCount: scoringMembers.length,
      completedCount: members.filter(p => p.isFinished).length,
      totalScore,
      averageScore: scoringMembers.length > 0 ? Math.round(totalScore / scoringMembers.length) : 0
    };
  }).filter(team => team.playerCount > 0).sort((a, b) => {
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    return b.playerCount - a.playerCount;
  });
};

export const canStartTeamMatch = (state) => {
  return hasEnoughTeamPlayers(state);
};

export const hasEnoughTeamPlayers = (state) => {
  const players = Object.values(state?.players || {}).filter(p => p.connected);
  return players.some(p => p.teamId);
};

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
