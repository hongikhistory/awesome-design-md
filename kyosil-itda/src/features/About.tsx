import { BRAND, DEMO_SCHOOL } from "../brand";
import type { Go } from "../App";

// Bundle size is measured at build time (see vite.config.ts).
const BUNDLE_KB = __BUNDLE_GZIP_KB__.startsWith("__") ? "측정 전" : `${__BUNDLE_GZIP_KB__} KB`;

export function About({ go }: { go: Go }) {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">정보 · 작품 설명</div>
          <h1>{BRAND.name} 작품 설명서</h1>
          <p className="lead">{BRAND.tagline}. {BRAND.promise}. 홍익대학교 사범대학 웹콘텐츠 경연 출품작입니다.</p>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => go("today", "t1")}>시연 시작</button>
        </div>
      </div>

      <section className="about-hero" aria-labelledby="name-h">
        <div>
          <h2 id="name-h">이름의 뜻: 널리 + 잇다</h2>
          <p><b>널리</b>는 「교육기본법」 제2조가 우리 교육의 이념으로 정한 <b>홍익인간(弘益人間, 널리 인간을 이롭게 함)</b>에서 왔습니다. <b>잇다</b>는 흩어진 것을 이어 붙인다는 뜻입니다. 한글 문서와 AI, 지도안과 수업, 교실과 가정, 담임과 동료 교사를 잇습니다.</p>
          <p>선생님이 서류에 쓰던 시간을 학생에게 돌려 드려, 교실의 배움을 널리 이롭게 하자는 뜻을 담았습니다.</p>
        </div>
        <blockquote>“교육은 홍익인간의 이념 아래 모든 국민으로 하여금 인격을 도야하고 자주적 생활능력과 민주시민으로서 필요한 자질을 갖추게 함으로써…”<cite>「교육기본법」 제2조(교육이념)</cite></blockquote>
      </section>

      <section className="section" aria-labelledby="ov-h">
        <h2 id="ov-h">개요</h2>
        <div className="scroll-x"><table className="sheet">
          <tbody>
            <tr><th scope="row">작품명</th><td>{BRAND.name} — {BRAND.tagline}</td></tr>
            <tr><th scope="row">대상</th><td>중·고등학교 교사(교과·담임), 시간표 담당, 교육실습생과 지도교사</td></tr>
            <tr><th scope="row">시연 무대</th><td>가상 학교 <b>{DEMO_SCHOOL}</b> 2학년 1반 담임 곽민혁(역사) 선생님, 시간표 담당 박민지 선생님, 교생 오세린 선생님. 사람·학생·시간표는 모두 지어낸 것이며 실제 학교와 관계없습니다.</td></tr>
            <tr><th scope="row">핵심 기능</th><td>◎ 과목별 수업 만들기: 역사·국어·수학·과학·사회·영어·미술·창체 8개 꾸러미(지도안·슬라이드·확인 문제·근거 판단·출구 카드)를 한 번에, 다른 주제는 뼈대와 AI 요청문 <br />◎ 도우미 이음이: 기기 안에서 도는 규칙 기반 챗봇(수업 꾸러미, 학생 뽑기, 타이머, 화면 찾기, NEIS 바이트) <br />① 수업 슬라이드: 지도안 → 템플릿 5종의 HTML 발표 파일·PPTX, 성취기준·활동 타이머 <br />② 학생 활동 만들기: 확인 문제·근거 판단·출구 카드를 학생이 휴대폰으로 푸는 웹 활동으로(로그인·서버 없음), 활동지 HWPX <br />③ 모둠 편성·자리 배치, 학급 도구함(1인 1역·경품 추첨·룰렛·사다리타기·인물 퀴즈·진진가) <br />④ 수업 에셋: 박물관·사료·통계 등 교과별 공식 자료실 연결과 수업 중 띄우는 에셋 보드 <br />⑤ 과목별 스튜디오: 교과에 따라 색·무늬·그림·슬라이드 틀·추천 자료가 바뀜 <br />⑥ 문서 변환: HWP·HWPX·DOCX·XLSX·PDF ↔ Markdown, 브라우저 안에서만 처리 <br />⑦ 가정통신문: 공문서 표기 점검, 개인정보 동의서 틀, 학교 HWPX 양식 빈칸 채우기 <br />⑧ 학생 상담·기록: 누가기록·상담, 생기부 기재 점검(NEIS 바이트, 금지 표현), 암호 백업 <br />⑨ 결강 처리: 교체 우선 제안, 근거를 보여 주는 보결 추천, 인수인계서, 결재란 <br />⑩ 교육실습: 임상장학 순서의 관찰·평가 비교·피드백 협의, 참관록 <br />⑪ 대화방: 종단간 암호화 메시지, 함께 편집하는 체크리스트·투표</td></tr>
            <tr><th scope="row">바로 쓸 수 있는 것</th><td>①~⑧은 서버 없이 이 기기 안에서 동작해 지금 바로 쓸 수 있습니다. ⑨~⑪은 학교 중계 서버가 필요한 시연판입니다.</td></tr>
            <tr><th scope="row">근거 자료</th><td>2026 학교생활기록부 기재요령 발췌와 학생부종합지원포털, 「행정업무의 운영 및 혁신에 관한 규정」, 개인정보 보호법 제15·22·22조의2·23조, 국립국어원 공공언어 자료, 경기도교육청 생성형 AI 활용 가이드. 출처마다 확실성을 표시했습니다(저장소 docs/FIELD-RESEARCH.md).</td></tr>
            <tr><th scope="row">실행</th><td>주소 하나로 PC·태블릿·스마트폰 브라우저에서 실행합니다. 홈 화면에 추가하면 앱처럼 열리고, 한 번 연 뒤에는 오프라인에서도 동작합니다(PWA).</td></tr>
            <tr><th scope="row">첫 화면 용량</th><td>{BUNDLE_KB} (gzip, HTML·JS·CSS 기준). 문서 도구는 처음 열 때 받습니다.</td></tr>
            <tr><th scope="row">디자인 기준</th><td>대한민국 정부 디자인 시스템(KRDS) 공식 토큰의 색·글자 크기·모서리 규칙과 고대비 모드, 직접 그린 일러스트와 아이콘</td></tr>
          </tbody>
        </table></div>
      </section>

      <section className="section" aria-labelledby="p-h">
        <h2 id="p-h">1. 문제 정의</h2>
        <p className="problem-statement">중등 교사는 수업 밖의 <b>문서·연락·기록</b>에 하루의 많은 시간을 씁니다. 이를 도울 도구는 많지만 <b>학교 문서 형식</b>(한글)과 <b>학생 개인정보 규정</b>을 함께 지키지 못해, 결국 손으로 옮겨 적고 메신저로 조율합니다. 교육부도 2024년 「학교 행정업무 경감 및 효율화 방안」과 2026년 ‘학교 현장 가짜 일 줄이기’ 과제로 같은 문제를 짚었습니다.</p>
        <div className="scroll-x"><table className="sheet">
          <thead><tr><th scope="col">벽</th><th scope="col">현장에서 일어나는 일</th><th scope="col">왜 기존 도구로 안 되는가</th><th scope="col">{BRAND.name}</th></tr></thead>
          <tbody>
            <tr>
              <td><b>문서의 벽</b></td>
              <td>지도안·통신문·명렬표가 HWP·엑셀·PDF로 흩어져 같은 내용을 여러 번 옮겨 적습니다. 통신문마다 날짜·금액 표기와 쉬운 말을 다시 확인합니다.</td>
              <td>범용 AI와 슬라이드 도구는 한글 파일을 제대로 읽지 못하고, 결과도 학교 양식(HWPX)으로 돌려주지 못합니다.</td>
              <td>모든 파일을 AI가 잘 읽는 Markdown으로 바꾸고 HWPX·DOCX·XLSX로 되돌립니다. 지도안은 슬라이드로, 내용은 통신문으로 이어지고, 공문서 표기를 점검합니다.</td>
            </tr>
            <tr>
              <td><b>개인정보의 벽</b></td>
              <td>상담·누가기록은 수첩과 개인 파일에 흩어지고, 학기 말 생기부를 쓸 때 근거를 다시 찾습니다.</td>
              <td>학생 정보는 외부 AI에 넣기 어렵고(교육청 가이드는 가명 처리를 권고), 2026 기재요령은 AI 문장을 그대로 입력하는 것을 금지합니다.</td>
              <td>학생 기록은 담임 기기에서만 열리도록 암호화합니다. AI 요청문은 이름·학교·연락처를 가리고, 금지 표현과 NEIS 바이트는 교사가 직접 점검합니다.</td>
            </tr>
            <tr>
              <td><b>협업의 벽</b></td>
              <td>결강이 생기면 시간표 담당이 교체 가능한 수업과 공강 교사를 직접 찾고, 보결 교사는 수업 정보 없이 들어가기도 합니다. 교생 피드백은 종이와 말로 흩어집니다.</td>
              <td>교내 메신저는 대화만 남기고 결정 과정은 남기지 않습니다. 설치형 메신저 사례(2026. 11. Windows 배포본 분석)는 교직원 앱 설치 파일 222.6 MiB에 상시 켜 둔 서버 PC가 필요했습니다.</td>
              <td>교체를 먼저 찾고, 보결 후보는 근거와 함께 비교합니다. 인수인계서와 결재란, 관찰 초점에 맞춘 교생 피드백이 서명된 암호 기록으로 남습니다.</td>
            </tr>
          </tbody>
        </table></div>
      </section>

      <section className="section" aria-labelledby="s-h">
        <h2 id="s-h">2. 해결 원칙</h2>
        <div className="principles">
          <div className="principle"><b>01</b><h3>한 번 쓰고, 여러 번 쓴다</h3><p>Markdown을 가운데 두고 문서·슬라이드·통신문·기록이 서로 이어집니다. 같은 내용을 다시 적지 않습니다.</p></div>
          <div className="principle"><b>02</b><h3>학생 정보는 기기 안에</h3><p>종단간 암호화와 기기 안 처리. 서버도 내용을 볼 수 없고, AI에는 가린 내용만 넘깁니다.</p></div>
          <div className="principle"><b>03</b><h3>학교 서식 그대로</h3><p>HWPX 읽기·쓰기, 결재란, 회신서, 개인정보 동의서. 학교가 이미 쓰는 문서 모양을 바꾸지 않습니다.</p></div>
          <div className="principle"><b>04</b><h3>판단은 교사가</h3><p>추천과 점검에는 근거와 확실성을 함께 보여 줍니다. 도구는 제안하고, 결정은 교사가 합니다.</p></div>
        </div>
      </section>

      <section className="section" aria-labelledby="e-h">
        <h2 id="e-h">3. 교육적 근거</h2>
        <div className="grid two">
          <div className="panel"><div className="panel-body stack tight">
            <h3>홍익인간과 교사의 시간</h3>
            <p className="small">「교육기본법」 제2조는 홍익인간을 교육이념으로 둡니다. 교사가 학생을 이롭게 하려면 학생과 함께할 시간이 있어야 합니다. {BRAND.name}은 행정 문서에 쓰이는 시간을 줄여 그 시간을 수업과 상담으로 돌리는 것을 목표로 합니다.</p>
          </div></div>
          <div className="panel"><div className="panel-body stack tight">
            <h3>관찰에 근거한 기록</h3>
            <p className="small">생기부는 학생의 실제 수행을 근거로 써야 합니다(2026 기재요령의 허위·과장 확인 의무). 누가기록에서 출발해 세특을 쓰게 하고, 관련 기록을 옆에 띄워 근거 없는 문장을 줄입니다.</p>
          </div></div>
          <div className="panel"><div className="panel-body stack tight">
            <h3>임상장학의 3단계</h3>
            <p className="small">Goldhammer(1969)와 Cogan(1973)의 임상장학은 <b>계획 협의 → 수업 관찰 → 피드백 협의</b>의 순환으로 수업을 개선합니다. 교육실습 화면은 이 순서를 그대로 따르고, 교생이 관찰 초점을 먼저 정하게 해서 관찰이 교생의 질문에 답하도록 했습니다.</p>
          </div></div>
          <div className="panel"><div className="panel-body stack tight">
            <h3>반성적 실천과 자기평가</h3>
            <p className="small">Schön(1983)의 반성적 실천가 관점에서, 교생이 자기 수업을 스스로 평가하고 외부 관찰과 비교하는 과정이 성장의 출발점입니다. 두 평가는 모두 제출된 뒤에만 비교가 열려 서로 영향을 주지 않습니다.</p>
          </div></div>
        </div>
      </section>

      <section className="section" aria-labelledby="d-h">
        <h2 id="d-h">4. 곽민혁 선생님의 하루로 보는 흐름</h2>
        <div className="scroll-x"><table className="sheet">
          <thead><tr><th scope="col">시각</th><th scope="col">상황</th><th scope="col">쓰는 화면</th></tr></thead>
          <tbody>
            <tr><td>07:50</td><td>강지호 선생님 출장, 1교시 보결 요청에 인수인계서를 읽고 동의 → 시간표 담당 결재</td><td>결강 처리</td></tr>
            <tr><td>08:40</td><td>한글 지도안을 올려 수업 슬라이드 생성, 성취기준과 활동 타이머 확인</td><td>문서 변환 → 수업 슬라이드</td></tr>
            <tr><td>09:00</td><td>1교시: 모둠을 섞어 교실 화면에 띄우고, 확인 문제를 학생 휴대폰으로 풀게 함. 탐구 차시에는 근거 판단 활동</td><td>모둠·자리 → 학생 활동 만들기</td></tr>
            <tr><td>12:40</td><td>현장체험학습 통신문과 개인정보 동의서 작성, 학년 협의방에 검토 요청</td><td>가정통신문 → 대화방</td></tr>
            <tr><td>16:30</td><td>출구 카드와 오늘 관찰한 장면을 누가기록으로, 학기 말에는 세특 초안을 점검</td><td>학생 상담·기록</td></tr>
            <tr><td>17:10</td><td>교생 수업 관찰 기록 정리, 자기평가와 다른 영역을 다음 협의 주제로</td><td>교육실습</td></tr>
          </tbody>
        </table></div>
      </section>

      <section className="section" aria-labelledby="t-h">
        <h2 id="t-h">5. 기술 구조</h2>
        <div className="scroll-x"><table className="sheet">
          <thead><tr><th scope="col">계층</th><th scope="col">구성</th><th scope="col">선택 이유</th></tr></thead>
          <tbody>
            <tr><td>기기(브라우저)</td><td>Web Crypto: ECDH P-256 키 교환, AES-256-GCM 암호화, ECDSA 서명. 개인 키는 꺼낼 수 없는 형태로 IndexedDB에 보관합니다.</td><td>별도 설치나 네이티브 모듈 없이 표준 API만으로 암호화할 수 있습니다.</td></tr>
            <tr><td>전송</td><td>시연판: 탭 간 BroadcastChannel. 운영판 계획: HTTPS 중계 + 같은 학교 안 WebRTC</td><td>서버가 꺼져도 같은 학교의 기기끼리 동기화할 수 있습니다.</td></tr>
            <tr><td>중계 서버</td><td>암호문, 암호화된 방 키, 공개 키 목록만 저장하고, 보존 기간이 지나면 삭제합니다.</td><td>서버 운영자도 내용을 볼 수 없습니다.</td></tr>
            <tr><td>문서 엔진</td><td>kordoc 4.24.66(MIT)을 브라우저용으로 묶어 필요할 때만 불러옵니다. DOCX·XLSX는 자체 OOXML 작성기, PPTX는 pptxgenjs, 발표 파일은 페이퍼로지 글꼴을 넣은 단일 HTML입니다.</td><td>학교 문서와 학생 정보가 서버로 나가지 않습니다.</td></tr>
            <tr><td>데이터 모델</td><td>모든 기록은 서명된 암호문 이벤트로 남고, 화면은 이벤트를 순서대로 반영해 만듭니다. 공동 체크리스트는 CRDT를 씁니다.</td><td>도착 순서가 달라도 결과가 같고, 처리 기록이 그대로 감사 기록이 됩니다.</td></tr>
          </tbody>
        </table></div>
      </section>

      <section className="section" aria-labelledby="v-h">
        <h2 id="v-h">6. 기대 효과와 현장 검증 계획</h2>
        <p className="small muted" style={{ marginBottom: 10 }}>아직 현장 검증은 하지 않았습니다. 실습 학교 한 곳에서 4주 동안 아래 지표를 잴 계획입니다.</p>
        <div className="scroll-x"><table className="sheet">
          <thead><tr><th scope="col">지표</th><th scope="col">측정 방법</th></tr></thead>
          <tbody>
            <tr><td>결강 처리 시간</td><td>결강 등록부터 결재까지 걸린 시간을 처리 기록에서 자동으로 계산해, 도입 전의 종이 방식과 비교합니다.</td></tr>
            <tr><td>인수인계 정보 누락</td><td>보결 교사 설문: “수업 목표와 활동을 알고 들어갔다” 5점 척도</td></tr>
            <tr><td>교생 피드백의 구체성</td><td>참관록의 피드백 문장 가운데 관찰 장면을 근거로 든 문장의 비율을 셉니다.</td></tr>
            <tr><td>통신문 작성 품질</td><td>교사 5명이 같은 안내문을 쓸 때 공문서 표기·쉬운 말 지적 건수와 작성 시간을, 도구 사용 전후로 비교합니다.</td></tr>
            <tr><td>생기부 점검</td><td>모의 세특 30건에서 기재 금지 표현과 NEIS 바이트 초과를 교사 혼자 찾을 때와 도구를 쓸 때의 놓친 건수를 비교합니다.</td></tr>
            <tr><td>접근성</td><td>KWCAG 2.2 자동 점검(axe)에서 위반 0건을 유지하고, 고대비 모드의 사용성을 확인합니다.</td></tr>
          </tbody>
        </table></div>
      </section>

      <section className="section" aria-labelledby="l-h">
        <h2 id="l-h">7. 한계</h2>
        <ul className="small" style={{ paddingLeft: 20, margin: 0, display: "grid", gap: 4 }}>
          <li>시연판은 한 브라우저 안에서 모든 사람의 기기 키를 만듭니다. 실제 서비스에서는 각자 자기 기기에서 만듭니다.</li>
          <li>참여자가 바뀌기 전까지는 같은 방 키를 계속 쓰므로 순방향 비밀성이 없습니다. 큰 그룹에는 MLS(RFC 9420) 도입이 다음 과제입니다.</li>
          <li>이벤트 시각은 기기가 찍습니다. 미래 시각은 거부하지만, 운영판에서는 중계 서버가 시각을 찍어야 합니다.</li>
          <li>시간표와 사람, 학생 명단은 모두 가상 데이터입니다(가상의 홍익중학교). NEIS 연동은 범위 밖이며, 생기부는 엑셀로 내보내 교사가 직접 입력합니다.</li>
          <li>생기부 점검 규칙은 보조 도구입니다. 학년도 기재요령 원문과 대조하지 않은 규칙은 ‘원문 대조 필요’로 표시하며, 최종 판단은 학교 기재요령과 교사가 합니다.</li>
          <li>HWP 5.x 바이너리 파일은 실제 학교 샘플로 시험하지 못했고, 이미지 글자 인식(OCR)은 지원하지 않습니다.</li>
        </ul>
      </section>
    </>
  );
}
