// Long-term feature shells (IA §24 / GDD §09). Routes + lock state + placeholder only.
import { CHARACTERS } from '@/data/master';
import { useSave } from '@/state/store';
import { lineupView } from '@/state/selectors';
import { FutureShell } from '@/components/FutureShell';
import { Panel } from '@/components/Panel';
import { EmptyState, Section, Tag } from '@/components/ui';
import { CharacterVisual } from '@/components/CharacterVisual';

export const FansChartsScreen = () => <FutureShell title="FANS / CHARTS" iaLocation="BAND" initialState="Placeholder / Locked" />;
export const RivalsScreen = () => <FutureShell title="RIVALS" iaLocation="OUTSIDE" initialState="일부 소개" description="핵심 라이벌 밴드는 고정 캐릭터와 고유 서사를 가진다 (GDD §07). Local Act Chapter에서 소개." />;
export const RankingsScreen = () => <FutureShell title="RANKINGS" iaLocation="OUTSIDE" initialState="Locked" />;
export const LabelsScreen = () => <FutureShell title="LABELS" iaLocation="OUTSIDE" initialState="Locked" description="대형 레이블 / 인디 레이블 / 완전 독립 (GDD §07)." />;
export const WorldOverseasScreen = () => <FutureShell title="WORLD / OVERSEAS" iaLocation="OUTSIDE" initialState="Locked" />;
export const StaffScreen = () => <FutureShell title="STAFF" iaLocation="MANAGEMENT" initialState="Locked / Shell" description="프로듀서 / 트레이너 / PR 매니저 / 스타일리스트 / 투어 매니저 (GDD §05) - 경영 확장 요소." />;
export const EquipmentScreen = () => <FutureShell title="EQUIPMENT" iaLocation="MANAGEMENT" initialState="Shell" description="악기/장비 성장 (IA §21)." />;

/** Career Archive - 기본 Timeline (careerHistory entries). */
export function CareerArchiveScreen() {
  const save = useSave();
  return (
    <Panel title="CAREER ARCHIVE" subtitle="BAND · 기본 Timeline" nav="back">
      {save.careerHistory.length === 0 && <EmptyState text="기록 없음" />}
      {save.careerHistory.map((h, i) => (
        <div key={i} className="rowcard"><span className="mono xs dim">W{h.week}</span><span className="grow small">{h.text}</span><Tag>{h.type}</Tag></div>
      ))}
      <div className="todo mt12">TODO · 앨범·포스터·티켓·트로피 전시(공간에 실제로 쌓이는 Career Memory)는 에셋 도착 후 Basecamp 오브젝트로 연결.</div>
    </Panel>
  );
}

/** Public Band Profile - Preview: current lineup first (GDD §08). */
export function PublicProfileScreen() {
  const save = useSave();
  const lineup = lineupView(save).filter((s) => s.kind !== 'EMPTY');
  return (
    <Panel title="PUBLIC PROFILE" subtitle="Preview" nav="back">
      <div className="rowcard__title" style={{ fontSize: 18 }}>{save.band.name ?? 'PLAYER BAND'}</div>
      <div className="tags mt8"><Tag>{save.band.careerTier}</Tag><Tag>Fans {save.band.metrics.fans}</Tag>{save.band.brandTags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
      <Section title="현재 라인업">
        {lineup.length === 0 && <EmptyState text="라인업 없음" />}
        <div className="row wrap">
          {lineup.map((s) => (
            <div key={s.slot} style={{ textAlign: 'center' }}>
              <CharacterVisual id={s.characterId ?? 'SESSION'} />
              <div className="xs">{s.characterId ? CHARACTERS[s.characterId].name : 'SESSION'}</div>
              <div className="xs faint">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>
      <div className="todo mt12">TODO · 공유 링크 / 다른 플레이어 프로필 구경은 소셜 단계 (GDD §08).</div>
    </Panel>
  );
}

/** History - 기본 기록 (performance snapshots + lineup changes). */
export function HistoryScreen() {
  const save = useSave();
  return (
    <Panel title="HISTORY" subtitle="BAND / Archive · 기본 기록" nav="back">
      <Section title="공연 기록 (Snapshot)">
        {save.performanceHistory.length === 0 && <div className="xs faint">아직 없음</div>}
        {save.performanceHistory.map((p) => (
          <div key={p.id} className="rowcard" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="row row--between"><span className="rowcard__title">{p.venueName}</span><Tag tone="accent">{p.grade}</Tag></div>
            <div className="rowcard__meta">W{p.week} · 관객 {p.audience} · 팬 +{p.fansDelta} · {p.lineup.map((l) => l.label).join(' / ')}</div>
          </div>
        ))}
      </Section>
      <Section title="이벤트 기록">
        {save.eventHistory.length === 0 && <div className="xs faint">아직 없음</div>}
      </Section>
    </Panel>
  );
}
