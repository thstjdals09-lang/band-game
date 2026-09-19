// WEEK RESOLUTION (IA §16): NEXT WEEK replays the week as short scene cards. Dock/HUD hidden, Back locked.
// Every step says 무엇을 했고 / 무엇이 바뀌었는지. Conditional events pause the flow for a choice.
import { useMemo, useState } from 'react';
import { ACTIVITIES, CHARACTERS, EVENTS, PROTOTYPE_BALANCE } from '@/data/master';
import { useSave } from '@/state/store';
import { projectedExpense, songCount } from '@/state/selectors';
import { bandActions, scheduleActions } from '@/state/actions';
import { useGameNav, useLockBack } from '@/app/navigation';
import { won, yearWeekLong } from '@/app/format';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Btn, EmptyState } from '@/components/ui';
import type { SaveData } from '@/state/save/schema';

type Step =
  | { kind: 'ACTION'; eyebrow: string; title: string; body: string; effects: string[]; assetKey: string }
  | { kind: 'EVENT_BAND_NAME' }
  | { kind: 'NEW_SONG'; title: string; origin: string }
  | { kind: 'COMPLETE' };

// Sample band names offered by the members. Natural placeholder copy until personality-driven
// suggestion generation exists (PHASE 2+).
const NAME_SUGGESTIONS = ['새벽 연습실', '두 번째 합주', '아직 이름 없음'];

