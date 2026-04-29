//-------------IMPORTS firebase----------------/
import { db } from "./services/firebase.js";
import {
  collection,
  getDocs,
  query,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

//-------------------------//
import { getLastCourse, saveLastCourseStorage } from "./storage.js";
//import "./uploadSimulacro.js";

let ALL_COURSES = [];

//-------------firebase----------------/
async function loadCourses() {
  try {
    const q = query(collection(db, "courses"));

    const snapshot = await getDocs(q);

    ALL_COURSES = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.curso,
        icon: data.icon || getCourseIcon(data.curso),
        link: `clase.html?id=${doc.id}`,
      };
    });
  } catch (error) {
    console.error("🔥 ERROR FIREBASE:", error);
  }
}
//---------------------------///

// Estado simplificado (Directo al Home)
let appState = {
  currentView: "home", // FORZADO AL HOME
  formData: {
    Nombre: "Cachimbo",
  }, // Nombre por defecto si no hay registro
  userSelection: {
    university: "UNSAAC",
    area: "ingenieria",
  }, // Valores por defecto
};

async function initApp() {
  // Intentar recuperar datos guardados si existen
  const savedData = localStorage.getItem("formData");
  if (savedData) appState.formData = JSON.parse(savedData);
  await loadCourses();

  renderHome();
}

function renderHome() {
  const userName = appState.formData.Nombre.split(" ")[0];
  const streak = calculateStreak();

  document.getElementById("app").innerHTML = `
    <div class="max-w-7xl mx-auto p-6 sm:p-8">
        <div class="space-y-6 sm:space-y-8">

            <header class="flex justify-between items-center gap-4">
                <div class="flex-1">
                    <p class="text-slate-300">¡Hola de nuevo!</p>
                    <h1 class="text-3xl sm:text-4xl font-extrabold text-white">${userName}</h1>
                </div>
                <div class="flex items-center gap-2 text-right">
                    <div>
                        <div class="font-bold text-lg sm:text-xl text-white">${streak} Días</div>
                        <div class="text-xs text-amber-300 font-medium">Racha Activa</div>
                    </div>
                    <span class="text-3xl sm:text-4xl">🔥</span>
                </div>
            </header>

            <section id="continue-section">
                <div class="bg-gradient-to-r from-cachimboz-mid to-cachimboz-light p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full"></div>
                    <p class="text-sm font-medium opacity-80 uppercase tracking-wider">Continuar Curso</p>
                    <h2 id="last-course-name" class="text-3xl font-bold mt-2 mb-4">Selecciona un curso</h2>
                    <a id="last-course-link" href="#" class="inline-block mt-4 font-semibold text-sm bg-white text-cachimboz-mid hover:bg-slate-100 px-5 py-2.5 rounded-lg transition-colors shadow">
                        Ir a la lección →
                    </a>
                </div>
               <a href="./simulacros.html"
                class="flex items-center justify-center gap-3 bg-white text-cachimboz-mid
                px-5 py-4 rounded-full font-semibold w-full mt-4 shadow
                hover:bg-slate-100 transition">
                <span class="flex items-center justify-center w-7 h-7 border-2 border-purple-800 rounded-full text-sm">
                ⏱
                </span>

         Comenzar simulacros
    </a>
            </section>

            <section>
                <h3 class="text-xl font-bold text-white mb-4">Cursos completos</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                    ${ALL_COURSES.map(
                      (course) => `
                                    <a href="${course.link}" class="bg-black/20 p-4 rounded-2xl shadow-sm hover:bg-black/30 transition-all group backdrop-blur-sm course-link" data-name="${course.name}" data-link="${course.link}">
                                        <div class="w-12 h-12 bg-cachimboz-light/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-cachimboz-light/30 transition-colors">
                                            <span class="text-2xl">${course.icon}</span>
                                        </div>
                                        <h4 class="font-bold text-white text-lg">${course.name}</h4>
                                        <span class="text-xs font-semibold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">Disponible</span>
                                    </a>
                                `,
                    ).join("")}
                </div>
            </section>

            <div class="h-16"></div>
        </div>
    </div>
    `;
  document.querySelectorAll(".course-link").forEach((el) => {
    el.addEventListener("click", () => {
      const name = el.dataset.name;
      const link = el.dataset.link;

      saveLastCourseStorage(name, link);
    });
  });
  loadLastCourse();
}

function calculateStreak() {
  // Lógica simple de racha
  return localStorage.getItem("streak") || 1;
}

function loadLastCourse() {
  const last = getLastCourse();

  const nameEl = document.getElementById("last-course-name");
  const linkEl = document.getElementById("last-course-link");
  const section = document.getElementById("continue-section");

  console.log("LAST:", last); // DEBUG

  if (!nameEl || !linkEl || !section) {
    console.warn("elements not found");
    return;
  }

  // 🔥 SI NO HAY DATA → ocultar
  if (!last) {
    section.style.display = "block";

    nameEl.textContent = "Empieza un curso";
    linkEl.href = "#";
    linkEl.textContent = "Explorar cursos ↓";
    return;
  }

  // 🔥 SI HAY DATA → SIEMPRE mostrar
  section.style.display = "block";

  nameEl.textContent = last.name || "Curso";
  linkEl.href = last.link || "#";
  linkEl.textContent = `Continuar ${last.name || ""} →`;
}

document.addEventListener("DOMContentLoaded", initApp);

function getCourseIcon(name) {
  if (!name) return "📘";
  const n = name.toLowerCase();

  if (n.includes("arit")) return "🧮";
  if (n.includes("alge")) return "📐";
  if (n.includes("leng")) return "✍️";
  if (n.includes("fis")) return "⚛️";
  if (n.includes("quim")) return "🧪";
  if (n.includes("geo")) return "🌍";
  if (n.includes("hist")) return "📜";
  if (n.includes("eco")) return "📊";
  if (n.includes("bio")) return "🧬";
  if (n.includes("civ")) return "🏛️";
  if (n.includes("psi")) return "🧠";
  if (n.includes("fil")) return "🤔";

  return "📘";
}
