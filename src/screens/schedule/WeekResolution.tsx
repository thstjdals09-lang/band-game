// WEEK RESOLUTION (IA §16): NEXT WEEK replays the week as short scene cards. Dock/HUD hidden, Back locked.
// Conditional event pauses the flow for a choice. Ends with Week Complete summary -> RETURN HOME (Basecamp changed).
import { useMemo, useState } from 'react';
import { ACTIVITIES, CHARACTERS, EVENTS } from '@/data/master';
import { useSave } from '@/state/store';
import { projectedExpense } from '@/state/selectors';
import { bandActions, scheduleActions } from '@/state/actions';
import { useGameNav, useLockBack } from '@/app/navigation';
import { won, yearWeekLong } from '@/app/format';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Btn, EmptyState, Todo } from '@/components/ui';
import type { SaveData } from '@/state/save/schema';

type Step =
  | { kind: 'ACTION'; title: string; text: string; assetKey: string }
  | { kind: 'EVENT_BAND_NAME' }
  | { kind: 'NEW_SONG'; title: string }
  | { kind: 'COMPLETE' };

// TODO(PHASE2 engine): event selection from EventDefinition conditions/priority; RNG stream "events".
function buildScript(save: SaveData): { steps: Step[]; songTitle: string | null } {
  const steps: Step[] = [];
  save.weeklyPlan.mainActions.forEach((a, i) => {
    if (!a) return;
    const def = ACTIVITIES.find((x) => x.scope === 'BAND' && x.id === a)!;
    steps.push({ kind: 'ACTION', title: `${i + 1} · ${def.name.toUpperCase()}`, text: `[PLACEHOLDER_SCENE_TEXT_${a}]`, assetKey: `SCENE_${a}` });
  });
  save.weeklyPlan.individualActions.forEach((ia) => {
    const def = ACTIVITIES.find((x) => x.scope === 'INDIVIDUAL' && x.id === ia.actionId)!;
    steps.push({ kind: 'ACTION', title: `${CHARACTERS[ia.characterId].name} · ${def.name.toUpperCase()}`, text: `[PLACEHOLDER_SCENE_TEXT_INDIVIDUAL_${ia.actionId}]`, assetKey: `SCENE_INDIVIDUAL_${ia.actionId}` });
  });

  const bandNameEvt = EVENTS.EVT_BAND_NAME;
  const needsName = save.band.name === null && save.band.activeMembers.length >= 2 && bandNameEvt.scripted;
  if (needsName) steps.push({ kind: 'EVENT_BAND_NAME' });

  const creates = save.weeklyPlan.mainActions.some((a) => a === 'PRACTICE' || a === 'RECORDING');
  const songTitle = creates && Object.keys(save.songs).length === 0 ? `Untitled Demo ${String(Object.keys(save.songs).length + 1).padStart(2, '0')}` : null;
  if (songTitle) steps.push({ kind: 'NEW_SONG', title: songTitle });

  steps.push({ kind: 'COMPLETE' });
  return { steps, songTitle };
}

export function WeekResolutionScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const [script] = useState(() => buildScript(save));
  const [i, setI] = useState(0);
  const [bandName, setBandName] = useState('');
  useLockBack(true);

  const step = script.steps[i];
  const total = script.steps.length;
  const expense = useMemo(() => projectedExpense(save), [save]);
  const noPlan = !save.weeklyPlan.mainActions.some(Boolean);

  if (noPlan) {
    return (
      <div className="imm"><div className="imm__stage" style={{ padding: 16 }}><EmptyState text="이번 주 계획이 없다." action={<Btn variant="secondary" onClick={() => go('/schedule', { replace: true })}>SCHEDULE</Btn>} /></div></div>
    );
  }

  const next = () => setI((x) => Math.min(total - 1, x + 1));
  const finish = () => {
    scheduleActions.commitWeek({ newSongTitle: script.songTitle ?? undefined });
    go('/', { replace: true });
  };

  return (
    <div className="imm">
      <div className="imm__top">
        <span>WEEK RESOLUTION</span>
        <span className="grow" />
        <span>{yearWeekLong(save)}</span>
      </div>
      <div className="imm__stage">
        {step.kind === 'ACTION' && (
          <div className="card-step">
            <div className="card-step__title">{step.title}</div>
            <div className="card-step__visual"><PlaceholderAsset assetKey={step.assetKey} variant="fill" /></div>
            <p className="mono xs dim">{step.text}</p>
          </div>
        )}
        {step.kind === 'EVENT_BAND_NAME' && (
          <div className="card-step">
            <div className="card-step__title">EVENT</div>
            <div className="choice">
              <div className="choice__title">{EVENTS.EVT_BAND_NAME.hook}</div>
              <p className="choice__text">멤버들이 밴드 이름을 이야기하기 시작한다.</p>
              <div className="tags">
                <span className="tag">[PLACEHOLDER_BAND_NAME_SUGGESTION_1]</span>
                <span className="tag">[PLACEHOLDER_BAND_NAME_SUGGESTION_2]</span>
              </div>
              <input className="input mt12" value={bandName} onChange={(e) => setBandName(e.target.value)} placeholder="밴드 이름 직접 입력" maxLength={24} />
              <Todo>멤버 성향 기반 밴드명 제안 생성은 PHASE2 (IA §26).</Todo>
            </div>
          </div>
        )}
        {step.kind === 'NEW_SONG' && (
          <div className="card-step">
            <div className="card-step__title accent">NEW SONG</div>
            <div className="card-step__visual"><PlaceholderAsset assetKey="SONG_REVEAL" variant="fill" /></div>
            <div className="rowcard__title" style={{ fontSize: 18 }}>{step.title}</div>
            <p className="small dim">연습 중에 첫 데모가 형태를 갖췄다. SONGS에서 4축 평가와 발매 전략을 확인할 수 있다.</p>
          </div>
        )}
        {step.kind === 'COMPLETE' && (
          <div className="card-step">
            <div className="card-step__title">WEEK COMPLETE</div>
            <dl className="kv mt12">
              <dt>지출</dt><dd>−{won(expense)}</dd>
              <dt>팬</dt><dd>{save.band.metrics.fans} (변화 없음)</dd>
              <dt>관계</dt><dd>변화 없음 (TODO PHASE2)</dd>
              <dt>곡</dt><dd>{script.songTitle ? `NEW · ${script.songTitle}` : '진행 없음'}</dd>
              <dt>기회</dt><dd>{Object.values(save.opportunities).some((o) => o.type === 'LIVE') ? '-' : '새 제안 도착 예정'}</dd>
            </dl>
            <p className="small dim mt12">RETURN HOME 후 Basecamp의 캐릭터 위치·알림이 바뀌어 있어야 한다.</p>
          </div>
        )}
      </div>
      <div className="imm__bottom col">
        <div className="progress">{script.steps.map((_, k) => <span key={k} className={`progress__dot ${k < i ? 'progress__dot--done' : k === i ? 'progress__dot--now' : ''}`} />)}</div>
        {step.kind === 'EVENT_BAND_NAME'
          ? <Btn variant="primary" full disabled={!bandName.trim()} onClick={() => { bandActions.setBandName(bandName); next(); }}>이 이름으로 간다</Btn>
          : step.kind === 'COMPLETE'
            ? <Btn variant="primary" full onClick={finish}>RETURN HOME</Btn>
            : <Btn variant="secondary" full onClick={next}>CONTINUE</Btn>}
      </div>
    </div>
  );
}
