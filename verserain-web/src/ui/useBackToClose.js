// useBackToClose — the phone's Back button closes an open dialog instead of
// leaving the page (UI/UX 第 2 階段).
//
// While `isOpen`, one history entry is pushed with the same URL and a
// `uiModal` marker. Back pops it → onClose(). Closing the dialog any other way
// (✕, Esc, a button) removes that entry again — but only when it is still the
// current entry, checked after the render settles, so an action that
// navigates on close (its own pushState) is never undone by our history.back().
import { useEffect, useLayoutEffect, useRef } from 'react';

let seq = 0;

export default function useBackToClose(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    const id = `m${++seq}`;
    let closedByBack = false;
    try { window.history.pushState({ ...(window.history.state || {}), uiModal: id }, ''); } catch { return undefined; }
    const onPop = () => {
      if (window.history.state?.uiModal === id) return;
      closedByBack = true;
      onCloseRef.current?.();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (closedByBack) return;
      setTimeout(() => {
        if (window.history.state?.uiModal === id) window.history.back();
      }, 0);
    };
  }, [isOpen]);
}
