import { db } from "./services/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function descargarYEjecutarExamen(reset) {
  document.getElementById("loading-text").innerText = "Cargando simulacro...";
  document.getElementById("loading-screen").style.display = "flex";

  try {
    //  leer desde firestore
    const snapshot = await getDocs(
      collection(db, "simulacros", currentExamDef.id, "preguntas"),
    );

    allQuestionsGlobal = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("🔥 Firestore preguntas:", allQuestionsGlobal.length);

    document.getElementById("loading-screen").style.display = "none";

    loadExamEngine(reset);
  } catch (error) {
    document.getElementById("loading-screen").style.display = "none";

    showCustomAlert("Error", "No se pudo cargar el simulacro desde Firestore", [
      { text: "OK", class: "btn-primary", action: () => closeAlert() },
    ]);
    console.log("❌ ERROR FIRESTORE:", error);

    console.error(error);
  }
}

const GK = (n) => `cachimboz_${n}`;

function getPremiumGlobal() {
  const exp = localStorage.getItem(GK("premium_exp"));
  return exp ? new Date(exp) : null;
}
function hasAccess() {
  const p = getPremiumGlobal();
  return p && p.getTime() >= Date.now();
}

// Enlace directo al Paywall
function openSales() {
  localStorage.setItem("prev_course", window.location.href);
  window.location.href = "paywalloficial.html";
}

const TIEMPO_TOTAL_SEGUNDOS = 3 * 60 * 60; // 3 Horas

const CATALOGO_SIMULACROS = [
  {
    periodo: "UNMSM 2026-I",
    id_year: "2026_I",
    url: "https://raw.githubusercontent.com/WilsonCcopa/db-cachimboz/main/simulacro%20UNMSM.json",
    examenes: [
      {
        id: "UNMSM_2026_I_A",
        titulo: "Área A",
        desc: "Ciencias de la salud - Excepto Medicina",
        activo: true,
        icon: "fa-stethoscope",
      },
      {
        id: "UNMSM_2026_I_MH",
        titulo: "Medicina Humana",
        desc: "Escuela Profesional de Medicina Humana",
        activo: true,
        icon: "fa-user-md",
      },
      {
        id: "UNMSM_2026_I_B",
        titulo: "Área B",
        desc: "Ciencias Básicas",
        activo: true,
        icon: "fa-flask",
      },
      {
        id: "UNMSM_2026_I_C",
        titulo: "Área C",
        desc: "Ingenierías",
        activo: true,
        icon: "fa-hard-hat",
      },
      {
        id: "UNMSM_2026_I_D",
        titulo: "Área D",
        desc: "Ciencias Económicas y de la Gestión",
        activo: true,
        icon: "fa-chart-line",
      },
      {
        id: "UNMSM_2026_I_E",
        titulo: "Área E",
        desc: "Humanidades y Ciencias Jurídicas",
        activo: true,
        icon: "fa-balance-scale",
      },
    ],
  },
  {
    periodo: "UNMSM 2025-II",
    id_year: "2025_II",
    url: "https://raw.githubusercontent.com/WilsonCcopa/db-cachimboz/refs/heads/main/UNMSM-2025-II.json",
    examenes: [
      {
        id: "UNMSM_2025_II_A",
        titulo: "Área A",
        desc: "Ciencias de la salud - Excepto Medicina",
        activo: true,
        icon: "fa-stethoscope",
      },
      {
        id: "UNMSM_2025_II_MH",
        titulo: "Medicina Humana",
        desc: "Escuela Profesional de Medicina Humana",
        activo: true,
        icon: "fa-user-md",
      },
      {
        id: "UNMSM_2025_II_B",
        titulo: "Área B",
        desc: "Ciencias Básicas",
        activo: true,
        icon: "fa-flask",
      },
      {
        id: "UNMSM_2025_II_C",
        titulo: "Área C",
        desc: "Ingenierías",
        activo: true,
        icon: "fa-hard-hat",
      },
      {
        id: "UNMSM_2025_II_D",
        titulo: "Área D",
        desc: "Ciencias Económicas y de la Gestión",
        activo: true,
        icon: "fa-chart-line",
      },
      {
        id: "UNMSM_2025_II_E",
        titulo: "Área E",
        desc: "Humanidades y Ciencias Jurídicas",
        activo: true,
        icon: "fa-balance-scale",
      },
    ],
  },
];

