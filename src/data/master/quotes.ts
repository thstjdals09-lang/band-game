// 오디션에서 후보가 남기는 한마디.
//
// **임시 문구다.** 최종 대사는 기획에서 따로 작성한다. 여기 값을 바꾸면 화면에 바로 반영된다.
// 공개된 정보(포지션, 드러난 성향)에서만 나오는 말로 둔다 — 숨은 능력치나 성장 가능성을 암시하지 않는다.
export const CHARACTER_QUOTES: Record<string, string> = {
  C01: '무대에 서면, 다들 저만 보게 될 거예요.',
  C02: '소리가 곱게 겹치는 순간이 좋아요.',
  C04: '조용히 연습해 왔어요. 들어봐 주실래요?',
  C07: '뒤에서 중심 잡는 건 제가 잘합니다.',
  C10: '몇 시간이든 칠 수 있습니다.',
};

export function characterQuote(id: string): string | undefined {
  return CHARACTER_QUOTES[id];
}
