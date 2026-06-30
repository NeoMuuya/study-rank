const form = document.querySelector("#studyForm");
const rankingList = document.querySelector("#rankingList");
const historyList = document.querySelector("#historyList");
const emptyState = document.querySelector("#emptyState");
const resetButton = document.querySelector("#resetButton");
const totalHours = document.querySelector("#totalHours");
const memberCount = document.querySelector("#memberCount");
const topScore = document.querySelector("#topScore");
const lastUpdated = document.querySelector("#lastUpdated");
const adminModal = document.querySelector("#adminModal");
const adminForm = document.querySelector("#adminForm");
const adminModalTitle = document.querySelector("#adminModalTitle");
const adminModalDescription = document.querySelector("#adminModalDescription");
const adminCode = document.querySelector("#adminCode");
const adminTimeFields = document.querySelector("#adminTimeFields");
const adminHours = document.querySelector("#adminHours");
const adminMinutes = document.querySelector("#adminMinutes");
const adminError = document.querySelector("#adminError");
const adminCancelButton = document.querySelector("#adminCancelButton");
const adminConfirmButton = document.querySelector("#adminConfirmButton");

let records = [];
let adminAction = null;

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "request-failed");
  }

  return data;
}

async function loadRecords() {
  try {
    const data = await apiRequest("/api/records");
    records = data.records;
    render();
  } catch {
    emptyState.textContent = "共有サーバーに接続できません。サーバーを起動してから開いてください。";
    emptyState.hidden = false;
  }
}

function toStudyHours(hours, minutes) {
  return Number(hours || 0) + Number(minutes || 0) / 60;
}

