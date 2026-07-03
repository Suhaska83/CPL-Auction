import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string
};

export const isFirebaseConfigured =
  !!config.apiKey && !!config.databaseURL && !!config.projectId;

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

function initIfNeeded() {
  if (!isFirebaseConfigured) return;
  if (!_app) {
    _app = initializeApp(config);
    _db = getDatabase(_app);
  }
}
initIfNeeded();

export function getFirebase() {
  initIfNeeded();
  if (!_app || !_db) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env.local and fill in values from the Firebase console."
    );
  }
  return { app: _app, db: _db, auth: getAuth(_app) };
}

export async function signInWithGoogle(): Promise<User> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOut() {
  const { auth } = getFirebase();
  await fbSignOut(auth);
}

export function onAuth(cb: (u: User | null) => void) {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, cb);
}
