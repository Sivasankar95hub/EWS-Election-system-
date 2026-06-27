import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, Mail, Key, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

interface AdminLoginProps {
  onBack: () => void;
  onSuccess: (isBypass: boolean) => void;
}

export default function AdminLogin({ onBack, onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== "shiva@ewskurnool.com") {
      setErrorMessage("Access Denied: Only the authorized administrator account can log in.");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      onSuccess(false);
    } catch (error: any) {
      if (error.code === "auth/operation-not-allowed") {
        console.warn("Email/Password auth is disabled in Firebase console, activating password bypass fallback.");
        // Fallback bypass when Firebase authentication Email/Password is disabled/unconfigured
        if (password === "Shiva@123") {
          onSuccess(true);
        } else {
          setErrorMessage("Invalid password. Please enter the correct password provided by Shiva AI Facilitator.");
        }
      } else {
        console.error("Login error:", error);
        if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
          setErrorMessage("Invalid password. Please enter the correct password provided by Shiva AI Facilitator.");
        } else if (error.code === "auth/user-not-found") {
          setErrorMessage("Admin account not found. Please wait 2 seconds while the system boots and try again.");
        } else {
          setErrorMessage(error.message || "An authentication error occurred. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin_login_container" className="min-h-screen bg-slate-900 flex flex-col justify-between p-6 select-none relative overflow-hidden font-sans">
      
      {/* Decorative ambient background blur vectors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back Button */}
      <div className="max-w-7xl mx-auto w-full text-left z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 hover:border-slate-600 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
          id="exit_login_btn"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit to Voting Terminal</span>
        </button>
      </div>

      {/* LOGIN CARD */}
      <div className="flex-1 flex items-center justify-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-800/85 backdrop-blur-md border border-slate-700/60 rounded-3xl p-8 shadow-2xl"
          id="admin_login_card"
        >
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-6 w-6" />
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white text-center tracking-tight mb-2">
            Administrator Gateway
          </h2>
          <p className="text-xs text-slate-400 text-center mb-8 max-w-xs mx-auto font-medium">
            Authorized admin portal for Edify World School Kurnool election monitors.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="Shiva@ewskurnool.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/60 focus:border-indigo-500 text-slate-200 text-xs rounded-xl outline-none font-semibold transition-all"
                  id="admin_login_email_input"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                Master Security Password
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/60 focus:border-indigo-500 text-slate-200 text-xs rounded-xl outline-none font-semibold transition-all font-mono"
                  id="admin_login_password_input"
                />
              </div>
            </div>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-start gap-2 text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-900/50 p-3 rounded-xl"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              id="submit_login_btn"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Unlock Dashboard</span>
              )}
            </button>
          </form>

          {/* Safe reminder instruction */}
          <div className="mt-6 border-t border-slate-700/50 pt-4 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
              Default Credentials Configured
            </span>
            <span className="text-[9px] text-slate-500 block mt-1 font-semibold">
              Shiva@ewskurnool.com / Shiva@123
            </span>
          </div>

        </motion.div>
      </div>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto w-full text-center text-[10px] text-slate-500 z-10">
        <p className="font-semibold mb-1">
          © 2026 Edify World School, Kurnool
        </p>
        <p className="tracking-wide">
          Designed & Developed by <span className="font-bold text-slate-400">Shiva AI Facilitator</span>
        </p>
      </footer>

    </div>
  );
}
