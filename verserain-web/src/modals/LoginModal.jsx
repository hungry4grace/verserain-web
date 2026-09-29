// Log in / sign up / enter the e-mailed code — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { OAuthButtons } from '../auth/OAuthButtons.jsx';
import { XCircle } from 'lucide-react';
import { alertDialog, toast } from '../ui';

export default function LoginModal({ t, applyPasswordLogin, authError, authLoading, handleOAuthSignIn, playerName, setAuthError, setAuthLoading, setShowLoginModal, setVerifyEmail, showLoginModal, verifyEmail }) {
  return (
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
  );
}
