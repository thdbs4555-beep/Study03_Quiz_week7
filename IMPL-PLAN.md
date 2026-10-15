<!-- 2026-10-09 16:26 KST -->

# 상식 퀴즈 웹 앱 구현 계획

> 에이전트 작업자에게: superpowers:executing-plans로 이 계획을 이 세션에서 태스크 단위로 실행함(Native). 단계는 체크박스(`- [ ]`)로 추적함. 태스크 하나를 끝내면 사용자에게 보고하고 답을 기다림. 사용자가 시작하라고 하기 전에는 Task 1을 시작하지 않음.

- 목표: PRD.md의 4지선다 상식 퀴즈 웹 앱을 3단계로 나눠 만들고, 단계마다 사용자가 브라우저에서 확인한 뒤 다음 단계로 넘어감
- 구조: 서버 없는 정적 파일 4개. index.html에 화면마다 `<section>`을 두고 `hidden` 속성으로 바꿈. script.js는 상태 객체 `state` 1개와 모드 규칙표 `MODES` 1개로 모든 모드를 처리함(PRD 3절). script.js 끝의 점검 함수 `runSelfTests()`가 화면 없이 확인할 수 있는 로직을 검사함(PRD 8절)
- 기술: HTML, CSS, 바닐라 자바스크립트(모듈 아님, 전역 함수), localStorage. 개발 중 검사에만 Node.js(v26.6.0, `node --version`으로 확인)
- 규격: [PRD.md](PRD.md). 실행자는 이 계획과 PRD를 함께 읽음

## 단계 요약

| 구현 단계 | 만들 것 | 완료 기준 | 태스크 |
|---|---|---|---|
| 1단계 | 파일 4개, 40문항, 시작 화면, 문제 화면, 결과 화면, 연습 모드 채점, 섞기, 점검 함수 | Node 문항 검사 통과, `node script.js` 점검 통과, 사용자의 브라우저 확인 7개 항목(`index.html?test` 콘솔 포함)과 40문항 확인 | 1~4 |
| 2단계 | 모드 선택 화면, 스피드 모드, 힌트 모드, 틀린 문제 다시 풀기 | `node script.js` 점검 통과, 사용자의 브라우저 확인 9개 항목(`index.html?test` 콘솔 포함) | 5~9 |
| 3단계 | localStorage 저장, 결과 화면의 순위, 순위표 화면 | `node script.js` 점검 통과, 사용자의 브라우저 확인 9개 항목(`index.html?test` 콘솔 포함, 크롬, 사파리) | 10~12 |

## 전체 제약

- 앱 파일은 index.html, style.css, script.js, questions.js 4개만 둠(PRD 1절). 점검 코드는 script.js 안에 둠. Node 문항 검사 명령은 파일로 남기지 않음(PRD 6.3항)
- index.html을 file://로 열어 동작해야 함. questions.js는 `<script>`로 읽고 fetch를 쓰지 않음(PRD 3절)
- 테스트 라이브러리를 쓰지 않음(PRD 9절). 검증은 3가지로 함(PRD 8절)
  - 클로드: `node script.js` 한 줄로 점검 함수를 실행함. 기대 출력의 끝 줄은 `점검 통과: N개`. 문항을 고친 태스크는 Task 1 Step 5의 Node 문항 검사도 실행함
  - 사용자: `index.html?test`로 열어 브라우저 콘솔에서 같은 점검 결과를 봄
  - 사용자: 단계 끝 태스크(Task 4, 9, 12)의 브라우저 확인 항목. 콘솔 명령이 필요한 항목은 명령을 적어 둠
- 점검 함수는 화면 없이 확인할 수 있는 로직(섞기, 채점, 점수 표기, 힌트 보기 고르기, 순위표 정렬, 저장값 해석, 날짜)만 검사함. 화면, 타이머, 저장은 사용자의 브라우저 확인으로 봄
- 점검을 더하는 태스크는 점검을 먼저 쓰고 `node script.js`가 FAIL을 내는지 본 뒤 구현함
- 태스크마다 마지막에 그 태스크에서 바꾼 파일을 커밋함. 메시지는 `feat: Task N <태스크 제목>`(git 저장소는 2026-10-09에 만듦, 아직 커밋 없음)
- 화면 문구는 PRD 4.2항의 문구를 그대로 씀: "순위표에 기록되지 않음", "상위 10위 밖", "순위표를 저장할 수 없음", [처음으로], [다음], [결과 보기], [힌트], [틀린 문제 다시 풀기], [순위표]
- 문항, 보기, 해설을 화면에 넣을 때 `textContent`를 씀(문항에 `<`, `&`가 들어가도 그대로 보이게 함)
- 점수 표기는 `점수/문항 수`(예: `7.5/10`, 다시 푼 판은 `3/4`)

## 검토 초점

PRD가 말하지 않았으나 사용자가 겪기 쉬운 경우 5개. 각 줄의 확인 항목을 담당 태스크에 넣었음.

