import type { Page } from "../App";

// Bundle size is measured at build time (see README "측정").
const BUNDLE_KB = __BUNDLE_GZIP_KB__.startsWith("__") ? "측정 전" : __BUNDLE_GZIP_KB__;

export function About({ go }: { go: (p: Page) => void }) {
  return (
    <>
      <section className="hero">
        <span className="pill">사범대 웹콘텐츠 출품작</span>
        <h1 style={{ marginTop: 12 }}>설치 없이, 링크 하나로<br />학교의 협업과 교생실습을 잇습니다</h1>
        <p className="muted" style={{ marginTop: 12, maxWidth: "60ch" }}>
          교실잇다는 브라우저만 있으면 PC·태블릿·스마트폰 어디서나 열리는 PWA입니다. 대화와 기록은 기기에서 암호화되고, 대강 추천은 근거를 보여 주며, 교생과 지도교사는 같은 기록을 보며 성장 대화를 나눕니다.
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={() => go("cover")}>대강 추천 체험</button>
          <button className="btn" onClick={() => go("practicum")}>교생실습 공간 보기</button>
          <button className="btn ghost" onClick={() => go("trust")}>서버가 보는 것</button>
        </div>
      </section>

      <h2 style={{ margin: "28px 0 12px" }}>왜 만들었나 · 설치형 교내 메신저 사례 분석</h2>
      <p className="muted small" style={{ marginBottom: 12, maxWidth: "70ch" }}>
        학교에서 쓰는 설치형 메신저 한 사례(Windows x64 설치 파일 2종, 2026년 11월 배포본)를 정적 분석해 확인한 수치입니다. 특정 제품을 비판하려는 것이 아니라, 설치형 구조가 만드는 진입장벽을 근거로 보여 주려는 것입니다.
      </p>
      <div className="grid three">
        <div className="card"><div className="stat">222.6 MiB</div><p className="small muted">교직원 앱 설치 파일 · 설치 후 538 MB</p></div>
        <div className="card"><div className="stat">상시 PC 서버</div><p className="small muted">Windows 서비스 등록과 관리자 권한 필요 · 서버 앱 설치 파일 227.3 MiB</p></div>
        <div className="card"><div className="stat">교내망 한정</div><p className="small muted">방화벽 규칙이 같은 네트워크(LocalSubnet)만 허용 · 자체 서명 인증서 수동 신뢰</p></div>
        <div className="card"><div className="stat">모바일 미지원</div><p className="small muted">설치 파일은 Windows용, 코드 분기는 Windows·macOS뿐</p></div>
        <div className="card"><div className="stat">교생 기능 없음</div><p className="small muted">교생 계정·참관 기록·피드백 기능이 코드에서 발견되지 않음</p></div>
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <div className="stat" style={{ color: "var(--accent)" }}>{BUNDLE_KB} KB</div>
          <p className="small muted">교실잇다 첫 로드(gzip, 빌드 시 측정) · 설치 0단계 · 모든 기기</p>
        </div>
      </div>

      <h2 style={{ margin: "28px 0 12px" }}>현장 문제 → 기능</h2>
      <div className="grid three">
        <article className="card">
          <span className="pill">A · 교사 업무 경감</span>
          <h3 style={{ marginTop: 10 }}>설명 가능한 대강 추천과 인수인계 카드</h3>
          <p className="small muted" style={{ marginTop: 6 }}>공강인 교사를 형평성·당일 부담·연속 수업·교과 연계·학급 친숙도로 점수화합니다. 점수의 모든 근거를 보여 주고, 가중치는 학교 협의로 조정합니다. 수업 목표·진도·활동을 담은 카드가 대강 교사에게 함께 갑니다. 학생 이름·연락처가 들어가면 경고합니다.</p>
        </article>
        <article className="card">
          <span className="pill">B · 사범대 · 교육실습</span>
          <h3 style={{ marginTop: 10 }}>교생실습 참관·피드백 워크스페이스</h3>
          <p className="small muted" style={{ marginTop: 6 }}>지도교사는 수업 중 시각과 영역 태그가 붙은 장면 기록을 남깁니다. 교생 자기평가와 지도교사 평가를 블라인드로 받아 차이가 큰 영역을 협의 주제로 제안합니다. 두 사람만 복호화하고, 실습 종료 후 자동 삭제됩니다.</p>
        </article>
        <article className="card">
          <span className="pill">C · 실시간 협업</span>
          <h3 style={{ marginTop: 10 }}>대화방 안의 공동 위젯</h3>
          <p className="small muted" style={{ marginTop: 6 }}>체크리스트와 투표를 대화방에 올리면 모두가 동시에 편집합니다. 순서 없이 도착해도 같은 결과로 수렴하는 CRDT로 만들어, P2P(WebRTC)로 바꿔도 동작합니다.</p>
        </article>
      </div>

      <h2 style={{ margin: "28px 0 12px" }}>웹 네이티브 아키텍처</h2>
      <div className="arch">
        <div className="box"><b>기기 (브라우저 · PWA)</b><ul className="small" style={{ paddingLeft: 18, margin: "6px 0 0" }}><li>Web Crypto: ECDH P-256 키 교환, AES-256-GCM 암호화, ECDSA 서명</li><li>개인 키는 내보낼 수 없는 CryptoKey로 IndexedDB에 보관</li><li>서비스 워커로 오프라인 실행·홈 화면 설치</li></ul></div>
        <div className="box"><b>전송</b><ul className="small" style={{ paddingLeft: 18, margin: "6px 0 0" }}><li>시연판: BroadcastChannel로 탭 간 실시간 동기화</li><li>운영판: HTTPS 중계 + 같은 학교 안 WebRTC DataChannel</li><li>모든 이벤트는 서명된 암호문 봉투</li></ul></div>
        <div className="box"><b>중계 서버 (클라우드 또는 교내)</b><ul className="small" style={{ paddingLeft: 18, margin: "6px 0 0" }}><li>암호문·봉인된 방 키·공개 키 목록만 저장</li><li>클라우드 기본, 원하는 학교는 같은 API를 교내에 설치</li><li>보존 기한이 지난 공간 자동 삭제</li></ul></div>
      </div>

      <div className="grid two" style={{ marginTop: 14 }}>
        <section className="card">
          <h3>교육적 가치</h3>
          <ul className="small" style={{ paddingLeft: 18, margin: "8px 0 0" }}>
            <li>교육실습의 핵심인 ‘관찰 → 자기 성찰 → 협의’ 순환을 기록으로 남깁니다.</li>
            <li>자기평가와 외부 평가의 차이를 드러내 메타인지적 성찰을 돕습니다.</li>
            <li>대강 배정의 기준을 투명하게 해 교사 간 신뢰와 형평성을 높입니다.</li>
            <li>AI·알고리즘은 근거를 보여 주는 조력자이고, 결정은 사람이 합니다.</li>
          </ul>
        </section>
        <section className="card">
          <h3>정직한 한계와 다음 단계</h3>
          <ul className="small" style={{ paddingLeft: 18, margin: "8px 0 0" }}>
            <li>시연판은 한 브라우저 안에 모든 사람의 기기 키를 만듭니다. 실제로는 각자 기기에서 생성됩니다.</li>
            <li>방 키는 참여자 변경 때 교체되지만, 같은 세대 안의 순방향 비밀성은 없습니다. 대규모 그룹은 MLS(RFC 9420) 도입이 다음 과제입니다.</li>
            <li>루브릭 블라인드는 화면 규칙입니다. 두 사람 모두 같은 방 키를 갖습니다.</li>
            <li>시간표는 가상 학교 데이터입니다. NEIS 연동은 범위 밖입니다.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
