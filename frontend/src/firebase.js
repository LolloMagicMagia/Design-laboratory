// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAZ3pr2Jb_M2ShCH4J43qYCDeECTxJoiGs",
    authDomain: "bico-chat.firebaseapp.com",
    databaseURL: "https://bico-chat-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "bico-chat",
    storageBucket: "bico-chat.appspot.com",
    messagingSenderId: "1029508691382",
    appId: "1:1029508691382:web:7aa602f64f361e9fd3fd17",
    measurementId: "G-2BX1Z1B7X5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup };
