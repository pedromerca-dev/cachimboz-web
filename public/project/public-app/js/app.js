import { hasAccess, setPremiumGlobal, getPremiumGlobal } from "./storage.js";
import { db } from "./services/firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Base de datos de URLs

const params = new URLSearchParams(window.location.search);
const urlId = params.get("id") || "algebra";

const COURSE_ID = urlId;
const API_URL =
  "https://script.google.com/macros/s/AKfycbzbV7ILE2cRtarBidnOU4X0iY_6ler48hkJuDb4LX00dgsGLKpbPaOwdxHE2bhMqTDAvw/exec";

const GK = (n) => `cachimboz_${n}`;
const CK = (n) => `cachimboz_${n}@${COURSE_ID}`;

let app = {
  data: null,
  flatList: [],
  currentIdx: 0,
  completed: new Set(),
  favorites: new Set(),
  clicks: 0,
  tab: "temario",
  quiz: { q: [], current: 0, score: 0, mode: "premium" },
  quizUsed: {},
};

const COURSE_CACHE_KEY = (id) => `course_cache_${id}`;
const CACHE_TIME = 1000 * 60 * 60;
let usedCache = false;

function setCourseAccess({ email, vencimiento }) {
  if (!vencimiento) return;
  localStorage.setItem(CK("access_email"), email || "");
  localStorage.setItem(CK("access_exp"), vencimiento);
}

document.addEventListener("DOMContentLoaded", async () => {
  loadStorage();

  const id = new URLSearchParams(window.location.search).get("id") || "algebra";
  const cachedRaw = localStorage.getItem(COURSE_CACHE_KEY(id));

  let cachedData = null;

  if (cachedRaw) {
    const parsed = JSON.parse(cachedRaw);
    cachedData = parsed.data;

    applyCourseData(cachedData);
    usedCache = true;

    renderSidebar();
    loadLesson(app.currentIdx, false);
  }

  fetchData().then((freshData) => {
    if (!freshData) return;

    // Si NO hubo cache → render normal
    if (!usedCache) {
      renderSidebar();
      loadLesson(app.currentIdx, false);
      return;
    }

    // Si hubo cache → solo actualizar si cambió
    if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
      renderSidebar();
      loadLesson(app.currentIdx, false);
    }
  });
});

function loadStorage() {
  const comp = localStorage.getItem(CK("comp"));
  if (comp) app.completed = new Set(JSON.parse(comp));
  const favs = localStorage.getItem(CK("favs"));
  if (favs) app.favorites = new Set(JSON.parse(favs));
  const last = localStorage.getItem(CK("last"));
  if (last) app.currentIdx = parseInt(last);
  const qUsed = localStorage.getItem(CK("quiz_usage"));
  if (qUsed) app.quizUsed = JSON.parse(qUsed);
  const clickCount = localStorage.getItem("course_clicks");
  if (clickCount) app.clicks = parseInt(clickCount);
  updateUIState();
}

async function fetchData() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || "algebra";

    const ref = doc(db, "courses", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error("Curso no existe");

    const data = snap.data();

    applyCourseData(data);

    localStorage.setItem(
      COURSE_CACHE_KEY(id),
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );

    return data;
  } catch (e) {
    console.error(e);
  }
}

function renderSidebar() {
  const container = document.getElementById("sidebar-content");
  container.innerHTML = "";
  if (app.tab === "favoritos") {
    renderFavoritesList(container);
    return;
  }
  if (!app.data) return;
  app.data.forEach((tema) => {
    const block = document.createElement("div");
    block.className = "module-block";
    let doneCount = 0;
    const temaVideos = app.flatList.filter((v) => v.tema === tema.titulo);
    temaVideos.forEach((v) => {
      if (app.completed.has(v.globalId)) doneCount++;
    });
    block.innerHTML = `<div class="module-header">${tema.titulo} <span class="module-count">${doneCount}/${tema.videos.length}</span></div>`;
    temaVideos.forEach((vid) => {
      block.appendChild(createLessonItem(vid));
    });
    container.appendChild(block);
  });
}

