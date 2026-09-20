// 영입 화면(오디션 · 후보 상세 · 비교 · 계약)이 함께 쓰는 표현 조각.
// 계산은 selectors.ts의 candidateFieldView가 하고, 여기서는 그리기만 한다.
// 보여주는 것은 전부 이미 공개된 정보다. 숨은 스탯·특성·성장 잠재력은 다루지 않는다.
import type { RefObject } from 'react';
import { CHARACTERS, type CharacterId } from '@/data/master';
import { positionTone } from '@/components/ui';
import type { AuditionState } from '@/state/save/schema';
import type { CandidateFieldView } from '@/state/selectors';
import { CharacterVisual } from '@/components/CharacterVisual';

/** 후보 전원이 한 줄에 보이는 로스터. 카드마다 그 사람의 가장 높은 스탯이 한 줄로 붙는다. */
export function RosterStrip({
  audition, selectedId, onSelect, compact, listRef,
}: {
  audition: AuditionState;
  selectedId: CharacterId;
  onSelect: (id: CharacterId) => void;
  compact?: boolean;
  /** 좌우 버튼이 이 목록을 넘긴다. */
  listRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <div className={`roster ${compact ? 'roster--compact' : ''}`} ref={listRef}>
      {audition.candidateIds.map((id) => {
        const selected = id === selectedId;
        const starred = audition.shortlistIds.includes(id);
        return (
          <button
            key={id}
            className={`roster__card roster__wrap ${selected ? 'roster__card--selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onSelect(id)}
          >
            {starred && !compact && <span className="roster__star">★</span>}
            {!compact && <CharacterVisual id={id} variant="THUMB" />}
            <span className="roster__name">
              {starred && compact && <span className="roster__star--inline">★</span>}
              {CHARACTERS[id].name}
            </span>
            <span className={`roster__pos roster__pos--${positionTone(CHARACTERS[id].positions[0])}`}>
              {CHARACTERS[id].positions[0].toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 다른 후보와 견줘 돋보이는 점. 공개된 스탯에서만 나온다. */
export function StandoutChips({ view }: { view: CandidateFieldView }) {
  if (view.standouts.length === 0) return null;
  // 1위가 하나도 없는 후보의 "평균 +n"은 1위만큼 크게 외치지 않는다.
  const soft = !view.stats?.some((s) => s.lead);
  return (
    <div className="badges">
      <span className="badges__among">후보 {view.fieldSize}명 중</span>
      {view.standouts.map((t) => (
        <span key={t} className={`badge ${soft ? 'badge--soft' : ''}`}>{t}</span>
      ))}
    </div>
  );
}

/** 핵심 5스탯. 세로선은 이번 오디션 후보 평균이고, 후보 중 가장 높은 항목은 강조된다. */
export function FieldStats({ view, legend = true, compact }: { view: CandidateFieldView; legend?: boolean; compact?: boolean }) {
  if (!view.stats) return null;
  return (
    <div className={`fstats ${compact ? 'fstats--compact' : ''}`}>
      {view.stats.map((s) => (
        <div key={s.key} className={`fstat ${s.lead ? 'fstat--lead' : ''}`}>
          <span className="fstat__label">{s.label}</span>
          <div className="fstat__track">
            <div className="fstat__fill" style={{ width: `${Math.max(0, Math.min(100, s.value))}%` }} />
            {view.fieldSize > 1 && (
              <span className="fstat__avg" style={{ left: `${Math.max(0, Math.min(100, s.fieldAverage))}%` }} />
            )}
          </div>
          <span className="fstat__value">{s.value}</span>
          <span className="fstat__rank">{s.lead ? '1위' : ''}</span>
        </div>
      ))}
      {legend && view.fieldSize > 1 && (
        <div className="fstats__legend"><span className="fstats__tick" /> 이번 오디션 후보 평균</div>
      )}
    </div>
  );
}
