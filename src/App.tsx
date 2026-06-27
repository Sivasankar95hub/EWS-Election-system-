import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, ensureAdminAccount } from "./firebase";
import { 
  seedInitialDataIfEmpty, 
  listenSettings, 
  listenCandidates, 
  listenVoters, 
  listenActivityFeed 
} from "./firebaseHelpers";
import { ElectionSettings, Voter, Candidate, LiveActivityLog } from "./types";

// Component imports
import VotingTerminal from "./components/VotingTerminal";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activityLogs, setActivityLogs] = useState<LiveActivityLog[]>([]);
  
  // Navigation: "kiosk" | "login" | "admin"
  const [currentView, setCurrentView] = useState<"kiosk" | "login" | "admin">("kiosk");
  const [isSystemLoading, setIsSystemLoading] = useState(true);
  const [isBypassActive, setIsBypassActive] = useState(false);

  // 1. Initial Seeding and Shiva's account registration on app mount
  useEffect(() => {
    async function initializeSystem() {
      try {
        // Auto-seed Shiva's admin account in Firebase Authentication if it doesn't exist
        await ensureAdminAccount();
        // Seed default Firestore database records (settings, candidates, voters)
        await seedInitialDataIfEmpty();
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsSystemLoading(false);
      }
    }
    initializeSystem();
  }, []);

  // 2. Real-Time Listeners (Core Synchronization engine)
  useEffect(() => {
    // Listen to Election settings
    const unsubSettings = listenSettings((settingsData) => {
      setSettings(settingsData);
    });

    // Listen to Ballot Candidates
    const unsubCandidates = listenCandidates((candidatesData) => {
      setCandidates(candidatesData);
    });

    // Listen to Student Voters Registry
    const unsubVoters = listenVoters((votersData) => {
      setVoters(votersData);
    });

    // Listen to Live Activity logs feed ticker
    const unsubLogs = listenActivityFeed((logsData) => {
      setActivityLogs(logsData);
    });

    // Cleanup listeners on unmount
    return () => {
      unsubSettings();
      unsubCandidates();
      unsubVoters();
      unsubLogs();
    };
  }, []);

  // 3. Listen to Firebase Auth state shifts
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (authUser && authUser.email?.toLowerCase() === "shiva@ewskurnool.com") {
        setCurrentView("admin");
        setIsBypassActive(false);
      } else if (!isBypassActive) {
        // If logged out and bypass is not active, return to kiosk view
        setCurrentView("kiosk");
      }
    });

    return () => unsubAuth();
  }, [isBypassActive]);

  // Loading Screen while bootstrapping
  if (isSystemLoading || !settings) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-center p-6 text-white font-sans">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Edify Student Election System</h2>
        <p className="text-xs text-slate-400 max-w-xs font-semibold uppercase tracking-widest">
          Bootstrapping master database and verifying security rules...
        </p>
      </div>
    );
  }

  // View Router
  return (
    <>
      {currentView === "login" && (
        <AdminLogin 
          onBack={() => setCurrentView("kiosk")} 
          onSuccess={(isBypass) => {
            if (isBypass) {
              setIsBypassActive(true);
            }
            setCurrentView("admin");
          }} 
        />
      )}

      {currentView === "admin" && (user || isBypassActive) && (
        <AdminDashboard 
          settings={settings}
          voters={voters}
          candidates={candidates}
          activityLogs={activityLogs}
          isBypassActive={isBypassActive}
          onLogout={() => {
            setIsBypassActive(false);
            setCurrentView("kiosk");
          }}
        />
      )}

      {currentView === "kiosk" && (
        <VotingTerminal 
          settings={settings}
          voters={voters}
          candidates={candidates}
          onOpenAdminLogin={() => setCurrentView("login")}
        />
      )}
    </>
  );
}