1. 같은 문항이 두 번 채점되는 경우(보기 연타, 0초와 클릭이 겹침): `state.answered`로 막아 한 문항은 한 번만 채점함. Task 3, Task 6
2. 스피드 모드 판을 끝내고 바로 새 판을 시작할 때 타이머가 2개 도는 경우: `startTimer()`가 먼저 이전 타이머를 지움. Task 6
3. localStorage의 `quiz-leaderboard` 값이 깨진 JSON이거나 객체가 아닌 경우: 빈 순위표로 보고 다음 저장에서 덮어씀. Task 10(점검과 브라우저 확인)
4. 오전 9시 전(한국 시각)에 기록하면 `toISOString()`이 어제 날짜를 내는 경우: 로컬 날짜로 `YYYY-MM-DD`를 만듦. Task 10(점검)
5. 다시 풀기를 2번 넘게 반복할 때 처음 판 점수가 바뀌는 경우: `state.firstScore`는 첫 다시 풀기 때 1번만 정함. Task 8

## 파일 구조

| 파일 | 맡는 일 | 만드는 태스크 |
|---|---|---|
| questions.js | 전역 `QUESTIONS` 배열, 40문항 | 1 |
| index.html | 화면별 `<section id="screen-…">`, 버튼 마크업. questions.js, script.js 순으로 읽음 | 2 |
| style.css | 배치, 정답 보기와 고른 오답 보기의 색 | 2 |
| script.js | `MODES`, `state`, 화면 전환, 채점, 타이머, 힌트, 다시 풀기, 순위표, 점검 함수 | 2 |

---

## 구현 1단계: 연습 모드와 점수

### Task 1: questions.js 40문항

파일: 만들기 `questions.js`

인터페이스
- 내놓는 것: `const QUESTIONS = [{ id, category, question, choices, answer, explanation, source }]`(PRD 6.1항 형식)
- id 약자: 한국사 `kh`, 세계지리 `wg`, 과학 `sc`, 예술과 문화 `ac`. 번호는 `01`~`10`

- [x] Step 1: 한국사 10문항(`kh-01`~`kh-10`)을 씀
  - 문항마다 웹 자료로 정답을 대조함. 자료는 공공기관, 백과사전(예: 우리역사넷, 한국민족문화대백과사전)을 우선함
  - `source`는 `"자료명, URL, 2026-10-09"`처럼 확인한 날짜를 넣음
  - 최상급 표현을 쓰면 기준과 시점을 question에 적음(PRD 6.2항)
  - 오답 보기 3개도 정답이 될 수 없는지 확인함
- [x] Step 2: 세계지리 10문항(`wg-01`~`wg-10`)을 Step 1 규칙으로 씀
- [x] Step 3: 과학 10문항(`sc-01`~`sc-10`)을 Step 1 규칙으로 씀
- [x] Step 4: 예술과 문화 10문항(`ac-01`~`ac-10`)을 Step 1 규칙으로 씀
- [x] Step 5: Node 문항 검사를 실행함(파일로 남기지 않음, 문항을 고치는 태스크도 이 명령을 씀)

```bash
node - <<'EOF'
const fs = require("fs"), vm = require("vm");
const ctx = {};
vm.runInNewContext(fs.readFileSync("questions.js", "utf8") + "\nthis.Q = QUESTIONS;", ctx);
const cats = ["한국사", "세계지리", "과학", "예술과 문화"];
const errs = [];
for (const c of cats) {
  const n = ctx.Q.filter(q => q.category === c).length;
  if (n !== 10) errs.push(`${c}: ${n}문항`);
}
if (ctx.Q.length !== 40) errs.push(`전체: ${ctx.Q.length}문항`);
for (const q of ctx.Q) {
  if (!cats.includes(q.category)) errs.push(`${q.id}: 카테고리 ${q.category}`);
  if (q.choices.length !== 4 || new Set(q.choices).size !== 4) errs.push(`${q.id}: 보기 4개가 서로 다르지 않음`);
  if (q.choices.filter(c => c === q.answer).length !== 1) errs.push(`${q.id}: 정답이 보기에 정확히 1번 나오지 않음`);
  if (!q.explanation?.trim() || !q.source?.trim()) errs.push(`${q.id}: 해설 또는 출처가 비어 있음`);
}
console.log(errs.length ? errs.join("\n") : "문항 검사 통과: 40문항");
process.exitCode = errs.length ? 1 : 0;
EOF
```

기대 출력: `문항 검사 통과: 40문항`

- [x] Step 6: `questions.js`를 커밋함

### Task 2: 화면 뼈대, 시작 화면, 점검 함수

파일: 만들기 `index.html`, `style.css`, `script.js`

