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
  /** 배경(월드/장면)이 비치는 화면. 패널 자체는 면을 깔지 않고 내용만 얹는다. */
  scene?: boolean;
  /** 패널 전체 뒤에 까는 레이어. 스크롤에 휩쓸리지 않고 HUD 아래까지 덮는다. */
  background?: ReactNode;
  /** 헤더를 패널이 그리지 않는다. 화면이 제목·닫기를 자기 그룹 안에 직접 넣을 때 쓴다. */
  hideHeader?: boolean;
  children: ReactNode;
}

export function Panel({ title, subtitle, nav = 'back', right, footer, immersive, flush, scene, background, hideHeader, children }: Props) {
  const { back, closeToHome } = useGameNav();
  return (
    <div className={`panel ${immersive ? 'panel--immersive' : ''} ${scene ? 'panel--scene' : ''}`}>
      {background}
      {!hideHeader && (
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
      )}
      <div className={`panel__body ${flush ? 'panel__body--flush' : ''}`}>{children}</div>
      {footer && <div className="panel__footer">{footer}</div>}
    </div>
  );
}
