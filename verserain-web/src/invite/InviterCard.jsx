// Moved out of App.jsx unchanged (UI/UX 第 4 階段).

// "My Referrer" pill on the Garden page. Surfaces whether the player's
// account is bound to an inviter, so missing bindings (the QR-scan-on-iOS
// silent-loss class of bug) are immediately visible.
export function InviterCard({ inviterCode, inviterName, canEdit, onOpenBindModal, t }) {
  const bound = !!inviterCode;
  // inviterName is tri-state: undefined = looking up, null = no mapping
  // exists for this code, string = the nickname. We prefer the nickname so
  // the card never surfaces the cryptic 10-char code; only legacy inviters
  // with no name mapping fall through to "(暱稱未提供)".
  const displayName =
    inviterName === undefined ? '…'
    : inviterName === null    ? t('（暱稱未提供）', '(nickname unavailable)')
    : inviterName;
  return (
    <div
      style={{
        background: bound
          ? 'linear-gradient(135deg, #fdf4ff, #fae8ff)'
          : 'linear-gradient(135deg, #fff7ed, #fed7aa)',
        border: bound ? '1px solid #e9d5ff' : '1px solid #fdba74',
        borderRadius: '14px',
        padding: '1rem 1.2rem',
        marginBottom: '1.75rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.8rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
        <div style={{ fontSize: '1.8rem' }}>{bound ? '🌟' : '🤝'}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', color: bound ? '#6b21a8' : '#9a3412', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('我的推薦人', 'My Referrer')}
          </div>
          <div style={{ fontSize: '1.05rem', color: bound ? '#581c87' : '#7c2d12', fontWeight: 700, marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bound ? displayName : t('尚未綁定推薦人', 'No referrer bound yet')}
          </div>
        </div>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onOpenBindModal}
          style={{
            background: '#ea580c',
            color: '#fff',
            border: 'none',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('補上推薦碼', 'Add Referrer')}
        </button>
      )}
    </div>
  );
}
