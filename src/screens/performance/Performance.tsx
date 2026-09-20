// PERFORMANCE (IA §19): full-screen stage, no dock / no management HUD.
// Not a rhythm game: the simulation runs and the player only answers 1~2 moment choices. Back locked.
import { useState } from 'react';
import { CHARACTERS, PROTOTYPE_BALANCE, VENUES } from '@/data/master';
import { useSave } from '@/state/store';
import { debutSongRequirement, lineupView, songList } from '@/state/selectors';
import { performanceActions } from '@/state/actions';
import { resolvePerformance } from '@/state/sim/performance';
import { useGameNav, useLockBack } from '@/app/navigation';
import { subjectParticle } from '@/app/format';
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState } from '@/components/ui';

const B = PROTOTYPE_BALANCE.performance;

type Beat =
  | { kind: 'INTRO' }
  | { kind: 'SONG'; index: number; title: string }
  | { kind: 'CHOICE'; prompt: string; options: { id: string; label: string; energy: number }[] }
  | { kind: 'OUTRO' };

export function PerformanceScreen() {
  const save = useSave();
  const { go } = useGameNav();
  useLockBack(true);

  const pending = save.pendingPerformance;
  const venue = pending ? VENUES[pending.venueId] : undefined;
  const songs = songList(save);
  const req = debutSongRequirement(save);
  const opening = songs.find((s) => s.id === pending?.openingSongId);
  // Debut Showcase setlist = Opening Song + remaining demos (full Setlist Editor is a later feature)
  const setlist = opening ? [opening, ...songs.filter((s) => s.id !== opening.id)].slice(0, req.required) : [];
  const lineup = lineupView(save).filter((s) => s.kind !== 'EMPTY');

  const [beats] = useState<Beat[]>(() => {
    const guitarist = lineup.find((s) => s.slot === 'GUITAR' && s.characterId)?.characterId ?? lineup.find((s) => s.characterId)?.characterId;
    const name = guitarist ? CHARACTERS[guitarist].name : '세션 기타';
    const list: Beat[] = [{ kind: 'INTRO' }];
    setlist.forEach((s, i) => {
      list.push({ kind: 'SONG', index: i, title: s.title });
      if (i === 0) {
        list.push({
          kind: 'CHOICE',
          prompt: `${name}${subjectParticle(name)} 예정된 기타 솔로보다 더 길게 이어가려 합니다. 관객 반응이 뜨겁습니다.`,
          options: [
            { id: 'PUSH', label: '그대로 밀어붙인다', energy: B.choicePushEnergy },
            { id: 'PLAN', label: '계획대로 간다', energy: B.choicePlanEnergy },
          ],
        });
      }
    });
    list.push({ kind: 'OUTRO' });
    return list;
  });
  const [i, setI] = useState(0);
  const [energy, setEnergy] = useState<number>(B.startEnergy);
  const [choices, setChoices] = useState<{ prompt: string; choiceId: string }[]>([]);

  if (!pending || !venue || !opening || !req.met || lineup.length === 0) {
    return (
      <div className="imm">
        <div className="imm__stage">
          <div className="imm__scroll">
            <EmptyState
              text={`공연을 시작할 수 없다. 예정된 공연, 오프닝 곡, 곡 ${req.have}/${req.required}, 라인업이 모두 필요하다.`}
              action={<Btn variant="secondary" onClick={() => go('/performance/prep', { replace: true })}>공연 준비로</Btn>}
            />
          </div>
        </div>
      </div>
    );
  }

  const beat = beats[i];
  const songNo = beats.slice(0, i + 1).filter((b) => b.kind === 'SONG').length;

  const advance = (gain: number) => {
    setEnergy((e) => Math.min(100, e + gain));
    setI((x) => Math.min(beats.length - 1, x + 1));
  };

  const finish = () => {
    // IA §19: the result comes from the band's accumulated state; the moment choices and a small
    // random spread only nudge it. See sim/performance.ts.
    const maxChoiceEnergy = beats
      .filter((b): b is Extract<Beat, { kind: 'CHOICE' }> => b.kind === 'CHOICE')
      .reduce((a, b) => a + Math.max(...b.options.map((o) => o.energy)), 0);
    const earned = choices.reduce((a, c) => {
      const beat = beats.find((b) => b.kind === 'CHOICE' && b.prompt === c.prompt);
      const opt = beat && beat.kind === 'CHOICE' ? beat.options.find((o) => o.id === c.choiceId) : undefined;
      return a + (opt?.energy ?? 0);
    }, 0);
    const choiceScore = maxChoiceEnergy > 0 ? earned / maxChoiceEnergy : 0;

    const result = resolvePerformance(save, choiceScore);
    performanceActions.commit({
      venueId: venue.id, venueName: venue.name,
      // 실제로 무대에 선 사람을 남긴다 (주전 기용 약속 판정의 근거).
      lineup: lineup.map((s) => ({ slot: s.slot, label: s.displayName ?? '', characterId: s.characterId ?? null })),
      openingSongTitle: opening.title,
      audience: result.audience, grade: result.grade,
      revenue: result.revenue,
      fansDelta: result.fansDelta,
      reputationDelta: result.reputationDelta,
      crowdEnergyPeak: Math.round(result.score),
      choices,
    });
    go('/performance/result', { replace: true });
  };

  return (
    <div className="imm">
      <div className="imm__top">
        <span className="amber strong">{venue.name}</span>
        <span className="mono">SONG {Math.max(1, songNo)}/{setlist.length}</span>
        <div className="energy" aria-label="관객 반응"><div className="energy__fill" style={{ width: `${energy}%` }} /></div>
      </div>

      <div className="imm__stage">
        <PlaceholderAsset assetKey={`PERFORMANCE_STAGE_${venue.id}`} variant="fill" kind="scene" />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '34%', display: 'flex', justifyContent: 'center', gap: 8 }}>
          {lineup.map((s) => (
            <CharacterVisual
              key={s.index}
              id={s.characterId ?? 'SESSION'}
              variant="THUMB"
              seed={s.assignment?.kind === 'SESSION' ? s.assignment.instanceId : s.index}
            />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '26%' }}>
          <PlaceholderAsset assetKey="PERFORMANCE_CROWD" variant="fill" kind="scene" />
        </div>
        {beat.kind === 'CHOICE' && (
          <div className="choice" style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
            <div className="choice__title">라이브 순간 선택</div>
            <p className="choice__text">{beat.prompt}</p>
            <div className="choice__actions">
              {beat.options.map((o) => (
                <Btn key={o.id} variant={o.id === 'PUSH' ? 'primary' : 'secondary'} size="lg" full
                  onClick={() => { setChoices((c) => [...c, { prompt: beat.prompt, choiceId: o.id }]); advance(o.energy); }}>
                  {o.label}
                </Btn>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="imm__bottom">
        {beat.kind === 'INTRO' && (<><div className="dim">무대에 오른다. 객석이 조용해진다.</div><Btn variant="secondary" size="lg" full onClick={() => advance(B.introEnergy)}>계속</Btn></>)}
        {beat.kind === 'SONG' && (<><div><span className="label dim caps">지금 연주 중</span><div className="lead strong">{beat.title}</div></div><Btn variant="secondary" size="lg" full onClick={() => advance(B.songEnergy)}>계속</Btn></>)}
        {beat.kind === 'CHOICE' && <div className="dim meta">선택을 기다리는 중…</div>}
        {beat.kind === 'OUTRO' && (<><div className="dim">마지막 곡이 끝났다.</div><Btn variant="primary" size="lg" full onClick={finish}>무대를 내려온다</Btn></>)}
      </div>
    </div>
  );
}
