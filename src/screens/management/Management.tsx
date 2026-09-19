// MANAGEMENT hub (IA §21): 자금 / 시설 / 계약이 실제 기능, 스태프 / 장비는 준비 중.
import { useSave } from '@/state/store';
import { basecampStage, weeklySalaryBurden } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { Section, Tag } from '@/components/ui';

export function ManagementScreen() {
  const { go } = useGameNav();
  const save = useSave();
  const contracts = Object.keys(save.contracts).length;

  const MAIN = [
    { label: '자금', to: '/management/finance', meta: won(save.economy.cash) },
    { label: '시설', to: '/management/facilities', meta: `연습실 ${basecampStage(save)}단계` },
    { label: '계약', to: '/management/contracts', meta: contracts > 0 ? `${contracts}건 · 주당 ${won(weeklySalaryBurden(save))}` : '계약 없음' },
  ];
  const LATER = [
    { label: '스태프', to: '/management/staff' },
    { label: '장비', to: '/management/equipment' },
  ];

  return (
    <Panel title="경영" nav="close">
      {MAIN.map((it) => (
        <button key={it.to} className="rowcard rowcard--tap" onClick={() => go(it.to)}>
          <span className="grow">
            <div className="rowcard__title lead">{it.label}</div>
            <div className="rowcard__meta">{it.meta}</div>
          </span>
          <span className="rowcard__chev">›</span>
        </button>
      ))}

      <Section title="준비 중">
        {LATER.map((it) => (
          <button key={it.to} className="rowcard rowcard--tap rowcard--locked" onClick={() => go(it.to)}>
            <span className="grow rowcard__title">{it.label}</span>
            <Tag tone="mute">준비 중</Tag>
          </button>
        ))}
      </Section>
    </Panel>
  );
}
