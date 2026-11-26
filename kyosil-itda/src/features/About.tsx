import type { Go } from "../App";

// Bundle size is measured at build time (see vite.config.ts).
const BUNDLE_KB = __BUNDLE_GZIP_KB__.startsWith("__") ? "측정 전" : `${__BUNDLE_GZIP_KB__} KB`;

export function About({ go }: { go: Go }) {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">정보 · 작품 설명</div>
          <h1>교실잇다 작품 설명서</h1>
          <p className="lead">설치 없이 브라우저에서 여는 학교 협업 도구입니다. 결강 처리와 교육실습 관찰을 한곳에서 하고, 기록은 기기에서 암호화합니다.</p>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => go("today", "t3")}>시연 시작</button>
        </div>
      </div>

      <section aria-labelledby="ov-h">
        <h2 id="ov-h" className="sr">개요</h2>
        <table className="sheet">
          <tbody>
            <tr><th scope="row">작품명</th><td>교실잇다</td></tr>
            <tr><th scope="row">대상</th><td>중등학교 교사(교과·담임), 시간표 담당, 교육실습생과 지도교사</td></tr>
            <tr><th scope="row">핵심 기능</th><td>① 결강 처리: 교체 우선 제안, 근거를 보여 주는 보결 추천, 인수인계서, 결재 <br />② 교육실습: 임상장학 순서의 관찰·평가 비교·피드백 협의, 참관록 <br />③ 대화방: 종단간 암호화 메시지, 함께 편집하는 체크리스트·투표 <br />④ 문서 변환: HWP·HWPX·DOCX·XLSX·PDF ↔ Markdown, 브라우저 안에서만 처리 <br />⑤ 수업 슬라이드: 지도안 → 템플릿 5종의 HTML 발표 파일·PPTX <br />⑥ 가정통신문: 내용만 넣으면 A4 통신문, 학교 HWPX 양식 빈칸 채우기 <br />⑦ 학생 상담·기록: 누가기록·상담 기록, 생기부 기재 점검(NEIS 바이트, 금지 표현)</td></tr>
            <tr><th scope="row">실행</th><td>주소 하나로 PC·태블릿·스마트폰 브라우저에서 실행합니다. 홈 화면에 추가하면 앱처럼 열립니다(PWA).</td></tr>
            <tr><th scope="row">첫 화면 용량</th><td>{BUNDLE_KB} (gzip, HTML·JS·CSS 기준). 한글 글꼴은 필요한 글자 범위만 나중에 받습니다.</td></tr>
            <tr><th scope="row">디자인 기준</th><td>대한민국 정부 디자인 시스템(KRDS) 공식 토큰의 색·글자 크기·모서리 규칙과 고대비 모드</td></tr>
          </tbody>
        </table>
      </section>

      <section className="section" aria-labelledby="p-h">
        <h2 id="p-h">1. 현장 문제</h2>
        <table className="sheet">
          <thead><tr><th scope="col">문제</th><th scope="col">지금의 처리 방식</th><th scope="col">교실잇다</th></tr></thead>
          <tbody>
            <tr>
              <td><b>결강 처리</b></td>
              <td>시간표 담당이 시간표를 보며 교체 가능한 수업과 공강 교사를 직접 찾습니다. 보결 교사는 수업 정보 없이 교실에 들어가기도 합니다.</td>
              <td>교체 가능 수업을 먼저 찾고, 보결 후보는 형평성·부담·교과 연계를 기준으로 비교표를 만듭니다. 수업 인수인계서가 함께 전달되고, 결재란으로 처리 단계가 남습니다.</td>
            </tr>
            <tr>
              <td><b>교육실습 기록</b></td>
              <td>참관 메모와 피드백이 종이와 구두로 흩어져, 교생이 무엇을 고쳐야 하는지 근거가 남지 않습니다.</td>
              <td>교생이 정한 관찰 초점에 맞춰 시각이 찍힌 장면 기록을 남기고, 자기평가와 지도교사 평가의 차이를 협의 주제로 제안합니다.</td>
            </tr>
            <tr>
              <td><b>설치 장벽</b></td>
              <td>설치형 교내 메신저 사례(2026년 11월 Windows 배포본 정적 분석)는 교직원 앱 설치 파일 222.6 MiB, 서버 앱 227.3 MiB이고, 서버는 상시 켜 둔 Windows PC와 같은 교내망 접속이 필요했습니다.</td>
              <td>설치 없이 열리고, 교생처럼 학교 PC가 없는 사람도 초대만으로 참여합니다.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="section" aria-labelledby="e-h">
        <h2 id="e-h">2. 교육적 근거</h2>
        <div className="grid two">
          <div className="panel"><div className="panel-body stack tight">
            <h3>임상장학의 3단계</h3>
            <p className="small">Goldhammer(1969)와 Cogan(1973)의 임상장학은 <b>계획 협의 → 수업 관찰 → 피드백 협의</b>의 순환으로 수업을 개선합니다. 교육실습 화면은 이 순서를 그대로 따르고, 교생이 관찰 초점을 먼저 정하게 해서, 관찰이 교생의 질문에 답하도록 했습니다.</p>
          </div></div>
          <div className="panel"><div className="panel-body stack tight">
            <h3>반성적 실천과 자기평가</h3>
            <p className="small">Schön(1983)의 반성적 실천가 관점에서, 교생이 자기 수업을 스스로 평가하고 외부 관찰과 비교하는 과정이 성장의 출발점입니다. 두 평가는 모두 제출된 뒤에만 비교가 열려 서로 영향을 주지 않습니다.</p>
          </div></div>
        </div>
      </section>

      <section className="section" aria-labelledby="t-h">
        <h2 id="t-h">3. 기술 구조</h2>
        <table className="sheet">
          <thead><tr><th scope="col">계층</th><th scope="col">구성</th><th scope="col">선택 이유</th></tr></thead>
          <tbody>
            <tr><td>기기(브라우저)</td><td>Web Crypto: ECDH P-256 키 교환, AES-256-GCM 암호화, ECDSA 서명. 개인 키는 꺼낼 수 없는 형태로 IndexedDB에 보관합니다.</td><td>별도 설치나 네이티브 모듈 없이 표준 API만으로 암호화할 수 있습니다.</td></tr>
            <tr><td>전송</td><td>시연판: 탭 간 BroadcastChannel. 운영판 계획: HTTPS 중계 + 같은 학교 안 WebRTC</td><td>서버가 꺼져도 같은 학교의 기기끼리 동기화할 수 있습니다.</td></tr>
            <tr><td>중계 서버</td><td>암호문, 암호화된 방 키, 공개 키 목록만 저장하고, 보존 기간이 지나면 삭제합니다.</td><td>서버 운영자도 내용을 볼 수 없습니다.</td></tr>
            <tr><td>문서 엔진</td><td>kordoc 4.24.66(MIT)을 브라우저용으로 묶어 필요할 때만 불러옵니다. DOCX·XLSX는 자체 OOXML 작성기, PPTX는 pptxgenjs, 발표 파일은 페이퍼로지 글꼴을 넣은 단일 HTML입니다.</td><td>학교 문서와 학생 정보가 서버로 나가지 않습니다.</td></tr>
            <tr><td>데이터 모델</td><td>모든 기록은 서명된 암호문 이벤트로 남고, 화면은 이벤트를 순서대로 반영해 만듭니다. 공동 체크리스트는 CRDT를 씁니다.</td><td>도착 순서가 달라도 결과가 같고, 처리 기록이 그대로 감사 기록이 됩니다.</td></tr>
          </tbody>
        </table>
      </section>

      <section className="section" aria-labelledby="v-h">
        <h2 id="v-h">4. 현장 검증 계획</h2>
        <p className="small muted" style={{ marginBottom: 10 }}>아직 현장 검증은 하지 않았습니다. 실습 학교 한 곳에서 4주 동안 아래 지표를 잴 계획입니다.</p>
        <table className="sheet">
          <thead><tr><th scope="col">지표</th><th scope="col">측정 방법</th></tr></thead>
          <tbody>
            <tr><td>결강 처리 시간</td><td>결강 등록부터 결재까지 걸린 시간을 처리 기록에서 자동으로 계산해, 도입 전의 종이 방식과 비교합니다.</td></tr>
            <tr><td>인수인계 정보 누락</td><td>보결 교사 설문: “수업 목표와 활동을 알고 들어갔다” 5점 척도</td></tr>
            <tr><td>교생 피드백의 구체성</td><td>참관록의 피드백 문장 가운데 관찰 장면을 근거로 든 문장의 비율을 셉니다.</td></tr>
            <tr><td>접근성</td><td>KWCAG 2.2 자동 점검(axe)에서 위반 0건을 유지하고, 고대비 모드의 사용성을 확인합니다.</td></tr>
          </tbody>
        </table>
      </section>

      <section className="section" aria-labelledby="l-h">
        <h2 id="l-h">5. 한계</h2>
        <ul className="small" style={{ paddingLeft: 20, margin: 0, display: "grid", gap: 4 }}>
          <li>시연판은 한 브라우저 안에서 모든 사람의 기기 키를 만듭니다. 실제 서비스에서는 각자 자기 기기에서 만듭니다.</li>
          <li>참여자가 바뀌기 전까지는 같은 방 키를 계속 쓰므로 순방향 비밀성이 없습니다. 큰 그룹에는 MLS(RFC 9420) 도입이 다음 과제입니다.</li>
          <li>이벤트 시각은 기기가 찍습니다. 미래 시각은 거부하지만, 운영판에서는 중계 서버가 시각을 찍어야 합니다.</li>
          <li>시간표와 사람, 학생 명단은 모두 가상 데이터입니다(가상의 한빛중학교). NEIS 연동은 범위 밖이며, 생기부는 엑셀로 내보내 교사가 직접 입력합니다.</li>
          <li>생기부 점검 규칙은 보조 도구입니다. 학년도 기재요령 원문과 대조하지 않은 규칙은 ‘원문 대조 필요’로 표시하며, 최종 판단은 학교 기재요령과 교사가 합니다.</li>
          <li>HWP 5.x 바이너리 파일은 실제 학교 샘플로 시험하지 못했고, 이미지 글자 인식(OCR)은 지원하지 않습니다.</li>
        </ul>
      </section>
    </>
  );
}
