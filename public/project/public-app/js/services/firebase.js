import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    initializeFirestore,
    persistentLocalCache,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
}
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getFunctions,
    httpsCallable
}
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";




const firebaseConfig = {
    apiKey: "AIzaSyCvNlUGP2nLPuOXln7azBBUEA8yaED7X-k",
    authDomain: "cachimboz-pro.firebaseapp.com",
    projectId: "cachimboz-pro",
    storageBucket: "cachimboz-pro.firebasestorage.app",
    messagingSenderId: "1071545177311",
    appId: "1:1071545177311:web:078e3a588c63593886456a",
};

export const app = initializeApp(firebaseConfig);


export const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

export const functions = getFunctions(app, "us-central1");

export const verifyEmail = httpsCallable(functions, "verifyEmail");

export const auth = getAuth(app);

export { doc, getDoc, updateDoc, arrayUnion, arrayRemove };