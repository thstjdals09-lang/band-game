// OUTSIDE (IA §23): Local Venues가 실제 목적지. 나머지는 아래쪽 '준비 중'으로 낮춘다.
import { VENUES } from '@/data/master';
import { useSave } from '@/state/store';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Section, Tag } from '@/components/ui';

const LATER = [
  { label: '스튜디오', to: '' },
  { label: '미디어', to: '' },
  { label: '라이벌', to: '/outside/rivals' },
  { label: '랭킹', to: '/outside/rankings' },
  { label: '레이블', to: '/outside/labels' },
  { label: '해외', to: '/outside/world' },
];

export function OutsideScreen() {
  const { go } = useGameNav();
  const save = useSave();
  const venueCount = Object.keys(VENUES).length;
  const pending = save.pendingPerformance;

  return (
    <Panel title="외부 활동" nav="close">
      <button className="rowcard rowcard--tap" onClick={() => go('/outside/venues')} style={{ minHeight: 88, borderColor: 'var(--c-border-strong)' }}>
        <span className="grow">
          <div className="rowcard__title lead">동네 공연장</div>
          <div className="rowcard__meta mt8">{venueCount}곳 · {pending ? '공연이 잡혀 있다' : '지금 갈 수 있는 곳'}</div>
        </span>
        <span className="rowcard__chev">›</span>
      </button>

      <Section title="아직 갈 수 없는 곳">
        {LATER.map((it) => (
          <button key={it.label} className="rowcard rowcard--tap rowcard--locked" onClick={() => it.to && go(it.to)} disabled={!it.to}>
            <span className="grow rowcard__title">{it.label}</span>
            <Tag tone="mute">준비 중</Tag>
          </button>
        ))}
      </Section>
    </Panel>
  );
}
