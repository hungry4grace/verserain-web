// IconButton — an icon-only button (close, more…). `label` is required: it is
// the screen-reader name and the hover tooltip. Tap area is 44×44px.
import { forwardRef } from 'react';

const IconButton = forwardRef(function IconButton(
  { label, type = 'button', className = '', children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={['ui-icon-btn', className].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
});

export default IconButton;
