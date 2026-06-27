import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  RotateCcw, 
  AlertCircle, 
  Maximize, 
  Minimize, 
  BookOpen, 
  ShieldCheck,
  Flame,
  Volume2,
  RefreshCw
} from "lucide-react";
import { Voter, Candidate, Position, ElectionSettings } from "../types";
import { castBallot, updateVoter } from "../firebaseHelpers";
import { getSymbolIcon, getSymbolColor } from "./Symbols";
import { CandidatePhoto } from "./CandidatePhoto";
import confetti from "canvas-confetti";

interface VotingTerminalProps {
  settings: ElectionSettings;
  voters: Voter[];
  candidates: Candidate[];
  onOpenAdminLogin: () => void;
}

export default function VotingTerminal({
  settings,
  voters,
  candidates,
  onOpenAdminLogin
}: VotingTerminalProps) {
  // State
  const [step, setStep] = useState<"welcome" | "verify" | "voting" | "success">("welcome");
  const [admissionInput, setAdmissionInput] = useState("");
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [activePositionIndex, setActivePositionIndex] = useState(0);
  const [ballotChoices, setBallotChoices] = useState<Record<string, string>>({}); // positionId -> candidateId
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  // EVM feedback states
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);
  const [busyLedActive, setBusyLedActive] = useState(false);

  // Keyboard Shortcuts HUD Toast
  const [hudToast, setHudToast] = useState<{ message: string; type: "refresh" | "login" } | null>(null);

  // Student Lookup States (Grade, Section, Roll No)
  const [lookupGrade, setLookupGrade] = useState("");
  const [lookupSection, setLookupSection] = useState("");
  const [lookupRollNo, setLookupRollNo] = useState("");

  // Dynamically extract actual grades and sections present in settings AND voters
  const availableGrades = useMemo(() => {
    const voterGrades = Array.from(new Set(voters.map((v) => v.grade.trim())))
      .filter(Boolean);
    const combined = Array.from(new Set([...voterGrades, ...(settings.grades || [])]))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    return combined;
  }, [voters, settings.grades]);

  const availableSections = useMemo(() => {
    const voterSections = Array.from(new Set(voters.map((v) => v.section.trim())))
      .filter(Boolean);
    const combined = Array.from(new Set([...voterSections, ...(settings.sections || [])]))
      .sort();
    return combined;
  }, [voters, settings.sections]);

  // Set default lookup grade and section when settings/voters are loaded
  useEffect(() => {
    if (availableGrades.length > 0 && !lookupGrade) {
      setLookupGrade(availableGrades[0]);
    }
    if (availableSections.length > 0 && !lookupSection) {
      setLookupSection(availableSections[0]);
    }
  }, [availableGrades, availableSections, lookupGrade, lookupSection]);

  const [editGrade, setEditGrade] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editRollNo, setEditRollNo] = useState("");
  const [isUpdatingVoter, setIsUpdatingVoter] = useState(false);

  useEffect(() => {
    if (selectedVoter) {
      setEditGrade(selectedVoter.grade || "");
      setEditSection(selectedVoter.section || "");
      setEditRollNo(selectedVoter.rollNo || "");
    } else {
      setEditGrade("");
      setEditSection("");
      setEditRollNo("");
    }
  }, [selectedVoter]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Callback refs to ensure keydown listener always has fresh callbacks
  const refreshCallbackRef = useRef<() => void>();
  const adminLoginCallbackRef = useRef<() => void>();

  // Filter positions that actually have candidates
  const activePositions = settings.positions.filter((pos) =>
    candidates.some((cand) => cand.positionId === pos.id)
  );

  const triggerVoterListRefresh = useCallback(() => {
    // Reset all terminal steps and states
    setAdmissionInput("");
    setLookupRollNo("");
    setSelectedVoter(null);
    setBallotChoices({});
    setActivePositionIndex(0);
    setStep("welcome");
    setErrorMessage("");
    
    // Auto-focus back onto input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 80);

    // Show celebratory/informational HUD toast
    setHudToast({
      message: `Voter registry synchronized! Terminal is ready for the next student (${voters.length} registered).`,
      type: "refresh"
    });

    const timer = setTimeout(() => {
      setHudToast(null);
    }, 3200);

    return () => clearTimeout(timer);
  }, [voters.length]);

  useEffect(() => {
    refreshCallbackRef.current = triggerVoterListRefresh;
  }, [triggerVoterListRefresh]);

  useEffect(() => {
    adminLoginCallbackRef.current = () => {
      setHudToast({
        message: "Redirecting to Admin Login portal...",
        type: "login"
      });
      setTimeout(() => {
        setHudToast(null);
        onOpenAdminLogin();
      }, 600);
    };
  }, [onOpenAdminLogin]);

  // Lock down developer controls, right-click, and handle Admin Kiosk Hotkeys
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Admin Login shortcuts: Alt+A, Alt+L
      if (
        (e.altKey && (e.key === "a" || e.key === "A")) ||
        (e.altKey && (e.key === "l" || e.key === "L"))
      ) {
        e.preventDefault();
        if (adminLoginCallbackRef.current) {
          adminLoginCallbackRef.current();
        }
        return;
      }

      // 2. Voter List Refresh shortcuts: Alt+R
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        if (refreshCallbackRef.current) {
          refreshCallbackRef.current();
        }
        return;
      }

      // Disable F5, Ctrl+R, F11, F12, Ctrl+Shift+I
      if (
        e.key === "F5" || 
        (e.ctrlKey && e.key === "r") || 
        e.key === "F12" || 
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "i") ||
        (e.metaKey && e.key === "r")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync fullscreen state
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Success countdown timer
  useEffect(() => {
    let timer: any;
    if (step === "success") {
      // Trigger voice TTS with personalization
      try {
        const voterGreetingName = selectedVoter?.name ? selectedVoter.name : "Student";
        const utterance = new SpeechSynthesisUtterance(
          `Thank you, ${voterGreetingName}, for voting. Your vote has been successfully recorded.`
        );
        utterance.rate = 0.95; // Slightly slower, very friendly and professional cadence
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("Speech Synthesis not supported or blocked by browser:", e);
      }

      // Trigger canvas-confetti bursts for instant positive feedback and delight
      try {
        // Main central burst
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6"]
        });

        // Left side celebratory burst
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.8 },
            colors: ["#6366f1", "#10b981", "#3b82f6"]
          });
        }, 200);

        // Right side celebratory burst
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.8 },
            colors: ["#6366f1", "#10b981", "#3b82f6"]
          });
        }, 350);
      } catch (err) {
        console.error("Confetti trigger failed:", err);
      }

      setConfettiParticles([]);

      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            resetTerminal();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  // Reset helper
  const resetTerminal = () => {
    setStep("welcome");
    setAdmissionInput("");
    setLookupRollNo("");
    setSelectedVoter(null);
    setActivePositionIndex(0);
    setBallotChoices({});
    setErrorMessage("");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Physical EVM machine high-fidelity Beep sound generator using Web Audio API
  const playEvmBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(950, audioCtx.currentTime); // Realistic EVM 950Hz tone
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      // Physical EVM beep is exactly 1.0 second long
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 1000);
    } catch (e) {
      console.warn("Audio Context beep failed to play:", e);
    }
  };

  // Helper to directly transition to voting without intermediate verify screen
  const selectVoterAndStartVoting = (voter: Voter) => {
    if (voter.hasVoted) {
      setErrorMessage("This student has already voted. Each student is permitted to vote only once.");
      return;
    }
    if (activePositions.length === 0) {
      setErrorMessage("No active election offices or candidates are configured at this moment.");
      return;
    }
    setSelectedVoter(voter);
    setBallotChoices({});
    setActivePositionIndex(0);
    setStep("voting");
  };

  // Handle voter lookup (Support Grade, Section, and Roll Number)
  const handleProceedLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const rollTrim = lookupRollNo.trim();
    if (!rollTrim) {
      setErrorMessage("Please enter a roll number.");
      return;
    }

    // Match voter in database by Grade, Section, and Roll Number
    const matches = voters.filter((v) => {
      const gMatch = v.grade.toLowerCase() === lookupGrade.toLowerCase();
      const sMatch = v.section.toLowerCase() === lookupSection.toLowerCase();
      
      const vRollInt = parseInt(v.rollNo, 10);
      const inputRollInt = parseInt(rollTrim, 10);
      const rMatch = v.rollNo.trim() === rollTrim || (!isNaN(vRollInt) && !isNaN(inputRollInt) && vRollInt === inputRollInt);
      
      return gMatch && sMatch && rMatch;
    });

    if (matches.length === 0) {
      setErrorMessage(`No student found for Grade ${lookupGrade} - ${lookupSection}, Roll No. "${lookupRollNo}". Please check with your teacher.`);
      return;
    }

    if (matches.length === 1) {
      selectVoterAndStartVoting(matches[0]);
    } else {
      // Multiple matches exist, wait for them to click their specific name from the search results
      setErrorMessage(`Multiple matches found. Please select your correct name below.`);
    }
  };

  // Start voting sequence
  const startVoting = () => {
    if (!selectedVoter) return;
    selectVoterAndStartVoting(selectedVoter);
  };

  // Record a vote choice and move forward
  const handleVoteChoice = (positionId: string, candidateId: string) => {
    const updatedChoices = { ...ballotChoices, [positionId]: candidateId };
    setBallotChoices(updatedChoices);

    if (activePositionIndex < activePositions.length - 1) {
      setActivePositionIndex((prev) => prev + 1);
    } else {
      // Final step: Submit ballot choices in a single transactions
      submitBallot(updatedChoices);
    }
  };

  // Final ballot submission via Firestore transaction
  const submitBallot = async (choices: Record<string, string>) => {
    if (!selectedVoter) return;
    setIsSubmitting(true);
    setErrorMessage("");

    const candidateIds = Object.values(choices);
    try {
      await castBallot(selectedVoter.admissionNo, candidateIds, {
        name: selectedVoter.name,
        grade: selectedVoter.grade,
        section: selectedVoter.section
      });
      setStep("success");
    } catch (error: any) {
      console.error(error);
      let userFriendlyMsg = "An error occurred while saving your vote. Please try again.";
      if (error && error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && typeof parsed === "object" && parsed.error) {
            userFriendlyMsg = parsed.error;
          } else {
            userFriendlyMsg = error.message;
          }
        } catch (e) {
          userFriendlyMsg = error.message;
        }
      }
      setErrorMessage(userFriendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get candidates for active position
  const currentPosition = activePositions[activePositionIndex];
  const currentCandidates = currentPosition
    ? candidates.filter((cand) => cand.positionId === currentPosition.id)
    : [];

  return (
    <div id="voting_terminal_container" className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans overflow-hidden select-none relative">
      
      {/* Floating HUD Toast Notification for keyboard shortcuts */}
      <AnimatePresence>
        {hudToast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.92 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 text-xs font-bold font-sans tracking-wide pointer-events-none"
            id="hud_toast_notification"
          >
            {hudToast.type === "refresh" ? (
              <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: '1.4s' }} />
            ) : (
              <Lock className="h-4 w-4 text-indigo-400" />
            )}
            <span>{hudToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Sparkles for success screen */}
      {step === "success" && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
              }}
              animate={{
                y: [0, window.innerHeight + 100],
                x: [`${p.x}%`, `${p.x + (Math.random() * 20 - 10)}%`],
                rotate: [0, 360]
              }}
              transition={{
                duration: Math.random() * 2.5 + 2,
                delay: p.delay,
                ease: "linear",
                repeat: Infinity
              }}
            />
          ))}
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="School Logo" 
              className="h-14 w-14 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            // Custom modern visual school shield logo as beautiful placeholder
            <div className="h-14 w-14 bg-indigo-600 text-white flex items-center justify-center rounded-xl shadow-md border-2 border-white">
              <ShieldCheck className="h-8 w-8" />
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              {settings.schoolName || "EDIFY WORLD SCHOOL"}
            </h1>
            <p className="text-xs md:text-sm font-semibold text-indigo-600 tracking-wider uppercase">
              {settings.electionTitle || "STUDENT ELECTION 2026"}
            </p>
          </div>
        </div>

        {/* System Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Toggle Full-Screen Mode"
            id="fullscreen_toggle_btn"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
          
          <button
            onClick={onOpenAdminLogin}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-lg transition-all"
            id="admin_lock_btn"
            title="Admin Login [Alt + A]"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="flex items-center gap-1.5">
              <span>Admin Log</span>
              <kbd className="hidden sm:inline-block bg-slate-100 px-1 py-0.5 rounded text-[9px] text-slate-400 border font-sans font-normal">Alt+A</kbd>
            </span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: WELCOME / ADMISSION OR ROLL NO LOOKUP */}
          {step === "welcome" && (
            <motion.div
              key="welcome-step"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 text-center"
              id="kiosk_welcome_card"
            >
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                <User className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
                Student Kiosk Check-In
              </h2>
              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                Enter your Roll Number or ID to search for your student record below.
              </p>

              <form onSubmit={handleProceedLookup} className="space-y-6 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Grade Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Grade / Class
                    </label>
                    <select
                      value={lookupGrade}
                      onChange={(e) => {
                        setErrorMessage("");
                        setLookupGrade(e.target.value);
                      }}
                      className="w-full px-4 py-3.5 bg-indigo-50/50 border-2 border-indigo-100 focus:border-indigo-500 focus:bg-white text-indigo-900 rounded-xl text-base font-extrabold outline-none transition-all cursor-pointer"
                    >
                      {availableGrades.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Section Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Section
                    </label>
                    <select
                      value={lookupSection}
                      onChange={(e) => {
                        setErrorMessage("");
                        setLookupSection(e.target.value);
                      }}
                      className="w-full px-4 py-3.5 bg-indigo-50/50 border-2 border-indigo-100 focus:border-indigo-500 focus:bg-white text-indigo-900 rounded-xl text-base font-extrabold outline-none transition-all cursor-pointer"
                    >
                      {availableSections.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Roll No Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Roll Number
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={lookupRollNo}
                      onChange={(e) => {
                        setErrorMessage("");
                        setLookupRollNo(e.target.value);
                      }}
                      placeholder="e.g. 5"
                      className="w-full px-4 py-3 text-center bg-indigo-50/50 border-2 border-indigo-100 focus:border-indigo-500 focus:bg-white text-indigo-900 rounded-xl text-lg font-black outline-none transition-all placeholder:text-slate-300 tracking-wider"
                      id="admission_number_input"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-2 justify-center text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3.5 rounded-xl"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {/* MATCHING STUDENTS LIVE RESULTS LIST */}
                {lookupRollNo.trim() && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-left bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-2.5 max-h-[190px] overflow-y-auto"
                  >
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                      Matching Student found:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {voters
                        .filter((v) => {
                          const gMatch = v.grade.toLowerCase() === lookupGrade.toLowerCase();
                          const sMatch = v.section.toLowerCase() === lookupSection.toLowerCase();
                          
                          const vRollInt = parseInt(v.rollNo, 10);
                          const inputRollInt = parseInt(lookupRollNo.trim(), 10);
                          const rMatch = v.rollNo.trim() === lookupRollNo.trim() || 
                            (!isNaN(vRollInt) && !isNaN(inputRollInt) && vRollInt === inputRollInt);
                          
                          return gMatch && sMatch && rMatch;
                        })
                        .map((v) => (
                          <div
                            key={v.id}
                            className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white border border-slate-150 rounded-xl gap-3 shadow-sm"
                          >
                            <div>
                              <p className="font-extrabold text-base text-indigo-950">{v.name}</p>
                              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                Roll No: <span className="font-bold text-slate-700">{v.rollNo}</span> • {v.grade} - Section {v.section}
                              </p>
                            </div>
                            
                            {v.hasVoted ? (
                              <span className="self-start sm:self-center text-[10px] font-extrabold bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-100 uppercase tracking-wider">
                                Already Voted
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVoter(v);
                                  setStep("verify");
                                }}
                                className="self-start sm:self-center text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider flex items-center gap-1"
                              >
                                <span>Vote Now</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      }
                      {voters.filter((v) => {
                        const gMatch = v.grade.toLowerCase() === lookupGrade.toLowerCase();
                        const sMatch = v.section.toLowerCase() === lookupSection.toLowerCase();
                        
                        const vRollInt = parseInt(v.rollNo, 10);
                        const inputRollInt = parseInt(lookupRollNo.trim(), 10);
                        const rMatch = v.rollNo.trim() === lookupRollNo.trim() || 
                          (!isNaN(vRollInt) && !isNaN(inputRollInt) && vRollInt === inputRollInt);
                        
                        return gMatch && sMatch && rMatch;
                      }).length === 0 && (
                        <p className="text-xs font-semibold text-slate-400 py-3 text-center">
                          No student found for Grade {lookupGrade} - {lookupSection}, Roll No. "{lookupRollNo}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="voter_proceed_btn"
                >
                  <span>Check Student Records</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: VERIFICATION / HELLO SCREEN (DIRECT TRANSITION TO VOTING) */}
          {step === "verify" && selectedVoter && (
            <motion.div
              key="verify-step"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-indigo-50 p-10 text-center relative overflow-hidden"
              id="kiosk_verify_card"
            >
              {/* Profile Greeting badge */}
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border-4 border-white">
                <User className="h-10 w-10" />
              </div>

              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] uppercase tracking-widest rounded-full">
                Student Verified
              </span>

              <h2 className="text-3xl font-black text-slate-800 mt-3 tracking-tight">
                Hello, {selectedVoter.name}!
              </h2>

              {selectedVoter.hasVoted ? (
                <div className="mt-8 bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
                  <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-lg font-black text-rose-800 mb-1">Already Voted</h3>
                  <p className="text-sm text-rose-600 max-w-md mx-auto">
                    Our database records show that your vote has already been recorded in this election.
                  </p>
                  <p className="text-xs text-rose-400 mt-3">
                    If this is an error, please notify Shiva at Shiva@ewskurnool.com immediately.
                  </p>
                </div>
              ) : (
                <div className="mt-6 text-left space-y-6">
                  {/* Editable Details Panel */}
                  <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-3.5 shadow-sm">
                    <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      Verify & Correct Your Class Details:
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Grade Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grade</label>
                        <select
                          value={editGrade}
                          onChange={(e) => setEditGrade(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                        >
                          {settings.grades.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      {/* Section Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Section</label>
                        <select
                          value={editSection}
                          onChange={(e) => setEditSection(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                        >
                          {settings.sections.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Roll No Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Roll Number</label>
                        <input
                          type="text"
                          value={editRollNo}
                          onChange={(e) => setEditRollNo(e.target.value)}
                          placeholder="e.g. 15"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-left">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Ready to cast your ballot</h4>
                      <p className="text-[11px] text-emerald-600 font-medium leading-relaxed">
                        Verify your Grade, Section, and Roll No, then click "Start Voting" to begin your digital ballot.
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-2 justify-center text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={resetTerminal}
                      disabled={isUpdatingVoter}
                      className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl transition-all cursor-pointer disabled:opacity-50 text-sm active:scale-95"
                    >
                      Cancel / Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editGrade || !editSection || !editRollNo.trim()) {
                          setErrorMessage("All details (Grade, Section, and Roll No) are required.");
                          return;
                        }
                        
                        setIsUpdatingVoter(true);
                        setErrorMessage("");
                        try {
                          // Update Firestore record so data is persisted permanently
                          await updateVoter(selectedVoter.id, {
                            grade: editGrade,
                            section: editSection,
                            rollNo: editRollNo.trim()
                          });

                          // Update state locally so current session reflects changes
                          setSelectedVoter({
                            ...selectedVoter,
                            grade: editGrade,
                            section: editSection,
                            rollNo: editRollNo.trim()
                          });

                          startVoting();
                        } catch (error: any) {
                          console.error("Failed to update voter record:", error);
                          // Proceed gracefully with local state if database is unreachable / offline
                          setSelectedVoter({
                            ...selectedVoter,
                            grade: editGrade,
                            section: editSection,
                            rollNo: editRollNo.trim()
                          });
                          startVoting();
                        } finally {
                          setIsUpdatingVoter(false);
                        }
                      }}
                      disabled={isUpdatingVoter}
                      className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm active:scale-95"
                      id="confirm_credentials_btn"
                    >
                      {isUpdatingVoter ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Start Voting</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: SEQUENTIAL PRIVATE BALLOTING (EVM SIMULATOR) */}
          {step === "voting" && currentPosition && (
            <motion.div
              key={`voting-step-${currentPosition.id}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-4xl flex flex-col gap-6 animate-fade-in"
              id="kiosk_ballot_container"
            >
              {/* Outer EVM Hardware Frame */}
              <div className="bg-[#e2e8f0] border-[12px] border-[#cbd5e1] rounded-[32px] p-4 sm:p-6 shadow-2xl relative overflow-hidden">
                
                {/* EVM Top Panel with LEDs */}
                <div className="bg-[#1e293b] rounded-2xl p-4 mb-6 flex items-center justify-between shadow-inner border border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] sm:text-xs font-black text-[#94a3b8] uppercase tracking-widest">
                      EVM Kiosk Voting Terminal
                    </span>
                    <span className="text-[10px] sm:text-xs bg-[#0f172a] text-indigo-400 px-3 py-1 rounded-lg font-black border border-indigo-950 uppercase">
                      {currentPosition.name}
                    </span>
                  </div>
                  
                  {/* Hardware LEDs */}
                  <div className="flex items-center gap-6">
                    {/* READY GREEN LED */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ready</div>
                      <div className={`w-5 h-5 rounded-full border-2 border-slate-950 transition-all duration-300 ${!busyLedActive ? 'bg-[#10b981] shadow-[0_0_15px_#10b981] animate-pulse' : 'bg-[#064e3b]'}`} />
                    </div>
                    {/* BUSY RED LED */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Busy</div>
                      <div className={`w-5 h-5 rounded-full border-2 border-slate-950 transition-all duration-300 ${busyLedActive ? 'bg-[#f43f5e] shadow-[0_0_15px_#f43f5e]' : 'bg-[#881337]'}`} />
                    </div>
                  </div>
                </div>

                {/* Voter Information Banner */}
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-indigo-600">
                    Step {activePositionIndex + 1} of {activePositions.length}
                  </span>
                  <span className="font-medium text-slate-500">
                    Active Voter: <strong className="text-slate-800 font-extrabold">{selectedVoter?.name} ({selectedVoter?.grade} - {selectedVoter?.section})</strong>
                  </span>
                </div>

                {/* EVM Ballot Rows */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md divide-y divide-slate-200 overflow-hidden">
                  {currentCandidates.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-slate-50">
                      <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-bold">No candidates running for {currentPosition.name}.</p>
                      <button
                        onClick={() => handleVoteChoice(currentPosition.id, "NOT_VOTED")}
                        className="mt-4 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl transition-all cursor-pointer"
                      >
                        Abstain / Skip
                      </button>
                    </div>
                  ) : (
                    currentCandidates.map((cand, idx) => {
                      const SymbolComponent = getSymbolIcon(cand.symbolName);
                      const symbolColorClasses = getSymbolColor(cand.symbolName);
                      const serialStr = String(idx + 1).padStart(2, "0");

                      return (
                        <div 
                          key={cand.id} 
                          className="flex items-center hover:bg-slate-50/50 transition-colors p-3 sm:p-4 gap-3 sm:gap-6"
                        >
                          {/* 1. Serial Number */}
                          <div className="w-10 text-center font-mono text-xl font-black text-slate-300 border-r border-slate-100 pr-2">
                            {serialStr}
                          </div>

                          {/* 2. Candidate Photo & Details */}
                          <div className="flex-1 flex items-center gap-4">
                            <CandidatePhoto 
                              photoUrl={cand.photoUrl} 
                              name={cand.name} 
                              className="w-14 h-14 rounded-xl shrink-0"
                              iconClassName="h-7 w-7"
                            />
                            <div className="text-left">
                              <h3 className="text-md sm:text-lg font-black text-slate-800 tracking-tight leading-snug">
                                {cand.name}
                              </h3>
                              {cand.manifesto && (
                                <p className="text-xs text-slate-400 italic line-clamp-1 hidden sm:block">
                                  "{cand.manifesto}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* 3. Candidate Symbol */}
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                            <div className={`p-1 rounded border shadow-sm ${symbolColorClasses}`}>
                              <SymbolComponent className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider hidden sm:inline">
                              {cand.symbolName}
                            </span>
                          </div>

                          {/* 4. Physical LED indicator & Blue Button */}
                          <div className="flex items-center gap-4 pl-4 border-l border-slate-150">
                            {/* Candidate LED indicator */}
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded-full border border-slate-950 transition-all duration-200 ${votedCandidateId === cand.id ? 'bg-[#f43f5e] shadow-[0_0_12px_#ef4444]' : 'bg-[#4c0519]'}`} />
                            </div>

                            {/* Tactile Blue EVM Button */}
                            <button
                              disabled={busyLedActive || isSubmitting}
                              onClick={() => {
                                if (busyLedActive || isSubmitting) return;
                                setVotedCandidateId(cand.id);
                                setBusyLedActive(true);
                                playEvmBeep();
                                
                                // Advanced delayed progress
                                setTimeout(() => {
                                  handleVoteChoice(currentPosition.id, cand.id);
                                  setVotedCandidateId(null);
                                  setBusyLedActive(false);
                                }, 1500);
                              }}
                              className="w-14 h-10 sm:w-16 sm:h-11 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-800 border-b-[6px] border-r-2 border-indigo-950 rounded-lg shadow-md hover:shadow-lg transition-all active:translate-y-1 active:border-b-0 active:border-r-0 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              id={`evm_btn_${cand.id}`}
                              title="Press blue button to cast vote"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-300 opacity-60 animate-pulse" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* EVM Overlay for dynamic reply with voter name (VOTER NAME THANKS) */}
                <AnimatePresence>
                  {busyLedActive && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 rounded-[20px]"
                    >
                      <div className="w-20 h-20 bg-rose-600 text-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_35px_rgba(244,63,94,0.6)] border-4 border-white animate-bounce">
                        <CheckCircle2 className="h-10 w-10 animate-pulse" />
                      </div>
                      
                      <span className="px-4 py-1.5 bg-rose-700 text-rose-100 font-black text-xs uppercase tracking-widest rounded-full mb-3 shadow">
                        VOTE RECORDED
                      </span>
                      
                      <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                        Thank You, {selectedVoter?.name}!
                      </h3>
                      
                      <p className="text-slate-300 mt-2 font-semibold text-sm">
                        Your vote is saved. Electronic beep has played successfully!
                      </p>
                      
                      <div className="mt-8 flex items-center gap-2 text-slate-500 font-mono text-xs bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-rose-400 font-extrabold uppercase tracking-widest">EVM BEEP TONE SOUNDING</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (activePositionIndex > 0) {
                      setActivePositionIndex((prev) => prev - 1);
                    } else {
                      setStep("verify");
                    }
                  }}
                  className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer animate-fade-in"
                >
                  Go Back
                </button>

                <button
                  onClick={() => handleVoteChoice(currentPosition.id, "ABSTAINED")}
                  className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all cursor-pointer animate-fade-in"
                >
                  Abstain for this position
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION & AUDIO */}
          {step === "success" && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-emerald-50 p-10 text-center relative overflow-hidden"
              id="kiosk_success_card"
            >
              {/* Emerald visual ring */}
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative">
                <CheckCircle2 className="h-16 w-16 stroke-[2.5]" />
                <motion.div 
                  className="absolute inset-0 border-4 border-emerald-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              <span className="px-4 py-1.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs tracking-wider rounded-full uppercase">
                Success Confirmed
              </span>

              <h2 className="text-3xl font-extrabold text-slate-800 mt-5 mb-2">
                Thank You for Voting!
              </h2>
              <p className="text-md font-medium text-slate-500 max-w-sm mx-auto mb-4">
                Your vote has been cast anonymously and registered securely in the master database.
              </p>

              <div className="flex items-center gap-1.5 justify-center text-xs font-semibold text-slate-400 mb-8 bg-slate-50 py-2 px-3 rounded-lg max-w-xs mx-auto border border-slate-100">
                <Volume2 className="h-4 w-4 text-emerald-500" />
                <span>Text-To-Speech triggered</span>
              </div>

              {/* Countdown circle */}
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <motion.path
                    className="text-emerald-500"
                    strokeWidth="3"
                    strokeDasharray={`${(countdown / 5) * 100}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="text-lg font-black text-slate-700 font-mono">
                  {countdown}s
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 font-semibold tracking-wider uppercase">
                Returning to start screen
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 z-10 space-y-2.5">
        {/* Keyboard Shortcuts Admin Helper */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          <span className="flex items-center gap-1.5">
            <kbd className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono shadow-sm">Alt + A</kbd>
            <span>Admin Log</span>
          </span>
          <span className="text-slate-200">•</span>
          <span className="flex items-center gap-1.5">
            <kbd className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono shadow-sm">Alt + R</kbd>
            <span>Reset / Sync Voters</span>
          </span>
        </div>
        <div>
          <p className="font-semibold text-slate-500 mb-1">
            © 2026 Edify World School, Kurnool
          </p>
          <p className="tracking-wide">
            Designed & Developed by <span className="font-bold text-slate-600">Shiva AI Facilitator</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