function createLessonItem(vid) {
  const el = document.createElement("div");
  const isDone = app.completed.has(vid.globalId);
  const isActive = vid.globalId === app.currentIdx;
  const isFav = app.favorites.has(vid.globalId);
  el.className = `lesson-item ${isActive ? "active" : ""} ${isDone ? "completed" : ""}`;
  el.onclick = () => {
    handleVideoClick(vid.globalId);
  };
  el.innerHTML = `<div class="lesson-status"><i class="fas ${isDone ? "fa-check" : "fa-play"}"></i></div><div class="lesson-info"><div class="lesson-title">${vid.titulo}</div><div class="lesson-sub">Lección ${vid.globalId + 1}</div></div>${isFav ? '<i class="fas fa-heart" style="color:var(--favorite); font-size:10px;"></i>' : ""}`;
  return el;
}

function handleVideoClick(idx) {
  const targetVid = app.flatList[idx];
  if (!targetVid) return;
  if (targetVid.tIdx >= 2 && !hasAccess()) {
    if (
      window.innerWidth < 768 &&
      document.getElementById("sidebar").classList.contains("open")
    ) {
      toggleSidebar();
    }
    openSales();
    return;
  }
  loadLesson(idx, true);
  if (window.innerWidth < 768) {
    const sb = document.getElementById("sidebar");
    if (sb.classList.contains("open")) toggleSidebar();
  }
}

function loadLesson(idx, countClick) {
  if (idx < 0 || idx >= app.flatList.length) return;
  app.currentIdx = idx;
  const lesson = app.flatList[idx];
  localStorage.setItem(CK("last"), idx);
  if (!app.completed.has(idx)) {
    app.completed.add(idx);
    localStorage.setItem(CK("comp"), JSON.stringify([...app.completed]));
  }
  document.getElementById("main-player").src =
    `https://www.youtube.com/embed/${lesson.youtube_id}?modestbranding=1&rel=0&showinfo=0`;
  document.getElementById("video-title").textContent = lesson.titulo;
  document.getElementById("module-name").textContent = lesson.tema;
  document.getElementById("lesson-index").textContent = idx + 1;
  updateUIState();
  renderSidebar();
  if (countClick) {
    app.clicks++;
    localStorage.setItem("course_clicks", app.clicks);
    if (app.clicks > 0 && app.clicks % 5 === 0) {
      setTimeout(() => {
        openViral();
      }, 5000);
    }
  }
}

function openViral() {
  document.getElementById("viral-overlay").classList.add("show");
  document.getElementById("viral-modal").classList.add("show");
}
function closeViral() {
  document.getElementById("viral-overlay").classList.remove("show");
  document.getElementById("viral-modal").classList.remove("show");
}
function viralShared() {
  const shareText = "¡Estoy practicando en Cachimboz y el método es brutal! 🚀";
  window.location.href =
    "whatsapp://send?text=" + encodeURIComponent(shareText);
  setTimeout(() => {
    closeViral();
  }, 2000);
}

function updateUIState() {
  const isFav = app.favorites.has(app.currentIdx);
  const isPremium = hasAccess();
  const btn = document.getElementById("current-fav-btn");
  btn.innerHTML = isFav
    ? '<i class="fas fa-heart"></i>'
    : '<i class="far fa-heart"></i>';
  btn.className = `main-fav-btn ${isFav ? "active" : ""}`;
  document.getElementById("header-fav-count").textContent = app.favorites.size;
  document.getElementById("btn-prev").disabled = app.currentIdx === 0;
  document.getElementById("btn-next").disabled =
    app.currentIdx === app.flatList.length - 1;
  document.getElementById("pdf-lock").style.display = isPremium
    ? "none"
    : "flex";
  document.getElementById("header-pro-badge").textContent = isPremium
    ? "PRO"
    : "";
  const quizSub = document.getElementById("quiz-subtitle");
  if (isPremium) {
    quizSub.textContent = "Práctica Intensiva";
    quizSub.style.color = "var(--text-sec)";
  } else {
    if (app.quizUsed[app.currentIdx]) {
      quizSub.textContent = "Desbloquear Todo";
      quizSub.style.color = "var(--danger)";
    } else {
      quizSub.textContent = "2 Preguntas Gratis";
      quizSub.style.color = "var(--success)";
    }
  }
  const currentLesson = app.flatList[app.currentIdx];
  const pdfCard = document.getElementById("pdf-card");
  const actionGrid = document.getElementById("actions-grid");
  if (
    currentLesson &&
    currentLesson.pdf_link &&
    currentLesson.pdf_link.trim() !== ""
  ) {
    pdfCard.style.display = "block";
    actionGrid.classList.remove("single-col");
  } else {
    pdfCard.style.display = "none";
    actionGrid.classList.add("single-col");
  }

  const total = app.flatList.length;
  if (total > 0) {
    const done = app.completed.size;
    const pct = Math.round((done / total) * 100);
    document.getElementById("sidebar-progress-fill").style.width = `${pct}%`;
    document.getElementById("sidebar-progress-text").textContent = `${pct}%`;
  }
}

