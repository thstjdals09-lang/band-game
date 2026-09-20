// LINEUP (IA §7-8): Role -> Assigned Member over a VARIABLE slot list (core VOCAL/GUITAR/BASS/DRUMS by default).
// Position tap -> Bottom Sheet (no drag & drop). Empty slot -> 멤버 배치 / 세션 고용.
// Multi-position member -> 역할 변경. Slot expansion is a later feature; the data already supports it.
import { useSearchParams } from 'react-router-dom';
import { CHARACTERS, SESSION_TEMPLATES } from '@/data/master';
import { useSave } from '@/state/store';
import { lineupCapacity, lineupView, membersAvailableForSlot, slotIndicesForCharacter, type LineupSlotView } from '@/state/selectors';
import { bandDna, type BandDna } from '@/state/sim/musicDna';
import { bandActions } from '@/state/actions';
import { useGameNav } from '@/app/navigation';
import { won } from '@/app/format';
import { CharacterVisual } from '@/components/CharacterVisual';
import { BottomSheet, Btn, Notice, Section, Tag } from '@/components/ui';

/** Plain words for the band's current Music DNA (Character Master §05 axis meanings). */
function soundWords(dna: BandDna): string[] {
  const m = dna.mean;
  return [
    m.accessibility >= 0 ? '대중적' : '실험적',
    m.energy >= 0 ? '공격적' : '부드러움',
    m.tone >= 0 ? '밝음' : '어두움',
  ];
}
import { BandFrame } from './BandFrame';

export function LineupScreen() {
  const save = useSave();
  const [params, setParams] = useSearchParams();
  const { go, back } = useGameNav();
  const slots = lineupView(save);
  const filled = slots.filter((s) => s.kind !== 'EMPTY').length;
  const empty = slots.length - filled;
  const dna = bandDna(save);

  const openSlot = (index: number) => setParams({ slot: String(index) }); // history push -> browser Back closes the sheet
  const slotParam = params.get('slot');
  const current = slotParam !== null ? slots[Number(slotParam)] : undefined;

  return (
    <BandFrame>
      <div className="row row--between">
        <div>
          {/* 제목은 한글이 크게 앞에, 수치가 작게 뒤에 온다 (오디션 화면과 같은 규칙). */}
          <div className="panel__title">현재 라인업</div>
          <div className="panel__sub">자리 {filled}/{lineupCapacity(save)}</div>
        </div>
        {empty > 0 && <Tag tone="amber">빈 자리 {empty}</Tag>}
      </div>

      <div className="mt16">
        {slots.map((s) => (
          <button key={s.index} className={`slot ${s.kind === 'EMPTY' ? 'slot--empty' : ''}`} onClick={() => openSlot(s.index)}>
            <span className="slot__role">{s.label}</span>
            <span className="grow">
              {s.kind === 'EMPTY' && <span className="slot__empty">+ 비어 있음</span>}
              {s.kind === 'MEMBER' && <><span className="slot__name">{s.displayName}</span><span className="slot__sub"> · 정식 멤버</span></>}
              {s.kind === 'SESSION' && <><span className="slot__name">{s.displayName}</span><span className="slot__sub"> · 세션</span></>}
            </span>
            {s.characterId
              ? <CharacterVisual id={s.characterId} variant="THUMB" />
              : s.kind === 'SESSION'
                ? <CharacterVisual id="SESSION" seed={s.assignment?.kind === 'SESSION' ? s.assignment.instanceId : s.index} />
                : <span className="rowcard__chev">›</span>}
          </button>
        ))}
      </div>

      {empty > 0 && <Notice tone="warn">빈 자리는 정식 멤버를 배치하거나 세션을 고용해 메울 수 있다.</Notice>}

      <Section title="사운드" aside={<button className="label accent" onClick={() => go('/band/chemistry')}>자세히 ›</button>}>
        {dna ? (
          <div className="rowcard">
            <span className="grow">
              <div className="rowcard__title">{dna.cohesion > 0.6 ? '한 방향으로 모인다' : '취향이 제각각이다'}</div>
              <div className="rowcard__meta">{soundWords(dna).join(' · ')}</div>
            </span>
          </div>
        ) : <Notice>멤버를 배치하면 밴드의 사운드가 생긴다.</Notice>}
      </Section>

      <BottomSheet open={!!current} title={current ? current.label : ''} onClose={back}>
        {current && <SlotSheet view={current} onDone={back} />}
      </BottomSheet>
    </BandFrame>
  );
}