// TODO(PHASE2 engine): event selection from EventDefinition conditions/priority; RNG stream "events".
function buildScript(save: SaveData): { steps: Step[]; songTitle: string | null } {
  const steps: Step[] = [];
  save.weeklyPlan.mainActions.forEach((a, i) => {
    if (!a) return;
    const def = ACTIVITIES.find((x) => x.scope === 'BAND' && x.id === a)!;
    steps.push({
      kind: 'ACTION', eyebrow: `밴드 활동 ${i + 1}`, title: def.name, body: def.summary,
      effects: def.affects, assetKey: `SCENE_${a}`,
    });
  });
  save.weeklyPlan.individualActions.forEach((ia) => {
    const def = ACTIVITIES.find((x) => x.scope === 'INDIVIDUAL' && x.id === ia.actionId)!;
    steps.push({
      kind: 'ACTION', eyebrow: '개인 일정', title: `${CHARACTERS[ia.characterId].name} · ${def.name}`, body: def.summary,
      effects: def.affects, assetKey: `SCENE_INDIVIDUAL_${ia.actionId}`,
    });
  });

  const needsName = save.band.name === null && save.band.activeMembers.length >= 2 && EVENTS.EVT_BAND_NAME.scripted;
  if (needsName) steps.push({ kind: 'EVENT_BAND_NAME' });

  const creates = save.weeklyPlan.mainActions.some((a) => a === 'PRACTICE' || a === 'RECORDING');
  // Scripted prototype tempo: one demo per creative week until the Debut requirement is met.
  const songTitle = creates && songCount(save) < PROTOTYPE_BALANCE.songs.minSongsForDebut
    ? `Untitled Demo ${String(songCount(save) + 1).padStart(2, '0')}`
    : null;
  if (songTitle) {
    steps.push({
      kind: 'NEW_SONG', title: songTitle,
      origin: save.weeklyPlan.mainActions.includes('RECORDING') ? '녹음 중에 형태를 잡았다.' : '합주 중에 형태를 잡았다.',
    });
  }

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
  const songsAfter = songCount(save) + (script.songTitle ? 1 : 0);
  const needed = PROTOTYPE_BALANCE.songs.minSongsForDebut;
  const hasLive = Object.values(save.opportunities).some((o) => o.type === 'LIVE');

  if (noPlan) {
    return (
      <div className="imm">
        <div className="imm__stage">
          <div className="imm__scroll">
            <EmptyState text="이번 주 계획이 없다." action={<Btn variant="secondary" onClick={() => go('/schedule', { replace: true })}>일정 짜기</Btn>} />
          </div>
        </div>
      </div>
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
        <span className="strong">한 주 정리</span>
        <span className="grow" />
        <span>{yearWeekLong(save)}</span>
      </div>

      <div className="imm__stage">
        {step.kind === 'ACTION' && (
          <div className="step">
            <div className="step__eyebrow">{step.eyebrow}</div>
            <div className="step__title">{step.title}</div>
            <div className="step__frame"><PlaceholderAsset assetKey={step.assetKey} variant="fill" kind="scene" /></div>
            <p className="step__body">{step.body}</p>
            <div className="step__result">
              {step.effects.map((e) => (
                <div key={e} className="step__resultrow"><span className="step__bullet" /><span>{e}에 영향을 남겼다</span></div>
              ))}
            </div>
          </div>
        )}

        {step.kind === 'EVENT_BAND_NAME' && (
          <div className="step">
            <div className="step__eyebrow">이번 주의 사건</div>
            <div className="step__title">{EVENTS.EVT_BAND_NAME.hook}</div>
            <p className="step__body">연습이 끝나고 누군가 말을 꺼낸다. 이제 우리를 뭐라고 부를지 정해야 한다.</p>
            <div className="col">
              <div className="tags">
                {NAME_SUGGESTIONS.map((n) => (
                  <button key={n} className={`tag ${bandName === n ? 'tag--accent' : ''}`} onClick={() => setBandName(n)}>{n}</button>
                ))}
              </div>
              <input className="input" value={bandName} onChange={(e) => setBandName(e.target.value)} placeholder="직접 입력" maxLength={24} />
            </div>
          </div>
        )}

        {step.kind === 'NEW_SONG' && (
          <div className="step step--reward">
            <div className="step__eyebrow">새 곡</div>
            <div className="step__title">{step.title}</div>
            <div className="step__frame"><PlaceholderAsset assetKey="SONG_REVEAL" variant="fill" kind="scene" /></div>
            <p className="step__body">{step.origin}</p>
            <div className="step__result">
              <div className="step__resultrow"><span className="step__bullet" /><span>보유 곡 <b>{songsAfter}곡</b></span></div>
              <div className="step__resultrow"><span className="step__bullet" /><span>곡 목록에서 평가와 발매 방향을 정할 수 있다</span></div>
            </div>
          </div>
        )}

        {step.kind === 'COMPLETE' && (
          <div className="step">
            <div className="step__eyebrow">정리</div>
            <div className="step__title">한 주가 끝났다</div>
            <div className="step__result mt8">
              <div className="step__resultrow"><span className="step__bullet" /><span>지출 <b>−{won(expense)}</b></span></div>
              <div className="step__resultrow"><span className="step__bullet" /><span>팬 <b>{save.band.metrics.fans}</b> · 변화 없음</span></div>
              <div className="step__resultrow"><span className="step__bullet" /><span>곡 <b>{songsAfter}곡</b>{script.songTitle ? ' · 새 곡 추가' : ''}</span></div>
              <div className="step__resultrow">
                <span className="step__bullet" />
                <span>{hasLive ? '공연 제안을 확인하자' : songsAfter >= needed ? '새 제안 도착 예정' : `공연 제안까지 곡 ${songsAfter}/${needed}`}</span>
              </div>
            </div>
            <p className="step__body mt12">연습실로 돌아가면 달라진 것이 보일 것이다.</p>
          </div>
        )}
      </div>

      <div className="imm__bottom">
        <div className="progress">
          {script.steps.map((_, k) => <span key={k} className={`progress__dot ${k < i ? 'progress__dot--done' : k === i ? 'progress__dot--now' : ''}`} />)}
        </div>
        {step.kind === 'EVENT_BAND_NAME'
          ? <Btn variant="primary" size="lg" full disabled={!bandName.trim()} onClick={() => { bandActions.setBandName(bandName); next(); }}>이 이름으로 간다</Btn>
          : step.kind === 'COMPLETE'
            ? <Btn variant="primary" size="lg" full onClick={finish}>연습실로 돌아가기</Btn>
            : <Btn variant="secondary" size="lg" full onClick={next}>계속</Btn>}
      </div>
    </div>
  );
}
