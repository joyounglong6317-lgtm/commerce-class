/*
  class-common.js
  ----------------
  상업과 교실 학습 자료실 - 학생용 공용 스크립트
  1) 상단 고정 배너: 학생 이름 · 실시간 시계 · 응원 문구 · 그만풀기 버튼
  2) Firebase(teacher-tools.html과 동일 프로젝트: tool-1afe7)를 이용한
     - 반/명단(PIN) 관리
     - 학생 활동 점수 기록(classHub_scores 컬렉션)

  사용법 (각 학생용 페이지 </body> 직전에 추가):
    <script type="module" src="../shared/class-common.js" data-role="activity" data-hub="hub.html"></script>

  data-role="hub"      : 로그인/메뉴 허브 페이지 (그만풀기 버튼 숨김)
  data-role="activity" : 게임/학습지 페이지 (기본값, 그만풀기 버튼 표시)
  data-hub             : 그만풀기 눌렀을 때 이동할 허브 페이지 경로 (기본값 "hub.html")
*/

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAWtLmHf7L5BSzAO4A9EveQShscrAHRzc",
  authDomain: "tool-1afe7.firebaseapp.com",
  projectId: "tool-1afe7",
  storageBucket: "tool-1afe7.firebasestorage.app",
  messagingSenderId: "598080083208",
  appId: "1:598080083208:web:545bbee80896ef5ef508bd",
  measurementId: "G-XPDXQMM3PN"
};

function getApp_(){ return getApps().length ? getApp() : initializeApp(firebaseConfig); }
export const db = getFirestore(getApp_());

let authReadyPromise = null;
function ensureAuth(){
  if(!authReadyPromise){
    authReadyPromise = signInAnonymously(getAuth(getApp_())).catch(e=>{ console.error("익명 로그인 실패:", e); });
  }
  return authReadyPromise;
}

// ===== 학생 세션(이름) =====
export function getStudentName(){ return sessionStorage.getItem('chb_name') || null; }
export function setStudentName(name){ sessionStorage.setItem('chb_name', name); }
export function clearStudentName(){ sessionStorage.removeItem('chb_name'); }

// ===== 반 명단(이름+PIN) Firestore 관리 =====
// 문서 위치: classHub/roster  ->  { students: [{name, pin}, ...] }
export async function getRoster(){
  await ensureAuth();
  try {
    const snap = await getDoc(doc(db, 'classHub', 'roster'));
    return snap.exists() ? (snap.data().students || []) : [];
  } catch(e){ console.error("명단 불러오기 실패:", e); return []; }
}
export async function saveRoster(students){
  await ensureAuth();
  await setDoc(doc(db, 'classHub', 'roster'), { students });
}

// ===== 활동 점수 기록 =====
// 컬렉션: classHub_scores  (문서마다 자동 ID)
export async function logScore(activity, detail, correct, total, score){
  const name = getStudentName();
  if(!name) return; // 로그인 안 한 상태(테스트 등)에서는 기록하지 않음
  await ensureAuth();
  try {
    await addDoc(collection(db, 'classHub_scores'), {
      studentName: name, activity, detail,
      correct: correct ?? null, total: total ?? null, score: score ?? null,
      timestamp: serverTimestamp()
    });
  } catch(e){ console.error("점수 기록 실패:", e); }
}

// ===== 상단 배너 주입 =====
const CHEERS = [
  "오늘도 한 걸음씩, 회계왕을 향해! 💪",
  "실수해도 괜찮아요, 다시 풀면 실력이 늘어요!",
  "집중력 최고! 지금 아주 잘하고 있어요 👏",
  "차근차근 풀면 분명히 맞힐 수 있어요.",
  "포기하지 않는 당신이 진짜 멋져요!",
  "오늘 배운 건 오늘 내 것으로! 화이팅 🔥",
  "틀린 문제는 최고의 스승! 다시 도전해봐요.",
  "잠깐 쉬었다 풀어도 좋아요, 천천히 가도 괜찮아요.",
  "한 문제 한 문제가 실력이 되고 있어요 ✨",
  "꾸준함이 결국 이깁니다. 잘하고 있어요!"
];

