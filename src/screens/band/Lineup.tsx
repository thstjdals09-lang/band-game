// LINEUP (IA §7-8): Role -> Assigned Member. Position tap -> Bottom Sheet (no drag & drop).
// Empty slot -> USE MEMBER / HIRE SESSION. Multi-position member -> ASSIGN ROLE (change role).
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, LINEUP_SLOTS, SESSION_TEMPLATES, type CharacterId, type SlotId } from '@/data/master';
import { useSave } from '@/state/store';
import { chemistryDiagnostics, lineupView, membersAvailableForSlot, slotsForCharacter } from '@/state/selectors';
import { bandActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { CharacterVisual } from '@/components/CharacterVisual';
import { BottomSheet, Btn, GradeLabel, Section, Tag, Todo } from '@/components/ui';
import { BandFrame } from './BandFrame';

export function LineupScreen() {
  const save = useSave();
  const [params, setParams] = useSearchParams();
  const { go, back } = useGameNav();
  const slots = lineupView(save);
  const filled = slots.filter((s) => s.kind !== 'EMPTY').length;
  const diag = chemistryDiagnostics(save);

  const openSlot = (slot: SlotId) => setParams({ slot }); // pushes history -> browser Back closes the sheet
  const closeSheet = () => back();
  const slotParam = params.get('slot') as SlotId | null;
  const current = slotParam ? slots.find((s) => s.slot === slotParam) : undefined;

  return (
    <BandFrame>
      <div className="row row--between">
        <div className="caps small dim">CURRENT LINEUP {filled}/{LINEUP_SLOTS.length}</div>
        <div className="xs faint">포지션을 탭해서 편성</div>
      </div>
      <div className="mt8">
        {slots.map((s) => (
          <button key={s.slot} className="slot" onClick={() => openSlot(s.slot)}>
            <span className="slot__role">{s.label}</span>
            <span style={{ textAlign: 'left' }}>
              {s.kind === 'EMPTY' && <span className="slot__empty">+ EMPTY</span>}
              {s.kind === 'MEMBER' && <span className="slot__name">{s.displayName}</span>}
              {s.kind === 'SESSION' && <span className="slot__session">SESSION · {s.displayName}</span>}
            </span>
            {s.characterId ? <CharacterVisual id={s.characterId} variant="THUMB" /> : s.kind === 'SESSION' ? <CharacterVisual id="SESSION" /> : <span className="dim">›</span>}
          </button>
        ))}
      </div>

      <Section title="조합 진단" aside={<button className="xs accent" onClick={() => go('/band/chemistry')}>CHEMISTRY →</button>}>
        <dl className="kv">
          <dt>Musical Fit</dt><dd><GradeLabel value={diag.musicalFit} /></dd>
          <dt>Conflict Risk</dt><dd><GradeLabel value={diag.conflictRisk} /></dd>
        </dl>
      </Section>

      <Section title="더 보기">
        <button className="rowcard rowcard--tap" onClick={() => go('/band/archive')}><span className="grow" style={{ textAlign: 'left' }}>Career Archive</span><Tag>Timeline</Tag></button>
        <button className="rowcard rowcard--tap" onClick={() => go('/band/profile')}><span className="grow" style={{ textAlign: 'left' }}>Public Profile</span><Tag>Preview</Tag></button>
        <button className="rowcard rowcard--tap rowcard--locked" onClick={() => go('/band/fans')}><span className="grow" style={{ textAlign: 'left' }}>Fans / Charts</span><Tag>Locked</Tag></button>
        <button className="rowcard rowcard--tap" onClick={() => go('/band/history')}><span className="grow" style={{ textAlign: 'left' }}>History</span><Tag>기본 기록</Tag></button>
      </Section>
      <Todo>슬롯 수(4 vs 5)는 Prototype Variable - IA §7 예시는 4슬롯, Visual Bible Hero 03은 5/5.</Todo>

      <BottomSheet open={!!current} title={current ? `${current.label} · ${current.kind === 'EMPTY' ? 'ASSIGN' : current.kind}` : ''} onClose={closeSheet}>
        {current && <SlotSheet slot={current.slot} kind={current.kind} characterId={current.characterId} onDone={closeSheet} />}
      </BottomSheet>
    </BandFrame>
  );
}

function SlotSheet({ slot, kind, characterId, onDone }: { slot: SlotId; kind: 'EMPTY' | 'MEMBER' | 'SESSION'; characterId?: CharacterId; onDone: () => void }) {
  const save = useSave();
  const { go } = useGameNav();
  const available = membersAvailableForSlot(save, slot);
  const sessions = SESSION_TEMPLATES.filter((t) => t.slot === slot);

  if (kind === 'MEMBER' && characterId) {
    const otherSlots = slotsForCharacter(characterId).filter((s) => s !== slot);
    return (
      <div className="col">
        <div className="row"><CharacterVisual id={characterId} /><div className="grow"><div className="rowcard__title">{CHARACTERS[characterId].name}</div><div className="rowcard__meta">{CHARACTERS[characterId].positions.join(' / ')}</div></div></div>
        {otherSlots.length > 0 && (
          <Section title="ASSIGN ROLE (역할 변경)">
            {otherSlots.map((s) => (
              <Btn key={s} full variant="secondary" onClick={() => { bandActions.assignSlot(s, { kind: 'MEMBER', characterId }); onDone(); }}>→ {s}{save.band.lineup[s] ? ' (교체)' : ''}</Btn>
            ))}
          </Section>
        )}
        <Btn full variant="secondary" onClick={() => go(`/band/members/${characterId}`)}>DETAIL</Btn>
        <Btn full variant="ghost" onClick={() => { bandActions.assignSlot(slot, null); onDone(); }}>REMOVE FROM LINEUP</Btn>
      </div>
    );
  }

  if (kind === 'SESSION') {
    const hire = Object.values(save.sessionHires).find((h) => h.slot === slot);
    return (
      <div className="col">
        <div className="rowcard"><CharacterVisual id="SESSION" /><div className="grow"><div className="rowcard__title">Generic Session</div><div className="rowcard__meta">{hire ? `${won(hire.weeklyCost)}/주 · ~W${hire.endWeek}` : ''}</div></div></div>
        <Btn full variant="secondary" disabled>OFFER PERMANENT CONTRACT</Btn>
        <div className="xs faint">generic session은 정식 영입 대상이 아니다. 고정 캐릭터 세션(C13/C15)만 조건 충족 시 열린다 (IA §11).</div>
        <Btn full variant="ghost" onClick={() => { bandActions.assignSlot(slot, null); onDone(); }}>END SESSION</Btn>
      </div>
    );
  }

  return (
    <div className="col">
      <Section title="USE MEMBER">
        {available.length === 0 && <div className="xs dim">이 포지션에 배치할 수 있는 보유 멤버가 없다.</div>}
        {available.map((id) => (
          <button key={id} className="rowcard rowcard--tap" onClick={() => { bandActions.assignSlot(slot, { kind: 'MEMBER', characterId: id }); onDone(); }}>
            <CharacterVisual id={id} /><span className="grow" style={{ textAlign: 'left' }}><div className="rowcard__title">{CHARACTERS[id].name}</div><div className="rowcard__meta">{CHARACTERS[id].positions.join(' / ')}</div></span>
          </button>
        ))}
      </Section>
      <Section title="HIRE SESSION">
        {sessions.map((t) => (
          <button key={t.templateId} className="rowcard rowcard--tap" onClick={() => { bandActions.hireSession(slot, t.templateId); onDone(); }}>
            <CharacterVisual id="SESSION" /><span className="grow" style={{ textAlign: 'left' }}><div className="rowcard__title">{t.label}</div><div className="rowcard__meta">{t.durationWeeks}주 · {won(t.weeklyCost)}/주 · 실력 {t.roughSkill} · 신뢰도 {t.reliability}</div></span>
          </button>
        ))}
      </Section>
    </div>
  );
}
