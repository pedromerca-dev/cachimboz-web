import { db } from "./services/firebase.js";
import {
  doc,
  setDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Error cargando ${path}: ${res.status}`);
  const data = await res.json();
  console.log("✅ JSON cargado:", path, data.length);
  return data;
}

// 🔥 separar A / B automáticamente
function agruparPorSimulacro(data) {
  const grupos = {};

  for (const pregunta of data) {
    const parts = pregunta.id.split("_");

    // UNMSM_2025_II_A
    const simId = parts.slice(0, 4).join("_");

    if (!grupos[simId]) {
      grupos[simId] = [];
    }

    grupos[simId].push(pregunta);
  }

  return grupos;
}

async function subirSimulacro(simId, preguntas, meta) {
  console.log(`🚀 Subiendo ${simId}`);

  // 📄 crear documento padre
  await setDoc(doc(db, "simulacros", simId), {
    nombre: simId,
    universidad: "UNMSM",
    anio: meta.anio,
    periodo: meta.periodo,
    total_preguntas: preguntas.length,
    createdAt: new Date(),
  });

  // ⚡ subir preguntas en paralelo
  const promises = preguntas.map((pregunta) => {
    const ref = doc(
      collection(db, "simulacros", simId, "preguntas"),
      pregunta.id,
    );

    const { id, ...rest } = pregunta;

    return setDoc(ref, rest);
  });

  await Promise.all(promises);

  console.log(`✅ ${simId} subido (${preguntas.length} preguntas)`);
}

async function uploadAll() {
  try {
    const data2025 = await loadJSON(
      "/public/project/public-app/js/data/UNMSM-2025-II.json",
    );
    const data2026 = await loadJSON(
      "/public/project/public-app/js/data/UNMSM-2026-I.json",
    );

    // 🔥 agrupar por A / B
    const grupos2025 = agruparPorSimulacro(data2025);
    const grupos2026 = agruparPorSimulacro(data2026);

    // 🔥 unir todo
    const todos = [
      ...Object.entries(grupos2025).map(([id, preguntas]) => ({
        id,
        preguntas,
        anio: 2025,
        periodo: "II",
      })),
      ...Object.entries(grupos2026).map(([id, preguntas]) => ({
        id,
        preguntas,
        anio: 2026,
        periodo: "I",
      })),
    ];

    // ⚡ subir todos los simulacros en paralelo
    await Promise.all(
      todos.map((sim) =>
        subirSimulacro(sim.id, sim.preguntas, {
          anio: sim.anio,
          periodo: sim.periodo,
        }),
      ),
    );

    console.log("🔥 TODOS LOS SIMULACROS SUBIDOS");
  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

uploadAll();
