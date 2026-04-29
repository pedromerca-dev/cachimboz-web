import { db, app } from "../js/firebase.js";



import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc, getDoc,
    serverTimestamp,
    collection, getDocs, deleteDoc

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_EMAIL = "admin@cachimboz.com";
const auth = getAuth(app);

// ================= LOGIN =================

window.login = async () => {

    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        alert("Error login: " + err.message);
    }

};

// ================= LOGOUT =================

window.logout = async () => {
    await signOut(auth);
};


// ================= AUTH STATE =================

onAuthStateChanged(auth, user => {

    if (!user) {
        showLogin();
        return;
    }

    if (user.email !== ADMIN_EMAIL) {
        alert("No eres admin");
        signOut(auth);
        return;
    }

    showPanel(user.email);

});

// ================= UI =================

function showLogin() {

    document.body.innerHTML = `
    <div style="max-width:400px;margin:80px auto;font-family:sans-serif">
      <h2>Admin Login</h2>

      <input id="email" placeholder="Email"
        style="width:100%;padding:10px;margin-bottom:10px"/>

      <input id="password" type="password"
        placeholder="Password"
        style="width:100%;padding:10px;margin-bottom:10px"/>

      <button onclick="login()" style="padding:10px;width:100%">
        Entrar
      </button>
    </div>
  `;
}

function showPanel(email) {

    document.body.innerHTML = `
    <div style="max-width:700px;margin:40px auto;font-family:sans-serif">

      <h2>Panel Admin</h2>
      <p>Logueado como: ${email}</p>

      <button onclick="logout()">Cerrar sesión</button>

      <hr><br>

      <h3>Subir Curso JSON</h3>

      <input type="file" id="file"/><br><br>

      <button id="uploadBtn" onclick="uploadCourse()">Subir</button>

      <p id="status"></p>

      <hr><br>

      <h3>Cursos</h3>

      <div id="courseList">Cargando...</div>

    </div>
  `;

    loadCourses();
}

// ================= UPLOAD =================

window.uploadCourse = async () => {

    const fileInput = document.getElementById("file");
    const btn = document.getElementById("uploadBtn");
    const status = document.getElementById("status")

    if (!fileInput.files.length) {
        alert("Selecciona un archivo");
        return;
    }

    const file = fileInput.files[0];




    try {
        btn.disabled = true;
        btn.innerText = "Subiendo...";
        status.innerText = "Cargando Curso..."

        const text = await file.text();
        const json = JSON.parse(text);

        const name = json.curso || json.nombre || "curso";

        const courseId = slugify(name);
        const ref = doc(db, "courses", courseId);

        const existing = await getDoc(ref);
        const dataToSave = {
            ...json,
            id: courseId,
            UpdateDate: serverTimestamp()
        };


        if (!existing.exists()) {

            dataToSave.CreationDate = serverTimestamp();

            await setDoc(ref, dataToSave);

            status.innerText = `✅ Curso creado: ${name}`;

        } else {

            await setDoc(ref, dataToSave, { merge: true });

            status.innerText = `🔄 Curso actualizado: ${name}`;

        }


        fileInput.value = "";
        loadCourses();



    } catch (err) {

        document.getElementById("status").innerText =
            "❌ Error: " + err.message;

    }
    finally {

        btn.disabled = false;
        btn.innerText = "Subir"
    }

};


function slugify(text) {
    return text
        .toString()
        .normalize("NFD")                 // separar acentos
        .replace(/[\u0300-\u036f]/g, "")  // quitar acentos
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")             // espacios → -
        .replace(/[^\w-]+/g, "")          // quitar caracteres raros
        .replace(/--+/g, "-");            // evitar --
}

async function loadCourses() {

    const container = document.getElementById("courseList");
    container.innerHTML = "Cargando cursos...";

    const snapshot = await getDocs(collection(db, "courses"));

    if (snapshot.empty) {
        container.innerHTML = "No hay cursos";
        return;
    }

    container.innerHTML = "";

    snapshot.forEach(docSnap => {

        const data = docSnap.data();
        const id = docSnap.id;

        const div = document.createElement("div");
        div.style.border = "1px solid #ccc";
        div.style.padding = "10px";
        div.style.marginBottom = "10px";

        div.innerHTML = `
            <b>${data.curso || data.nombre || id}</b><br>
            ID: ${id}<br><br>
            <button onclick="deleteCourse('${id}')">Eliminar</button>
        `;

        container.appendChild(div);
    });

}

window.deleteCourse = async (id) => {

    if (!confirm("¿Eliminar curso?")) return;

    try {

        await deleteDoc(doc(db, "courses", id));

        alert("Curso eliminado");

        loadCourses();

    } catch (err) {

        alert("Error: " + err.message);

    }

};