function toggleCurrentFavorite() {
  if (app.favorites.has(app.currentIdx)) {
    app.favorites.delete(app.currentIdx);
  } else {
    app.favorites.add(app.currentIdx);
  }
  localStorage.setItem(CK("favs"), JSON.stringify([...app.favorites]));
  updateUIState();
  if (app.tab === "favoritos") renderSidebar();
}
function switchTab(t) {
  app.tab = t;
  document.getElementById("tab-temario").className =
    `tab-btn ${t === "temario" ? "active" : ""}`;
  document.getElementById("tab-favoritos").className =
    `tab-btn ${t === "favoritos" ? "active" : ""}`;
  renderSidebar();
}
function nextLesson() {
  handleVideoClick(app.currentIdx + 1);
}
function prevLesson() {
  handleVideoClick(app.currentIdx - 1);
}
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("show");
}
function openFavorites() {
  switchTab("favoritos");
  toggleSidebar();
}
function renderFavoritesList(container) {
  const favs = app.flatList.filter((v) => app.favorites.has(v.globalId));
  if (favs.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; opacity:0.5; margin-top:50px;">No tienes favoritos aún</div>';
    return;
  }
  favs.forEach((vid) => {
    container.appendChild(createLessonItem(vid));
  });
}

function handleTutorClick() {
  if (hasAccess()) {
    window.location.href = "go:pronto";
  } else {
    openSales();
  }
}
function attemptStartQuiz() {
  if (hasAccess()) {
    startQuiz("premium");
  } else {
    if (app.quizUsed[app.currentIdx]) {
      openSales();
    } else {
      startQuiz("free_trial");
    }
  }
}

function startQuiz(mode) {
  const lesson = app.flatList[app.currentIdx];
  if (!lesson.preguntas || lesson.preguntas.length === 0) {
    showToast("No hay preguntas disponibles para este tema.");
    return;
  }
  let pool = [...lesson.preguntas];
  pool.sort(() => Math.random() - 0.5);
  app.quiz.mode = mode;
  app.quiz.q = pool.slice(0, 10);
  app.quiz.current = 0;
  app.quiz.score = 0;
  renderQuizQ();
  document.getElementById("quiz-modal").classList.add("show");
}

function renderQuizQ() {
  const container = document.getElementById("quiz-container");
  const q = app.quiz.q[app.quiz.current];
  const qNum = app.quiz.current + 1;
  let mixedOpts = q.opciones.map((txt, i) => {
    return { txt: txt, originalIdx: i };
  });
  mixedOpts.sort(() => Math.random() - 0.5);

  let html = `<div style="font-size:12px; color:var(--text-sec); margin-bottom:10px;">Pregunta ${qNum} de ${app.quiz.q.length}</div>
    <div class="question-card"><div style="font-size:18px; font-weight:700; line-height:1.4; color:white;">${q.pregunta}</div></div>
    <div style="display:flex; flex-direction:column; gap:8px;">`;

  mixedOpts.forEach((optObj, idx) => {
    html += `<div class="quiz-opt" data-idx="${optObj.originalIdx}" onclick="checkAnswer(this, ${optObj.originalIdx}, ${q.correcta})">
                            <div class="opt-circle">${String.fromCharCode(65 + idx)}</div><div style="font-size:15px; color:white;">${optObj.txt}</div>
                        </div>`;
  });
  html += "</div>";

  if (q.resolucion) {
    html += `<div id="res-box" class="resolution-box" style="display:none;">
                            <strong><i class="fas fa-lightbulb"></i> Resolución:</strong><br>
                            ${q.resolucion}
                         </div>
                         <button id="btn-next-q" class="btn-next-q" onclick="nextQuestionManual()">
                            Siguiente Pregunta <i class="fas fa-arrow-right"></i>
                         </button>`;
  } else {
    html += `<button id="btn-next-q" class="btn-next-q" onclick="nextQuestionManual()">
                            Siguiente Pregunta <i class="fas fa-arrow-right"></i>
                         </button>`;
  }

  container.innerHTML = html;
  if (window.MathJax) {
    MathJax.typesetPromise([container]).then(() => {});
  }
}