인터페이스
- 소비: Task 1의 `QUESTIONS`
- 내놓는 것
  - 섹션 id: `screen-start`, `screen-question`, `screen-result`(2단계에 `screen-mode`, 3단계에 `screen-leaderboard`를 더함)
  - 시작 화면의 카테고리 버튼 4개: `<button data-category="한국사">` 등. 버튼 아래에 "순위표에 기록되지 않음"
  - `MODES`: 이 단계에서는 `practice` 줄 1개만 둠

```js
const MODES = {
  practice: { name: "연습", timeLimit: 0, hintCount: 0, hintScore: null, leaderboard: false, retry: true },
};
```

  - `state`: PRD 3절의 8개 필드에 `answered`, `firstScore`, `timerId` 3개를 더함(검토 초점 1, 5와 타이머 정지에 필요함)

```js
const state = {
  category: null, mode: "practice", questions: [], index: 0, score: 0,
  hintUsed: false, wrong: [], secondsLeft: 0,
  answered: false, firstScore: null, timerId: null,
};
```

  - `showScreen(name: "start" | "question" | "result" | "mode" | "leaderboard") -> void`: `screen-<name>`만 `hidden`을 풂
  - `init() -> void`: 버튼에 이벤트를 연결하고 `showScreen("start")`
  - `runSelfTests() -> boolean`: 점검 함수. 이후 태스크는 `// 태스크마다 여기에 check(...)를 더함` 자리에 점검을 더함. script.js 끝은 아래처럼 둠(Node에는 `document`가 없으므로 점검만 실행하고, 브라우저는 앱을 띄운 뒤 `?test`가 있을 때 점검도 실행함)

```js
function runSelfTests() {
  const results = [];
  const check = (name, fn) => {
    let ok = false;
    try { ok = fn() === true; } catch (e) { ok = false; }
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  };
  check("연습 모드 규칙(PRD 5.1항)", () =>
    MODES.practice.timeLimit === 0 && MODES.practice.hintCount === 0 &&
    MODES.practice.leaderboard === false && MODES.practice.retry === true);
  // 태스크마다 여기에 check(...)를 더함
  const failed = results.filter(ok => !ok).length;
  console.log(failed ? `점검 실패: ${failed}개` : `점검 통과: ${results.length}개`);
  return failed === 0;
}

if (typeof document === "undefined") {
  process.exitCode = runSelfTests() ? 0 : 1;   // 클로드: node script.js
} else {
  init();
  if (new URLSearchParams(location.search).has("test")) runSelfTests();   // 사용자: index.html?test
}
```

- [x] Step 1: index.html에 섹션 3개와 시작 화면 마크업을 씀. 문제 화면과 결과 화면은 빈 요소(진행, 점수, 문항, 보기 목록, 해설, 버튼)만 둠
- [x] Step 2: style.css에 클래스 `correct`(정답 보기), `wrong`(고른 오답 보기)의 색과 기본 배치를 씀
- [x] Step 3: script.js에 `MODES`, `state`, `showScreen()`, `init()`, `runSelfTests()`와 끝부분 분기를 씀
- [x] Step 4: `node script.js`를 실행함. 기대 출력: `PASS 연습 모드 규칙(PRD 5.1항)`, `점검 통과: 1개`
- [x] Step 5: `index.html`, `style.css`, `script.js`를 커밋함

### Task 3: 연습 모드 한 판

파일: 고치기 `script.js`, `index.html`

인터페이스
- 소비: `QUESTIONS`, `MODES`, `state`, `showScreen()`, `runSelfTests()`
- 내놓는 것
  - `shuffle(items: Array) -> Array`: 새 배열을 돌려주는 피셔-예이츠 섞기. 원본을 바꾸지 않음
  - `scoreFor(correct: boolean, hintUsed: boolean, mode: string) -> number`: 틀리면 0, 맞히고 힌트를 썼으면 `MODES[mode].hintScore`, 아니면 1(PRD 5.2항)
  - `formatScore(score: number, total: number) -> string`: `` `${score}/${total}` ``
  - `startCategory(category: string) -> void`: 1단계에서는 `state.category`, `state.mode = "practice"`, `state.firstScore = null`을 정하고 `startRound(QUESTIONS.filter(...))`
  - `startRound(list: Array<Question>) -> void`: `state.questions = shuffle(list).map(q => ({ ...q, choices: shuffle(q.choices) }))`, `index`, `score`, `wrong`을 초기화하고 `renderQuestion()`
  - `renderQuestion() -> void`: 진행(`3/10`), 현재 점수, 문항, 보기 4개를 그림. `state.answered = false`, `state.hintUsed = false`
  - `selectChoice(choice: string) -> void`: `state.answered`면 아무것도 하지 않음. 보기 내용을 `answer`와 비교해 `scoreFor()`로 채점하고, 틀리면 `state.wrong`에 넣음. 이어서 `revealAnswer(choice)`
  - `revealAnswer(selected: string | null) -> void`: `state.answered = true`, 보기를 모두 잠금, 정답 보기에 `correct`, 고른 오답 보기에 `wrong`, 정답 여부(시간 초과면 `selected === null`), 해설, 출처, 마지막 문항이면 [결과 보기] 아니면 [다음]
  - `nextQuestion() -> void`, `showResult() -> void`

