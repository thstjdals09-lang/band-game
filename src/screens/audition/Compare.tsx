// COMPARE (IA §12): "누가 지금 이 밴드에 더 맞는가"를 판단하는 화면.
// Facts first (position / burden / tags / trait / empty-slot fit), then core stats,
// then a fit diagnosis area that stays honest: anything needing the simulation engine is
// shown as "아직 알 수 없음" with the reason - never an invented number.
import { CHARACTERS, traitName } from '@/data/master';
import { useSave } from '@/state/store';
import { candidateFit, compareLeaders, VISIBLE_STAT_LABEL, VISIBLE_STAT_ORDER } from '@/state/selectors';
import { useGameNav } from '@/app/navigation';
import { Panel } from '@/components/Panel';
import { CharacterVisual } from '@/components/CharacterVisual';
import { Btn, EmptyState, Section, StatBar, Tag } from '@/components/ui';

export function CompareScreen() {
  const save = useSave();
  const { go } = useGameNav();
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN');
  const ids = (audition?.compareIds ?? []).slice(0, 3);
  if (ids.length < 2) {
    return <Panel title="비교하기" nav="back"><EmptyState text="쇼트리스트에 2명 이상을 담은 뒤 비교할 수 있다." /></Panel>;
  }

  const fits = ids.map((id) => ({ id, fit: candidateFit(save, id) }));
  const unknownLabels = fits[0].fit.unknown;
  // 나란히 놓은 후보들 사이에서 항목별 최고값. 어느 쪽이 앞서는지 숫자를 외우지 않아도 보인다.
  const leaders = compareLeaders(ids);

  return (
    <Panel title="비교하기" subtitle={`후보 ${ids.length}명`} nav="back">
      {/* 1. Identity + contract burden */}
      <div className={`compare compare--${ids.length}`}>
        {fits.map(({ id, fit }) => {
          const c = CHARACTERS[id];
          return (
            <div key={id} className="compare__col">
              <div style={{ display: 'grid', placeItems: 'center' }}><CharacterVisual id={id} variant="THUMB" /></div>
              <div className="compare__name">{c.name}</div>
              <div className="compare__pos"><Tag tone="role">{c.positions[0].toUpperCase()}</Tag></div>
              <div className="col mt12" style={{ gap: 6 }}>
                <div className="compare__fact"><span>계약</span><b>{fit.contractBurden}</b></div>
                <div className="compare__fact"><span>빈 자리</span><b>{fit.fillsSlotLabel ?? '없음'}</b></div>
                <div className="compare__fact"><span>겹치는 장르</span><b>{fit.sharedTags.length}</b></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Core stats */}
      <Section title="핵심 5 스탯">
        <div className="ahint" style={{ textAlign: 'left', marginBottom: 8 }}>색이 들어간 막대가 나란히 놓은 후보 중 가장 높은 값이다.</div>
        <div className={`compare compare--${ids.length}`}>
          {ids.map((id) => {
            const s = CHARACTERS[id].visibleStats;
            return (
              <div key={id} className="compare__col">
                <div className="compare__name" style={{ marginTop: 0, marginBottom: 8 }}>{CHARACTERS[id].name}</div>
                <div className="col" style={{ gap: 6 }}>
                  {VISIBLE_STAT_ORDER.map((key) => (
                    <div key={key} className={s[key] === leaders[key] ? 'cmpstat--best' : 'cmpstat--rest'}>
                      <StatBar compact label={VISIBLE_STAT_LABEL[key].short} value={s[key]} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 3. Known traits + genres */}
      <Section title="알고 있는 것">
        {fits.map(({ id, fit }) => {
          const c = CHARACTERS[id];
          return (
            <div key={id} className="rowcard rowcard--stack">
              <div className="rowcard__title">{c.name}</div>
              <div className="tags mt8">
                <Tag tone="amber">{traitName(c.visibleTraitIds[0])}</Tag>
                {c.musicTags.map((t) => <Tag key={t} tone={fit.sharedTags.includes(t) ? 'ok' : undefined}>{t}</Tag>)}
              </div>
              {save.band.activeMembers.length > 0 && (
                <div className="rowcard__meta mt8">
                  {fit.sharedTags.length > 0 ? `현재 밴드와 겹치는 장르: ${fit.sharedTags.join(', ')}` : '현재 밴드와 겹치는 장르가 없다'}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {/* 4. Fit diagnosis - honest unknowns */}
      <Section title="밴드 적합도">
        <div className="rowcard rowcard--stack">
          {unknownLabels.map((u) => (
            <div key={u.label} className="fitrow">
              <span>{u.label}</span>
              <span className="fitrow__unknown">아직 알 수 없음 · {u.reason}</span>
            </div>
          ))}
        </div>
        <div className="notice mt12">합주와 조사를 거쳐야 실제 궁합이 드러난다. 지금 보이는 것은 확인된 사실뿐이다.</div>
      </Section>

      <Section title="더 알아보기">
        {ids.map((id) => (
          <Btn key={id} variant="secondary" full onClick={() => go(`/audition/candidate/${id}`)}>{CHARACTERS[id].name} 상세 보기</Btn>
        ))}
      </Section>
    </Panel>
  );
}