function checkAnswer(el, idx, correct) {
  if (el.classList.contains("checked")) return;
  const parent = el.parentElement;
  const opts = parent.querySelectorAll(".quiz-opt");
  opts.forEach((o) => {
    o.classList.add("checked");
    o.onclick = null;
  });

  if (idx === correct) {
    el.classList.add("correct");
    el.querySelector(".opt-circle").innerHTML = '<i class="fas fa-check"></i>';
    app.quiz.score++;
  } else {
    el.classList.add("wrong");
    el.querySelector(".opt-circle").innerHTML = '<i class="fas fa-times"></i>';
    opts.forEach((o) => {
      if (parseInt(o.dataset.idx) === correct) {
        o.classList.add("correct");
        o.querySelector(".opt-circle").innerHTML =
          '<i class="fas fa-check"></i>';
      }
    });
  }

  const resBox = document.getElementById("res-box");
  if (resBox) resBox.style.display = "block";
  const btnNext = document.getElementById("btn-next-q");
  if (btnNext) btnNext.style.display = "block";
}

function nextQuestionManual() {
  if (app.quiz.mode === "free_trial" && app.quiz.current === 1) {
    app.quizUsed[app.currentIdx] = true;
    localStorage.setItem(CK("quiz_usage"), JSON.stringify(app.quizUsed));
    updateUIState();
    closeQuiz();
    openSales();
    return;
  }
  app.quiz.current++;
  if (app.quiz.current < app.quiz.q.length) {
    renderQuizQ();
  } else {
    showQuizResults();
  }
}

function showQuizResults() {
  const container = document.getElementById("quiz-container");
  const percent = Math.round((app.quiz.score / app.quiz.q.length) * 100);
  let rank = "Aspirante";
  let msg = "Sigue intentando";
  let color = "var(--text-sec)";
  let stars = "";

  if (percent === 100) {
    rank = "¡Cómputo General!";
    msg = "Dominio total del tema";
    color = "var(--success)";
    stars = "★★★★★";
  } else if (percent >= 80) {
    rank = "Cachimbo Excelencia";
    msg = "Estás casi listo";
    color = "var(--success)";
    stars = "★★★★☆";
  } else if (percent >= 60) {
    rank = "Postulante Serio";
    msg = "Buen progreso";
    color = "var(--warning)";
    stars = "★★★☆☆";
  } else if (percent >= 40) {
    rank = "Novato";
    msg = "Falta repasar";
    color = "var(--danger)";
    stars = "★★☆☆☆";
  } else {
    rank = "Turista";
    msg = "Necesitas ver el video";
    color = "var(--danger)";
    stars = "★☆☆☆☆";
  }

  container.innerHTML = `
    <div class="result-card">
        <div style="margin-top:20px; margin-bottom:10px;"><i class="fas fa-crown" style="font-size:60px; color:${color}; margin-bottom:15px; filter:drop-shadow(0 0 10px ${color})"></i></div>
        <span class="rank-badge" style="color:${color}; border-color:${color};">${rank}</span>
        <div class="score-big">${percent}%</div>
        <div class="stars-row">${stars}</div>
        <p style="opacity:0.8; font-size:15px; margin-bottom:30px; color:#ddd;">Respondiste correctamente <b>${app.quiz.score}</b> de <b>${app.quiz.q.length}</b> preguntas. <br>${msg}</p>
        <button class="nav-btn" onclick="startQuiz('premium')" style="width:100%; background:var(--surface); border:2px solid var(--primary); color:white; margin-bottom:12px; border-radius:var(--radius-btn);"><i class="fas fa-redo"></i> Intentar de nuevo</button>
        <button class="nav-btn" onclick="closeQuiz()" style="width:100%; background:var(--gradient-btn); border-radius:var(--radius-btn);">Finalizar Práctica</button>
    </div>`;
}

function downloadTopicPDF() {
  if (!hasAccess()) {
    openSales();
    return;
  }
  const lesson = app.flatList[app.currentIdx];
  const topic = app.data[lesson.tIdx];

  if (topic && topic.pdf_resuelto && topic.pdf_resuelto.trim() !== "") {
    window.open(topic.pdf_resuelto, "_blank");
  } else {
    showToast("PDF no disponible para este tema");
  }
}

