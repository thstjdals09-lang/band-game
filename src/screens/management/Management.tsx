// MANAGEMENT hub (IA §21): Finance / Facilities / Contracts real; Staff / Equipment shell.
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Tag } from '@/components/ui';

const ITEMS = [
  { label: 'FINANCE', to: '/management/finance', tag: 'Vertical Slice' },
  { label: 'FACILITIES', to: '/management/facilities', tag: 'Vertical Slice' },
  { label: 'CONTRACTS', to: '/management/contracts', tag: 'Vertical Slice' },
  { label: 'STAFF', to: '/management/staff', tag: 'Locked / Shell' },
  { label: 'EQUIPMENT', to: '/management/equipment', tag: 'Shell' },
];

export function ManagementScreen() {
  const { go } = useGameNav();
  return (
    <Panel title="MANAGEMENT" nav="close">
      {ITEMS.map((it) => (
        <button key={it.to} className={`rowcard rowcard--tap ${it.tag.includes('Locked') ? 'rowcard--locked' : ''}`} onClick={() => go(it.to)}>
          <span className="grow rowcard__title" style={{ textAlign: 'left' }}>{it.label}</span>
          <Tag tone={it.tag === 'Vertical Slice' ? 'ok' : undefined}>{it.tag}</Tag>
        </button>
      ))}
    </Panel>
  );
}
