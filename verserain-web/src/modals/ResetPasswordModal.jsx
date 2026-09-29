// Set a new password from the e-mailed reset link — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { toast } from '../ui';

export default function ResetPasswordModal({ t, resetBusy, resetError, resetToken, setResetBusy, setResetError, setResetToken, setShowLoginModal }) {
  return (
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
  );
}
