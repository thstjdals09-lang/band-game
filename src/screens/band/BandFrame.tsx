// BAND HUB frame (IA §7): first screen principle = CURRENT LINEUP, not the roster.
// Long-term shells (기록 / 프로필 / 차트) live behind the overflow entry, not on the first screen.
import { useState, type ReactNode } from 'react';
import { useSave } from '@/state/store';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { BottomSheet, SubTabs, Tag } from '@/components/ui';

const SECONDARY = [
  { label: '커리어 기록', to: '/band/archive', tag: '타임라인', locked: false },
  { label: '공개 프로필', to: '/band/profile', tag: '미리보기', locked: false },
  { label: '히스토리', to: '/band/history', tag: '기록', locked: false },
  { label: '팬 / 차트', to: '/band/fans', tag: '준비 중', locked: true },
];

export function BandFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const save = useSave();
  const { go } = useGameNav();
  const [more, setMore] = useState(false);

  return (
    <Panel
      title="밴드"
      subtitle={save.band.name ?? '아직 이름이 없다'}
      nav="close"
      flush
      footer={footer}
      right={<button className="panel__nav" onClick={() => setMore(true)} aria-label="더 보기">⋯</button>}
    >
      <SubTabs tabs={[
        { label: '라인업', to: '/band', end: true },
        { label: '멤버', to: '/band/members', end: true },
        { label: '케미', to: '/band/chemistry' },
        { label: '곡', to: '/band/songs' },
      ]} />
      <div style={{ padding: '14px var(--gutter) 28px' }}>{children}</div>

      <BottomSheet open={more} title="기록과 프로필" onClose={() => setMore(false)}>
        <div className="col">
          {SECONDARY.map((s) => (
            <button
              key={s.to}
              className={`rowcard rowcard--tap ${s.locked ? 'rowcard--locked' : ''}`}
              onClick={() => { setMore(false); go(s.to); }}
            >
              <span className="grow rowcard__title">{s.label}</span>
              <Tag tone={s.locked ? 'mute' : undefined}>{s.tag}</Tag>
            </button>
          ))}
        </div>
      </BottomSheet>
    </Panel>
  );
}