function SlotSheet({ view, onDone }: { view: LineupSlotView; onDone: () => void }) {
  const save = useSave();
  const { go } = useGameNav();
  const { index, slot, kind, characterId } = view;
  const available = membersAvailableForSlot(save, slot);
  const sessions = SESSION_TEMPLATES.filter((t) => t.slot === slot);

  if (kind === 'MEMBER' && characterId) {
    const otherIdx = slotIndicesForCharacter(save, characterId, index);
    return (
      <div className="col">
        <div className="row">
          <CharacterVisual id={characterId} />
          <div className="grow">
            <div className="rowcard__title">{CHARACTERS[characterId].name}</div>
            <div className="rowcard__meta">{CHARACTERS[characterId].positions.join(' / ')}</div>
          </div>
        </div>
        {otherIdx.length > 0 && (
          <Section title="역할 변경">
            <div className="col">
              {otherIdx.map((i) => (
                <Btn key={i} full variant="secondary" onClick={() => { bandActions.assignSlot(i, { kind: 'MEMBER', characterId }); onDone(); }}>
                  {save.band.lineup[i].slotId}로 이동{save.band.lineup[i].assignment ? ' (교체)' : ''}
                </Btn>
              ))}
            </div>
          </Section>
        )}
        <Btn full variant="secondary" onClick={() => go(`/band/members/${characterId}`)}>자세히 보기</Btn>
        <Btn full variant="ghost" onClick={() => { bandActions.assignSlot(index, null); onDone(); }}>라인업에서 빼기</Btn>
      </div>
    );
  }

  if (kind === 'SESSION') {
    const hire = view.assignment?.kind === 'SESSION' ? save.sessionHires[view.assignment.instanceId] : undefined;
    return (
      <div className="col">
        <div className="rowcard">
          <CharacterVisual id="SESSION" seed={hire?.instanceId ?? index} />
          <div className="grow">
            <div className="rowcard__title">{view.displayName}</div>
            <div className="rowcard__meta">{hire ? `${won(hire.weeklyCost)} / 주 · ${hire.endWeek}주차까지` : ''}</div>
          </div>
        </div>
        <Notice>세션은 잠시 자리를 메워주는 연주자다. 정식 영입 제안은 이 자리에서는 할 수 없다.</Notice>
        <Btn full variant="ghost" onClick={() => { bandActions.assignSlot(index, null); onDone(); }}>세션 계약 종료</Btn>
      </div>
    );
  }

  return (
    <div className="col">
      <Section title="정식 멤버 배치">
        {available.length === 0 && <Notice>이 포지션에 배치할 수 있는 멤버가 아직 없다.</Notice>}
        <div className="col">
          {available.map((id) => (
            <div key={id} className="rowcard">
              <CharacterVisual id={id} />
              <div className="grow">
                <div className="rowcard__title">{CHARACTERS[id].name}</div>
                <div className="rowcard__meta">{CHARACTERS[id].positions.join(' / ')}</div>
              </div>
              <Btn size="sm" variant="secondary" onClick={() => { bandActions.assignSlot(index, { kind: 'MEMBER', characterId: id }); onDone(); }}>배치</Btn>
            </div>
          ))}
        </div>
      </Section>

      <Section title="세션 고용">
        <div className="col">
          {sessions.map((t) => (
            <div key={t.templateId} className="rowcard rowcard--stack">
              <div className="row">
                <CharacterVisual id="SESSION" seed={t.templateId} />
                <div className="grow">
                  <div className="rowcard__title">{t.label}</div>
                  <div className="rowcard__meta">{slot} · {t.durationWeeks}주 계약</div>
                </div>
              </div>
              <dl className="kv mt12">
                <dt>주당 비용</dt><dd>{won(t.weeklyCost)}</dd>
                <dt>실력</dt><dd>{t.roughSkill}</dd>
                <dt>신뢰도</dt><dd>{t.reliability}</dd>
              </dl>
              <div className="mt12">
                <Btn variant="amber" full onClick={() => { bandActions.hireSession(index, t.templateId); onDone(); }}>이 포지션에 고용</Btn>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
