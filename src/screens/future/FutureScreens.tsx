// Long-term feature shells (IA §24 / GDD §09). Routes + lock state + placeholder only.
import { CHARACTERS } from '@/data/master';
import { useSave } from '@/state/store';
import { lineupView } from '@/state/selectors';
import { FutureShell } from '@/components/FutureShell';
import { Panel } from '@/components/Panel';
import { EmptyState, Section, Tag } from '@/components/ui';
import { CharacterVisual } from '@/components/CharacterVisual';

export const FansChartsScreen = () => (
  <FutureShell title="팬 / 차트" iaLocation="BAND" initialState="Placeholder / Locked"
    description="팬층과 차트는 음원을 내고 나서 볼 수 있다." />
);
export const RivalsScreen = () => (
  <FutureShell title="라이벌" iaLocation="OUTSIDE" initialState="일부 소개"
    description="같은 씬에서 경쟁할 밴드들은 아직 만나지 못했다." />
);
export const RankingsScreen = () => (
  <FutureShell title="랭킹" iaLocation="OUTSIDE" initialState="Locked"
    description="랭킹은 지역에서 이름이 알려진 뒤에 열린다." />
);
export const LabelsScreen = () => (
  <FutureShell title="레이블" iaLocation="OUTSIDE" initialState="Locked"
    description="레이블은 밴드가 눈에 띄기 시작하면 먼저 연락해 온다." />
);
export const WorldOverseasScreen = () => (
  <FutureShell title="해외" iaLocation="OUTSIDE" initialState="Locked"
    description="해외 무대는 아직 아주 먼 이야기다." />
);
export const StaffScreen = () => (
  <FutureShell title="스태프" iaLocation="MANAGEMENT" initialState="Locked / Shell"
    description="사무 공간이 생기면 함께 일할 사람을 둘 수 있다." />
);
export const EquipmentScreen = () => (
  <FutureShell title="장비" iaLocation="MANAGEMENT" initialState="Shell"
    description="장비 관리는 장비 공간을 지은 뒤에 열린다." />
);

/** Career Archive - 기본 Timeline (careerHistory entries). */
export function CareerArchiveScreen() {
  const save = useSave();
  const TYPE_LABEL: Record<string, string> = {
    MILESTONE: '이정표', LINEUP_CHANGE: '라인업', CONTRACT: '계약', RELEASE: '발매', FACILITY: '시설', BAND: '밴드',
  };
  return (
    <Panel title="커리어 기록" nav="back">
      {save.careerHistory.length === 0 && <EmptyState text="아직 기록이 없다." />}
      {save.careerHistory.map((h, i) => (
        <div key={i} className="rowcard">
          <span className="mono meta dim" style={{ width: 44 }}>{h.week}주</span>
          <span className="grow">{h.text}</span>
          <Tag tone="mute">{TYPE_LABEL[h.type] ?? h.type}</Tag>
        </div>
      ))}
    </Panel>
  );
}

/** Public Band Profile - Preview: current lineup first (GDD §08). */
export function PublicProfileScreen() {
  const save = useSave();
  const lineup = lineupView(save).filter((s) => s.kind !== 'EMPTY');
  return (
    <Panel title="공개 프로필" subtitle="미리보기" nav="back">
      <div className="panel__title" style={{ fontSize: 22 }}>{save.band.name ?? '이름 없는 밴드'}</div>
      <div className="tags mt12">
        <Tag>팬 {save.band.metrics.fans}</Tag>
        <Tag>명성 {save.band.metrics.fame}</Tag>
        {save.band.brandTags.map((t) => <Tag key={t}>{t}</Tag>)}
      </div>
      <Section title="현재 라인업">
        {lineup.length === 0 && <EmptyState text="라인업이 비어 있다." />}
        <div className="row wrap" style={{ gap: 14 }}>
          {lineup.map((s) => (
            <div key={s.index} className="center">
              <CharacterVisual id={s.characterId ?? 'SESSION'} />
              <div className="meta mt8">{s.characterId ? CHARACTERS[s.characterId].name : '세션'}</div>
              <div className="label faint">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>
    </Panel>
  );
}

/** History - 기본 기록 (performance snapshots). */
export function HistoryScreen() {
  const save = useSave();
  const GRADE_WORD: Record<string, string> = {
    'GREAT SHOW': '최고의 무대', 'GOOD SHOW': '좋은 공연', OKAY: '무난한 공연', DISASTER: '아쉬운 밤',
  };
  return (
    <Panel title="히스토리" nav="back">
      <Section title="공연 기록">
        {save.performanceHistory.length === 0 && <EmptyState text="아직 무대에 선 적이 없다." />}
        {save.performanceHistory.map((p) => (
          <div key={p.id} className="rowcard rowcard--stack">
            <div className="row row--between">
              <span className="rowcard__title lead">{p.venueName}</span>
              <Tag tone="accent">{GRADE_WORD[p.grade] ?? p.grade}</Tag>
            </div>
            <div className="rowcard__meta mt8">{p.week}주차 · 관객 {p.audience}명 · 팬 +{p.fansDelta}</div>
            <div className="rowcard__meta">{p.lineup.map((l) => l.label).join(' · ')}</div>
          </div>
        ))}
      </Section>
    </Panel>
  );
}
