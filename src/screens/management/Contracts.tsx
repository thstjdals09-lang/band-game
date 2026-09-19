// CONTRACTS: current member contracts (words, not raw satisfaction numbers).
import { CHARACTERS, CLAUSE_LABELS } from '@/data/master';
import { useSave } from '@/state/store';
import { conditionWord } from '@/state/selectors';
import { won } from '@/app/format';
import { Panel } from '@/components/Panel';
import { EmptyState, Tag } from '@/components/ui';

export function ContractsScreen() {
  const save = useSave();
  const list = Object.values(save.contracts).filter(Boolean);
  const sessions = Object.values(save.sessionHires);
  return (
    <Panel title="CONTRACTS" nav="back">
      {list.length === 0 && sessions.length === 0 && <EmptyState text="계약이 없다." />}
      {list.map((c) => c && (
        <div key={c.characterId} className="rowcard" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="row row--between"><div className="rowcard__title">{CHARACTERS[c.characterId].name}</div><Tag>{c.rolePromise}</Tag></div>
          <div className="rowcard__meta">{won(c.salary)}/주 · W{c.startWeek}→W{c.endWeek} · 만족도 {conditionWord(c.satisfaction)}</div>
          {c.clauses.length > 0 && <div className="tags mt8">{c.clauses.map((k) => <Tag key={k} tone="amber">{CLAUSE_LABELS[k] ?? k}</Tag>)}</div>}
        </div>
      ))}
      {sessions.map((h) => (
        <div key={h.instanceId} className="rowcard"><span className="grow small">{h.instanceId} · {h.slot}</span><span className="mono xs dim">{won(h.weeklyCost)}/주 · ~W{h.endWeek}</span></div>
      ))}
    </Panel>
  );
}