- [x] Step 1: `runSelfTests()`에 점검 4개를 더함

```js
check("shuffle: 원소를 그대로 두고 원본을 바꾸지 않음", () => {
  const a = [1, 2, 3, 4], b = shuffle(a);
  return b.length === 4 && [...b].sort().join() === "1,2,3,4" && a.join() === "1,2,3,4";
});
check("formatScore", () => formatScore(7.5, 10) === "7.5/10" && formatScore(3, 4) === "3/4");
check("채점: 연습 모드에서 맞히면 1점", () => scoreFor(true, false, "practice") === 1);
check("채점: 틀리면 0점", () => scoreFor(false, false, "practice") === 0);
```

- [x] Step 2: `node script.js`를 실행함. 기대 출력: 새 점검 4개가 FAIL, 끝 줄 `점검 실패: 4개`
- [x] Step 3: 위 함수를 script.js에 씀. 카테고리 버튼은 `startCategory`, 결과 화면의 [처음으로]는 `showScreen("start")`에 연결함. 결과 화면에 점수와 "순위표에 기록되지 않음"을 보여 줌
- [x] Step 4: `node script.js`를 실행함. 기대 출력: 끝 줄 `점검 통과: 5개`
- [x] Step 5: Task 1 Step 5의 Node 문항 검사를 다시 실행함. 기대 출력: `문항 검사 통과: 40문항`
- [x] Step 6: `script.js`, `index.html`을 커밋함

### Task 4: 1단계 사용자 확인

- [x] Step 1: 아래 항목을 사용자에게 드리고 답을 기다림. 열기 명령: `open index.html`. 1-0은 크롬 주소창의 주소 끝에 `?test`를 붙여 열고 `Cmd+Option+J`로 콘솔을 엶