let currentActiveGroupIndex = 0;
let allQuestionsGlobal = [];
let examData = [];
let currentExamDef = null;
let currentYearId = null;
let currentExamUrl = null;
let STORAGE_KEY = "";

let currentIndex = 0;
let state = {
  answers: {},
  timeLeft: TIEMPO_TOTAL_SEGUNDOS,
  isFinished: false,
  score: 0,
};
let timerInterval;

function iniciarApp() {
  renderMenuTabs();
}

function renderMenuTabs() {
  const tabsContainer = document.getElementById("period-tabs");
  tabsContainer.innerHTML = "";

  CATALOGO_SIMULACROS.forEach((grupo, index) => {
    const btn = document.createElement("button");
    btn.className = `period-tab ${index === currentActiveGroupIndex ? "active" : ""}`;
    btn.innerHTML = `<i class="fas fa-university" style="margin-right:5px; opacity:0.8;"></i> ${grupo.periodo}`;

    btn.onclick = () => {
      currentActiveGroupIndex = index;
      renderMenuTabs();
    };
    tabsContainer.appendChild(btn);
  });

  renderExamCardsForGroup(CATALOGO_SIMULACROS[currentActiveGroupIndex]);
}

function renderExamCardsForGroup(grupo) {
  const listContainer = document.getElementById("exam-list");
  listContainer.innerHTML = "";

  grupo.examenes.forEach((exam, index) => {
    const isFree = index === 0; // El primero siempre es gratis

    const card = document.createElement("div");
    card.className = `exam-menu-card ${exam.activo ? "" : "disabled"}`;

    // Lógica de íconos: Candado si inactivo, Coronita si es PRO y no tiene acceso, Icono normal si es gratis o es PRO con acceso
    let iconHtml = `<i class="fas fa-lock"></i>`;
    let titleAppend = "";
    if (exam.activo) {
      if (!isFree && !hasAccess()) {
        iconHtml = `<i class="fas fa-crown" style="color:var(--gold);"></i>`;
        titleAppend = `<span style="font-size:10px; background:var(--gold); color:black; padding:2px 6px; border-radius:4px; margin-left:8px;">PRO</span>`;
      } else {
        iconHtml = `<i class="fas ${exam.icon}"></i>`;
        if (isFree)
          titleAppend = `<span style="font-size:10px; background:rgba(16, 185, 129, 0.2); color:var(--success); padding:2px 6px; border-radius:4px; margin-left:8px;">GRATIS</span>`;
      }
    }

    card.innerHTML = `
                    <div>
                        <div class="exam-title">${exam.titulo} ${titleAppend}</div>
                        <div class="exam-desc">${exam.desc}</div>
                    </div>
                    <div class="exam-icon">
                        ${iconHtml}
                    </div>
                `;

    card.onclick = () => {
      if (!exam.activo) {
        showToast("Próximamente disponible 🚀");
        return;
      }
      if (!isFree && !hasAccess()) {
        openSales();
        return;
      }
      intentarAbrirExamen(exam, grupo.url, grupo.id_year);
    };

    listContainer.appendChild(card);
  });
}

function forceUpdateCurrentExamDB() {
  const grupoActual = CATALOGO_SIMULACROS[currentActiveGroupIndex];
  const cacheKey = `Cachimboz_DB_${grupoActual.id_year}`;

  localStorage.removeItem(cacheKey);

  showCustomAlert(
    "¡Caché Limpiado! 🧹",
    `Se ha preparado la sincronización del periodo <b>${grupoActual.periodo}</b>. <br><br>Cuando ingreses a cualquier área, se descargarán las últimas preguntas desde el servidor.<br><br><span style="color:var(--success);"><b>Nota:</b> Tu progreso previo no se borrará.</span>`,
    [{ text: "Entendido", class: "btn-primary", action: () => closeAlert() }],
  );
}

async function intentarAbrirExamen(examDef, jsonUrl, idYear) {
  currentExamDef = examDef;
  currentExamUrl = jsonUrl;
  currentYearId = idYear;
  STORAGE_KEY = `Cachimboz_Estado_${examDef.id}`;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!parsed.isFinished) {
      showCustomAlert(
        "¡Simulacro en Pausa! ⏳",
        "Detectamos que ya habías iniciado este simulacro. ¿Deseas continuar desde donde te quedaste o reiniciarlo desde cero?",
        [
          {
            text: "Continuar",
            class: "btn-primary",
            action: () => {
              closeAlert();
              state = parsed;
              descargarYEjecutarExamen(false);
            },
          },
          {
            text: "Reiniciar",
            class: "btn-secondary",
            action: () => {
              closeAlert();
              showDetailsAndPayModal(true);
            },
          },
        ],
      );
      return;
    } else {
      state = parsed;
      descargarYEjecutarExamen(false);
      return;
    }
  }

  showDetailsAndPayModal(false);
}

function showDetailsAndPayModal(isRestart) {
  let msg = `
                <div style="text-align:left; font-size:14px; color:var(--text-muted); line-height:1.6; background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; border:1px solid var(--border-color);">
                    <p style="margin-bottom:10px;"><i class="fas fa-stopwatch" style="color:var(--primary)"></i> <b>Duración:</b> 3 horas.</p>
                    <p style="margin-bottom:10px;"><i class="fas fa-info-circle" style="color:var(--success)"></i> <b>Detalles:</b> Podrás saltar preguntas, finalizar cuando desees y ver los resultados con resoluciones detalladas al final.</p>
                    <p style="margin-bottom:10px; color:var(--warning); font-size:13px;"><i>Nota: Las preguntas son del examen original adaptadas al formato digital.</i></p>
                    <p style="margin-bottom:0; font-size:13px;">Te recomendamos estar en un lugar tranquilo. Si sales, <b>podrás retomar el examen luego.</b></p>
                </div>
            `;

  showCustomAlert(`Empezar ${currentExamDef.titulo} 🚀`, msg, [
    { text: "Cancelar", class: "btn-secondary", action: () => closeAlert() },
    {
      text: "Empezar Examen",
      class: "btn-primary",
      action: () => {
        closeAlert();
        descargarYEjecutarExamen(true);
      },
    },
  ]);
}

