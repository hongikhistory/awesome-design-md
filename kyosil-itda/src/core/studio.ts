// 과목별 스튜디오: the same tools, dressed for the subject a teacher teaches.
// Each studio sets the accent colours (checked for WCAG AA in studio.test.ts), a quiet background
// pattern, the hero illustration, the default slide template and the recommended lesson assets.

export type StudioId = "history" | "korean" | "math" | "science" | "social" | "english" | "arts" | "default";

export interface AssetLink {
  name: string;
  url: string;
  /** search URL with {q}, only for sites whose search address is public and stable */
  search?: string;
  what: string;
}

export interface Studio {
  id: StudioId;
  subject: string;
  name: string;
  tagline: string;
  colors: { primary: string; hover: string; pressed: string; text: string; bg: string; line: string };
  slideTheme: string;
  assets: AssetLink[];
}

const COMMONS: AssetLink = { name: "위키미디어 공용", url: "https://commons.wikimedia.org", search: "https://commons.wikimedia.org/w/index.php?search={q}", what: "자유 이용 이미지·지도·사진(라이선스 표시 확인)" };
const KOWIKI: AssetLink = { name: "위키백과", url: "https://ko.wikipedia.org", search: "https://ko.wikipedia.org/w/index.php?search={q}", what: "개념 확인용(수업 자료로 쓸 때는 원출처 대조)" };
const KOGL: AssetLink = { name: "공공누리", url: "https://www.kogl.or.kr", what: "공공저작물 이용 조건(유형 1~4) 확인" };

