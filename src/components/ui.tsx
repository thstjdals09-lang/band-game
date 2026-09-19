// Small shared UI primitives (dark management UI language - Visual Bible §07).
import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

// ---------------- Buttons
interface BtnProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'amber' | 'default';
  size?: 'sm' | 'md';
  full?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  type?: 'button' | 'submit';
}
export function Btn({ variant = 'default', size = 'md', full, disabled, onClick, children, type = 'button' }: BtnProps) {
  const cls = ['btn', variant !== 'default' ? `btn--${variant}` : '', size === 'sm' ? 'btn--sm' : '', full ? 'btn--full' : ''].join(' ');
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick}>{children}</button>
  );
}

// ---------------- Stat bar
export function StatBar({ label, value, tone }: { label: string; value: number; tone?: 'amber' }) {
  return (
    <div className={`statbar ${tone ? `statbar--${tone}` : ''}`}>
      <span className="statbar__label">{label}</span>
      <div className="statbar__track"><div className="statbar__fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
      <span className="statbar__value">{value}</span>
    </div>
  );
}

// ---------------- Tag
export function Tag({ children, tone }: { children: ReactNode; tone?: 'role' | 'accent' | 'amber' | 'ok' }) {
  return <span className={`tag ${tone ? `tag--${tone}` : ''}`}>{children}</span>;
}

// ---------------- Grade
export function GradeLabel({ value }: { value: string }) {
  return <span className={`grade grade--${value}`}>{value}</span>;
}

// ---------------- Section
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__title"><span>{title}</span>{aside}</div>
      {children}
    </section>
  );
}

// ---------------- Empty state
export function EmptyState({ text, action }: { text: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div>{text}</div>
      {action && <div className="mt12">{action}</div>}
    </div>
  );
}

// ---------------- Sub tabs
export function SubTabs({ tabs }: { tabs: { label: string; to: string; end?: boolean }[] }) {
  return (
    <nav className="subtabs">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} replace className={({ isActive }) => `subtabs__item ${isActive ? 'subtabs__item--active' : ''}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

// ---------------- Bottom sheet (Overlay layer - IA §4)
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="sheet__header"><span>{title}</span><button className="panel__nav" onClick={onClose} aria-label="close">×</button></div>
        <div className="sheet__body">{children}</div>
      </div>
    </>
  );
}

// ---------------- Design notes rendered in UI for prototype review
export function Todo({ children }: { children: ReactNode }) {
  return <div className="todo mt8">TODO · {children}</div>;
}
