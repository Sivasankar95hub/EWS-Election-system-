import React, { useState, useEffect, useRef } from "react";
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
  Volume2
} from "lucide-react";
import { Voter, Candidate, Position, ElectionSettings } from "../types";
import { castBallot } from "../firebaseHelpers";
import { getSymbolIcon, getSymbolColor } from "./Symbols";

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
  const [showKeypad, setShowKeypad] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Filter positions that actually have candidates
  const activePositions = settings.positions.filter((pos) =>
    candidates.some((cand) => cand.positionId === pos.id)
  );

  // Lock down developer controls & right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
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
      // Trigger voice TTS
      try {
        const utterance = new SpeechSynthesisUtterance(
          "Thank you for voting. Your vote has been successfully recorded."
        );
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("Speech Synthesis not supported or blocked by browser:", e);
      }

      // Generate local confetti particles
      const colors = ["#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316"];
      const particles = Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage x
        y: Math.random() * -20 - 10, // above screen
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 2
      }));
      setConfettiParticles(particles);

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
    setSelectedVoter(null);
    setActivePositionIndex(0);
    setBallotChoices({});
    setErrorMessage("");
    setShowKeypad(false);
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

  // Handle voter lookup
  const handleProceedLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const normalizedNo = admissionInput.trim().toUpperCase();
    if (!normalizedNo) {
      setErrorMessage("Please enter an admission number.");
      return;
    }

    // Match voter in database
    const voter = voters.find((v) => v.admissionNo.toUpperCase() === normalizedNo);
    if (!voter) {
      setErrorMessage(`Admission Number "${normalizedNo}" not found. Please verify with the administrator.`);
      return;
    }

    setSelectedVoter(voter);
    setStep("verify");
  };

  // On-screen keypad touch
  const handleKeypadPress = (val: string) => {
    setErrorMessage("");
    if (val === "DELETE") {
      setAdmissionInput((prev) => prev.slice(0, -1));
    } else if (val === "CLEAR") {
      setAdmissionInput("");
    } else {
      setAdmissionInput((prev) => prev + val);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Start voting sequence
  const startVoting = () => {
    if (!selectedVoter) return;
    if (selectedVoter.hasVoted) {
      setErrorMessage("You have already voted. Each student is permitted to vote only once.");
      return;
    }
    if (activePositions.length === 0) {
      setErrorMessage("No active election offices or candidates are configured at this moment.");
      return;
    }

    setBallotChoices({});
    setActivePositionIndex(0);
    setStep("voting");
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
      setErrorMessage(error.message || "An error occurred while saving your vote. Please try again.");
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
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Admin Log</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: WELCOME / ADMISSION LOOKUP */}
          {step === "welcome" && (
            <motion.div
              key="welcome-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center"
              id="kiosk_welcome_card"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <User className="h-8 w-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                Student Ballot Check-In
              </h2>
              <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                Please enter your School Admission Number to retrieve your electronic voter credentials.
              </p>

              <form onSubmit={handleProceedLookup} className="space-y-6">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={admissionInput}
                    onChange={(e) => {
                      setErrorMessage("");
                      setAdmissionInput(e.target.value);
                    }}
                    onFocus={() => setShowKeypad(true)}
                    placeholder="E.g., EWS-1001"
                    className="w-full px-5 py-4 text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all placeholder:text-slate-300 tracking-wider uppercase"
                    id="admission_number_input"
                  />
                </div>

                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-2 justify-center text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-lg"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  id="voter_proceed_btn"
                >
                  <span>Verify Identity</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>

              {/* Touchscreen On-screen Keypad Helper */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <button
                  onClick={() => setShowKeypad(!showKeypad)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {showKeypad ? "Hide On-Screen Keyboard" : "Show On-Screen Keyboard"}
                </button>
                
                <AnimatePresence>
                  {showKeypad && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto p-2 bg-slate-50 border border-slate-100 rounded-xl shadow-inner">
                        {["E", "W", "S", "-"].map((char) => (
                          <button
                            key={char}
                            type="button"
                            onClick={() => handleKeypadPress(char)}
                            className="py-3 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-lg text-slate-700 active:scale-95 transition-all text-sm"
                          >
                            {char}
                          </button>
                        ))}
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleKeypadPress(num.toString())}
                            className="py-3 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-lg text-slate-700 active:scale-95 transition-all text-sm"
                          >
                            {num}
                          </button>
                        ))}
                        {[5, 6, 7, 8].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleKeypadPress(num.toString())}
                            className="py-3 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-lg text-slate-700 active:scale-95 transition-all text-sm"
                          >
                            {num}
                          </button>
                        ))}
                        {[9, 0].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleKeypadPress(num.toString())}
                            className="py-3 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-lg text-slate-700 active:scale-95 transition-all text-sm"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleKeypadPress("DELETE")}
                          className="col-span-2 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-rose-600 rounded-lg text-xs active:scale-95 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 2: VERIFICATION SCREEN */}
          {step === "verify" && selectedVoter && (
            <motion.div
              key="verify-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
              id="kiosk_verify_card"
            >
              <h2 className="text-2xl font-bold text-slate-800 text-center mb-6 pb-4 border-b border-slate-100">
                Verify Your Voter Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Student Name</label>
                    <p className="text-xl font-bold text-slate-800">{selectedVoter.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Admission Number</label>
                    <p className="text-lg font-bold text-slate-700 font-mono tracking-wide">{selectedVoter.admissionNo}</p>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Grade</label>
                      <p className="text-md font-bold text-slate-800">{selectedVoter.grade}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Section</label>
                      <p className="text-md font-bold text-slate-800">{selectedVoter.section}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Roll Number</label>
                    <p className="text-md font-bold text-slate-800">{selectedVoter.rollNo}</p>
                  </div>
                </div>
              </div>

              {selectedVoter.hasVoted ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-center mb-6">
                  <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-rose-800 mb-1">Already Voted</h3>
                  <p className="text-sm text-rose-600 max-w-md mx-auto">
                    Our database records show you have already cast your vote in this election. For ballot security, students can only vote once.
                  </p>
                  <p className="text-xs text-rose-400 mt-2">
                    If this is an error, please notify Shiva at Shiva@ewskurnool.com immediately.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3 mb-6">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800">You are eligible to vote!</h4>
                    <p className="text-xs text-emerald-600">
                      Verify that the above details belong to you. Clicking the proceed button will start your private digital ballot.
                    </p>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 justify-center text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-lg mb-6">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={resetTerminal}
                  className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel / Back
                </button>
                {!selectedVoter.hasVoted && (
                  <button
                    type="button"
                    onClick={startVoting}
                    className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                    id="confirm_credentials_btn"
                  >
                    <span>Confirm & Vote</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: SEQUENTIAL PRIVATE BALLOTING */}
          {step === "voting" && currentPosition && (
            <motion.div
              key={`voting-step-${currentPosition.id}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-5xl flex flex-col gap-6"
              id="kiosk_ballot_container"
            >
              {/* Ballot Step Header / Status */}
              <div className="bg-white border border-slate-200/60 rounded-xl px-6 py-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block mb-0.5">
                    Step {activePositionIndex + 1} of {activePositions.length}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                    Vote for: <span className="text-indigo-600 underline decoration-indigo-200 decoration-wavy underline-offset-4">{currentPosition.name}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Current Voter:</span>
                  <span className="text-sm font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                    {selectedVoter?.name}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300" 
                  style={{ width: `${((activePositionIndex + 1) / activePositions.length) * 100}%` }}
                />
              </div>

              {/* Candidate Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentCandidates.length === 0 ? (
                  <div className="col-span-full bg-white border border-slate-100 rounded-xl p-12 text-center text-slate-500">
                    <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="font-bold">No candidates running for this position.</p>
                    <button
                      onClick={() => handleVoteChoice(currentPosition.id, "NOT_VOTED")}
                      className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors"
                    >
                      Skip / Abstain
                    </button>
                  </div>
                ) : (
                  currentCandidates.map((cand) => {
                    const SymbolComponent = getSymbolIcon(cand.symbolName);
                    const symbolColorClasses = getSymbolColor(cand.symbolName);

                    return (
                      <motion.div
                        key={cand.id}
                        whileHover={{ y: -6, scale: 1.01 }}
                        className="bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-200 shadow-md hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden relative"
                      >
                        {/* Candidate Details */}
                        <div className="p-6 flex-1 flex flex-col">
                          {/* Image */}
                          <div className="w-full h-48 bg-slate-50 rounded-xl overflow-hidden mb-5 border border-slate-100 flex items-center justify-center relative">
                            {cand.photoUrl ? (
                              <img 
                                src={cand.photoUrl} 
                                alt={cand.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="text-center text-slate-300 p-4">
                                <User className="h-16 w-16 mx-auto mb-2 text-slate-200" />
                                <span className="text-xs uppercase font-bold tracking-wider">No Photo Uploaded</span>
                              </div>
                            )}

                            {/* Floating Symbol Card on image */}
                            <div className="absolute bottom-3 right-3 flex items-center justify-center">
                              <div className={`p-2.5 rounded-lg border shadow-md flex items-center justify-center ${symbolColorClasses}`}>
                                <SymbolComponent className="h-6 w-6" />
                              </div>
                            </div>
                          </div>

                          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-snug mb-1">
                            {cand.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                            <span>Election Symbol:</span>
                            <span className="text-slate-600 font-bold">{cand.symbolName.toUpperCase()}</span>
                          </div>

                          {cand.manifesto && (
                            <p className="text-sm text-slate-500 line-clamp-3 bg-slate-50/60 p-3 rounded-lg border border-slate-100/40 italic">
                              "{cand.manifesto}"
                            </p>
                          )}
                        </div>

                        {/* BIG GREEN VOTE BUTTON */}
                        <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                          <button
                            onClick={() => handleVoteChoice(currentPosition.id, cand.id)}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-black text-md rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                            id={`vote_btn_${cand.id}`}
                          >
                            <span className="text-lg">🟢</span>
                            <span>CAST VOTE</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Back / Abstain Row */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => {
                    if (activePositionIndex > 0) {
                      setActivePositionIndex((prev) => prev - 1);
                    } else {
                      setStep("verify");
                    }
                  }}
                  className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Go Back / Previous Step
                </button>

                <button
                  onClick={() => handleVoteChoice(currentPosition.id, "ABSTAINED")}
                  className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-xl transition-all"
                >
                  Abstain / Blank Ballot for this position
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
      <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 z-10">
        <p className="font-semibold text-slate-500 mb-1">
          © 2026 Edify World School, Kurnool
        </p>
        <p className="tracking-wide">
          Designed & Developed by <span className="font-bold text-slate-600">Shiva AI Facilitator</span>
        </p>
      </footer>
    </div>
  );
}
