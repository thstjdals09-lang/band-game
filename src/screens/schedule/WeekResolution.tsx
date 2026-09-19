// WEEK RESOLUTION (IA §16): NEXT WEEK replays the week as short scene cards. Dock/HUD hidden, Back locked.
//
// The whole week is simulated ONCE when this screen mounts. The cards below show that outcome and
// commitWeek applies the very same object, so what the player watched is exactly what happens and
// nothing can be awarded twice.
import { useState } from 'react';
import { EVENTS, PROTOTYPE_BALANCE } from '@/data/master';
import { useSave } from '@/state/store';
import { songCount } from '@/state/selectors';
import { bandActions, scheduleActions } from '@/state/actions';
import { simulateWeek, type WeekLogEntry, type WeekOutcome } from '@/state/sim/weekEngine';
import { useGameNav, useLockBack } from '@/app/navigation';
import { won, yearWeekLong } from '@/app/format';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { Btn, EmptyState } from '@/components/ui';

type Step =
  | { kind: 'LOG'; entry: WeekLogEntry }
  | { kind: 'EVENT_BAND_NAME' }
  | { kind: 'COMPLETE' };

// Sample band names offered by the members. Natural placeholder copy until personality-driven
// suggestion generation exists (PHASE 2B).
const NAME_SUGGESTIONS = ['새벽 연습실', '두 번째 합주', '아직 이름 없음'];

const REWARD_KINDS: WeekLogEntry['kind'][] = ['SONG', 'GROWTH', 'RELEASE_INCOME', 'OFFER'];

function buildSteps(save: ReturnType<typeof useSave>, outcome: WeekOutcome): Step[] {
  const steps: Step[] = outcome.log.map((entry) => ({ kind: 'LOG', entry } as Step));
  const needsName = save.band.name === null && save.band.activeMembers.length >= 2 && EVENTS.EVT_BAND_NAME.scripted;
  if (needsName) {
    // The naming moment belongs before the rewards so the week ends on the band's own result.
    const firstReward = steps.findIndex((s) => s.kind === 'LOG' && REWARD_KINDS.includes(s.entry.kind));
    steps.splice(firstReward < 0 ? steps.length : firstReward, 0, { kind: 'EVENT_BAND_NAME' });
  }
  steps.push({ kind: 'COMPLETE' });
  return steps;
}

export function WeekResolutionScreen() {
  const save = useSave();
  const { go } = useGameNav();
  // Simulated once on mount: the same outcome drives both the cards and the commit.
  const [outcome] = useState<WeekOutcome>(() => simulateWeek(save));
  const [steps] = useState<Step[]>(() => buildSteps(save, outcome));
  const [i, setI] = useState(0);
  const [bandName, setBandName] = useState('');
  useLockBack(true);

  const step = steps[i];
  const noPlan = !save.weeklyPlan.mainActions.some(Boolean);
  const songsAfter = songCount(save) + (outcome.newSong ? 1 : 0);
  const needed = PROTOTYPE_BALANCE.songs.minSongsForDebut;
  const net = outcome.musicIncome - outcome.expense;

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

  const next = () => setI((x) => Math.min(steps.length - 1, x + 1));
  const finish = () => {
    scheduleActions.commitWeek(outcome);
    go('/', { replace: true });
  };

  const growth = outcome.members.filter((m) => m.stageAfter > m.stageBefore);
  const tired = outcome.members.filter((m) => m.limited);

  return (
    <div className="imm">
      <div className="imm__top">
        <span className="strong">한 주 정리</span>
        <span className="grow" />
        <span>{yearWeekLong(save)}</span>
      </div>

      <div className="imm__stage">
        {step.kind === 'LOG' && (
          <div className={`step ${REWARD_KINDS.includes(step.entry.kind) ? 'step--reward' : ''}`}>
            <div className="step__eyebrow">{eyebrowFor(step.entry.kind)}</div>
            <div className="step__title">{step.entry.title}</div>
            {step.entry.assetKey && (
              <div className="step__frame"><PlaceholderAsset assetKey={step.entry.assetKey} variant="fill" kind="scene" /></div>
            )}
            {step.entry.body && <p className="step__body">{step.entry.body}</p>}
            <div className="step__result">
              {step.entry.effects.map((e) => (
                <div key={e} className="step__resultrow"><span className="step__bullet" /><span>{e}</span></div>
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

        {step.kind === 'COMPLETE' && (
          <div className="step">
            <div className="step__eyebrow">정리</div>
            <div className="step__title">한 주가 끝났다</div>
            <div className="step__result mt8">
              <div className="step__resultrow"><span className="step__bullet" /><span>지출 <b>−{won(outcome.expense)}</b></span></div>
              {outcome.musicIncome > 0 && (
                <div className="step__resultrow"><span className="step__bullet" /><span>음원 수익 <b>+{won(outcome.musicIncome)}</b></span></div>
              )}
              <div className="step__resultrow"><span className="step__bullet" /><span>이번 주 수지 <b>{net >= 0 ? '+' : ''}{won(net)}</b></span></div>
              <div className="step__resultrow"><span className="step__bullet" /><span>팬 <b>{save.band.metrics.fans + outcome.fansDelta}</b>{outcome.fansDelta ? ` (+${outcome.fansDelta})` : ''}</span></div>
              <div className="step__resultrow"><span className="step__bullet" /><span>곡 <b>{songsAfter}곡</b>{outcome.newSong ? ' · 새 곡 추가' : ''}</span></div>
              {growth.length > 0 && (
                <div className="step__resultrow"><span className="step__bullet" /><span className="accent">성장 {growth.length}명</span></div>
              )}
              {tired.length > 0 && (
                <div className="step__resultrow"><span className="step__bullet" /><span className="amber">지쳐서 덜 배운 멤버 {tired.length}명</span></div>
              )}
              <div className="step__resultrow">
                <span className="step__bullet" />
                <span>{outcome.newOffers.length > 0 ? '새 제안 도착 예정' : songsAfter >= needed ? '곧 제안이 들어올 것 같다' : `공연 제안까지 곡 ${songsAfter}/${needed}`}</span>
              </div>
            </div>
            <p className="step__body mt12">연습실로 돌아가면 달라진 것이 보일 것이다.</p>
          </div>
        )}
      </div>

      <div className="imm__bottom">
        <div className="progress">
          {steps.map((_, k) => <span key={k} className={`progress__dot ${k < i ? 'progress__dot--done' : k === i ? 'progress__dot--now' : ''}`} />)}
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

function eyebrowFor(kind: WeekLogEntry['kind']): string {
  switch (kind) {
    case 'ACTIVITY': return '밴드 활동';
    case 'INDIVIDUAL': return '개인 일정';
    case 'GROWTH': return '성장';
    case 'SONG': return '새 곡';
    case 'RELEASE_INCOME': return '음원';
    case 'OFFER': return '새 제안';
    default: return '이번 주';
  }
}
