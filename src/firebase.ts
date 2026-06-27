import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjFtAKdoF4yiLp30fagn8feukiXKCvPJA",
  authDomain: "stable-haiku-860cq.firebaseapp.com",
  projectId: "stable-haiku-860cq",
  storageBucket: "stable-haiku-860cq.firebasestorage.app",
  messagingSenderId: "447720280024",
  appId: "1:447720280024:web:17d271486be86f67f8acad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom databaseId and experimental long-polling
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  "ai-studio-studentelectionm-aab9f142-68d1-46b3-b3cd-97ee4f3b44f1"
);

// Initialize Auth
export const auth = getAuth(app);

// Helper function to auto-provision Shiva's administrator account if it doesn't exist yet
export async function ensureAdminAccount() {
  const adminEmail = "Shiva@ewskurnool.com";
  const adminPassword = "Shiva@123";
  
  try {
    // Attempt login
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("Admin logged in successfully.");
  } catch (error: any) {
    // If the account does not exist (user-not-found) or another issue occurs, attempt to register
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
      try {
        await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log("Admin account created successfully.");
      } catch (createError) {
        console.error("Failed to auto-create admin account:", createError);
      }
    } else if (error.code === "auth/operation-not-allowed") {
      console.warn("Firebase Auth Email/Password provider is disabled in Firebase Console. Administrator login will run via client-side security password bypass.");
    } else {
      console.error("Error during admin account auto-login:", error);
    }
  }
}