function formatHours(hours) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes}分`;
  }

  if (minutes === 0) {
    return `${wholeHours}時間`;
  }

  return `${wholeHours}時間${minutes}分`;
}

function getScore(hours) {
  return Math.floor(hours / 10);
}

function openAdminModal(action) {
  adminAction = action;
  adminError.textContent = "";
  adminCode.value = "";

  if (action.type === "edit") {
    const currentWholeHours = Math.floor(action.currentHours);
    const currentMinutes = Math.round((action.currentHours - currentWholeHours) * 60);
    adminModalTitle.textContent = `${action.name}さんの時間を変更`;
    adminModalDescription.textContent = "管理者コードと、新しい合計勉強時間を入力してください。";
    adminTimeFields.hidden = false;
    adminHours.value = currentWholeHours;
    adminMinutes.value = currentMinutes;
    adminConfirmButton.textContent = "変更する";
  } else {
    adminModalTitle.textContent = "すべての記録をリセット";
    adminModalDescription.textContent = "管理者コードを入力すると、すべての記録を削除します。";
    adminTimeFields.hidden = true;
    adminHours.value = "";
    adminMinutes.value = "";
    adminConfirmButton.textContent = "リセット";
  }

  adminModal.hidden = false;
  adminCode.focus();
}

function closeAdminModal() {
  adminModal.hidden = true;
  adminAction = null;
  adminForm.reset();
}

function getRanking() {
  const totals = records.reduce((members, record) => {
    const current = members.get(record.name) ?? {
      name: record.name,
      hours: 0,
      subjects: new Set(),
      latestAt: record.createdAt,
    };

    current.hours += record.hours;
    current.subjects.add(record.subject);
    current.latestAt = record.createdAt > current.latestAt ? record.createdAt : current.latestAt;
    members.set(record.name, current);
    return members;
  }, new Map());

  return [...totals.values()]
    .map((member) => ({
      ...member,
      score: getScore(member.hours),
      subjects: [...member.subjects],
    }))
    .sort((a, b) => b.score - a.score || b.hours - a.hours || a.name.localeCompare(b.name, "ja"));
}

function renderRanking() {
  const ranking = getRanking();
  rankingList.innerHTML = "";
  emptyState.textContent = "まだ記録がありません。最初の勉強時間を入れてみましょう。";
  emptyState.hidden = ranking.length > 0;

  ranking.forEach((member, index) => {
    const item = document.createElement("li");
    const rankNumber = document.createElement("div");
    const details = document.createElement("div");
    const studentName = document.createElement("p");
    const studentMeta = document.createElement("div");
    const scoreBox = document.createElement("div");
    const score = document.createElement("strong");
    const scoreLabel = document.createElement("span");
    const editButton = document.createElement("button");

    item.className = "rank-card";
    rankNumber.className = "rank-number";
    studentName.className = "student-name";
    studentMeta.className = "student-meta";
    scoreBox.className = "score-box";
    editButton.className = "edit-action";
    editButton.type = "button";

    rankNumber.textContent = index + 1;
    studentName.textContent = member.name;
    studentMeta.textContent = `${formatHours(member.hours)} / ${member.subjects.join("・")}`;
    score.textContent = member.score;
    scoreLabel.textContent = "score";
    editButton.textContent = "変更";
    editButton.dataset.studentName = member.name;
    editButton.dataset.currentHours = member.hours;

    details.append(studentName, studentMeta);
    scoreBox.append(score, scoreLabel, editButton);
    item.append(rankNumber, details, scoreBox);
    rankingList.append(item);
  });

  const total = records.reduce((sum, record) => sum + record.hours, 0);
  totalHours.textContent = formatHours(total);
  memberCount.textContent = ranking.length;
  topScore.textContent = ranking[0]?.score ?? 0;
}

function renderHistory() {
  const recentRecords = records.slice(-8).reverse();
  historyList.innerHTML = "";

  recentRecords.forEach((record) => {
    const item = document.createElement("li");
    const summary = document.createElement("span");
    const name = document.createElement("strong");
    const subject = document.createElement("span");
    const date = new Date(record.createdAt);

    name.textContent = record.name;
    if (record.type === "admin-edit") {
      summary.append(name, ` の合計を ${formatHours(record.hours)} に変更`);
    } else {
      summary.append(name, ` が ${formatHours(record.hours)} 記録`);
    }

    subject.className = "subject-pill";
    subject.textContent = record.subject;
    item.append(summary, subject);
    item.title = date.toLocaleString("ja-JP");
    historyList.append(item);
  });

  if (records.length === 0) {
    lastUpdated.textContent = "未更新";
    return;
  }

  const latest = new Date(records.at(-1).createdAt);
  lastUpdated.textContent = latest.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function render() {
  renderRanking();
  renderHistory();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const name = String(data.get("studentName")).trim();
  const hours = toStudyHours(data.get("studyHours"), data.get("studyMinutes"));
  const subject = String(data.get("studySubject"));

  if (!name || hours <= 0) {
    return;
  }

  const result = await apiRequest("/api/records", {
    method: "POST",
    body: JSON.stringify({ name, hours, subject }),
  });

  records = result.records;
  form.reset();
  document.querySelector("#studentName").focus();
  render();
});

rankingList.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-action");

  if (!editButton) {
    return;
  }

  openAdminModal({
    type: "edit",
    name: editButton.dataset.studentName,
    currentHours: Number(editButton.dataset.currentHours),
  });
});

resetButton.addEventListener("click", () => {
  openAdminModal({ type: "reset" });
});

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminError.textContent = "";

  if (!adminAction) {
    return;
  }

  try {
    if (adminAction.type === "reset") {
      const result = await apiRequest("/api/reset", {
        method: "POST",
        body: JSON.stringify({ adminCode: adminCode.value }),
      });
      records = result.records;
      render();
      closeAdminModal();
      return;
    }

    const hours = toStudyHours(adminHours.value, adminMinutes.value);
    const minutes = Number(adminMinutes.value || 0);

    if (!Number.isFinite(hours) || hours < 0 || minutes < 0 || minutes > 59) {
      adminError.textContent = "0以上の時間と、0から59の分を入力してください。";
      return;
    }

    const result = await apiRequest("/api/member", {
      method: "PUT",
      body: JSON.stringify({
        adminCode: adminCode.value,
        name: adminAction.name,
        hours,
      }),
    });

    records = result.records;
    render();
    closeAdminModal();
  } catch (error) {
    adminError.textContent =
      error.message === "admin-code" ? "管理者コードが違います。" : "保存できませんでした。もう一度試してください。";
  }
});

adminCancelButton.addEventListener("click", closeAdminModal);

adminModal.addEventListener("click", (event) => {
  if (event.target === adminModal) {
    closeAdminModal();
  }
});

loadRecords();
