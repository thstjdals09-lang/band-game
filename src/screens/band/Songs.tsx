// SONGS (IA §17): 밴드의 작업 노트. 4축, 장르, 기여 멤버, 탄생 배경. 전략은 3가지로 단순화.
import { CHARACTERS, RELEASE_FORMATS } from '@/data/master';
import { useSave } from '@/state/store';
import { releaseReadiness, songList } from '@/state/selectors';
import { songActions } from '@/state/actions';
import { isReleased } from '@/state/save/schema';
import { Btn, EmptyState, Section, StatBar, Tag } from '@/components/ui';
import { BandFrame } from './BandFrame';

const STATUS_LABEL: Record<string, string> = {
  UNRELEASED: '미발표', DEMO: '데모 보관', SAVED_FOR_EP: 'EP용 보관',
  RELEASED_SINGLE: '싱글 발매', RELEASED_EP: 'EP 수록', RELEASED_ALBUM: '앨범 수록',
};
const ORIGIN_LABEL: Record<string, string> = {
  BAND_PRACTICE: '합주 중에 나왔다', RECORDING_SESSION: '녹음 중에 다듬었다',
  RELATIONSHIP_TENSION: '멤버 사이의 긴장에서', LATE_NIGHT_SESSION: '새벽 작업에서',
};

export function SongsScreen() {
  const save = useSave();
  const songs = songList(save);
  const ready = releaseReadiness(save);
  const releases = Object.values(save.releases).sort((a, b) => b.releasedWeek - a.releasedWeek);

  return (
    <BandFrame>
      {songs.length === 0 && <EmptyState text="아직 곡이 없다. 합주나 녹음으로 한 주를 보내면 첫 데모가 나온다." />}

      {ready.epSongs.length > 0 && (
        <Section title="EP 준비">
          <div className="rowcard rowcard--stack">
            <div className="row row--between">
              <span className="rowcard__title">모아둔 곡 {ready.epSongs.length}/{RELEASE_FORMATS.EP.songsRequired}</span>
              <Tag tone={ready.canReleaseEp ? 'ok' : 'mute'}>{ready.canReleaseEp ? '발매 가능' : '더 필요'}</Tag>
            </div>
            <div className="rowcard__meta mt8">{ready.epSongs.map((x) => x.title).join(' · ')}</div>
            <div className="mt12">
              <Btn size="sm" variant="primary" full disabled={!ready.canReleaseEp}
                onClick={() => songActions.release('EP', ready.epSongs.map((x) => x.id))}>
                EP로 낸다
              </Btn>
            </div>
          </div>
        </Section>
      )}

      {releases.length > 0 && (
        <Section title="발매 기록">
          {releases.map((r) => (
            <div key={r.id} className="rowcard">
              <span className="grow">
                <div className="rowcard__title">{RELEASE_FORMATS[r.type].label}</div>
                <div className="rowcard__meta">{r.songIds.map((id) => save.songs[id]?.title).filter(Boolean).join(', ')}</div>
              </span>
              <span className="rowcard__meta mono">팬 +{r.result?.fansDelta ?? 0}</span>
            </div>
          ))}
        </Section>
      )}
      {songs.map((s, i) => (
        <div key={s.id} className="rowcard rowcard--stack">
          <div className="row row--between">
            <div>
              <div className="label dim">{String(i + 1).padStart(2, '0')}</div>
              <div className="rowcard__title lead">{s.title}</div>
            </div>
            <Tag tone={s.status === 'UNRELEASED' ? 'mute' : 'accent'}>{STATUS_LABEL[s.status] ?? s.status}</Tag>
          </div>

          <div className="rowcard__meta mt8">
            {s.createdWeek}주차 · 작곡 {s.contributors.composer.map((c) => CHARACTERS[c].name).join(', ') || '-'}
            {s.contributors.lyrics.length > 0 && ` · 작사 ${s.contributors.lyrics.map((c) => CHARACTERS[c].name).join(', ')}`}
          </div>
          <div className="tags mt8">
            {s.genreTags.map((g) => <Tag key={g}>{g}</Tag>)}
            {s.originContext.map((o) => <Tag key={o} tone="amber">{ORIGIN_LABEL[o] ?? o}</Tag>)}
          </div>

          <div className="col mt12" style={{ gap: 8 }}>
            <StatBar label="대중성" value={s.musicProfile.popularity} />
            <StatBar label="음악성" value={s.musicProfile.artistry} />
            <StatBar label="팬 적합" value={s.musicProfile.fanFit} />
            <StatBar label="라이브" value={s.musicProfile.liveFit} />
          </div>

          {!isReleased(s.status) && (
            <Section title="이 곡을 어떻게 할까" tight>
              <div className="col" style={{ gap: 6 }}>
                <Btn size="sm" variant={s.status === 'DEMO' ? 'primary' : 'secondary'} full onClick={() => songActions.setStatus(s.id, 'DEMO')}>데모로 둔다</Btn>
                <Btn size="sm" variant="secondary" full disabled={!ready.canRelease} onClick={() => songActions.release('SINGLE', [s.id])}>
                  {ready.canRelease ? '싱글로 낸다' : '첫 공연 후 발매 가능'}
                </Btn>
                <Btn size="sm" variant={s.status === 'SAVED_FOR_EP' ? 'primary' : 'secondary'} full onClick={() => songActions.setStatus(s.id, 'SAVED_FOR_EP')}>EP까지 모은다</Btn>
              </div>
            </Section>
          )}
        </div>
      ))}
    </BandFrame>
  );
}
