// Full Screen Panel / Immersive container with Back-Close rules (IA v1.1 §25).
import type { ReactNode } from 'react';
import { useGameNav } from '@/app/navigation';

interface Props {
  title: string;
  subtitle?: string;
  /** 'close' = top-level panel -> HOME ; 'back' = previous panel ; 'none' = back disabled (immersive) */
  nav?: 'close' | 'back' | 'none';
  right?: ReactNode;
  footer?: ReactNode;
  immersive?: boolean;
  flush?: boolean;
  children: ReactNode;
}

export function Panel({ title, subtitle, nav = 'back', right, footer, immersive, flush, children }: Props) {
  const { back, closeToHome } = useGameNav();
  return (
    <div className={`panel ${immersive ? 'panel--immersive' : ''}`}>
      <header className="panel__header">
        {nav === 'none' ? (
          <span className="panel__nav panel__nav--disabled" aria-hidden>·</span>
        ) : (
          <button className="panel__nav" onClick={nav === 'close' ? closeToHome : back} aria-label={nav === 'close' ? 'close' : 'back'}>
            {nav === 'close' ? '×' : '←'}
          </button>
        )}
        <div className="grow">
          <div className="panel__title">{title}</div>
          {subtitle && <div className="panel__sub">{subtitle}</div>}
        </div>
        {right}
      </header>
      <div className={`panel__body ${flush ? 'panel__body--flush' : ''}`}>{children}</div>
      {footer && <div className="panel__footer">{footer}</div>}
    </div>
  );
}
