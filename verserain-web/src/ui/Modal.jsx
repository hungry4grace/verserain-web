// Modal — the shared dialog frame: title on the left, close on the top right,
// closes on the scrim, on Esc and on the ✕. Portalled to the app's root
// wrapper ([data-ui-root], which carries lang / dir / the per-language font
// stack) so no parent overflow or z-index can clip it; <body> as a fallback.
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import IconButton from './IconButton.jsx';

export default function Modal({ open, title, onClose, closeLabel = 'Close', footer = null, children, role = 'dialog', dismissible = true, className = '', testId }) {
  const titleId = useId();
  const boxRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    // Focus the button marked data-autofocus, else the dialog itself, so Esc
    // and Enter work and screen readers announce the dialog.
    const box = boxRef.current;
    (box?.querySelector('[data-autofocus]') || box)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); onCloseRef.current?.(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (prevFocus && typeof prevFocus.focus === 'function') { try { prevFocus.focus(); } catch { /* ignore */ } }
    };
  }, [open, dismissible]);

  if (!open) return null;
  return createPortal(
    <div className="ui-modal-scrim" onClick={() => { if (dismissible) onCloseRef.current?.(); }}>
      <div
        ref={boxRef}
        className={['ui-modal', className].filter(Boolean).join(' ')}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || dismissible) && (
          <div className="ui-modal__header">
            {title ? <h2 id={titleId} className="ui-modal__title">{title}</h2> : <span />}
            {dismissible && <IconButton label={closeLabel} onClick={() => onCloseRef.current?.()}><X size={22} /></IconButton>}
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.querySelector('[data-ui-root]') || document.body,
  );
}
