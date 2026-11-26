import { HardDrive, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { imageToDataUrl, resetIntro, saveMe, saveSchool, useMyProfile, useSchool, type MyProfile, type SchoolProfile } from "../core/profile";
import { useApp } from "../state";
import { Avatar, Notice, useToast } from "../ui/common";

export function Settings() {
  const { me } = useApp();
  const school = useSchool();
  const mine = useMyProfile(me.id);
  const toast = useToast();
  const logoIn = useRef<HTMLInputElement>(null), photoIn = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<{ used: number; quota: number; persisted: boolean } | null>(null);

  const setS = <K extends keyof SchoolProfile>(k: K, v: SchoolProfile[K]) => { try { saveSchool({ ...school, [k]: v }); } catch (e) { toast.show((e as Error).message); } };
  const setM = <K extends keyof MyProfile>(k: K, v: MyProfile[K]) => { try { saveMe(me.id, { ...mine, [k]: v }); } catch (e) { toast.show((e as Error).message); } };
  const pick = async (f: File | undefined, kind: "logo" | "photo") => {
    if (!f) return;
    try {
      const url = await imageToDataUrl(f, kind === "logo" ? 200 : 160, kind === "photo");
      if (kind === "logo") setS("logo", url); else setM("photo", url);
      toast.show(kind === "logo" ? "학교 로고를 바꿨습니다." : "프로필 사진을 바꿨습니다.");
    } catch (e) {
      toast.show((e as Error).message);
    }
  };

  const checkStorage = async () => {
    const est = await navigator.storage?.estimate?.();
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    setStorage({ used: est?.usage ?? 0, quota: est?.quota ?? 0, persisted });
  };
  useEffect(() => { void checkStorage(); }, []);
  const persist = async () => {
    const ok = (await navigator.storage?.persist?.()) ?? false;
    toast.show(ok ? "이 브라우저가 기록을 임의로 지우지 않도록 설정했습니다." : "브라우저가 요청을 거절했습니다. 홈 화면에 추가(앱 설치)한 뒤 다시 눌러 보세요.");
    void checkStorage();
  };
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">정보 · 학교·내 정보</div>
          <h1>학교·내 정보</h1>
          <p className="lead">한 번 적어 두면 가정통신문, 수업 슬라이드, 학생 기록이 이 값을 기본으로 씁니다. 모두 이 기기에만 저장되고 서버로 보내지 않습니다.</p>
        </div>
      </div>

      <div className="grid two" style={{ alignItems: "start" }}>
        <section className="panel" aria-labelledby="sc-h">
          <div className="panel-head"><h2 id="sc-h">학교</h2></div>
          <div className="panel-body stack">
            <div className="row nowrap" style={{ gap: 16 }}>
              <div className="logo-slot">{school.logo ? <img src={school.logo} alt="학교 로고" /> : <span className="meta">로고 없음</span>}</div>
              <div className="stack tight">
                <div className="row">
                  <button className="btn sm" onClick={() => logoIn.current?.click()}><ImagePlus className="ico sm" aria-hidden /> 로고 올리기</button>
                  {school.logo && <button className="btn sm text" onClick={() => setS("logo", undefined)}><Trash2 className="ico sm" aria-hidden /> 지우기</button>}
                </div>
                <span className="meta">가정통신문 머리글에 들어갑니다. PNG·SVG 권장, 이 기기에서 200px로 줄여 저장합니다.</span>
              </div>
              <input ref={logoIn} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="학교 로고 파일" onChange={(e) => { void pick(e.target.files?.[0], "logo"); e.target.value = ""; }} />
            </div>
            <div className="grid two">
              <label className="field">학교 이름<input id="st-school" type="text" value={school.school} onChange={(e) => setS("school", e.target.value)} /></label>
              <label className="field">학교급
                <select id="st-level" value={school.level} onChange={(e) => setS("level", e.target.value as SchoolProfile["level"])}>
                  <option value="중">중학교</option><option value="고">고등학교</option>
                </select>
              </label>
              <label className="field">학년도
                <select id="st-year" value={school.year} onChange={(e) => setS("year", Number(e.target.value))}>
                  {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}학년도</option>)}
                </select>
              </label>
              <label className="field">대표 전화<input id="st-phone" type="text" inputMode="tel" value={school.phone} onChange={(e) => setS("phone", e.target.value)} /></label>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="me-h">
          <div className="panel-head"><h2 id="me-h">내 정보</h2><span className="meta">{me.name} · {me.subject}</span></div>
          <div className="panel-body stack">
            <div className="row nowrap" style={{ gap: 16 }}>
              <Avatar id={me.id} size={72} />
              <div className="stack tight">
                <div className="row">
                  <button className="btn sm" onClick={() => photoIn.current?.click()}><ImagePlus className="ico sm" aria-hidden /> 프로필 사진</button>
                  {mine.photo && <button className="btn sm text" onClick={() => setM("photo", undefined)}><Trash2 className="ico sm" aria-hidden /> 그림으로 되돌리기</button>}
                </div>
                <span className="meta">사진이 없으면 그림 프로필을 씁니다. 사진은 가운데를 정사각형으로 잘라 160px로 줄입니다.</span>
              </div>
              <input ref={photoIn} type="file" hidden accept="image/*" aria-label="프로필 사진 파일" onChange={(e) => { void pick(e.target.files?.[0], "photo"); e.target.value = ""; }} />
            </div>
            <div className="grid two">
              <label className="field">표시할 이름 <span className="hint">비우면 시연 인물 이름</span><input id="st-name" type="text" autoComplete="name" value={mine.displayName ?? ""} onChange={(e) => setM("displayName", e.target.value)} placeholder={me.name} /></label>
              <label className="field">담당 부서<input id="st-dept" type="text" value={mine.dept} onChange={(e) => setM("dept", e.target.value)} placeholder="예: 2학년부" /></label>
              <label className="field">연락처 <span className="hint">통신문 문의처</span><input id="st-mphone" type="text" inputMode="tel" value={mine.phone} onChange={(e) => setM("phone", e.target.value)} placeholder="교무실 직통" /></label>
              <label className="field">담임 학급 <span className="hint">없으면 비움</span><input id="st-home" type="text" value={mine.homeroom} onChange={(e) => setM("homeroom", e.target.value)} placeholder="예: 2-1" /></label>
            </div>
          </div>
        </section>
      </div>

      <section className="panel section" aria-labelledby="ob-h">
        <div className="panel-head"><h2 id="ob-h">처음 안내</h2></div>
        <div className="panel-body row between">
          <p className="small muted">서비스 소개와 ‘시연 / 우리 학교에서 쓰기’ 선택 화면을 다시 봅니다.</p>
          <button className="btn" onClick={() => { resetIntro(); location.href = `${location.pathname}#today`; }}>처음 안내 다시 보기</button>
        </div>
      </section>

      <section className="panel section" aria-labelledby="dv-h">
        <div className="panel-head"><h2 id="dv-h">이 기기의 저장 공간</h2><HardDrive className="ico" aria-hidden /></div>
        <div className="panel-body stack">
          {storage && <p className="small">사용 {mb(storage.used)} / 한도 {mb(storage.quota)} · {storage.persisted ? <b>지우지 않도록 설정됨</b> : "브라우저가 공간이 부족하면 지울 수 있음"}</p>}
          <div className="row">
            {!storage?.persisted && <button className="btn" onClick={() => void persist()}>기록이 지워지지 않게 하기</button>}
          </div>
          <Notice kind="info">학생 기록은 담임 기기에만 암호화되어 있습니다. 기기를 바꾸거나 브라우저 데이터를 지우면 사라지므로, ‘학생 상담·기록’의 <b>암호 백업</b>을 학기마다 내려받아 학교 보안 USB 등 안전한 곳에 두세요.</Notice>
        </div>
      </section>
      {toast.node}
    </>
  );
}