function getIncludeTag(){
  return document.querySelector('script[src*="class-common.js"]');
}

function injectBanner(){
  const tag = getIncludeTag();
  const role = (tag && tag.dataset.role) || 'activity';
  const hubUrl = (tag && tag.dataset.hub) || 'hub.html';
  const name = getStudentName();

  const banner = document.createElement('div');
  banner.id = 'chb-banner';
  banner.innerHTML = `
    <style>
      #chb-banner{position:fixed;top:0;left:0;right:0;z-index:99999;
        background:#1F3D2E;color:#F3EEDD;
        display:flex;align-items:center;gap:14px;flex-wrap:wrap;
        padding:8px 16px;font-family:'Noto Sans KR',sans-serif;font-size:13px;
        box-shadow:0 2px 8px rgba(0,0,0,.3);border-bottom:2px solid #B8892B;}
      #chb-banner .chb-name{font-weight:700;white-space:nowrap;}
      #chb-banner .chb-clock{font-family:'Roboto Mono',monospace;font-weight:700;white-space:nowrap;opacity:.9;}
      #chb-banner .chb-cheer{flex:1;text-align:center;color:#E8C468;font-weight:700;min-width:140px;
        transition:opacity .4s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      #chb-banner .chb-stop{background:#7A2E2E;color:#fff;border:none;border-radius:20px;
        padding:6px 16px;font-weight:700;cursor:pointer;font-size:12.5px;white-space:nowrap;}
      #chb-banner .chb-stop:hover{background:#973939;}
      html{scroll-padding-top:56px;}
      body{padding-top:54px !important;}
      @media (max-width:640px){
        #chb-banner{font-size:11px;padding:6px 10px;gap:8px;}
        #chb-banner .chb-cheer{order:3;flex-basis:100%;text-align:center;}
        body{padding-top:76px !important;}
      }
      @media print{ #chb-banner{ display:none !important; } body{ padding-top:0 !important; } }
    </style>
    <div class="chb-name">🙋 ${name ? name + ' 님' : '게스트'}</div>
    <div class="chb-clock" id="chb-clock">--</div>
    <div class="chb-cheer" id="chb-cheer"></div>
    ${role === 'activity' ? '<button type="button" class="chb-stop" id="chb-stop">⏹ 그만풀기</button>' : ''}
  `;
  document.body.prepend(banner);

  const clockEl = banner.querySelector('#chb-clock');
  function tick(){
    const now = new Date();
    const d = now.toLocaleDateString('ko-KR', { month:'long', day:'numeric', weekday:'short' });
    const t = now.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    clockEl.textContent = `${d} ${t}`;
  }
  tick(); setInterval(tick, 1000);

  const cheerEl = banner.querySelector('#chb-cheer');
  let ci = 0;
  function showCheer(){
    cheerEl.style.opacity = 0;
    setTimeout(()=>{ cheerEl.textContent = CHEERS[ci % CHEERS.length]; ci++; cheerEl.style.opacity = 1; }, 400);
  }
  showCheer(); setInterval(showCheer, 6000);

  const stopBtn = banner.querySelector('#chb-stop');
  if(stopBtn){
    stopBtn.addEventListener('click', ()=>{
      if(confirm('정말 그만 풀고 나갈까요?\n지금까지의 진행 상황은 저장되지 않을 수 있어요.')){
        window.location.href = hubUrl;
      }
    });
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', injectBanner);
} else {
  injectBanner();
}

// 모듈이 아닌 일반 <script>(각 게임의 기존 코드)에서도 점수 기록을 호출할 수 있도록 전역 노출
window.ClassHub = { logScore, getStudentName, setStudentName, clearStudentName };

