// CONTRACTS: 현재 멤버 계약과 세션 계약을 말로 보여준다 (원시 수치 비노출).
import { CHARACTERS, CLAUSE_LABELS, SESSION_TEMPLATES } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord } from '@/state/selectors';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { EmptyState, Section, Tag } from '@/components/ui';

export function ContractsScreen() {
  const save = useSave();
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
                <dt>기간</dt><dd>{c.startWeek}주 → {c.endWeek}주</dd>
                <dt>만족도</dt><dd>{conditionWord(c.satisfaction)}</dd>
              </dl>
              {c.clauses.length > 0 && <div className="tags mt12">{c.clauses.map((k) => <Tag key={k} tone="amber">{CLAUSE_LABELS[k] ?? k}</Tag>)}</div>}
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
