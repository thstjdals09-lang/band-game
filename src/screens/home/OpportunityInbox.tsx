// Opportunity Inbox (IA §6): 나중에 결정 가능한 기회. ACCEPT / DECLINE / LATER + expiry.
import { useEffect } from 'react';
import { useSave } from '@/state/store';
import { pendingOpportunities } from '@/state/selectors';
import { opportunityActions } from '@/state/actions';
import { expiresIn } from '@/app/format';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, EmptyState, Tag } from '@/components/ui';

const TYPE_LABEL: Record<string, string> = { LIVE: 'Live', MEDIA: 'Media', RECRUITMENT: 'Recruitment', SPECIAL_AUDITION: 'Special Audition', EQUIPMENT: 'Equipment', LABEL: 'Label' };

export function OpportunityInboxScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const list = pendingOpportunities(save);
  const accepted = Object.values(save.opportunities).filter((o) => o.status === 'ACCEPTED');

  useEffect(() => { list.forEach((o) => { if (o.status === 'NEW') opportunityActions.markSeen(o.id); }); }, [list]);

  return (
    <Panel title="OPPORTUNITY INBOX" subtitle="전화 / 책상 / 게시판" nav="back">
      {list.length === 0 && accepted.length === 0 && <EmptyState text="아직 도착한 기회가 없다. 주간 운영과 공연 뒤에 제안이 들어온다." />}
      {list.map((o) => (
        <div key={o.id} className="rowcard" style={{ alignItems: 'stretch', flexDirection: 'column' }}>
          <div className="row row--between">
            <div className="rowcard__title">{o.title}</div>
            <Tag tone={o.type === 'LIVE' ? 'accent' : undefined}>{TYPE_LABEL[o.type] ?? o.type}</Tag>
          </div>
          <div className="rowcard__meta">{o.description}</div>
          <div className="rowcard__meta amber">{expiresIn(save, o.expiresWeek)}</div>
          <div className="row mt8">
            <Btn size="sm" variant="primary" onClick={() => opportunityActions.accept(o.id)}>ACCEPT</Btn>
            <Btn size="sm" variant="secondary" onClick={() => opportunityActions.decline(o.id)}>DECLINE</Btn>
            <Btn size="sm" variant="ghost" onClick={() => opportunityActions.later(o.id)}>LATER</Btn>
          </div>
        </div>
      ))}
      {accepted.map((o) => (
        <div key={o.id} className="rowcard" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row row--between"><div className="rowcard__title">{o.title}</div><Tag tone="ok">ACCEPTED</Tag></div>
          {o.type === 'LIVE' && save.pendingPerformance?.opportunityId === o.id && (
            <Btn size="sm" variant="amber" onClick={() => go('/performance/prep')}>DEBUT SHOWCASE PREP →</Btn>
          )}
          {o.type === 'MEDIA' && <div className="rowcard__meta">TODO(PHASE2): 인터뷰는 Individual Action으로 처리</div>}
        </div>
      ))}
    </Panel>
  );
}
