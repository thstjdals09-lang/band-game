// SONGS (IA §17): 밴드의 작업 노트. 4축, 장르, 기여 멤버, 탄생 배경. 전략은 3가지로 단순화.
//
// v1 곡 제작 규칙이 여기서 결정된다:
//  1. 새 곡 작업을 예약해야 다음 합주 한 칸이 데모를 만든다.
//  2. 나머지 합주는 공연 준비에 쓰이고, 대상 곡은 대표곡을 따라가되 바꿀 수 있다.
//  3. 녹음은 기존 데모를 발매 가능한 음원으로 만든다 (주당 1칸).
//  4. 녹음하지 않은 곡은 공연에는 쓰지만 발매할 수 없다.
import { CHARACTERS, RELEASE_FORMATS } from '@/data/master';
import { useSave } from '@/state/store';
import { releaseReadiness, songList, songWorkView } from '@/state/selectors';
import { scheduleActions, songActions } from '@/state/actions';
import { isRecorded, isReleased } from '@/state/save/schema';
import { Btn, EmptyState, Notice, Section, StatBar, Tag } from '@/components/ui';
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
  const work = songWorkView(save);
  const releases = Object.values(save.releases).sort((a, b) => b.releasedWeek - a.releasedWeek);

  return (
    <BandFrame>
      <Section title="이번 주 작업">
        <div className="rowcard rowcard--stack">
          <div className="row row--between">
            <span className="rowcard__title lead">새 곡 쓰기</span>
            <Tag tone={work.newSong ? 'ok' : 'mute'}>{work.newSong ? '예약함' : '예약 안 함'}</Tag>
          </div>
          <div className="rowcard__meta mt8">
            {work.newSong
              ? work.practiceSlots > 0
                ? '이번 주 합주 한 칸이 새 데모를 만드는 데 쓰인다.'
                : '일정에 합주를 넣어야 데모가 나온다.'
              : '예약하지 않으면 합주는 곡을 만들지 않고 공연 준비에 쓰인다.'}
          </div>
          <div className="mt12">
            <Btn
              size="sm"
              variant={work.newSong ? 'secondary' : 'primary'}
              full
              onClick={() => scheduleActions.setNewSongWork(!work.newSong)}
            >
              {work.newSong ? '새 곡 작업 취소' : '새 곡 작업 예약'}
            </Btn>
          </div>
        </div>

        {songs.length > 0 && (
          <div className="rowcard rowcard--stack">
            <div className="row row--between">
              <span className="rowcard__title lead">공연 준비</span>
              <Tag tone={work.rehearsalSlots > 0 ? 'ok' : 'mute'}>합주 {work.rehearsalSlots}칸</Tag>
            </div>
            <div className="rowcard__meta mt8">
              {work.rehearsalSlots === 0
                ? '남는 합주 칸이 없다. 일정에 합주를 더 넣으면 무대를 다듬을 수 있다.'
                : work.rehearsalTarget
                  ? `${work.rehearsalTarget.title}${work.rehearsalPinned ? '' : ' · 무대에 올릴 곡을 따라간다'}`
                  : '준비할 곡이 없다.'}
            </div>
            {work.rehearsalPinned && (
              <div className="mt12">
                <Btn size="sm" variant="ghost" full onClick={() => scheduleActions.setRehearsalSong(null)}>
                  대표곡을 따라가게 되돌리기
                </Btn>
              </div>
            )}
          </div>
        )}

        {work.recordingSlot && (
          <div className="rowcard rowcard--stack">
            <div className="row row--between">
              <span className="rowcard__title lead">녹음</span>
              <Tag tone={work.recordingTarget ? 'ok' : 'amber'}>{work.recordingTarget ? '대상 있음' : '대상 없음'}</Tag>
            </div>
            <div className="rowcard__meta mt8">
              {work.recordingTarget
                ? `${work.recordingTarget.title} · 음원으로 다듬는다.`
                : '아래에서 녹음할 곡을 고르자. 고르지 않으면 녹음 비용도 청구되지 않는다.'}
            </div>
          </div>
        )}
      </Section>

      {songs.length === 0 && (
        <EmptyState text="아직 곡이 없다. 새 곡 작업을 예약하고 합주로 한 주를 보내면 첫 데모가 나온다." />
      )}

      {ready.epWaiting.length > 0 && (
        <Section title="EP 준비">
          <Notice tone="warn">
            EP용으로 모은 곡 가운데 {ready.epWaiting.length}곡이 아직 녹음 전이다. 녹음해야 발매할 수 있다.
          </Notice>
        </Section>
      )}

      {ready.epSongs.length > 0 && (
        <Section title={ready.epWaiting.length > 0 ? '녹음을 마친 EP 후보' : 'EP 준비'}>
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

      {songs.map((s, i) => {
        const recorded = isRecorded(s);
        const released = isReleased(s.status);
        const rehearsing = work.rehearsalTarget?.id === s.id;
        const recordingHere = work.recordingTarget?.id === s.id;
        return (
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
              <Tag tone={recorded ? 'ok' : 'amber'}>{recorded ? '녹음 완료' : '녹음 전'}</Tag>
              {rehearsing && <Tag tone="accent">이번 주 합주</Tag>}
              {recordingHere && <Tag tone="accent">이번 주 녹음</Tag>}
              {s.genreTags.map((g) => <Tag key={g}>{g}</Tag>)}
              {s.originContext.map((o) => <Tag key={o} tone="amber">{ORIGIN_LABEL[o] ?? o}</Tag>)}
            </div>

            <div className="col mt12" style={{ gap: 8 }}>
              <StatBar label="대중성" value={s.musicProfile.popularity} />
              <StatBar label="음악성" value={s.musicProfile.artistry} />
              <StatBar label="팬 적합" value={s.musicProfile.fanFit} />
              <StatBar label="라이브" value={s.musicProfile.liveFit} />
            </div>

            {!released && (
              <>
                <Section title="이번 주에 이 곡으로" tight>
                  <div className="col" style={{ gap: 6 }}>
                    <Btn
                      size="sm"
                      variant={rehearsing && work.rehearsalPinned ? 'primary' : 'secondary'}
                      full
                      onClick={() => scheduleActions.setRehearsalSong(rehearsing && work.rehearsalPinned ? null : s.id)}
                    >
                      {rehearsing && work.rehearsalPinned ? '합주 대상 해제' : '합주로 무대를 다듬는다'}
                    </Btn>
                    {!recorded && (
                      <Btn
                        size="sm"
                        variant={recordingHere ? 'primary' : 'secondary'}
                        full
                        disabled={!work.recordingRoom}
                        onClick={() => scheduleActions.setRecordingSong(recordingHere ? null : s.id)}
                      >
                        {!work.recordingRoom
                          ? '녹음실을 지어야 한다'
                          : recordingHere ? '녹음 대상 해제' : '이번 주에 녹음한다'}
                      </Btn>
                    )}
                  </div>
                  {recordingHere && !work.recordingSlot && (
                    <Notice tone="warn">일정에 녹음을 넣어야 실제로 녹음된다.</Notice>
                  )}
                </Section>

                <Section title="이 곡을 어떻게 할까" tight>
                  <div className="col" style={{ gap: 6 }}>
                    <Btn size="sm" variant={s.status === 'DEMO' ? 'primary' : 'secondary'} full onClick={() => songActions.setStatus(s.id, 'DEMO')}>데모로 둔다</Btn>
                    <Btn size="sm" variant="secondary" full disabled={!ready.canRelease || !recorded} onClick={() => songActions.release('SINGLE', [s.id])}>
                      {!ready.canRelease ? '첫 공연 후 발매 가능' : !recorded ? '녹음해야 발매할 수 있다' : '싱글로 낸다'}
                    </Btn>
                    <Btn size="sm" variant={s.status === 'SAVED_FOR_EP' ? 'primary' : 'secondary'} full onClick={() => songActions.setStatus(s.id, 'SAVED_FOR_EP')}>EP까지 모은다</Btn>
                  </div>
                </Section>
              </>
            )}
          </div>
        );
      })}
    </BandFrame>
  );
}
