// 2026-10-09 17:04 KST

const MODES = {
  practice: { name: "연습", timeLimit: 0, hintCount: 0, hintScore: null, leaderboard: false, retry: true },
  speed: { name: "스피드", timeLimit: 15, hintCount: 0, hintScore: null, leaderboard: true, retry: false },
  hint:  { name: "힌트",   timeLimit: 0,  hintCount: 1, hintScore: 0.5,  leaderboard: true, retry: false },
};

const LEADERBOARD_KEY = "quiz-leaderboard";
const CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];

const state = {
  category: null, mode: "practice", questions: [], index: 0, score: 0,
  hintUsed: false, wrong: [], secondsLeft: 0,
  answered: false, firstScore: null, timerId: null,
};

function showScreen(name) {
  document.querySelectorAll("main > section").forEach(section => {
    section.hidden = section.id !== `screen-${name}`;
  });
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function scoreFor(correct, hintUsed, mode) {
  if (!correct) return 0;
  return hintUsed ? MODES[mode].hintScore : 1;
}

function formatScore(score, total) {
  return `${score}/${total}`;
}

function todayString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseLeaderboard(text) {
  if (text === null || text === undefined) return {};
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
    return value;
  } catch (e) {
    return {};
  }
}

function loadLeaderboard() {
  try {
    return parseLeaderboard(localStorage.getItem(LEADERBOARD_KEY));
  } catch (e) {
    return {};
  }
}

function insertScore(list, entry) {
  const index = list.filter(item => item.score >= entry.score).length;
  const next = [...list.slice(0, index), entry, ...list.slice(index)].slice(0, 10);
  return { list: next, rank: index < 10 ? index + 1 : null };
}

function recordScore(mode, category, score, date = todayString()) {
  const board = loadLeaderboard();
  const key = `${mode}|${category}`;
  const list = Array.isArray(board[key]) ? board[key] : [];
  const result = insertScore(list, { date, score });
  board[key] = result.list;
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  } catch (e) {
    return { saved: false, rank: null };
  }
  return { saved: true, rank: result.rank };
}

function startCategory(category) {
  state.category = category;
  document.getElementById("mode-category").textContent = category;
  showScreen("mode");
}

function startMode(mode) {
  state.mode = mode;
  state.firstScore = null;
  startRound(QUESTIONS.filter(q => q.category === state.category));
}

function startRound(list) {
  state.questions = shuffle(list).map(q => ({ ...q, choices: shuffle(q.choices) }));
  state.index = 0;
  state.score = 0;
  state.wrong = [];
  renderQuestion();
  showScreen("question");
}

function renderQuestion() {
  const q = state.questions[state.index];
  state.answered = false;
  state.hintUsed = false;
  document.getElementById("progress").textContent = `${state.index + 1}/${state.questions.length}`;
  document.getElementById("current-score").textContent = `점수 ${formatScore(state.score, state.questions.length)}`;
  document.getElementById("question-text").textContent = q.question;
  const list = document.getElementById("choice-list");
  list.replaceChildren();
  for (const choice of q.choices) {
    const button = document.createElement("button");
    button.textContent = choice;
    button.addEventListener("click", () => selectChoice(choice));
    list.appendChild(button);
  }
  document.getElementById("feedback").hidden = true;
  document.getElementById("timer").hidden = MODES[state.mode].timeLimit === 0;
  const hintButton = document.getElementById("hint-button");
  hintButton.hidden = MODES[state.mode].hintCount === 0;
  hintButton.disabled = false;
  if (MODES[state.mode].timeLimit > 0) startTimer();
}