function loadExamEngine(reset) {
  examData = allQuestionsGlobal;

  if (examData.length === 0) {
    showCustomAlert(
      "Área Vacía",
      "Esta área aún está en construcción en la base de datos central.",
      [{ text: "Entendido", class: "btn-primary", action: () => closeAlert() }],
    );
    return;
  }

  document.getElementById("exam-menu-view").style.display = "none";
  document.getElementById("exam-area").style.display = "block";
  document.getElementById("question-view").style.display = "block";
  document.getElementById("results-view").style.display = "none";
  document.getElementById("timer-display").style.display = "flex";

  if (reset) {
    state = {
      answers: {},
      timeLeft: TIEMPO_TOTAL_SEGUNDOS,
      isFinished: false,
      score: 0,
    };
    currentIndex = 0;
  } else {
    if (!state.isFinished) {
      currentIndex = examData.findIndex(
        (q) => state.answers[q.id] === undefined,
      );
      if (currentIndex === -1) currentIndex = 0;
    } else {
      renderResultsScreen(0, 0, 0);
      return;
    }
  }

  document.getElementById("bottom-bar").style.display = "flex";
  saveState();
  renderQuestion(currentIndex);

  if (!state.isFinished) startTimer();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cleanText(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/\\?\[\s*cite\s*:[^\]]*\\?\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatMath(text) {
  if (/[\\_^]/.test(text) && !/(\$|\\\(|\\\[)/.test(text)) {
    const match = text.match(/^([A-E]\) |[A-E]\.)\s*(.+)$/);
    if (match) return `${match[1]} \\( ${match[2]} \\)`;
    else return `\\( ${text} \\)`;
  }
  return text;
}

function resolveContext(q) {
  let ctxText = cleanText(q.contexto);
  let ctxImg = q.contexto_img;

  if (ctxText.startsWith("Depende del")) {
    const match = q.contexto.match(/id ([\w_]+)/);
    if (match && match[1]) {
      const parentQ = allQuestionsGlobal.find((x) => x.id === match[1]);
      if (parentQ) {
        ctxText = cleanText(parentQ.contexto);
        ctxImg = parentQ.contexto_img;
      }
    }
  }
  return { text: ctxText, img: ctxImg };
}

function renderQuestion(index) {
  if (index < 0 || index >= examData.length) return;
  currentIndex = index;
  const q = examData[index];

  document.getElementById("q-course").innerText = `${index + 1}. ${q.curso}`;
  document.getElementById("q-theme").innerText = q.tema;

  const contextData = resolveContext(q);
  const ctxPanel = document.getElementById("context-container");
  const ctxTextElem = document.getElementById("context-text");
  const ctxImgElem = document.getElementById("context-img");

  if (contextData.text || contextData.img) {
    ctxPanel.style.display = "block";
    document.getElementById("context-body").classList.remove("active");
    document.getElementById("context-arrow").innerText = "▼";

    ctxTextElem.innerText = contextData.text;
    if (contextData.img) {
      ctxImgElem.src = contextData.img;
      ctxImgElem.style.display = "block";
    } else {
      ctxImgElem.style.display = "none";
    }
  } else {
    ctxPanel.style.display = "none";
  }

  document.getElementById("q-text").innerText = cleanText(q.pregunta);

  const mathContainer = document.getElementById("q-math");
  if (q.pregunta_b64 && q.pregunta_b64.trim() !== "") {
    mathContainer.style.display = "block";
    mathContainer.innerText = atob(q.pregunta_b64);
  } else {
    mathContainer.style.display = "none";
  }

  const imgContainer = document.getElementById("q-img");
  if (q.pregunta_img) {
    imgContainer.src = q.pregunta_img;
    imgContainer.style.display = "block";
  } else {
    imgContainer.style.display = "none";
  }

  const optsContainer = document.getElementById("options-container");
  optsContainer.innerHTML = "";

  const savedAnswerIndex = state.answers[q.id];

  q.opciones.forEach((optText, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = formatMath(cleanText(optText));

    if (savedAnswerIndex === i) btn.classList.add("selected");
    btn.onclick = () => selectOption(q.id, i);
    optsContainer.appendChild(btn);
  });

  try {
    renderMathInElement(document.getElementById("question-view"), {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  } catch (e) {}

  updateNavigationButtons();
  window.scrollTo(0, 0);
}

function toggleContext() {
  const body = document.getElementById("context-body");
  const arrow = document.getElementById("context-arrow");
  body.classList.toggle("active");
  arrow.innerText = body.classList.contains("active") ? "▲" : "▼";
}

function selectOption(questionId, optIndex) {
  state.answers[questionId] = optIndex;
  saveState();
  renderQuestion(currentIndex);
}

function navQuestion(dir) {
  const newIndex = currentIndex + dir;
  if (newIndex >= 0 && newIndex < examData.length) {
    renderQuestion(newIndex);
  } else if (newIndex === examData.length && !state.isFinished) {
    confirmSubmit();
  }
}

function updateNavigationButtons() {
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  btnPrev.style.visibility = currentIndex === 0 ? "hidden" : "visible";

  if (currentIndex === examData.length - 1 && !state.isFinished) {
    btnNext.innerHTML = "Finalizar <i class='fas fa-check'></i>";
    btnNext.style.backgroundColor = "var(--success)";
  } else {
    btnNext.innerHTML = "Siguiente <i class='fas fa-arrow-right'></i>";
    btnNext.style.backgroundColor = "var(--primary)";
  }
}

function startTimer() {
  const display = document.getElementById("timer-display");
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (state.timeLeft <= 0) {
      clearInterval(timerInterval);
      finishExam();
      return;
    }
    state.timeLeft--;
    if (state.timeLeft % 10 === 0) saveState();

    const h = Math.floor(state.timeLeft / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((state.timeLeft % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (state.timeLeft % 60).toString().padStart(2, "0");

    display.innerHTML = `<i class="fas fa-stopwatch"></i> ${h}:${m}:${s}`;

    if (state.timeLeft < 300) {
      display.style.backgroundColor = "var(--danger-bg)";
      display.style.color = "var(--danger)";
    }
  }, 1000);
}

function openGridModal() {
  let html = `<div class="grid-container">`;
  examData.forEach((q, i) => {
    let classes = "grid-item";
    if (i === currentIndex) classes += " current";
    else if (state.answers[q.id] !== undefined) classes += " answered";

    html += `<div class="${classes}" onclick="jumpTo(${i})">${i + 1}</div>`;
  });
  html += `</div>`;

  showCustomAlert("Navegador de Preguntas", html, [
    { text: "Cerrar", class: "btn-secondary", action: () => closeAlert() },
  ]);
}

function jumpTo(index) {
  closeAlert();
  renderQuestion(index);
}

function confirmSubmit() {
  const answeredCount = Object.keys(state.answers).length;
  const missing = examData.length - answeredCount;

  let msg = `Has respondido ${answeredCount} de ${examData.length} preguntas.`;
  if (missing > 0)
    msg += `<br><br><span style="color:var(--danger)">Te faltan ${missing} preguntas.</span>`;
  msg += `<br><br>¿Estás seguro de finalizar el simulacro?`;

  showCustomAlert("Finalizar Simulacro", msg, [
    { text: "Revisar", class: "btn-secondary", action: () => closeAlert() },
    {
      text: "Sí, finalizar",
      class: "btn-primary",
      action: () => {
        closeAlert();
        finishExam();
      },
    },
  ]);
}

function finishExam() {
  clearInterval(timerInterval);
  state.isFinished = true;

  let correctas = 0;
  let enBlanco = 0;

  examData.forEach((q) => {
    const userAns = state.answers[q.id];
    if (userAns === undefined) {
      enBlanco++;
    } else {
      const cleanedOptions = q.opciones.map((opt) => cleanText(opt));
      const cleanedCorrectAnswer = cleanText(q.respuesta);
      const correctIndex = cleanedOptions.findIndex(
        (opt) => opt === cleanedCorrectAnswer,
      );

      if (userAns === correctIndex) correctas++;
    }
  });

  const incorrectas = examData.length - correctas - enBlanco;
  const puntaje = correctas * 20 - incorrectas * 1.125;
  state.score = Math.max(0, puntaje).toFixed(2);
  saveState();

  renderResultsScreen(correctas, incorrectas, enBlanco);
}

function renderResultsScreen(correctas = 0, incorrectas = 0, enBlanco = 0) {
  if (correctas === 0 && incorrectas === 0 && enBlanco === 0) {
    examData.forEach((q) => {
      const userAns = state.answers[q.id];
      if (userAns === undefined) {
        enBlanco++;
      } else {
        const cleanedOptions = q.opciones.map((opt) => cleanText(opt));
        const correctIndex = cleanedOptions.findIndex(
          (opt) => opt === cleanText(q.respuesta),
        );
        if (userAns === correctIndex) correctas++;
      }
    });
    incorrectas = examData.length - correctas - enBlanco;
  }

  document.getElementById("bottom-bar").style.display = "none";
  document.getElementById("question-view").style.display = "none";
  document.getElementById("timer-display").innerHTML =
    `<i class="fas fa-flag-checkered"></i> Finalizado`;

  const resultsArea = document.getElementById("results-view");
  resultsArea.style.display = "block";

  let html = `
                <div style="text-align:center; padding: 25px 15px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 25px;">
                    <h2 style="color:var(--text-main); margin-bottom:10px;">¡Simulacro Completado!</h2>
                    <div style="font-size:48px; font-weight:900; color:var(--success); line-height:1;">${state.score}</div>
                    <div style="color:var(--text-muted); font-size:14px; margin-top:5px; margin-bottom:15px;">PUNTOS OBTENIDOS</div>
                    <div style="display:flex; justify-content:center; gap:15px; font-size:14px; font-weight:600;">
                        <span style="color:var(--success)">✅ ${correctas}</span>
                        <span style="color:var(--danger)">❌ ${incorrectas}</span>
                        <span style="color:var(--text-muted)">⚪ ${enBlanco}</span>
                    </div>
                </div>
            `;

  examData.forEach((q, index) => {
    const contextData = resolveContext(q);
    const userAns = state.answers[q.id];
    const cleanedOptions = q.opciones.map((opt) => cleanText(opt));
    const correctIndex = cleanedOptions.findIndex(
      (opt) => opt === cleanText(q.respuesta),
    );

    let optionsHtml = "";
    cleanedOptions.forEach((opt, i) => {
      let btnClass = "option-btn";
      if (i === correctIndex) {
        btnClass += " correct";
      } else if (userAns === i && i !== correctIndex) {
        btnClass += " incorrect";
      }
      optionsHtml += `<div class="${btnClass}" style="cursor:default;">${formatMath(opt)}</div>`;
    });

    let contextHtml = "";
    if (contextData.text || contextData.img) {
      contextHtml = `
                        <div class="context-panel" style="display:block; border-color: #2a3142; background: transparent;">
                            <div style="padding: 10px 15px; font-size:13px; color:var(--primary); font-weight:600; border-bottom: 1px solid #2a3142;">CONTEXTO BASE</div>
                            <div style="padding: 15px; font-size:14px; color:var(--text-muted); white-space: pre-line;">
                                <p>${contextData.text}</p>
                                ${contextData.img ? `<img class="responsive-img" src="${contextData.img}">` : ""}
                            </div>
                        </div>
                    `;
    }

    let mathHtml =
      q.pregunta_b64 && q.pregunta_b64.trim() !== ""
        ? `<div class="question-text">${atob(q.pregunta_b64)}</div>`
        : "";
    let imgHtml = q.pregunta_img
      ? `<img class="responsive-img" src="${q.pregunta_img}">`
      : "";
    let resMathHtml = q.resolucion_latex
      ? `<div style="font-size: 14px; margin-bottom: 10px; color: var(--text-main);">${q.resolucion_latex}</div>`
      : "";
    let resImgHtml = q.resolucion_img
      ? `<img class="responsive-img" src="${q.resolucion_img}">`
      : "";

    html += `
                    <div class="question-card">
                        <div class="course-tag">${index + 1}. ${q.curso}</div>
                        <div class="course-tag" style="background:var(--border-color); color:var(--text-muted); margin-left:5px;">${q.tema}</div>
                        
                        ${contextHtml}
                        
                        <div class="question-text" style="white-space: pre-line;">${cleanText(q.pregunta)}</div>
                        ${mathHtml}
                        ${imgHtml}

                        <div class="options-container" style="margin-bottom: 20px;">
                            ${optionsHtml}
                        </div>

                        <div class="resolution-box" style="display:block;">
                            <h4>💡 Resolución:</h4>
                            <div style="font-size: 14px; margin-bottom: 10px; color: var(--text-main); white-space: pre-line;">${cleanText(q.resolucion)}</div>
                            ${resMathHtml}
                            ${resImgHtml}
                        </div>
                    </div>
                `;
  });

  const txtWsp = encodeURIComponent(
    `¡Acabo de sacar ${state.score} puntos en el simulacro de "${currentExamDef.titulo}" usando Cachimboz! 🚀🔥 Prepárate como un pro y a ver si superas mi puntaje.`,
  );
  const urlWsp = "whatsapp://send?text=" + txtWsp;

  html += `
                <button onclick="window.location.href='${urlWsp}'" style="width:100%; padding:16px; background-color:#25D366; color:white; border:none; border-radius:12px; font-size:16px; font-weight:800; cursor:pointer; margin-top:10px; margin-bottom: 15px; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow: 0 4px 12px rgba(37,211,102,0.3);">
                    <i class="fab fa-whatsapp" style="font-size:20px;"></i> Compartir mi puntaje y retar a un amigo
                </button>
                
                <button onclick="window.location.reload()" style="width:100%; padding:16px; background-color:var(--card-bg); color:white; border:2px solid var(--primary); border-radius:12px; font-size:16px; font-weight:700; cursor:pointer; margin-bottom: 40px; display:flex; align-items:center; justify-content:center; gap:10px; transition:0.2s;">
                    <i class="fas fa-home"></i> Volver al Menú Principal
                </button>
            `;

  resultsArea.innerHTML = html;

  try {
    renderMathInElement(resultsArea, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  } catch (e) {}

  window.scrollTo(0, 0);
}

function showCustomAlert(title, contentHTML, buttons) {
  document.getElementById("modal-title").innerHTML = title;
  document.getElementById("modal-text").innerHTML = contentHTML;

  const btnContainer = document.getElementById("modal-buttons");
  btnContainer.innerHTML = "";

  buttons.forEach((btnDef) => {
    const b = document.createElement("button");
    b.className = `btn ${btnDef.class}`;
    b.innerHTML = btnDef.text;
    b.onclick = btnDef.action;
    btnContainer.appendChild(b);
  });

  document.getElementById("custom-modal").classList.add("active");
}

function closeAlert() {
  document.getElementById("custom-modal").classList.remove("active");
}

function showToast(text) {
  const t = document.getElementById("premium-toast");
  document.getElementById("toast-text").innerText = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}

iniciarApp();

Object.assign(window, {
  forceUpdateCurrentExamDB,
  toggleContext,
  navQuestion,
  openGridModal,
  jumpTo,
  closeAlert,
  confirmSubmit,
});
