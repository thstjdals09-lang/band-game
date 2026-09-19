// LOCAL VENUES: 지금 활동 가능한 도시의 공연장. 수락된 공연은 준비로 연결된다.
import { VENUES } from '@/data/master';
import { useSave } from '@/state/store';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, Notice, Tag } from '@/components/ui';

export function LocalVenuesScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const pending = save.pendingPerformance;

  return (
    <Panel title="동네 공연장" nav="back">
      {Object.values(VENUES).map((v) => {
        const isPending = pending?.venueId === v.id;
        const played = save.performanceHistory.filter((p) => p.venueId === v.id).length;
        return (
          <div key={v.id} className="rowcard rowcard--stack">
            <div className="row row--between">
              <div className="rowcard__title lead">{v.name}</div>
              <Tag>{v.kind === 'CLUB' ? '소규모 클럽' : '라이브하우스'}</Tag>
            </div>
            <dl className="kv mt12">
              <dt>수용 인원</dt><dd>{v.capacity}명</dd>
              <dt>공연 횟수</dt><dd>{played}회</dd>
            </dl>
            {isPending
              ? <div className="mt12"><Btn variant="amber" full onClick={() => go('/performance/prep')}>공연 준비하기</Btn></div>
              : <div className="mt12"><Notice>공연 제안은 전화와 책상으로 들어온다.</Notice></div>}
          </div>
        );
      })}
    </Panel>
  );
}
