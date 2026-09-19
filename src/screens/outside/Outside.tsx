// OUTSIDE (IA §23): Local Venues works; Studio / Media / Labels / World locked placeholders; Rivals partial intro.
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Tag, Todo } from '@/components/ui';

const ITEMS = [
  { label: 'LOCAL VENUES', to: '/outside/venues', tag: 'Vertical Slice', locked: false },
  { label: 'STUDIO', to: '', tag: 'Later', locked: true },
  { label: 'MEDIA', to: '', tag: 'Later', locked: true },
  { label: 'RIVALS', to: '/outside/rivals', tag: '일부 소개', locked: false },
  { label: 'RANKINGS', to: '/outside/rankings', tag: 'Locked', locked: true },
  { label: 'LABELS', to: '/outside/labels', tag: 'Locked', locked: true },
  { label: 'WORLD / OVERSEAS', to: '/outside/world', tag: 'Locked', locked: true },
];

export function OutsideScreen() {
  const { go } = useGameNav();
  return (
    <Panel title="OUTSIDE" subtitle="외부 목적지 선택" nav="close">
      <PlaceholderAsset assetKey="OUTSIDE_MAP" style={{ height: 120 }} />
      <div className="mt12">
        {ITEMS.map((it) => (
          <button key={it.label} className={`rowcard rowcard--tap ${it.locked ? 'rowcard--locked' : ''}`} onClick={() => it.to && go(it.to)} disabled={!it.to}>
            <span className="grow rowcard__title" style={{ textAlign: 'left' }}>{it.label}</span>
            <Tag tone={it.tag === 'Vertical Slice' ? 'ok' : undefined}>{it.tag}</Tag>
          </button>
        ))}
      </div>
      <Todo>초기에는 정교한 지도보다 목적지 선택 화면. 도시/외부 지도 구조는 후속 Prototype에서 결정 (IA §23).</Todo>
    </Panel>
  );
}
