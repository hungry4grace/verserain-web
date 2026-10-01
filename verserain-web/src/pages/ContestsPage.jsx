// The 讀經比賽 (contests) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { BookOpen } from 'lucide-react';
import { SearchPicker } from '../ui';

export default function ContestsPage({ t, acceptContestChallengeAction, claimContestCompletionAction, contestActionBusy, contestCreateBusy, contestCreateDraft, contestFocus, contestLeaderboards, contestMine, contestNoticeText, contestProgress, contests, createContest, joinContestAction, loadContestLeaderboard, myPlaces, poolStatusBadge, safeActiveSets, setContestCreateDraft, setMainTab, setSelectedSetId, userEmail }) {
  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1rem' };
  const h3 = { margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.05rem' };
  const field = { width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#fff' };
  const label = { display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: 700, margin: '0.8rem 0 0.25rem' };
  const list = contests?.contests || [];
  const mineByI = contestMine && !contestMine.error ? contestMine : null;
  const joinedById = new globalThis.Map((mineByI?.joined || []).map(c => [c.id, c])); // `Map` here is the lucide-react icon, not the global constructor
  const owned = mineByI?.owned || [];
  const eligibleOrgPlaces = (myPlaces || []).filter(pl => ['church', 'org'].includes(pl.kind) && pl.status === 'approved');
  const focusOrg = (list.find(c => c.id === contestFocus) || {}).orgPlaceId || '';
  const bar = (value, max) => (
    <div style={{ background: '#dbeafe', borderRadius: 999, height: 8, overflow: 'hidden' }}><div style={{ width: `${max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0}%`, background: '#2563eb', height: '100%' }} /></div>
  );
  const fmtDate = (s) => { try { return new Date(s).toLocaleDateString(); } catch { return s; } };
  const notice = (
    <div data-testid="contest-notice" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: 10, padding: '0.7rem 0.9rem', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '1rem' }}>
      ℹ️ {contestNoticeText()}
    </div>
  );
  return (
    <div style={{ backgroundColor: '#f5f8ff', borderRadius: '8px', border: '1px solid #bfdbfe', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={26} color="#2563eb" /> {t('讀經比賽', 'Reading contest')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      <p style={{ color: '#475569', lineHeight: 1.7, marginTop: 0 }}>
        {t('教會選定一組經文，公告一段期間的讀經比賽。參加後可以看到自己的讀經進度；讀完整組即可申請認證，主辦教會會另行公告獎勵方式。', 'A church picks a verse set and announces a reading contest for a set period. Join to track your progress — finish the whole set to apply for certified completion, and the church announces the reward separately.')}
      </p>
      {notice}

      <div style={card}>
        <h3 style={h3}>📖 {t('進行中的讀經比賽', 'Open reading contests')}</h3>
        {!contests ? <div style={{ color: '#94a3b8' }}>{t('載入中…', 'Loading…')}</div> : contests.error ? (
          <div style={{ color: '#b45309', fontSize: '0.9rem' }}>{String(contests.error)}</div>
        ) : list.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('目前還沒有開放中的讀經比賽。已上地圖的教會可以在下方建立。', 'No reading contest is open yet. A church already on the map can create one below.')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {list.map(c => {
              const focus = c.id === contestFocus || (!!focusOrg && c.orgPlaceId === focusOrg);
              const mineC = joinedById.get(c.id);
              const localProgress = contestProgress(c);
              const busy = contestActionBusy === c.id;
              return (
                <div key={c.id} id={`contest-${c.id}`} data-testid="contest-card" style={{ border: focus ? '2px solid #2563eb' : '1px solid #bfdbfe', background: '#fff', borderRadius: 10, padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                    <b style={{ color: '#1e293b', fontSize: '1.02rem' }}>📖 {c.name}</b>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>⛪ {c.orgPlaceName}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.2rem 0' }}>{t('經文組：{s}', 'Verse set: {s}').replace('{s}', c.setTitle)} · {fmtDate(c.startsAt)} – {fmtDate(c.endsAt)}</div>
                  {c.description ? <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, margin: '0.4rem 0', whiteSpace: 'pre-wrap' }}>{c.description}</div> : null}
                  {c.rewardDescription ? <div style={{ color: '#166534', fontSize: '0.85rem', margin: '0.3rem 0' }}>🎁 {c.rewardDescription}</div> : null}
                  <div style={{ color: '#334155', fontSize: '0.84rem' }}>{t('{n} 人參加 · {m} 人已完成', '{n} joined · {m} completed').replace('{n}', String(c.joined || 0)).replace('{m}', String(c.completed || 0))}</div>
                  {!userEmail ? (
                    <button type="button" onClick={() => joinContestAction(c)} style={{ marginTop: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', cursor: 'pointer', fontWeight: 800 }}>📖 {t('我要參加', 'I want to join')}</button>
                  ) : !mineC ? (
                    <button type="button" disabled={busy} onClick={() => joinContestAction(c)} style={{ marginTop: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', cursor: busy ? 'wait' : 'pointer', fontWeight: 800 }}>{busy ? '…' : `📖 ${t('我要參加', 'I want to join')}`}</button>
                  ) : (
                    <div style={{ marginTop: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {t('我的讀經進度', 'My reading progress')}
                          <button type="button" onClick={() => { setSelectedSetId(c.setId); setMainTab('versesets'); }} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>📖 {t('前往閱讀', 'Go read')}</button>
                        </span>
                        <b>{localProgress.passed} / {localProgress.total}</b>
                      </div>
                      {bar(localProgress.passed, localProgress.total)}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                        {mineC.completedByMe ? (
                          <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '0.25rem 0.8rem', fontSize: '0.82rem', fontWeight: 700 }}>✅ {t('已認證完成', 'Completion verified')}</span>
                        ) : localProgress.total > 0 && localProgress.passed >= localProgress.total ? (
                          <button type="button" disabled={busy} onClick={() => claimContestCompletionAction(c)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.9rem', cursor: busy ? 'wait' : 'pointer', fontWeight: 800, fontSize: '0.85rem' }}>{busy ? '…' : `✅ ${t('完成，申請認證', 'Finished — apply for completion')}`}</button>
                        ) : null}
                        {!mineC.accepted ? (
                          <button type="button" disabled={busy} onClick={() => acceptContestChallengeAction(c)} style={{ background: 'transparent', border: '1px solid #2563eb', color: '#2563eb', borderRadius: 8, padding: '0.4rem 0.9rem', cursor: busy ? 'wait' : 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>{busy ? '…' : `⚔️ ${t('接受背經文挑戰', 'Accept the memorisation challenge')}`}</button>
                        ) : (
                          <span style={{ background: '#eff6ff', color: '#1e40af', borderRadius: 999, padding: '0.25rem 0.8rem', fontSize: '0.82rem', fontWeight: 700 }}>⚔️ {t('目前分數 {s}（第 {r} 名）', 'Score {s} (rank #{r})').replace('{s}', String(mineC.myScore || 0)).replace('{r}', mineC.myRank ? String(mineC.myRank) : '—')}</span>
                        )}
                      </div>
                      {mineC.accepted && (
                        <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '0.4rem' }}>{t('到「背經文挑戰」選「{s}」這組經文來玩，每一節的最高分會自動加總到這個活動的排行榜。', 'Go to Memorise mode and pick “{s}” — your best score on each verse is added to this contest’s leaderboard automatically.').replace('{s}', c.setTitle)}</div>
                      )}
                      {contestLeaderboards[c.id] === undefined ? (
                        <button type="button" onClick={() => loadContestLeaderboard(c.id)} style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>🏆 {t('看排行榜', 'See the leaderboard')}</button>
                      ) : (
                        <div style={{ marginTop: '0.5rem' }}>
                          <b style={{ color: '#334155', fontSize: '0.85rem' }}>🏆 {t('排行榜', 'Leaderboard')}</b>
                          {contestLeaderboards[c.id].length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{t('還沒有人接受挑戰。', 'No one has accepted the challenge yet.')}</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
                              {contestLeaderboards[c.id].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', background: '#f8fafc', borderRadius: 6, padding: '0.2rem 0.6rem' }}>
                                  <span>#{i + 1} {row.who}</span><span style={{ fontWeight: 700 }}>{row.score.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {owned.length > 0 && owned.map(oc => { const b = poolStatusBadge(oc.status); return (
        <div key={oc.id} data-testid="owned-contest" style={{ ...card, border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ ...h3, margin: 0 }}>⛪ {t('我的讀經比賽', 'My reading contest')}：{oc.name}</h3>
            <span style={{ background: b.bg, color: b.fg, borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 700 }}>{b.text}</span>
          </div>
          <div style={{ color: '#334155', fontSize: '0.84rem', margin: '0.4rem 0' }}>{t('{n} 人參加 · {a} 人接受挑戰 · {m} 人已完成', '{n} joined · {a} accepted the challenge · {m} completed').replace('{n}', String(oc.joined || 0)).replace('{a}', String(oc.accepted || 0)).replace('{m}', String(oc.completed || 0))}</div>
          {oc.status === 'pending' && <div style={{ color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}>{t('已送出，等待審核', 'Submitted, awaiting review')}</div>}
          <button type="button" onClick={() => setContestCreateDraft(d => ({ ...d, orgPlaceId: oc.orgPlaceId, setId: oc.setId, name: oc.name, seriesId: oc.seriesId }))} style={{ marginTop: '0.6rem', background: 'transparent', border: '1px solid #2563eb', color: '#2563eb', borderRadius: 8, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>🔁 {t('再開一輪（沿用同系列）', 'Start another round (same series)')}</button>
        </div>
      ); })}

      {userEmail && eligibleOrgPlaces.length > 0 && (
        <div style={card} data-testid="contest-create">
          <h3 style={h3}>⛪ {t('建立讀經比賽', 'Create a reading contest')}</h3>
          <div style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6 }}>{t('你的教會／機構已在地圖上，可以選一組經文，公告一段期間的讀經比賽。', 'Your church / organisation is on the map, so it can pick a verse set and announce a reading contest for a period.')}</div>
          <label style={label}>{t('教會／機構標記', 'Church / organisation marker')}</label>
          <select value={contestCreateDraft.orgPlaceId} onChange={e => setContestCreateDraft(d => ({ ...d, orgPlaceId: e.target.value }))} style={field}>
            <option value="">{t('請選擇', 'Choose')}</option>
            {eligibleOrgPlaces.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
          </select>
          <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 4 }}>{t('同一個教會／機構可以建立多個活動（最多 5 個進行中）。', 'One church / organisation can run several contests (up to 5 open at once).')}</div>
          <label style={label}>{t('經文組', 'Verse Set')}</label>
          <SearchPicker
            testId="contest-set-picker"
            items={safeActiveSets.map(s => ({ value: s.id, label: s.title, hint: [`${(s.verses || []).length} ${t('節', 'verses')}`, s.authorName].filter(Boolean).join(' · ') }))}
            value={contestCreateDraft.setId}
            onChange={(id) => setContestCreateDraft(d => ({ ...d, setId: id }))}
            labels={{ placeholder: t('輸入經文組名稱或作者搜尋', 'Search by set name or author'), empty: t('找不到符合的經文組', 'No matching verse sets'), change: t('更換', 'Change'), more: t('還有 {n} 組，請輸入更多字縮小範圍', '{n} more — type more to narrow it down') }}
          />
          <label style={label}>{t('活動名稱', 'Contest name')}</label>
          <input type="text" maxLength={60} value={contestCreateDraft.name} onChange={e => setContestCreateDraft(d => ({ ...d, name: e.target.value }))} placeholder={t('例如：互惠經濟讀經比賽', 'e.g. Mutual Economy reading contest')} style={field} />
          <label style={label}>{t('活動說明', 'Description')}</label>
          <textarea maxLength={300} rows={3} value={contestCreateDraft.description} onChange={e => setContestCreateDraft(d => ({ ...d, description: e.target.value }))} placeholder={t('例如：讀完整組經文即完成，公告時間內截止。', 'e.g. Finish the whole set before the deadline.')} style={{ ...field, resize: 'vertical' }} />
          <label style={label}>{t('獎勵說明（由機構自行發放）', 'Reward (given by the organisation itself)')}</label>
          <textarea maxLength={300} rows={2} value={contestCreateDraft.rewardDescription} onChange={e => setContestCreateDraft(d => ({ ...d, rewardDescription: e.target.value }))} placeholder={t('例如：完成者致贈紀念品一份', 'e.g. A keepsake for everyone who finishes')} style={{ ...field, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={label}>{t('開始日期', 'Start date')}</label>
              <input type="date" value={contestCreateDraft.startsAt} onChange={e => setContestCreateDraft(d => ({ ...d, startsAt: e.target.value }))} style={field} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={label}>{t('結束日期', 'End date')}</label>
              <input type="date" value={contestCreateDraft.endsAt} onChange={e => setContestCreateDraft(d => ({ ...d, endsAt: e.target.value }))} style={field} />
            </div>
          </div>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.8rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
            <input type="checkbox" checked={contestCreateDraft.agree} onChange={e => setContestCreateDraft(d => ({ ...d, agree: e.target.checked }))} style={{ marginTop: 3 }} />
            <span>{t('我確認本機構了解：獎勵由機構自行發放，經文雨僅記錄完成名單，不經手任何獎勵或款項。', 'I confirm the organisation understands it hands out the reward itself — VerseRain only records who completed and never handles the reward or any money.')}</span>
          </label>
          <button type="button" disabled={contestCreateBusy || !contestCreateDraft.agree || !contestCreateDraft.orgPlaceId || !contestCreateDraft.setId} onClick={createContest} style={{ marginTop: '0.8rem', background: (contestCreateDraft.agree && contestCreateDraft.orgPlaceId && contestCreateDraft.setId) ? '#2563eb' : '#e2e8f0', color: (contestCreateDraft.agree && contestCreateDraft.orgPlaceId && contestCreateDraft.setId) ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '0.5rem 1.1rem', cursor: contestCreateBusy ? 'wait' : 'pointer', fontWeight: 800 }}>{contestCreateBusy ? '…' : `📖 ${t('送出審核', 'Submit for review')}`}</button>
        </div>
      )}
    </div>
  );
}
