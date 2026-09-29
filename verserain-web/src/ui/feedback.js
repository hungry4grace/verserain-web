// Imperative toast / confirm / alert API (UI/UX 第 1 階段).
//
// Callable from anywhere — event handlers, helpers outside React, child
// components — without prop drilling. <UiHost/> (mounted once in App) renders
// whatever is queued here. Replaces window.alert / window.confirm, which do
// nothing inside the iOS app's WKWebView.
//
//   toast('已複製')                      → kind guessed from the text
//   toast.success(msg) / toast.error(msg) / toast.info(msg)
//   toast.dismiss()
//   await confirmDialog({ title, message, confirmLabel, danger }) → true/false
//   await alertDialog({ title, message })                          → resolves on OK

let toastListener = null;
let dialogListener = null;
let pendingToast = null;
const pendingDialogs = [];

const ERROR_RE = /失敗|錯誤|无法|無法|找不到|不正確|不能|failed|error|invalid|could not|cannot|can't/i;
const SUCCESS_RE = /^\s*(🎉|✓|✅)|✓\s*$|已(複製|儲存|更新|刪除|加入|匯入|送出|登記|綁定|核銷|開啟|整理|上傳|投入|接受|認證)|成功|copied|saved|updated|deleted|added|success/i;

export function guessToastKind(message) {
  const s = String(message ?? '');
  if (ERROR_RE.test(s)) return 'error';
  if (SUCCESS_RE.test(s)) return 'success';
  return 'info';
}

// Long messages stay longer; errors stay 1.5× as long.
export function toastDuration(message, kind) {
  const base = Math.min(7000, Math.max(3000, 2000 + String(message ?? '').length * 60));
  return kind === 'error' ? Math.round(base * 1.5) : base;
}

let seq = 0;
function show(message, kind) {
  if (message == null || message === '') { dismiss(); return; }
  const k = kind || guessToastKind(message);
  const item = { id: ++seq, message: String(message), kind: k, duration: toastDuration(message, k) };
  if (toastListener) toastListener(item); else pendingToast = item;
}
function dismiss() {
  pendingToast = null;
  if (toastListener) toastListener(null);
}

export const toast = Object.assign((message) => show(message), {
  success: (message) => show(message, 'success'),
  error: (message) => show(message, 'error'),
  info: (message) => show(message, 'info'),
  dismiss,
});

function openDialog(spec) {
  return new Promise((resolve) => {
    const item = { ...spec, id: ++seq, resolve };
    if (dialogListener) dialogListener(item); else pendingDialogs.push(item);
  });
}

export function confirmDialog({ title, message, confirmLabel, cancelLabel, danger = false } = {}) {
  return openDialog({ type: 'confirm', title, message, confirmLabel, cancelLabel, danger });
}

export function alertDialog({ title, message, confirmLabel } = {}) {
  return openDialog({ type: 'alert', title, message, confirmLabel });
}

// Host wiring (UiHost only).
export function _bindToastHost(fn) {
  toastListener = fn;
  if (fn && pendingToast) { const p = pendingToast; pendingToast = null; fn(p); }
  return () => { if (toastListener === fn) toastListener = null; };
}
export function _bindDialogHost(fn) {
  dialogListener = fn;
  if (fn) while (pendingDialogs.length) fn(pendingDialogs.shift());
  return () => { if (dialogListener === fn) dialogListener = null; };
}
