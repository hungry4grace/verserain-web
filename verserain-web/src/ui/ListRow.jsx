// ListRow — one tappable row in a grouped list: icon · title + description ·
// optional badge · chevron. Rows in a group sit in a <ListGroup> card.
import { ChevronRight } from 'lucide-react';

export function ListGroup({ title, children, testId }) {
  return (
    <section className="ui-list-group" data-testid={testId}>
      {title && <h2 className="ui-list-group__title">{title}</h2>}
      <div className="ui-list-group__rows">{children}</div>
    </section>
  );
}

export default function ListRow({ icon = null, iconColor, title, desc, badge = null, onClick, testId }) {
  return (
    <button type="button" className="ui-list-row" onClick={onClick} data-testid={testId}>
      {icon && <span className="ui-list-row__icon" style={iconColor ? { color: iconColor } : undefined} aria-hidden="true">{icon}</span>}
      <span className="ui-list-row__text">
        <span className="ui-list-row__title">{title}</span>
        {desc && <span className="ui-list-row__desc">{desc}</span>}
      </span>
      {badge}
      <ChevronRight className="ui-list-row__chevron" size={20} aria-hidden="true" />
    </button>
  );
}
