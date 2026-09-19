// LOCAL VENUES: venues in HOME_CITY. Pending accepted show -> PREP.
import { VENUES } from '@/data/master';
import { useSave } from '@/state/store';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, Tag, Todo } from '@/components/ui';

export function LocalVenuesScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const pending = save.pendingPerformance;
  return (
    <Panel title="LOCAL VENUES" subtitle="HOME CITY" nav="back">
      {Object.values(VENUES).map((v) => {
        const isPending = pending?.venueId === v.id;
        const played = save.performanceHistory.filter((p) => p.venueId === v.id).length;
        return (
          <div key={v.id} className="rowcard" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="row row--between"><div className="rowcard__title">{v.name}</div><Tag>{v.kind.replace('_', ' ')}</Tag></div>
            <div className="rowcard__meta">수용 {v.capacity} · 공연 {played}회</div>
            {isPending && <div className="mt8"><Btn size="sm" variant="amber" onClick={() => go('/performance/prep')}>DEBUT SHOWCASE PREP →</Btn></div>}
            {!isPending && <div className="xs faint mt8">공연 제안은 Opportunity Inbox로 도착한다.</div>}
          </div>
        );
      })}
      <Todo>공연장 직접 섭외(비용/조건)는 PHASE2. 가상 도시 설정 - 실제 도시명 사용 금지.</Todo>
    </Panel>
  );
}