function openPDF() {
  if (!hasAccess()) {
    openSales();
    return;
  }
  const link = app.flatList[app.currentIdx].pdf_link;
  if (link) window.open(link, "_blank");
}
function openSales() {
  document.getElementById("sales-overlay").classList.add("show");
  document.getElementById("sales-modal").classList.add("show");
}
function closeSales() {
  document.getElementById("sales-overlay").classList.remove("show");
  document.getElementById("sales-modal").classList.remove("show");
}
function toggleVerify() {
  const box = document.getElementById("verify-box");
  box.style.display = box.style.display === "none" ? "block" : "none";
}

async function verifySub() {
  const email = document.getElementById("v-email").value.trim().toLowerCase();
  const msg = document.getElementById("v-msg");
  const btn = document.getElementById("btn-verify-action");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.style.color = "var(--danger)";
    msg.textContent = "Ingresa un correo válido.";
    return;
  }
  msg.style.color = "var(--text-sec)";
  msg.textContent = "Verificando...";
  btn.disabled = true;
  try {
    const url = `${API_URL}?email=${encodeURIComponent(email)}&course=${encodeURIComponent(COURSE_ID)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error de red");
    const data = await res.json();
    const end = data.end || data.exp || data.vencimiento || "";
    const plan = Array.isArray(data.plan) ? data.plan : [];
    const reason = data.reason || "";
    const access = !!data.access;
    if (access && (reason === "pro" || plan.includes("PRO_PLAN"))) {
      setPremiumGlobal({
        email,
        plan,
        start: data.start || "",
        vencimiento: end,
      });
      msg.style.color = "var(--success)";
      msg.textContent = "¡PRO activo en todos los cursos!";
      successAction();
    } else if (access) {
      setCourseAccess({ email, vencimiento: end });
      msg.style.color = "var(--success)";
      msg.textContent = "¡Acceso a Álgebra activado!";
      successAction();
    } else {
      msg.style.color = "var(--danger)";
      if (Array.isArray(plan) && plan.length > 0) {
        const other = plan.join(", ");
        msg.innerHTML = `Tienes activo: ${other}. <br> Verifica en ese curso.`;
      } else if (reason === "expired") {
        msg.textContent = "Tu suscripción ha vencido.";
      } else if (reason === "beforeStart") {
        msg.textContent = "Tu acceso aún no inicia.";
      } else {
        msg.textContent = "No tienes suscripción activa.";
      }
    }
  } catch (e) {
    console.error(e);
    msg.style.color = "var(--danger)";
    msg.textContent = "Error de conexión";
  } finally {
    btn.disabled = false;
  }
}

function successAction() {
  setTimeout(() => {
    updateUIState();
    closeSales();
    showToast("¡Bienvenido Premium! Todo desbloqueado.");
  }, 1000);
}
function closeQuiz() {
  document.getElementById("quiz-modal").classList.remove("show");
}
function showToast(text) {
  const t = document.getElementById("premium-toast");
  document.getElementById("toast-text").innerText = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 4000);
}

function applyCourseData(data) {
  document.title = "Cachimboz - " + data.curso;

  const titleDisplay = document.getElementById("course-title-display");
  if (titleDisplay) titleDisplay.textContent = data.curso;

  const sidebarTitle = document.getElementById("sidebar-course-name");
  if (sidebarTitle) sidebarTitle.textContent = data.curso;

  app.data = data.temas;

  let globalIndex = 0;
  app.flatList = [];

  app.data.forEach((tema, tIdx) => {
    const preguntasTema = tema.preguntas || [];

    tema.videos.forEach((vid, vIdx) => {
      const preguntasFinales =
        vid.preguntas && vid.preguntas.length > 0
          ? vid.preguntas
          : preguntasTema;

      app.flatList.push({
        ...vid,
        tema: tema.titulo,
        preguntas: preguntasFinales,
        globalId: globalIndex,
        tIdx,
        vIdx,
      });

      globalIndex++;
    });
  });
}

Object.assign(window, {
  checkAnswer,
  nextQuestionManual,
  startQuiz,
  closeQuiz,
  toggleSidebar,
  switchTab,
  viralShared,
  closeViral,
  handleTutorClick,
  openFavorites,
  toggleCurrentFavorite,
  attemptStartQuiz,
  openPDF,
  prevLesson,
  nextLesson,
  closeSales,
  toggleVerify,
  verifySub,
  viralShared,
  closeViral,
  downloadTopicPDF,
});
