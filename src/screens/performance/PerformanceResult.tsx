// PERFORMANCE RESULT (IA §20): 감정적 평가 -> 객관적 결과 -> 세계가 바뀐 결과 -> 돌아가기. Back locked.
import { useSave } from '@/state/store';
import { facilityAvailability } from '@/state/selectors';
import { useGameNav, useLockBack } from '@/app/navigation';
import { won } from '@/app/format';
import { Btn, EmptyState, Section } from '@/components/ui';

const GRADE_WORD: Record<string, string> = {
  'GREAT SHOW': '최고의 무대', 'GOOD SHOW': '좋은 공연', OKAY: '무난한 공연', DISASTER: '아쉬운 밤',
};
const CHOICE_WORD: Record<string, string> = { PUSH: '솔로를 끝까지 밀어붙였다', PLAN: '계획대로 무대를 끌고 갔다' };

export function PerformanceResultScreen() {
  const save = useSave();
  const { go } = useGameNav();
  useLockBack(true);
  const snap = save.performanceHistory[save.performanceHistory.length - 1];

  if (!snap) {
    return (
      <div className="imm">
        <div className="imm__stage"><div className="imm__scroll">
          <EmptyState text="공연 기록이 없다." action={<Btn variant="secondary" onClick={() => go('/', { replace: true })}>연습실로</Btn>} />
        </div></div>
      </div>
    );
  }

  const newOpps = Object.values(save.opportunities).filter((o) => o.createdWeek === save.world.week && o.status === 'NEW');
  const recording = facilityAvailability(save, 'RECORDING_ROOM');

  return (
    <div className="imm">
      <div className="imm__top"><span className="strong">공연 결과</span><span className="grow" /><span>{snap.venueName}</span></div>
      <div className="imm__stage">
        <div className="imm__scroll">
          <div className="step__eyebrow">오늘 밤</div>
          <div className="big-grade mt8">{GRADE_WORD[snap.grade] ?? snap.grade}</div>
          <div className="dim meta mt8">오프닝 · {snap.openingSongTitle}</div>

          <Section title="숫자로 남은 것">
            <dl className="kv">
              <dt>관객</dt><dd>{snap.audience}명</dd>
              <dt>수익</dt><dd>+{won(snap.revenue)}</dd>
              <dt>팬</dt><dd>+{snap.fansDelta}</dd>
              <dt>평판</dt><dd>{snap.reputationDelta >= 0 ? '+' : ''}{snap.reputationDelta}</dd>
            </dl>
          </Section>

          <Section title="세계가 바뀐 것">
            <div className="step__result">
              {snap.choices.map((c, i) => (
                <div key={i} className="step__resultrow"><span className="step__bullet" /><span>{CHOICE_WORD[c.choiceId] ?? '무대 위에서 선택을 했다'}</span></div>
              ))}
              {newOpps.map((o) => (
                <div key={o.id} className="step__resultrow"><span className="step__bullet" /><span className="accent">새 제안 · {o.title}</span></div>
              ))}
              {recording === 'AVAILABLE' && (
                <div className="step__resultrow"><span className="step__bullet" /><span className="amber">녹음실을 건설할 수 있게 됐다</span></div>
              )}
              <div className="step__resultrow"><span className="step__bullet" /><span className="dim">이 공연은 기록으로 남는다</span></div>
            </div>
          </Section>
        </div>
      </div>
      <div className="imm__bottom"><Btn variant="primary" size="lg" full onClick={() => go('/', { replace: true })}>연습실로 돌아가기</Btn></div>
    </div>
  );
}
