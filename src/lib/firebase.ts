import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import autoConfig from '../../firebase-applet-config.json';

// Permite usar as credenciais próprias via variáveis de ambiente (Vite - Settings > Secrets)
const customConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AQ.Ab8RN6LAvYZBO43T6MCAlo6r2jHbDsS63t_zOugRe41ztoJJIg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "637642955718",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Usa a configuração customizada se informada, senão usa a estruturada pelo AI Studio como fallback
const firebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY ? customConfig : autoConfig;

// === VÍNCULO EXPLÍCITO AO PROJETO REQUERIDO: 637642955718 ===
firebaseConfig.projectId = "637642955718";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Use signInWithPopup para funcionar no iframe com segurança
export const loginWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = () => signOut(auth);
