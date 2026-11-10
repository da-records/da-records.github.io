import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyB8wG5a8VFnssv9DPCexnY28grUJYTx5hw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "records-f9ca9.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "records-f9ca9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "records-f9ca9.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "847227109296",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:847227109296:web:e1e040a5e67bf1bc8c6075",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-BT65862C7J",
};

export const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function initializeAnalytics() {
  if (typeof window === "undefined") return;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) getAnalytics(app);
}