function startTimer() {
  stopTimer();
  state.secondsLeft = MODES[state.mode].timeLimit;
  const timer = document.getElementById("timer");
  timer.textContent = `${state.secondsLeft}초`;
  state.timerId = setInterval(() => {
    state.secondsLeft--;
    timer.textContent = `${state.secondsLeft}초`;
    if (state.secondsLeft <= 0) onTimeout();
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function onTimeout() {
  if (state.answered) return;
  state.wrong.push(state.questions[state.index]);
  revealAnswer(null);
}

function pickHintChoices(choices, answer) {
  return shuffle(choices.filter(c => c !== answer)).slice(0, 2);
}

function useHint() {
  if (state.answered || state.hintUsed) return;
  const q = state.questions[state.index];
  const picked = pickHintChoices(q.choices, q.answer);
  for (const button of document.getElementById("choice-list").children) {
    if (picked.includes(button.textContent)) button.disabled = true;
  }
  state.hintUsed = true;
  document.getElementById("hint-button").disabled = true;
}

function selectChoice(choice) {
  if (state.answered) return;
  const q = state.questions[state.index];
  const correct = choice === q.answer;
  state.score += scoreFor(correct, state.hintUsed, state.mode);
  if (!correct) state.wrong.push(q);
  revealAnswer(choice);
}

function revealAnswer(selected) {
  const q = state.questions[state.index];
  state.answered = true;
  stopTimer();
  document.getElementById("hint-button").disabled = true;
  for (const button of document.getElementById("choice-list").children) {
    button.disabled = true;
    if (button.textContent === q.answer) button.classList.add("correct");
    else if (button.textContent === selected) button.classList.add("wrong");
  }
  let result = selected === q.answer ? "정답" : "오답";
  if (selected === null) result = "시간 초과";
  document.getElementById("feedback-result").textContent = result;
  document.getElementById("feedback-explanation").textContent = q.explanation;
  document.getElementById("feedback-source").textContent = `출처: ${q.source}`;
  document.getElementById("current-score").textContent = `점수 ${formatScore(state.score, state.questions.length)}`;
  const isLast = state.index === state.questions.length - 1;
  document.getElementById("next-button").textContent = isLast ? "결과 보기" : "다음";
  document.getElementById("feedback").hidden = false;
}

function nextQuestion() {
  state.index++;
  renderQuestion();
}

function showResult() {
  const score = formatScore(state.score, state.questions.length);
  const first = document.getElementById("result-first");
  first.hidden = state.firstScore === null;
  if (state.firstScore === null) {
    document.getElementById("result-score").textContent = score;
  } else {
    first.textContent = `처음 판 ${formatScore(state.firstScore.score, state.firstScore.total)}`;
    document.getElementById("result-score").textContent = `다시 푼 점수 ${score}`;
  }
  document.getElementById("result-note").hidden = MODES[state.mode].leaderboard;
  const rank = document.getElementById("result-rank");
  rank.hidden = true;
  if (state.firstScore === null && MODES[state.mode].leaderboard) {
    const recorded = recordScore(state.mode, state.category, state.score);
    if (!recorded.saved) rank.textContent = "순위표를 저장할 수 없음";
    else if (recorded.rank === null) rank.textContent = "상위 10위 밖";
    else rank.textContent = `이번 점수는 ${recorded.rank}위`;
    rank.hidden = false;
  }
  document.getElementById("retry-button").hidden = !(MODES[state.mode].retry && state.wrong.length > 0);
  showScreen("result");
}

function renderLeaderboard() {
  const board = loadLeaderboard();
  const container = document.getElementById("leaderboard-list");
  container.replaceChildren();
  for (const mode of ["speed", "hint"]) {
    for (const category of CATEGORIES) {
      const title = document.createElement("h3");
      title.textContent = `${MODES[mode].name} ${category}`;
      container.appendChild(title);
      const list = board[`${mode}|${category}`];
      if (!Array.isArray(list) || list.length === 0) {
        const empty = document.createElement("p");
        empty.className = "note";
        empty.textContent = "기록 없음";
        container.appendChild(empty);
        continue;
      }
      const table = document.createElement("table");
      const head = table.insertRow();
      for (const label of ["순위", "날짜", "점수"]) {
        const th = document.createElement("th");
        th.textContent = label;
        head.appendChild(th);
      }
      list.forEach((item, i) => {
        const row = table.insertRow();
        row.insertCell().textContent = `${i + 1}`;
        row.insertCell().textContent = item.date;
        row.insertCell().textContent = item.score;
      });
      container.appendChild(table);
    }
  }
}

function retryWrong() {
  if (state.firstScore === null) {
    state.firstScore = { score: state.score, total: state.questions.length };
  }
  startRound(state.wrong);
}

function init() {
  document.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => startCategory(button.dataset.category));
  });
  document.querySelectorAll("[data-mode]").forEach(button => {
    button.addEventListener("click", () => startMode(button.dataset.mode));
  });
  document.getElementById("hint-button").addEventListener("click", useHint);
  document.getElementById("next-button").addEventListener("click", () => {
    if (state.index === state.questions.length - 1) showResult();
    else nextQuestion();
  });
  document.getElementById("retry-button").addEventListener("click", retryWrong);
  document.getElementById("home-button").addEventListener("click", () => {
    stopTimer();
    showScreen("start");
  });
  document.getElementById("leaderboard-button").addEventListener("click", () => {
    renderLeaderboard();
    showScreen("leaderboard");
  });
  document.getElementById("leaderboard-home-button").addEventListener("click", () => showScreen("start"));
  showScreen("start");
}

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
  check("shuffle: 원소를 그대로 두고 원본을 바꾸지 않음", () => {
    const a = [1, 2, 3, 4], b = shuffle(a);
    return b.length === 4 && [...b].sort().join() === "1,2,3,4" && a.join() === "1,2,3,4";
  });
  check("formatScore", () => formatScore(7.5, 10) === "7.5/10" && formatScore(3, 4) === "3/4");
  check("채점: 연습 모드에서 맞히면 1점", () => scoreFor(true, false, "practice") === 1);
  check("채점: 틀리면 0점", () => scoreFor(false, false, "practice") === 0);
  check("스피드 모드 규칙(PRD 5.1항)", () =>
    MODES.speed.timeLimit === 15 && MODES.speed.hintCount === 0 &&
    MODES.speed.leaderboard === true && MODES.speed.retry === false);
  check("힌트 모드 규칙(PRD 5.1항)", () =>
    MODES.hint.timeLimit === 0 && MODES.hint.hintCount === 1 && MODES.hint.hintScore === 0.5 &&
    MODES.hint.leaderboard === true && MODES.hint.retry === false);
  check("채점: 힌트를 쓰고 맞히면 0.5점", () => scoreFor(true, true, "hint") === 0.5);
  check("채점: 힌트를 쓰고 틀리면 0점", () => scoreFor(false, true, "hint") === 0);
  check("힌트: 정답을 빼고 서로 다른 오답 2개", () => {
    const picked = pickHintChoices(["가", "나", "다", "라"], "나");
    return picked.length === 2 && !picked.includes("나") && new Set(picked).size === 2 &&
      picked.every(c => ["가", "다", "라"].includes(c));
  });
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