export const STUDIOS: Record<StudioId, Studio> = {
  history: {
    id: "history", subject: "역사", name: "역사 스튜디오", tagline: "사료와 유물로 과거를 묻는 교실",
    colors: { primary: "#9A3412", hover: "#7C2D12", pressed: "#5C210D", text: "#8A2E0F", bg: "#FBF1E6", line: "#EBC9A8" },
    slideTheme: "hanji",
    assets: [
      { name: "e뮤지엄", url: "https://www.emuseum.go.kr", what: "전국 국공립 박물관 소장품 통합 검색(국립중앙박물관 운영)" },
      { name: "국립중앙박물관", url: "https://www.museum.go.kr", what: "소장품·전시 해설, 교육 자료" },
      { name: "우리역사넷", url: "https://contents.history.go.kr", what: "국사편찬위원회 한국사 콘텐츠, 연대기" },
      { name: "한국사데이터베이스", url: "https://db.history.go.kr", what: "국사편찬위원회 사료 원문 검색" },
      { name: "국가유산포털", url: "https://www.heritage.go.kr", what: "국가유산(문화재) 정보와 사진" },
      COMMONS, KOWIKI,
    ],
  },
  korean: {
    id: "korean", subject: "국어", name: "국어 스튜디오", tagline: "읽고 쓰고 말하는 원고지 교실",
    colors: { primary: "#2F6B3A", hover: "#24542D", pressed: "#1A3E21", text: "#2A6034", bg: "#EEF6EF", line: "#B5D6BA" },
    slideTheme: "pastel",
    assets: [
      { name: "표준국어대사전", url: "https://stdict.korean.go.kr", what: "국립국어원 표준어·뜻풀이" },
      { name: "우리말샘", url: "https://opendict.korean.go.kr", what: "참여형 국어사전, 신어·지역어" },
      { name: "국립국어원", url: "https://www.korean.go.kr", what: "어문 규범, 쉬운 공공언어" },
      { name: "한국고전종합DB", url: "https://db.itkc.or.kr", what: "고전 원문과 번역" },
      COMMONS, KOWIKI,
    ],
  },
  math: {
    id: "math", subject: "수학", name: "수학 스튜디오", tagline: "그래프와 도형을 움직여 보는 교실",
    colors: { primary: "#3B4CCA", hover: "#2F3DA8", pressed: "#232E80", text: "#3443B8", bg: "#EEF0FD", line: "#C3C9F5" },
    slideTheme: "blue",
    assets: [
      { name: "알지오매스", url: "https://www.algeomath.kr", what: "한국과학창의재단 수학 탐구 도구" },
      { name: "GeoGebra", url: "https://www.geogebra.org", what: "그래프·도형 탐구, 수업 자료 공유" },
      { name: "Desmos 계산기", url: "https://www.desmos.com/calculator", what: "함수 그래프를 바로 그리기" },
      COMMONS, KOWIKI,
    ],
  },
  science: {
    id: "science", subject: "과학", name: "과학 스튜디오", tagline: "실험하고 모델로 설명하는 교실",
    colors: { primary: "#0F766E", hover: "#0B5F58", pressed: "#084540", text: "#0D6B64", bg: "#E8F6F4", line: "#A8DAD3" },
    slideTheme: "chalk",
    assets: [
      { name: "PhET 시뮬레이션", url: "https://phet.colorado.edu/ko/", what: "물리·화학·생명 무료 시뮬레이션(한국어)" },
      { name: "사이언스올", url: "https://www.scienceall.com", what: "한국과학창의재단 과학 콘텐츠" },
      { name: "국립과천과학관", url: "https://www.sciencecenter.go.kr", what: "전시·교육 자료" },
      COMMONS, KOWIKI,
    ],
  },
  social: {
    id: "social", subject: "사회", name: "사회 스튜디오", tagline: "지도와 통계로 세상을 읽는 교실",
    colors: { primary: "#4D6B1F", hover: "#3D5518", pressed: "#2C3E11", text: "#46621C", bg: "#F1F6E8", line: "#C9DBA8" },
    slideTheme: "marker",
    assets: [
      { name: "국가통계포털 KOSIS", url: "https://kosis.kr", what: "인구·경제 등 국가 통계" },
      { name: "통계지리정보서비스 SGIS", url: "https://sgis.kostat.go.kr", what: "통계를 지도로 보기" },
      { name: "국토지리정보원 지도", url: "https://map.ngii.go.kr", what: "국가 기본도, 옛 지도" },
      COMMONS, KOWIKI,
    ],
  },
  english: {
    id: "english", subject: "영어", name: "영어 스튜디오", tagline: "말하고 들으며 배우는 교실",
    colors: { primary: "#B4235A", hover: "#931C4A", pressed: "#6B1436", text: "#A31F52", bg: "#FCEEF3", line: "#F1BCD0" },
    slideTheme: "lavender",
    assets: [
      { name: "Cambridge Dictionary", url: "https://dictionary.cambridge.org", what: "영영·영한 사전과 발음" },
      COMMONS, { ...KOWIKI, name: "Wikipedia(영문)", url: "https://en.wikipedia.org", search: "https://en.wikipedia.org/w/index.php?search={q}" },
    ],
  },
  arts: {
    id: "arts", subject: "예체능", name: "예술·체육 스튜디오", tagline: "보고 듣고 움직이는 교실",
    colors: { primary: "#7C3AED", hover: "#6527CC", pressed: "#4A1D96", text: "#6D28D9", bg: "#F3EEFE", line: "#D5C4FB" },
    slideTheme: "lavender",
    assets: [
      { name: "국립현대미술관", url: "https://www.mmca.go.kr", what: "소장품·전시" },
      { name: "국립국악원", url: "https://www.gugak.go.kr", what: "국악 자료" },
      COMMONS, KOWIKI,
    ],
  },
  default: {
    id: "default", subject: "공통", name: "기본 스튜디오", tagline: "모든 교과에 쓰는 교실",
    colors: { primary: "#256EF4", hover: "#0B50D0", pressed: "#083891", text: "#0B50D0", bg: "#ECF2FE", line: "#B1CEFB" },
    slideTheme: "pastel",
    assets: [{ name: "에듀넷·티-클리어", url: "https://www.edunet.net", what: "교육부 교수·학습 자료" }, COMMONS, KOWIKI],
  },
};

export const COMMON_ASSETS: AssetLink[] = [KOGL];

const BY_SUBJECT: Record<string, StudioId> = { 역사: "history", 한국사: "history", 국어: "korean", 수학: "math", 과학: "science", 사회: "social", 지리: "social", 영어: "english", 체육: "arts", 음악: "arts", 미술: "arts" };
export const studioForSubject = (subject: string): StudioId => BY_SUBJECT[subject.trim()] ?? "default";

export const searchUrl = (a: AssetLink, q: string) => (a.search ? a.search.replace("{q}", encodeURIComponent(q.trim())) : a.url);

/** Contrast ratio (WCAG 2) of two #RRGGBB colours. */
export function contrast(a: string, b: string) {
  const lum = (h: string) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