| 번호 | 확인할 것(PRD 8.1항과 검토 초점) |
|---|---|
| 1-0 | `index.html?test`로 열면 콘솔 끝 줄이 `점검 통과: 5개`이고, 앱 화면도 그대로 뜸(file://에서 `?test`가 동작하는지는 확인하지 않았음, PRD 10절) |
| 1-1 | 카테고리 4개를 각각 10문항 끝까지 풀 수 있음 |
| 1-2 | 결과 화면의 점수가 맞힌 문항 수와 같음 |
| 1-3 | 답을 고르면 정답 여부, 해설, 출처가 나오고, 고른 보기와 정답 보기가 색으로 구분됨 |
| 1-4 | "순위표에 기록되지 않음"이 시작 화면과 결과 화면에 나옴 |
| 1-5 | 같은 카테고리를 두 번 열면 문항 순서와 보기 순서가 다름 |
| 1-6 | 보기를 빠르게 2번 눌러도 점수가 1점만 오름(검토 초점 1) |
| 1-7 | questions.js의 40문항(정답, 해설, 출처, 최상급 문항의 기준과 시점)을 최종 확인함 |

- [x] Step 2: 사용자가 지적한 항목을 고치고, 고친 항목만 다시 확인을 요청함. 고친 파일을 커밋함. 모두 통과하면 2단계로 넘어감

---

## 구현 2단계: 모드 추가와 다시 풀기

### Task 5: 모드 선택 화면

파일: 고치기 `index.html`, `script.js`

인터페이스
- 내놓는 것
  - `MODES`에 2줄을 더함(PRD 5.1항)

```js
  speed: { name: "스피드", timeLimit: 15, hintCount: 0, hintScore: null, leaderboard: true, retry: false },
  hint:  { name: "힌트",   timeLimit: 0,  hintCount: 1, hintScore: 0.5,  leaderboard: true, retry: false },
```

  - `screen-mode` 섹션: 고른 카테고리 이름, `<button data-mode="practice">`, `speed`, `hint`. 연습 버튼 안에 "순위표에 기록되지 않음"
  - `startCategory(category)`를 바꿈: `state.category`를 정하고 `showScreen("mode")`
  - `startMode(mode: "practice" | "speed" | "hint") -> void`: `state.mode`, `state.firstScore = null`을 정하고 `startRound(...)`
  - 결과 화면의 "순위표에 기록되지 않음"은 `!MODES[state.mode].leaderboard`일 때만 보여 줌

- [x] Step 1: `runSelfTests()`에 점검 2개를 더함

```js
check("스피드 모드 규칙(PRD 5.1항)", () =>
  MODES.speed.timeLimit === 15 && MODES.speed.hintCount === 0 &&
  MODES.speed.leaderboard === true && MODES.speed.retry === false);
check("힌트 모드 규칙(PRD 5.1항)", () =>
  MODES.hint.timeLimit === 0 && MODES.hint.hintCount === 1 && MODES.hint.hintScore === 0.5 &&
  MODES.hint.leaderboard === true && MODES.hint.retry === false);
```

- [x] Step 2: `node script.js`. 기대 출력: 끝 줄 `점검 실패: 2개`
- [x] Step 3: 시작 화면에서 "순위표에 기록되지 않음"을 지우고, 위 내용을 씀(PRD 8.2항)
- [x] Step 4: `node script.js`. 기대 출력: 끝 줄 `점검 통과: 7개`
- [x] Step 5: `index.html`, `script.js`를 커밋함

### Task 6: 스피드 모드

파일: 고치기 `script.js`, `index.html`

인터페이스
- 소비: `MODES[state.mode].timeLimit`, `revealAnswer()`
- 내놓는 것
  - 문제 화면에 남은 초 요소. `timeLimit`이 0이면 숨김
  - `startTimer() -> void`: 먼저 `stopTimer()`를 부름(검토 초점 2). `state.secondsLeft = timeLimit`, 1초마다 1씩 줄이고 정수로 보여 줌. 0이 되면 `onTimeout()`
  - `stopTimer() -> void`: `clearInterval(state.timerId)`, `state.timerId = null`
  - `onTimeout() -> void`: `state.answered`면 아무것도 하지 않음. 현재 문항을 `state.wrong`에 넣고 `revealAnswer(null)`
  - `renderQuestion()`은 `timeLimit > 0`이면 `startTimer()`, `revealAnswer()`는 항상 `stopTimer()`, [처음으로]도 `stopTimer()`

- [x] Step 1: 위 내용을 씀(PRD 5.3항). 타이머는 화면과 시간에 묶여 점검 함수로 보지 않고 Task 9의 2-2~2-4 항목으로 봄
- [x] Step 2: `node script.js`. 기대 출력: 끝 줄 `점검 통과: 7개`
- [x] Step 3: `script.js`, `index.html`을 커밋함

### Task 7: 힌트 모드

파일: 고치기 `script.js`, `index.html`

인터페이스
- 소비: `MODES[state.mode].hintCount`, `scoreFor()`, `shuffle()`
- 내놓는 것
  - 문제 화면의 [힌트] 버튼. `hintCount`가 0이면 숨김
  - `pickHintChoices(choices: Array<string>, answer: string) -> Array<string>`: 오답 보기 중 2개를 `shuffle()`로 골라 돌려줌
  - `useHint() -> void`: `state.answered`나 `state.hintUsed`면 아무것도 하지 않음. `pickHintChoices()`가 고른 보기 2개를 `disabled`, `state.hintUsed = true`, [힌트]를 `disabled`
  - `revealAnswer()`는 [힌트]도 `disabled`로 바꿈

- [x] Step 1: `runSelfTests()`에 점검 3개를 더함

```js
check("채점: 힌트를 쓰고 맞히면 0.5점", () => scoreFor(true, true, "hint") === 0.5);
check("채점: 힌트를 쓰고 틀리면 0점", () => scoreFor(false, true, "hint") === 0);
check("힌트: 정답을 빼고 서로 다른 오답 2개", () => {
  const picked = pickHintChoices(["가", "나", "다", "라"], "나");
  return picked.length === 2 && !picked.includes("나") && new Set(picked).size === 2 &&
    picked.every(c => ["가", "다", "라"].includes(c));
});
```

- [x] Step 2: `node script.js`. 기대 출력: `pickHintChoices` 점검 1개가 FAIL, 끝 줄 `점검 실패: 1개`(채점 점검 2개는 Task 3의 `scoreFor()`와 Task 5의 규칙표로 이미 통과함)
- [x] Step 3: 위 내용을 씀(PRD 5.4항)
- [x] Step 4: `node script.js`. 기대 출력: 끝 줄 `점검 통과: 10개`
- [x] Step 5: `script.js`, `index.html`을 커밋함

### Task 8: 틀린 문제 다시 풀기

파일: 고치기 `script.js`, `index.html`

인터페이스
- 소비: `state.wrong`, `startRound()`, `MODES[state.mode].retry`
- 내놓는 것
  - 결과 화면의 [틀린 문제 다시 풀기]: `MODES[state.mode].retry && state.wrong.length > 0`일 때만 보임
  - `retryWrong() -> void`: `state.firstScore`가 `null`일 때만 `{ score: state.score, total: state.questions.length }`로 정함(검토 초점 5). 이어서 `startRound(state.wrong)`
  - `showResult()`: `state.firstScore`가 있으면 "처음 판 `formatScore(firstScore.score, firstScore.total)`"와 "다시 푼 점수 `formatScore(score, questions.length)`"를 함께 보여 줌

- [x] Step 1: 위 내용을 씀(PRD 5.5항, 4.2항). 다시 풀기는 화면 상태에 묶여 점검 함수로 보지 않고 Task 9의 2-7, 2-8 항목으로 봄
- [x] Step 2: `node script.js`. 기대 출력: 끝 줄 `점검 통과: 10개`
- [x] Step 3: `script.js`, `index.html`을 커밋함

### Task 9: 2단계 사용자 확인

- [x] Step 1: 아래 항목을 사용자에게 드리고 답을 기다림

| 번호 | 확인할 것(PRD 8.2항과 검토 초점) |
|---|---|
| 2-0 | `index.html?test`로 열면 콘솔 끝 줄이 `점검 통과: 10개` |
| 2-1 | 카테고리를 고르면 모드 선택 화면이 나오고 연습, 스피드, 힌트 3개가 보임. 연습 버튼에 "순위표에 기록되지 않음" |
| 2-2 | 스피드: 15초가 지나면 오답으로 처리하고 정답 보기와 해설을 보여 줌 |
| 2-3 | 스피드: 해설이 나온 동안 남은 초가 멈춤. [다음]을 누르면 15부터 다시 셈 |
| 2-4 | 스피드: 한 판을 끝내고 [처음으로] 뒤 다시 스피드를 시작해도 남은 초가 1초에 1씩 줄어듦(검토 초점 2) |
| 2-5 | 힌트: [힌트]를 누르면 오답 보기 2개만 눌리지 않고 정답 보기는 남음. [힌트]를 다시 누를 수 없음 |
| 2-6 | 힌트: 힌트를 쓰고 맞힌 문항은 0.5점, 힌트를 쓰고 틀린 문항은 0점 |
| 2-7 | 연습: 다시 풀기에 틀린 문항만 나옴. 또 틀리면 다시 풀기를 반복할 수 있고, 반복해도 "처음 판" 점수가 그대로임(검토 초점 5) |
| 2-8 | 스피드, 힌트 모드의 결과 화면에는 [틀린 문제 다시 풀기]가 없음 |

- [x] Step 2: 지적한 항목을 고치고 그 항목만 다시 확인을 요청함. 고친 파일을 커밋함. 모두 통과하면 3단계로 넘어감

---

## 구현 3단계: 점수 저장과 순위표

### Task 10: 점수 저장과 결과 화면의 순위

파일: 고치기 `script.js`, `index.html`

인터페이스
- 소비: `MODES[state.mode].leaderboard`, `state.category`, `state.score`
- 내놓는 것
  - `const LEADERBOARD_KEY = "quiz-leaderboard"`, `const CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"]`
  - `todayString(date = new Date()) -> string`: 로컬 날짜의 `getFullYear()`, `getMonth() + 1`, `getDate()`로 `"2026-10-09"` 형식을 만듦. `toISOString()`을 쓰지 않음(검토 초점 4)
  - `parseLeaderboard(text: string | null) -> object`: 값이 없거나, `JSON.parse`가 실패하거나, 결과가 객체가 아니거나 배열이면 `{}`(검토 초점 3)
  - `loadLeaderboard() -> object`: `parseLeaderboard(localStorage.getItem(LEADERBOARD_KEY))`. 읽기가 예외를 내면 `{}`
  - `insertScore(list: Array<{date, score}>, entry: {date, score}) -> { list: Array, rank: number | null }`: `score`가 `entry.score` 이상인 마지막 기록 뒤에 넣음(동점이면 먼저 기록한 것이 위). 앞 10개만 남김. 넣은 위치가 10위 안이면 `rank`는 1부터 센 순위, 밖이면 `null`
  - `recordScore(mode: string, category: string, score: number, date = todayString()) -> { saved: boolean, rank: number | null }`: 키 `` `${mode}|${category}` ``의 표에 `insertScore()`를 적용하고 `setItem`으로 저장함. `setItem`이 예외를 내면 `{ saved: false, rank: null }`. `date` 인자는 Task 12의 콘솔 확인에 씀
  - `showResult()`: 첫 판이고(`state.firstScore === null`) `MODES[state.mode].leaderboard`면 `recordScore()`를 부르고 "이번 점수는 N위", "상위 10위 밖", "순위표를 저장할 수 없음" 중 하나를 보여 줌

- [x] Step 1: `runSelfTests()`에 점검 5개를 더함

```js
check("저장값 해석: 없거나 깨지거나 객체가 아니면 빈 순위표", () =>
  [null, "{", "[]", "\"x\"", "null"].every(t => JSON.stringify(parseLeaderboard(t)) === "{}"));
check("날짜: 로컬 날짜, 두 자리 채움", () =>
  todayString(new Date(2026, 9, 9, 8, 30)) === "2026-10-09" && todayString(new Date(2026, 0, 5)) === "2026-01-05");
check("순위표: 11개를 넣어도 10개만 남음", () => {
  let list = [];
  for (let i = 0; i <= 10; i++) list = insertScore(list, { date: "2026-10-09", score: i }).list;
  return list.length === 10 && list[0].score === 10 && list[9].score === 1;
});
check("순위표: 동점이면 먼저 기록한 점수가 위", () => {
  let list = insertScore([], { date: "2026-10-01", score: 5 }).list;
  const r = insertScore(list, { date: "2026-10-02", score: 5 });
  return r.rank === 2 && r.list[0].date === "2026-10-01";
});
check("순위표: 10위 밖이면 rank가 null", () => {
  const full = Array.from({ length: 10 }, () => ({ date: "2026-10-09", score: 9 }));
  const r = insertScore(full, { date: "2026-10-09", score: 3 });
  return r.rank === null && r.list.length === 10;
});
```

- [x] Step 2: `node script.js`. 기대 출력: 새 점검 5개가 FAIL, 끝 줄 `점검 실패: 5개`
- [x] Step 3: 위 내용을 씀(PRD 7절, 4.2항)
- [x] Step 4: `node script.js`. 기대 출력: 끝 줄 `점검 통과: 15개`
- [x] Step 5: `script.js`, `index.html`을 커밋함

### Task 11: 순위표 화면

파일: 고치기 `index.html`, `script.js`

인터페이스
- 소비: `loadLeaderboard()`, `CATEGORIES`
- 내놓는 것
  - 시작 화면의 [순위표] 버튼, `screen-leaderboard` 섹션, 순위표 화면의 [처음으로]
  - `renderLeaderboard() -> void`: 모드 `speed`, `hint` 순, 카테고리는 `CATEGORIES` 순으로 표 8개를 그림. 표 제목은 `MODES[mode].name`과 카테고리 이름, 행은 순위, 날짜, 점수. 기록이 없는 표는 "기록 없음"

- [x] Step 1: 위 내용을 씀(PRD 4.2항). 표 그리기는 화면 작업이라 점검 함수로 보지 않고 Task 12의 3-1, 3-3~3-5 항목으로 봄
- [x] Step 2: `node script.js`. 기대 출력: 끝 줄 `점검 통과: 15개`
- [x] Step 3: `index.html`, `script.js`를 커밋함

### Task 12: 3단계 사용자 확인

- [x] Step 1: 아래 항목을 사용자에게 드리고 답을 기다림. 콘솔은 크롬에서 `Cmd+Option+J`로 염

| 번호 | 확인할 것(PRD 8.3항과 검토 초점) |
|---|---|
| 3-0 | `index.html?test`로 열면 콘솔 끝 줄이 `점검 통과: 15개` |
| 3-1 | 스피드, 힌트 모드로 한 판씩 풀면 결과 화면에 순위가 나오고, 새로고침 뒤 [순위표]에 두 기록이 남아 있음. 날짜가 오늘(한국 시각)임(검토 초점 4) |
| 3-2 | 연습 모드로 한 판 풀면 순위표에 기록되지 않음 |
| 3-3 | 콘솔에 `for (let i = 0; i <= 10; i++) recordScore("speed", "한국사", i);`(11개 기록)를 넣고 새로고침하면 스피드 한국사 표에 10점부터 1점까지 10개만 남음 |
| 3-4 | 콘솔에 `recordScore("hint", "과학", 5, "2026-10-01"); recordScore("hint", "과학", 5, "2026-10-02");`를 넣고 새로고침하면 힌트 과학 표에서 10-01 기록이 10-02 기록 위에 옴 |
| 3-5 | 콘솔에 `localStorage.setItem("quiz-leaderboard", "{")`를 넣고 새로고침하면 순위표가 빈 표로 열리고, 스피드 한 판을 풀면 기록이 저장됨(검토 초점 3) |
| 3-6 | 콘솔에 `Storage.prototype.setItem = () => { throw new Error("blocked"); };`를 넣고 스피드 한 판을 풀면 "순위표를 저장할 수 없음"이 나오고 [처음으로]가 동작함. 새로고침하면 원래대로 돌아옴 |
| 3-7 | 크롬에서 file://로 연 index.html의 기록이 새로고침 뒤에도 남음 |
| 3-8 | 사파리에서 file://로 연 index.html의 기록이 새로고침 뒤에도 남고, `index.html?test`의 콘솔 끝 줄이 `점검 통과: 15개`(PRD 10절의 확인하지 않은 것) |

- [x] Step 2: 지적한 항목을 고치고 그 항목만 다시 확인을 요청함. 고친 파일을 커밋함. 3-8이 실패하면 고치기 전에 사용자와 대응을 정함(PRD 7절은 저장 실패 시 게임을 계속한다고만 정함)

---

## PRD 항목과 태스크 대응표

PRD의 항목마다 그것을 구현하거나 확인하는 태스크를 적음. "확인"은 사용자 확인 태스크의 항목 번호임.

| PRD 위치 | 항목 | 구현 태스크 | 확인 |
|---|---|---|---|
| PRD 1절 | 앱 파일 4개 | 1, 2 | 1-1 |
| PRD 2절 | 답을 고르면 정답 여부, 해설, 출처를 곧바로 보여 줌 | 3 | 1-3 |
| PRD 3절 | file://로 열어 동작, questions.js를 `<script>`로 읽음 | 2 | 1-1 |
| PRD 3절 | 화면마다 `<section>`, 보이기와 숨기기 | 2 | 1-1 |
| PRD 3절 | 상태 객체 1개, 모드 규칙표 1개 | 2, 5 | 1-0, 2-0 |
| PRD 4.1항 | 구현 1단계 흐름: 시작, 문제 ×10, 결과, [처음으로] | 3 | 1-1 |
| PRD 4.1항 | 구현 2단계 흐름: 모드 선택, 다시 풀기 | 5, 8 | 2-1, 2-7 |
| PRD 4.1항 | 구현 3단계 흐름: 시작 화면의 [순위표] | 11 | 3-1 |
| PRD 4.2항 | 시작 화면: 카테고리 버튼 4개, 문구, [순위표] | 2, 5, 11 | 1-4, 2-1, 3-1 |
| PRD 4.2항 | 모드 선택 화면 | 5 | 2-1 |
| PRD 4.2항 | 문제 화면: 진행, 현재 점수, 남은 초, [힌트] | 3, 6, 7 | 1-1, 2-2, 2-5 |
| PRD 4.2항 | 답한 뒤 문제 화면: 보기 잠금, 색 구분, [다음], [결과 보기] | 3 | 1-3, 1-6 |
| PRD 4.2항 | 결과 화면: 점수, [처음으로], 연습 모드 문구 | 3, 5 | 1-2, 1-4, 2-1 |
| PRD 4.2항 | 결과 화면(연습): [틀린 문제 다시 풀기], 처음 판 점수와 다시 푼 점수 | 8 | 2-7, 2-8 |
| PRD 4.2항 | 결과 화면(스피드, 힌트): 순위, "상위 10위 밖" | 10 | 3-1, 3-3 |
| PRD 4.2항 | 순위표 화면: 표 8개, 상위 10개 | 11 | 3-1, 3-3 |
| PRD 5.1항 | 모드 규칙표 3줄 | 2, 5 | 1-0, 2-0 |
| PRD 5.2항 | 맞히면 1점, 틀리면 0점, 힌트를 쓰고 맞히면 0.5점, 10점 만점 표기 | 3, 7 | 1-0, 1-2, 2-0, 2-6 |
| PRD 5.2항 | 문항 순서와 보기 순서 섞기, 보기 내용으로 채점 | 3 | 1-0, 1-5 |
| PRD 5.3항 | 스피드 모드: 15초, 시간 초과는 오답, 해설 중 정지, [다음]에서 다시 셈 | 6 | 2-2, 2-3, 2-4 |
| PRD 5.4항 | 힌트 모드: 오답 보기 2개를 막음, 1번만 씀 | 7 | 2-0, 2-5, 2-6 |
| PRD 5.5항 | 틀린 문제 다시 풀기: 연습 모드만, 틀린 문항만, 처음 판 점수 유지, 반복 | 8 | 2-7, 2-8 |
| PRD 6.1항 | 문항 데이터 형식 | 1 | Task 1 Step 5 |
| PRD 6.2항 | 정답 1개, 출처 명시, 최상급 문항의 기준과 시점 | 1 | 1-7 |
| PRD 6.3항 | 클로드의 웹 대조, 사용자 최종 확인 | 1 | 1-7 |
| PRD 6.3항 | Node 문항 검사 | 1, 3 | Task 1 Step 5 |
| PRD 7절 | 키 `quiz-leaderboard` 1개, 값의 형태, 표 8개 | 10 | 3-1 |
| PRD 7절 | 점수 내림차순, 상위 10개, 동점이면 먼저 기록한 것이 위 | 10 | 3-0, 3-3, 3-4 |
| PRD 7절 | 연습 모드 점수는 저장하지 않음 | 10 | 3-2 |
| PRD 7절 | 저장이 막히면 "순위표를 저장할 수 없음", 게임 계속 | 10 | 3-6 |
| PRD 8절 | script.js의 점검 코드(`node script.js`, `index.html?test`) | 2, 3, 5, 7, 10 | 1-0, 2-0, 3-0 |
| PRD 8.1항 | 구현 1단계 완료 확인 항목 | 4 | 1-0~1-7 |
| PRD 8.2항 | 구현 2단계 완료 확인 항목 | 9 | 2-0~2-8 |
| PRD 8.3항 | 구현 3단계 완료 확인 항목 | 12 | 3-0~3-8 |
| PRD 9절 | 하지 않을 것 | 해당 태스크 없음(만들지 않음) | 없음 |
| PRD 10절 | file://에서 `<script>`로 문항을 읽음 | 2 | 1-1 |
| PRD 10절 | file://에서 `?test`를 붙여 열림 | 2 | 1-0, 3-8 |
| PRD 10절 | file://에서 크롬과 사파리의 localStorage | 10 | 3-7, 3-8 |
