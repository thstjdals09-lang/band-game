// CONTRACTS: 현재 멤버 계약과 세션 계약을 말로 보여준다 (원시 수치 비노출).
import { CHARACTERS, CLAUSE_LABELS, SESSION_TEMPLATES } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord } from '@/state/selectors';
import { absoluteWeek, renewalOpen, starterPromise } from '@/state/sim/contract';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { Btn, EmptyState, Notice, Section, Tag } from '@/components/ui';

export function ContractsScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const list = Object.values(save.contracts).filter(Boolean);
  const sessions = Object.values(save.sessionHires);

  return (
    <Panel title="계약" nav="back">
      {list.length === 0 && sessions.length === 0 && <EmptyState text="아직 계약이 없다." />}

      {list.length > 0 && (
        <Section title="정식 멤버">
          {list.map((c) => c && (
            <div key={c.characterId} className="rowcard rowcard--stack">
              <div className="row row--between">
                <div className="rowcard__title lead">{CHARACTERS[c.characterId].name}</div>
                <Tag>{c.rolePromise === 'CORE_MEMBER' ? '주전' : '서포트'}</Tag>
              </div>
              <dl className="kv mt12">
                <dt>주급</dt><dd>{won(c.salary)}</dd>
                <dt>남은 기간</dt><dd>{Math.max(0, c.endWeek - absoluteWeek(save.world) + 1)}주</dd>
                <dt>만족도</dt><dd>{conditionWord(c.satisfaction)}</dd>
              </dl>
              {c.rolePromise === 'CORE_MEMBER' && (() => {
                const p = starterPromise(save, c.characterId);
                if (p.considered === 0) return <div className="rowcard__meta mt8 dim">아직 판정할 공연 기록이 없다</div>;
                return (
                  <div className="rowcard__meta mt8">
                    최근 공연 {p.considered}회 중 결장 {p.absences}회 {p.met ? '· 약속을 지키고 있다' : '· 약속을 어겼다'}
                  </div>
                );
              })()}
              {c.clauses.length > 0 && <div className="tags mt12">{c.clauses.map((k) => <Tag key={k} tone="amber">{CLAUSE_LABELS[k] ?? k}</Tag>)}</div>}
              {c.renewal && <Notice tone="info">재계약 합의 · 주급 {won(c.renewal.salary)} · {c.renewal.durationWeeks}주</Notice>}
              {c.pendingChange && <Notice tone="info">다음 주부터 {c.pendingChange.rolePromise === 'CORE_MEMBER' ? '주전' : '서포트'}</Notice>}
              <div className="mt12">
                <Btn size="sm" variant={renewalOpen(c, save.world) ? 'primary' : 'secondary'} full
                  onClick={() => go(`/audition/contract/${c.characterId}`)}>
                  {renewalOpen(c, save.world) ? '재계약 협상' : '역할 재협상'}
                </Btn>
              </div>
            </div>
          ))}
        </Section>
      )}

      {sessions.length > 0 && (
        <Section title="세션">
          {sessions.map((h) => {
            const tpl = SESSION_TEMPLATES.find((t) => t.templateId === h.templateId);
            return (
              <div key={h.instanceId} className="rowcard">
                <span className="grow">
                  <div className="rowcard__title">{tpl?.label ?? '세션'}</div>
                  <div className="rowcard__meta">{h.slot} · {h.endWeek}주차까지</div>
                </span>
                <span className="mono meta dim">{won(h.weeklyCost)} / 주</span>
              </div>
            );
          })}
        </Section>
      )}
    </Panel>
  );
}
