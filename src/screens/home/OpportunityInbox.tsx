// Opportunity Inbox (IA §6): 나중에 결정 가능한 기회. 수락이 main CTA, 거절/보류는 secondary.
import { useEffect } from 'react';
import { VENUES } from '@/data/master';
import { useSave } from '@/state/store';
import { debutSongRequirement, pendingOpportunities } from '@/state/selectors';
import { opportunityActions } from '@/state/actions';
import { expiresIn } from '@/app/format';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { Btn, EmptyState, Notice, Section, Tag } from '@/components/ui';

const TYPE_LABEL: Record<string, string> = {
  LIVE: '공연', MEDIA: '미디어', RECRUITMENT: '영입', SPECIAL_AUDITION: '특별 오디션', EQUIPMENT: '장비', LABEL: '레이블',
};

export function OpportunityInboxScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const list = pendingOpportunities(save);
  const accepted = Object.values(save.opportunities).filter((o) => o.status === 'ACCEPTED');
  const req = debutSongRequirement(save);

  useEffect(() => {
    list.forEach((o) => { if (o.status === 'NEW') opportunityActions.markSeen(o.id); });
  }, [list]);

  return (
    <Panel title="들어온 제안" subtitle="전화와 책상 위" nav="back">
      {list.length === 0 && accepted.length === 0 && (
        <EmptyState text="아직 도착한 제안이 없다. 활동을 이어가면 연락이 온다." />
      )}

      {list.map((o) => {
        const venue = o.payload?.venueId ? VENUES[o.payload.venueId] : undefined;
        return (
          <div key={o.id} className="rowcard rowcard--stack">
            <div className="row row--between row--top">
              <div className="grow">
                <div className="rowcard__title lead">{venue?.name ?? o.title}</div>
                <div className="rowcard__meta mt8">{o.description}</div>
              </div>
              <Tag tone={o.type === 'LIVE' ? 'accent' : undefined}>{TYPE_LABEL[o.type] ?? o.type}</Tag>
            </div>

            {venue && (
              <dl className="kv mt12">
                <dt>공연장</dt><dd>{venue.kind === 'CLUB' ? '소규모 클럽' : '라이브하우스'}</dd>
                <dt>수용 인원</dt><dd>{venue.capacity}명</dd>
              </dl>
            )}
            <div className="rowcard__meta amber mt8">{expiresIn(save, o.expiresWeek)}</div>

            <div className="col mt12" style={{ gap: 8 }}>
              <Btn variant="primary" full onClick={() => opportunityActions.accept(o.id)}>수락</Btn>
              <div className="row" style={{ gap: 8 }}>
                <Btn variant="ghost" full onClick={() => opportunityActions.later(o.id)}>나중에</Btn>
                <Btn variant="ghost" full onClick={() => opportunityActions.decline(o.id)}>거절</Btn>
              </div>
            </div>
          </div>
        );
      })}

      {accepted.length > 0 && (
        <Section title="수락한 제안">
          {accepted.map((o) => (
            <div key={o.id} className="rowcard rowcard--stack">
              <div className="row row--between">
                <div className="rowcard__title">{o.payload?.venueId ? VENUES[o.payload.venueId]?.name ?? o.title : o.title}</div>
                <Tag tone="ok">수락함</Tag>
              </div>
              {o.type === 'LIVE' && save.pendingPerformance?.opportunityId === o.id && (
                <div className="mt12">
                  {!req.met && <Notice tone="warn">공연까지 곡 {req.have}/{req.required}. 준비가 더 필요하다.</Notice>}
                  <Btn variant="amber" full onClick={() => go('/performance/prep')}>공연 준비하기</Btn>
                </div>
              )}
            </div>
          ))}
        </Section>
      )}
    </Panel>
  );
}
