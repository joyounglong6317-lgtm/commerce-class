# 연말정산 AI 튜터 & ERP 시뮬레이터 — 설정 가이드

## 구성 파일
- `yearend-tax-app.html` — 학생/교사용 웹앱 (GitHub Pages에 그대로 업로드하면 됩니다)
- `functions/index.js` — AI 튜터 챗봇이 Anthropic API를 안전하게 호출하는 Firebase Functions 프록시
- `functions/package.json` — 위 함수의 의존성 정의

## 1. Firebase 프로젝트 준비
기존에 쓰시던 Firebase 프로젝트(commerce.knowee.co.kr용)를 그대로 사용하셔도 됩니다.

1. Firestore 데이터베이스가 이미 활성화되어 있는지 확인
2. `yearend-tax-app.html` 상단 `FIREBASE_CONFIG` 값을 프로젝트 설정값으로 교체
3. `CLASS_PINS` 값을 담당하시는 학급 구성에 맞게 수정 (예: `{"1반":"실제PIN", ...}`)
4. `TEACHER_PASSWORD` 값을 반드시 변경

## 2. AI 튜터(챗봇) 배포 — Firebase Functions
Anthropic API 키는 절대 HTML/JS 파일에 직접 넣지 마세요. 아래처럼 서버(Functions)에서만 사용합니다.

```bash
# functions 폴더로 이동 후
npm install

# 방법 A) 간단한 방식 (구버전 config, 테스트용)
firebase functions:config:set anthropic.key="sk-ant-여기에_실제_키"

# 방법 B) Secret Manager 방식 (권장, index.js 상단 주석 참고해서 코드 활성화)
firebase functions:secrets:set ANTHROPIC_API_KEY

# 배포
firebase deploy --only functions:yearEndTaxTutor
```

배포가 끝나면 콘솔에 아래와 같은 URL이 출력됩니다.
```
https://REGION-YOUR_PROJECT.cloudfunctions.net/yearEndTaxTutor
```
이 URL을 `yearend-tax-app.html`의 `CHAT_ENDPOINT` 값에 붙여넣으세요.

이 엔드포인트는 ④ AI 튜터 챗봇과 ⑦ BI 대시보드의 "생성형 ERP 코파일럿"이 함께 사용합니다. BI 코파일럿은 RPA로 처리된 데이터를 프롬프트에 함께 담아 보내므로, 실제 화면의 수치에 근거해서만 답하도록 설계되어 있습니다. `CHAT_ENDPOINT`가 미설정이거나 응답에 실패하면 자동으로 규칙 기반 응답(간단한 통계 질의 응답)으로 대체됩니다.

## 3. Firestore 보안 규칙 (권장)
현재 앱은 PIN/비밀번호를 클라이언트에서 확인하는 간단한 방식으로, 교실 내 사용에는 충분하지만
데이터를 완전히 보호하지는 않습니다. 다음 규칙으로 최소한의 오남용을 막을 수 있습니다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{studentId} {
      allow read, write: if true;   // 교실 환경 기준 최소 규칙(필요 시 강화)
      match /chatLogs/{logId} {
        allow read, write: if true;
      }
    }
    match /settings/classPins {
      allow read, write: if true;   // 교사 대시보드에서 학급 PIN을 저장하는 문서 (⚠️ 강화 권장, 아래 참고)
    }
  }
}
```
`settings/classPins`는 교사 대시보드의 [PIN 저장] 버튼이 쓰는 문서로, 학급명(예: "1반")을 키로, PIN을 값으로 저장합니다. 위 규칙은 학생도 이 문서를 수정할 수 있는 최소 규칙이므로, 실제 운영 시에는 Firebase Authentication으로 교사 계정을 만들고 `allow write: if request.auth.token.role == 'teacher';` 같은 조건으로 강화하는 것을 권장드립니다.

더 엄격하게 하시려면 Firebase Anonymous Authentication을 추가해 학생별 UID로 문서를 제한하는 방식을 권장드립니다. 필요하시면 이 부분도 이어서 작업해 드릴 수 있습니다.

## 4. GitHub Pages 배포
`yearend-tax-app.html`을 `commerce.knowee.co.kr` 저장소의 원하는 경로(예: `/yearend-tax/index.html`)에 올리면 바로 접속 가능합니다.

## 5. 세법 기준값 최신화
`yearend-tax-app.html` 안의 `TAX_RULES` 객체(근로소득공제 구간, 세율, 공제율 등)는 교육용으로 단순화한 값입니다.
학기 초에 국세청 발표 최신 기준으로 값을 확인·수정해 주세요. (실제 연말정산 신고에는 사용 불가 — 학습용 모의 계산 전용임을 학생들에게 안내해 주세요.)

## 6. 지도안 연계
동봉된 `연말정산_AI융합수업_교수학습지도안.docx`의 차시별 "AI 튜터 연계" 항목이 이 앱의 각 탭(①~⑤)과 1:1로 대응됩니다.
