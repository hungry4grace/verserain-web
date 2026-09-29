// UiHost — renders the toast and the confirm / alert dialogs queued through
// ./feedback.js. Mount exactly once (App does). `t` supplies the default
// button labels in the current UI language.
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import Button from './Button.jsx';
import IconButton from './IconButton.jsx';
import Modal from './Modal.jsx';
import { _bindDialogHost, _bindToastHost } from './feedback.js';

const TOAST_ICON = {
  success: <CheckCircle2 size={20} />,
  error: <AlertCircle size={20} />,
  info: <Info size={20} />,
};

function ToastHost({ t }) {
  const [item, setItem] = useState(null);
  const timer = useRef(null);
  useEffect(() => _bindToastHost((next) => {
    clearTimeout(timer.current);
    setItem(next);
    if (next) timer.current = setTimeout(() => setItem(null), next.duration);
  }), []);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!item) return null;
  return (
    <div
      key={item.id}
      className={`ui-toast ui-toast--${item.kind}`}
      role={item.kind === 'error' ? 'alert' : 'status'}
      aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
      data-testid="ui-toast"
      data-kind={item.kind}
    >
      <span className="ui-toast__icon" aria-hidden="true">{TOAST_ICON[item.kind]}</span>
      <span>{item.message}</span>
      {item.kind === 'error' && (
        <IconButton className="ui-toast__close" label={t('關閉', 'Close')} onClick={() => { clearTimeout(timer.current); setItem(null); }}>
          <X size={18} />
        </IconButton>
      )}
    </div>
  );
}

function DialogHost({ t }) {
  const [queue, setQueue] = useState([]);
  useEffect(() => _bindDialogHost((item) => setQueue((q) => [...q, item])), []);
  const current = queue[0];
  if (!current) return null;
  const finish = (value) => {
    current.resolve(value);
    setQueue((q) => q.slice(1));
  };
  const isConfirm = current.type === 'confirm';
  const okLabel = current.confirmLabel || (isConfirm ? t('確定', 'OK') : t('知道了', 'Got it'));
  return (
    <Modal
      open
      key={current.id}
      role={isConfirm ? 'alertdialog' : 'dialog'}
      title={current.title}
      closeLabel={t('關閉', 'Close')}
      onClose={() => finish(false)}
      testId={isConfirm ? 'ui-confirm' : 'ui-alert'}
      footer={
        <>
          {isConfirm && (
            <Button variant="secondary" onClick={() => finish(false)} data-testid="ui-confirm-cancel" data-autofocus={current.danger ? '' : undefined}>
              {current.cancelLabel || t('取消', 'Cancel')}
            </Button>
          )}
          <Button variant={current.danger ? 'danger' : 'primary'} onClick={() => finish(true)} data-testid="ui-confirm-ok" data-autofocus={current.danger ? undefined : ''}>
            {okLabel}
          </Button>
        </>
      }
    >
      {current.message}
    </Modal>
  );
}

export default function UiHost({ t }) {
  return (
    <>
      <ToastHost t={t} />
      <DialogHost t={t} />
    </>
  );
}
