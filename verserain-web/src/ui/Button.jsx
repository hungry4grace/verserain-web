// Button — the one button of the app (UI/UX 第 1 階段).
//   variant: 'primary' | 'secondary' | 'text' | 'danger'
//   size:    'lg' | 'md' | 'sm'   (every size keeps a 44px tap height)
//   icon:    a lucide element shown left of the label
//   loading: shows a spinner and disables the button
import { forwardRef } from 'react';

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon = null, loading = false, block = false, type = 'button', className = '', disabled, children, ...rest },
  ref,
) {
  const cls = ['ui-btn', `ui-btn--${variant}`, size !== 'md' && `ui-btn--${size}`, block && 'ui-btn--block', className]
    .filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon && <span className="ui-btn__icon" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
});

export default Button;
