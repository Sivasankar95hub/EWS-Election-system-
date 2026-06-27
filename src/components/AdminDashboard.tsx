import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Vote, 
  UserX, 
  Percent, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Settings, 
  RotateCcw, 
  Check, 
  X, 
  LogOut, 
  TrendingUp, 
  FileText, 
  Award, 
  UploadCloud, 
  Grid,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Info
} from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { Voter, Candidate, Position, ElectionSettings, LiveActivityLog } from "../types";
import { 
  updateSettings, 
  addVoter, 
  updateVoter, 
  deleteVoter, 
  bulkUploadVoters, 
  addCandidate, 
  updateCandidate, 
  deleteCandidate, 
  resetElection 
} from "../firebaseHelpers";
import { PREDEFINED_SYMBOLS, getSymbolIcon, getSymbolColor } from "./Symbols";
import { fileToBase64, resizeImage, formatTimestamp } from "../utils";

interface AdminDashboardProps {
  settings: ElectionSettings;
  voters: Voter[];
  candidates: Candidate[];
  activityLogs: LiveActivityLog[];
  isBypassActive?: boolean;
  onLogout?: () => void;
}

export default function AdminDashboard({
  settings,
  voters,
  candidates,
  activityLogs,
  isBypassActive = false,
  onLogout
}: AdminDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"monitor" | "voters" | "candidates" | "settings">("monitor");

  // Filter and Search states
  const [voterSearch, setVoterSearch] = useState("");
  const [voterGradeFilter, setVoterGradeFilter] = useState("");
  const [voterSectionFilter, setVoterSectionFilter] = useState("");
  const [voterStatusFilter, setVoterStatusFilter] = useState("");

  // Create Voter Modal state
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [voterForm, setVoterForm] = useState({
    name: "",
    admissionNo: "",
    grade: "",
    section: "",
    rollNo: ""
  });

  // Bulk Upload state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");

  // Create Candidate Modal state
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    positionId: "",
    symbolName: "star",
    symbolUrl: "",
    photoUrl: "",
    manifesto: ""
  });

  // Custom Grade / Section additions
  const [newGradeInput, setNewGradeInput] = useState("");
  const [newSectionInput, setNewSectionInput] = useState("");
  const [newPositionInput, setNewPositionInput] = useState("");

  // Reset Election Guard state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmWord, setResetConfirmWord] = useState("");

  // Feedback notifications
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const triggerNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (onLogout) {
        onLogout();
      }
    } catch (e) {
      console.error("Logout failed:", e);
      if (onLogout) {
        onLogout();
      }
    }
  };

  // Calculable Live Monitoring KPIs
  const totalRegistered = voters.length;
  const totalVotesCast = voters.filter((v) => v.hasVoted).length;
  const pendingVoters = totalRegistered - totalVotesCast;
  const votingPercentage = totalRegistered > 0 ? Math.round((totalVotesCast / totalRegistered) * 100) : 0;

  // Split voter lists
  const votersWhoHaveVoted = voters.filter((v) => v.hasVoted);
  const votersYetToVote = voters.filter((v) => !v.hasVoted);

  // Manage Voter Add/Edit
  const handleOpenAddVoter = () => {
    setEditingVoter(null);
    setVoterForm({
      name: "",
      admissionNo: "",
      grade: settings.grades[0] || "",
      section: settings.sections[0] || "",
      rollNo: ""
    });
    setShowVoterModal(true);
  };

  const handleOpenEditVoter = (voter: Voter) => {
    setEditingVoter(voter);
    setVoterForm({
      name: voter.name,
      admissionNo: voter.admissionNo,
      grade: voter.grade,
      section: voter.section,
      rollNo: voter.rollNo
    });
    setShowVoterModal(true);
  };

  const handleSaveVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterForm.name || !voterForm.admissionNo || !voterForm.grade || !voterForm.section) {
      triggerNotification("error", "Please fill in all required fields.");
      return;
    }

    try {
      if (editingVoter) {
        // Edit
        await updateVoter(editingVoter.id, {
          name: voterForm.name,
          grade: voterForm.grade,
          section: voterForm.section,
          rollNo: voterForm.rollNo
        });
        triggerNotification("success", `Voter ${voterForm.name} updated successfully.`);
      } else {
        // Add
        const exists = voters.some((v) => v.admissionNo.toUpperCase() === voterForm.admissionNo.toUpperCase());
        if (exists) {
          triggerNotification("error", "Student with this Admission Number already exists.");
          return;
        }
        await addVoter({
          name: voterForm.name,
          admissionNo: voterForm.admissionNo.trim().toUpperCase(),
          grade: voterForm.grade,
          section: voterForm.section,
          rollNo: voterForm.rollNo
        });
        triggerNotification("success", `Voter ${voterForm.name} registered.`);
      }
      setShowVoterModal(false);
    } catch (err) {
      triggerNotification("error", "Failed to save voter record.");
    }
  };

  const handleDeleteVoter = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to delete student voter "${name}"?`)) {
      try {
        await deleteVoter(id);
        triggerNotification("success", `Voter ${name} deleted.`);
      } catch (err) {
        triggerNotification("error", "Failed to delete voter.");
      }
    }
  };

  // Bulk Upload Voter CSV text parser
  const handleBulkUpload = async () => {
    setBulkError("");
    setBulkSuccessMsg("");

    if (!bulkCsvText.trim()) {
      setBulkError("CSV text container is empty.");
      return;
    }

    const lines = bulkCsvText.split("\n");
    const parsedVoters: Omit<Voter, "hasVoted">[] = [];

    // Formats: AdmissionNumber, Name, Grade, Section, RollNumber
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Ignore header line if any
      if (i === 0 && (line.toLowerCase().includes("admission") || line.toLowerCase().includes("name"))) {
        continue;
      }

      const parts = line.split(",");
      if (parts.length < 3) {
        setBulkError(`Format error at line ${i + 1}: Expected: AdmissionNumber, Name, Grade, [Section], [RollNumber]`);
        return;
      }

      const admissionNo = parts[0]?.trim();
      const name = parts[1]?.trim();
      const grade = parts[2]?.trim();
      const section = parts[3]?.trim() || "Orion";
      const rollNo = parts[4]?.trim() || "N/A";

      if (!admissionNo || !name || !grade) {
        setBulkError(`Missing required values at line ${i + 1}.`);
        return;
      }

      parsedVoters.push({
        admissionNo: admissionNo.toUpperCase(),
        name,
        grade,
        section,
        rollNo,
        id: admissionNo.toUpperCase()
      });
    }

    if (parsedVoters.length === 0) {
      setBulkError("No valid rows were parsed.");
      return;
    }

    try {
      await bulkUploadVoters(parsedVoters);
      setBulkSuccessMsg(`Successfully uploaded and synced ${parsedVoters.length} voters!`);
      setBulkCsvText("");
      setTimeout(() => setShowBulkModal(false), 2000);
      triggerNotification("success", `Bulk imported ${parsedVoters.length} student records.`);
    } catch (err) {
      setBulkError("An error occurred during firestore batch upload.");
    }
  };

  // Manage Candidate Add/Edit
  const handleOpenAddCandidate = () => {
    setEditingCandidate(null);
    setCandidateForm({
      name: "",
      positionId: settings.positions[0]?.id || "",
      symbolName: "star",
      symbolUrl: "",
      photoUrl: "",
      manifesto: ""
    });
    setShowCandidateModal(true);
  };

  const handleOpenEditCandidate = (cand: Candidate) => {
    setEditingCandidate(cand);
    setCandidateForm({
      name: cand.name,
      positionId: cand.positionId,
      symbolName: cand.symbolName,
      symbolUrl: cand.symbolUrl,
      photoUrl: cand.photoUrl,
      manifesto: cand.manifesto || ""
    });
    setShowCandidateModal(true);
  };

  // File to base64 handlers for logo & candidates
  const handleCandidatePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const rawBase64 = await fileToBase64(file);
        // Resize image to max 250px x 250px to save firestore space
        const compressedBase64 = await resizeImage(rawBase64, 250, 250);
        setCandidateForm((prev) => ({ ...prev, photoUrl: compressedBase64 }));
      } catch (err) {
        triggerNotification("error", "Failed to compress/upload photo.");
      }
    }
  };

  const handleCustomSymbolUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const rawBase64 = await fileToBase64(file);
        const compressedBase64 = await resizeImage(rawBase64, 120, 120);
        setCandidateForm((prev) => ({ ...prev, symbolName: "custom", symbolUrl: compressedBase64 }));
      } catch (err) {
        triggerNotification("error", "Failed to compress/upload symbol.");
      }
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.name || !candidateForm.positionId) {
      triggerNotification("error", "Name and position fields are required.");
      return;
    }

    try {
      if (editingCandidate) {
        await updateCandidate(editingCandidate.id, {
          name: candidateForm.name,
          positionId: candidateForm.positionId,
          symbolName: candidateForm.symbolName,
          symbolUrl: candidateForm.symbolUrl,
          photoUrl: candidateForm.photoUrl,
          manifesto: candidateForm.manifesto
        });
        triggerNotification("success", `Candidate ${candidateForm.name} updated.`);
      } else {
        await addCandidate({
          name: candidateForm.name,
          positionId: candidateForm.positionId,
          symbolName: candidateForm.symbolName,
          symbolUrl: candidateForm.symbolUrl,
          photoUrl: candidateForm.photoUrl,
          manifesto: candidateForm.manifesto
        });
        triggerNotification("success", `Candidate ${candidateForm.name} added to ballot.`);
      }
      setShowCandidateModal(false);
    } catch (err) {
      triggerNotification("error", "Failed to save candidate records.");
    }
  };

  const handleDeleteCandidate = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete candidate "${name}" from the election?`)) {
      try {
        await deleteCandidate(id);
        triggerNotification("success", `Candidate ${name} deleted.`);
      } catch (err) {
        triggerNotification("error", "Failed to delete candidate.");
      }
    }
  };

  // School Logo Upload
  const handleSchoolLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const rawBase64 = await fileToBase64(file);
        const compressedBase64 = await resizeImage(rawBase64, 150, 150);
        await updateSettings({ logoUrl: compressedBase64 });
        triggerNotification("success", "School logo updated on all terminals instantly!");
      } catch (err) {
        triggerNotification("error", "Failed to upload and resize logo.");
      }
    }
  };

  // Add Grades, Sections, Positions Settings
  const handleAddGrade = async () => {
    const val = newGradeInput.trim();
    if (!val) return;
    if (settings.grades.includes(val)) {
      triggerNotification("error", "Grade already exists.");
      return;
    }
    const updatedGrades = [...settings.grades, val];
    await updateSettings({ grades: updatedGrades });
    setNewGradeInput("");
    triggerNotification("success", `Added ${val}`);
  };

  const handleRemoveGrade = async (grade: string) => {
    const updatedGrades = settings.grades.filter((g) => g !== grade);
    await updateSettings({ grades: updatedGrades });
    triggerNotification("success", `Removed ${grade}`);
  };

  const handleAddSection = async () => {
    const val = newSectionInput.trim();
    if (!val) return;
    if (settings.sections.includes(val)) {
      triggerNotification("error", "Section already exists.");
      return;
    }
    const updatedSections = [...settings.sections, val];
    await updateSettings({ sections: updatedSections });
    setNewSectionInput("");
    triggerNotification("success", `Added ${val}`);
  };

  const handleRemoveSection = async (section: string) => {
    const updatedSections = settings.sections.filter((s) => s !== section);
    await updateSettings({ sections: updatedSections });
    triggerNotification("success", `Removed ${section}`);
  };

  const handleAddPosition = async () => {
    const val = newPositionInput.trim();
    if (!val) return;
    
    const id = val.toLowerCase().replace(/\s+/g, "_");
    if (settings.positions.some((p) => p.id === id)) {
      triggerNotification("error", "Position already exists.");
      return;
    }

    const updatedPositions = [...settings.positions, { id, name: val }];
    await updateSettings({ positions: updatedPositions });
    setNewPositionInput("");
    triggerNotification("success", `Added electoral office: ${val}`);
  };

  const handleRemovePosition = async (id: string) => {
    const updatedPositions = settings.positions.filter((p) => p.id !== id);
    await updateSettings({ positions: updatedPositions });
    triggerNotification("success", `Removed electoral office`);
  };

  // Election Status control
  const handleToggleStatus = async (status: "draft" | "active" | "completed") => {
    await updateSettings({ electionStatus: status });
    triggerNotification("success", `Election status modified to: ${status.toUpperCase()}`);
  };

  // Yearly reset triggers
  const handleResetElectionAction = async () => {
    if (resetConfirmWord !== "RESET") {
      triggerNotification("error", 'You must type "RESET" to confirm.');
      return;
    }

    try {
      await resetElection();
      setShowResetConfirm(false);
      setResetConfirmWord("");
      triggerNotification("success", "Election database reset completed. Ready for annual reuse!");
    } catch (err) {
      triggerNotification("error", "Database reset failed.");
    }
  };

  // Export List to Excel/CSV Utility
  const exportListToCSV = (listType: "voted" | "pending") => {
    const list = listType === "voted" ? votersWhoHaveVoted : votersYetToVote;
    if (list.length === 0) {
      triggerNotification("error", "No records found in this list to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Admission Number,Student Name,Grade,Section,Roll Number,Voted Status,Voting Time\n";

    list.forEach((v) => {
      const timeStr = v.votedAt ? formatTimestamp(v.votedAt) : "N/A";
      csvContent += `"${v.admissionNo}","${v.name}","${v.grade}","${v.section}","${v.rollNo}","${v.hasVoted ? "Voted" : "Yet to Vote"}","${timeStr}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EWS_Kurnool_Election_Voters_${listType}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("success", "Voters report successfully downloaded!");
  };

  // Print friendly view trigger
  const handlePrintReports = () => {
    window.print();
  };

  // Search/Filters logic for Voters management
  const filteredVotersList = voters.filter((v) => {
    const matchesSearch = 
      v.name.toLowerCase().includes(voterSearch.toLowerCase()) ||
      v.admissionNo.toLowerCase().includes(voterSearch.toLowerCase());
    
    const matchesGrade = voterGradeFilter ? v.grade === voterGradeFilter : true;
    const matchesSection = voterSectionFilter ? v.section === voterSectionFilter : true;
    const matchesStatus = voterStatusFilter ? 
      (voterStatusFilter === "voted" ? v.hasVoted : !v.hasVoted) : true;

    return matchesSearch && matchesGrade && matchesSection && matchesStatus;
  });

  return (
    <div id="admin_dashboard_container" className="min-h-screen bg-slate-100 flex flex-col font-sans print:bg-white select-none">
      
      {isBypassActive && (
        <div className="bg-amber-600 border-b border-amber-700 px-6 py-3 flex items-center justify-between text-xs font-semibold text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-100 shrink-0" />
            <span>
              <strong>Firebase Auth Notice:</strong> Email/Password authentication is disabled or unconfigured in your Firebase Console. Client-side bypass is active so you can fully manage the election in preview.
            </span>
          </div>
          <a 
            href="https://console.firebase.google.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg transition-all"
          >
            Open Console
          </a>
        </div>
      )}
      
      {/* Dynamic Toast Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl shadow-xl border flex items-center gap-3 text-sm font-semibold max-w-sm ${
              notification.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                : "bg-rose-50 text-rose-800 border-rose-100"
            }`}
          >
            {notification.type === "success" ? (
              <Check className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADMIN UPPER DECK HEADER */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-3.5">
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="School Logo" 
              className="h-10 w-10 object-contain rounded-lg bg-white p-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-10 w-10 bg-indigo-600 text-white flex items-center justify-center rounded-lg">
              <Award className="h-6 w-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight">EWS KURNOOL</h1>
              <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                ADMIN BOARD
              </span>
            </div>
            <p className="text-xs text-slate-400">Student Council Election System • Secure Control Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400 font-medium">Logged in as</p>
            <p className="text-sm font-bold text-slate-200">Shiva AI Facilitator</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-300 font-bold text-xs rounded-lg border border-slate-700/60 transition-all cursor-pointer"
            id="admin_logout_btn"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* DASHBOARD NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 px-6 py-1 flex items-center justify-between print:hidden">
        <div className="flex gap-1 overflow-x-auto scrollbar-none py-1">
          {[
            { id: "monitor", label: "Live Monitor", icon: TrendingUp },
            { id: "voters", label: "Voters Registry", icon: Users },
            { id: "candidates", label: "Ballot Candidates", icon: Award },
            { id: "settings", label: "System Settings", icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isActive 
                    ? "bg-slate-100 text-slate-800 border-b-2 border-indigo-600" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
                id={`tab_nav_${tab.id}`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Status indicator */}
        <div className="hidden md:flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Terminals Live & Synced
          </span>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        
        {/* TABS BODY */}
        <AnimatePresence mode="wait">

          {/* TAB 1: LIVE MONITOR & KPIS */}
          {activeTab === "monitor" && (
            <motion.div
              key="monitor-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* TOP KPIS GRID */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="monitor_kpi_deck">
                {[
                  { label: "Total Registered", value: totalRegistered, icon: Users, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
                  { label: "Total Votes Cast", value: totalVotesCast, icon: Vote, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                  { label: "Pending Voters", value: pendingVoters, icon: UserX, color: "text-amber-600 bg-amber-50 border-amber-100" },
                  { label: "Voting Percentage", value: `${votingPercentage}%`, icon: Percent, color: "text-purple-600 bg-purple-50 border-purple-100" }
                ].map((kpi, i) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={i} className={`bg-white border rounded-2xl p-5 flex items-center justify-between shadow-sm ${kpi.color}`}>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{kpi.label}</span>
                        <span className="text-2xl md:text-3xl font-black text-slate-800">{kpi.value}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* LIVE RESULTS & FEED GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Live Candidate Standings leaderboard */}
                <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Live Election Standings</h3>
                      <p className="text-xs text-slate-400">Aggregated real-time votes counts (ballot secrecy preserved)</p>
                    </div>
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Live Updating</span>
                    </span>
                  </div>

                  {/* Group candidates by Position */}
                  <div className="space-y-8">
                    {settings.positions.map((pos) => {
                      const posCandidates = candidates
                        .filter((c) => c.positionId === pos.id)
                        .sort((a, b) => b.votesCount - a.votesCount);

                      const maxVotes = posCandidates[0]?.votesCount || 0;

                      return (
                        <div key={pos.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                          <h4 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                            <span>{pos.name}</span>
                          </h4>

                          {posCandidates.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No candidates running for this position.</p>
                          ) : (
                            <div className="space-y-4">
                              {posCandidates.map((cand, idx) => {
                                const percentage = maxVotes > 0 ? Math.round((cand.votesCount / totalVotesCast) * 100) : 0;
                                const isLeader = idx === 0 && cand.votesCount > 0;
                                const SymbolIcon = getSymbolIcon(cand.symbolName);

                                return (
                                  <div key={cand.id} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2.5">
                                        <div className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</div>
                                        {cand.photoUrl ? (
                                          <img 
                                            src={cand.photoUrl} 
                                            alt={cand.name} 
                                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Users className="h-3.5 w-3.5 text-slate-400" />
                                          </div>
                                        )}
                                        <div>
                                          <span className="font-bold text-slate-700">{cand.name}</span>
                                          {isLeader && (
                                            <span className="ml-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                              Leader
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 font-mono">
                                        <div className="text-xs text-slate-400">Symbol: {cand.symbolName}</div>
                                        <div className="font-extrabold text-slate-800">{cand.votesCount} votes</div>
                                      </div>
                                    </div>

                                    {/* Standings bar */}
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                                      <div 
                                        className={`h-full transition-all duration-500 ${isLeader ? 'bg-indigo-600' : 'bg-slate-400'}`}
                                        style={{ width: `${totalVotesCast > 0 ? (cand.votesCount / totalVotesCast) * 100 : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live public activity feed logs */}
                <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col justify-between h-[600px]">
                  <div>
                    <h3 className="text-md font-extrabold text-slate-800 mb-1 flex items-center gap-2">
                      <span>Live Ballot Casts</span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 border-b border-slate-100 pb-3 mb-4">
                      Secrecy enforced: Individual vote choices are omitted.
                    </p>

                    <div className="overflow-y-auto max-h-[440px] space-y-4 pr-1 scrollbar-thin">
                      {activityLogs.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <Vote className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                          <p className="text-xs font-semibold">Waiting for student check-ins...</p>
                        </div>
                      ) : (
                        activityLogs.map((log) => (
                          <div key={log.id} className="flex gap-3 items-start border-l-2 border-indigo-100 pl-3.5 py-0.5">
                            <div className="flex-1">
                              <p className="text-xs font-extrabold text-slate-700">
                                {log.voterName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {log.admissionNo} • {log.grade} • Sec {log.section}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[11px] text-slate-400 flex gap-2 items-start mt-4">
                    <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p>
                      Each ballot submission is synchronized in real-time instantly across all active school voter devices.
                    </p>
                  </div>
                </div>

              </div>

              {/* DETAILED STUDENT SPLIT LISTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                
                {/* 1. Voters Who Have Voted */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6" id="voted_students_panel">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                      <h3 className="text-md font-extrabold text-slate-800">Students Who Have Voted</h3>
                      <p className="text-xs text-slate-400">List of verified ballots submitted ({votersWhoHaveVoted.length})</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => exportListToCSV("voted")}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[300px] scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Admission #</th>
                          <th className="py-2.5 px-3">Grade/Sec</th>
                          <th className="py-2.5 px-3">Roll #</th>
                          <th className="py-2.5 px-3 text-right">Voting Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {votersWhoHaveVoted.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">No voters recorded yet.</td>
                          </tr>
                        ) : (
                          votersWhoHaveVoted.map((v) => (
                            <tr key={v.id}>
                              <td className="py-2 px-3 font-extrabold">{v.name}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">{v.admissionNo}</td>
                              <td className="py-2 px-3">{v.grade} - {v.section}</td>
                              <td className="py-2 px-3">{v.rollNo}</td>
                              <td className="py-2 px-3 text-right font-mono text-indigo-600 font-bold">
                                {v.votedAt ? formatTimestamp(v.votedAt) : "Just now"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Voters Yet to Vote */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6" id="pending_students_panel">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                      <h3 className="text-md font-extrabold text-slate-800">Students Yet to Vote</h3>
                      <p className="text-xs text-slate-400">Registered students with pending ballots ({votersYetToVote.length})</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => exportListToCSV("pending")}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[300px] scrollbar-thin">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Admission #</th>
                          <th className="py-2.5 px-3">Grade/Sec</th>
                          <th className="py-2.5 px-3">Roll #</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {votersYetToVote.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">All registered students have cast their vote!</td>
                          </tr>
                        ) : (
                          votersYetToVote.map((v) => (
                            <tr key={v.id}>
                              <td className="py-2 px-3 font-extrabold">{v.name}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">{v.admissionNo}</td>
                              <td className="py-2 px-3">{v.grade} - {v.section}</td>
                              <td className="py-2 px-3">{v.rollNo}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 2: VOTERS REGISTRY MANAGEMENT */}
          {activeTab === "voters" && (
            <motion.div
              key="voters-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Student Voters Registry</h3>
                  <p className="text-xs text-slate-400">Manage voter lookup files, add records, or bulk copy from excel sheets</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 text-slate-600 hover:text-indigo-600 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    id="bulk_voters_btn"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Excel Bulk Upload</span>
                  </button>
                  <button
                    onClick={handleOpenAddVoter}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    id="add_single_voter_btn"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Single Student</span>
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-100/60">
                {/* Search query input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name or admission no..."
                    value={voterSearch}
                    onChange={(e) => setVoterSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none"
                  />
                </div>

                {/* Grade dropdown */}
                <div className="relative">
                  <Filter className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={voterGradeFilter}
                    onChange={(e) => setVoterGradeFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none appearance-none"
                  >
                    <option value="">All Grades</option>
                    {settings.grades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Section dropdown */}
                <div className="relative">
                  <Grid className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={voterSectionFilter}
                    onChange={(e) => setVoterSectionFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none appearance-none"
                  >
                    <option value="">All Sections</option>
                    {settings.sections.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Status dropdown */}
                <div className="relative">
                  <Vote className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={voterStatusFilter}
                    onChange={(e) => setVoterStatusFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none appearance-none"
                  >
                    <option value="">All Voting Status</option>
                    <option value="voted">Voted Only</option>
                    <option value="pending">Pending Only</option>
                  </select>
                </div>
              </div>

              {/* LIST TABLE */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Admission Number</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Voting Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredVotersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">No student voters found matching filters.</td>
                      </tr>
                    ) : (
                      filteredVotersList.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-800">{v.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{v.admissionNo}</td>
                          <td className="py-3 px-4">{v.grade}</td>
                          <td className="py-3 px-4">{v.section}</td>
                          <td className="py-3 px-4">{v.rollNo}</td>
                          <td className="py-3 px-4">
                            {v.hasVoted ? (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                Voted
                              </span>
                            ) : (
                              <span className="bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditVoter(v)}
                              className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 border border-transparent hover:border-indigo-100 rounded transition-colors cursor-pointer"
                              title="Edit Voter Details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoter(v.id, v.name)}
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-transparent hover:border-rose-100 rounded transition-colors cursor-pointer"
                              title="Delete Voter"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CANDIDATES MANAGEMENT */}
          {activeTab === "candidates" && (
            <motion.div
              key="candidates-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Ballot Candidates Setup</h3>
                  <p className="text-xs text-slate-400">Add election competitors, upload photos, and link symbol icons</p>
                </div>
                <button
                  onClick={handleOpenAddCandidate}
                  disabled={settings.positions.length === 0}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  id="add_candidate_btn"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register Competitor</span>
                </button>
              </div>

              {/* CANDIDATES GRID VIEW */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.length === 0 ? (
                  <div className="col-span-full border border-dashed border-slate-200 p-12 text-center text-slate-400 rounded-2xl">
                    <Award className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-xs font-bold">No candidates registered on this ballot yet.</p>
                  </div>
                ) : (
                  candidates.map((cand) => {
                    const posName = settings.positions.find((p) => p.id === cand.positionId)?.name || cand.positionId;
                    const SymbolIcon = getSymbolIcon(cand.symbolName);
                    const symbolColorClasses = getSymbolColor(cand.symbolName);

                    return (
                      <div 
                        key={cand.id} 
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                      >
                        {/* Upper image + details */}
                        <div className="p-5">
                          <div className="flex gap-4 items-start">
                            {/* Candidate image representation */}
                            <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-200/60 relative">
                              {cand.photoUrl ? (
                                <img 
                                  src={cand.photoUrl} 
                                  alt={cand.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                                  <Users className="h-7 w-7" />
                                </div>
                              )}
                            </div>

                            {/* Candidate info */}
                            <div className="flex-1 space-y-1">
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {posName}
                              </span>
                              <h4 className="text-md font-bold text-slate-800 tracking-tight leading-tight pt-1">
                                {cand.name}
                              </h4>
                            </div>
                          </div>

                          {/* Symbol card detail */}
                          <div className="mt-4 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                              {cand.symbolName === "custom" && cand.symbolUrl ? (
                                <img 
                                  src={cand.symbolUrl} 
                                  alt="Custom symbol" 
                                  className="h-8 w-8 object-contain rounded border border-white"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className={`p-1.5 rounded-md border flex items-center justify-center ${symbolColorClasses}`}>
                                  <SymbolIcon className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Symbol Assigned</p>
                                <p className="text-xs font-bold text-slate-700 uppercase">{cand.symbolName}</p>
                              </div>
                            </div>

                            {/* Current live total vote tally */}
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Votes Tally</p>
                              <p className="text-sm font-black text-slate-800 font-mono">{cand.votesCount} votes</p>
                            </div>
                          </div>

                          {cand.manifesto && (
                            <div className="mt-3.5 pt-3 border-t border-slate-100">
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Election Manifesto</p>
                              <p className="text-xs text-slate-500 italic line-clamp-3">"{cand.manifesto}"</p>
                            </div>
                          )}
                        </div>

                        {/* Lower action bar */}
                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{cand.id}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditCandidate(cand)}
                              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Edit Candidate
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete Candidate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: SYSTEM & ELECTION SETTINGS */}
          {activeTab === "settings" && (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* School Profile and Election timing */}
                <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Election Profile Setup</h3>
                    <p className="text-xs text-slate-400">Configure global metadata and terminal behaviors</p>
                  </div>

                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">School / Institution Name</label>
                        <input
                          type="text"
                          value={settings.schoolName}
                          onChange={async (e) => await updateSettings({ schoolName: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-bold"
                          id="school_name_setting_input"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Election / Ballot Title</label>
                        <input
                          type="text"
                          value={settings.electionTitle}
                          onChange={async (e) => await updateSettings({ electionTitle: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-bold"
                          id="election_title_setting_input"
                        />
                      </div>
                    </div>

                    {/* School logo upload */}
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">School Official Logo</label>
                      <div className="flex items-center gap-5">
                        <div className="h-16 w-16 bg-white rounded-xl border border-slate-200/60 p-2 flex items-center justify-center shrink-0 shadow-sm">
                          {settings.logoUrl ? (
                            <img 
                              src={settings.logoUrl} 
                              alt="Logo preview" 
                              className="h-full w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Award className="h-8 w-8 text-slate-300" />
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 w-fit">
                            <UploadCloud className="h-4 w-4" />
                            <span>Upload Local File</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSchoolLogoUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-slate-400">Supports PNG, JPG. Automatically resizes on upload.</p>
                        </div>
                      </div>
                    </div>

                    {/* Active voting Status Controls */}
                    <div className="border border-slate-200 rounded-2xl p-5 bg-indigo-50/20 border-indigo-100/50">
                      <label className="text-xs font-black text-indigo-900 uppercase tracking-wider block mb-3">Live Election Stage Status</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "draft", label: "🟡 Draft / Registration Mode", desc: "Setting up competitors & voters." },
                          { id: "active", label: "🟢 Active / Live Voting", desc: "Kiosks are unlocked and collecting ballots." },
                          { id: "completed", label: "🔴 Completed / Results Out", desc: "Voting is locked. View official reports." }
                        ].map((stage) => {
                          const isCurrent = settings.electionStatus === stage.id;
                          return (
                            <button
                              key={stage.id}
                              onClick={() => handleToggleStatus(stage.id as any)}
                              className={`flex-1 text-left px-4 py-3.5 border rounded-xl transition-all cursor-pointer ${
                                isCurrent 
                                  ? "bg-white text-indigo-900 border-indigo-500 shadow-md ring-2 ring-indigo-500/10" 
                                  : "bg-transparent text-slate-500 border-slate-200 hover:bg-white hover:text-slate-800"
                              }`}
                              id={`election_status_btn_${stage.id}`}
                            >
                              <p className="text-xs font-black">{stage.label}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1">{stage.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </form>

                  {/* ANNUAL SYSTEM RENEWAL GUARD */}
                  <div className="border border-rose-100 rounded-2xl p-5 bg-rose-50/20">
                    <div className="flex items-start gap-3.5 mb-4">
                      <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-extrabold text-rose-900">Annual Election Reset & Database Renewal</h4>
                        <p className="text-xs text-rose-700/80 mt-1">
                          Permanently wipes all ballot counts, deletes live activity tickers, and resets voter flags to 'Pending' so the entire school system can be reused next year without code changes or data loss.
                        </p>
                      </div>
                    </div>

                    {!showResetConfirm ? (
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
                        id="start_reset_election_flow_btn"
                      >
                        Start System Reset Flow
                      </button>
                    ) : (
                      <div className="space-y-3 max-w-md bg-white border border-rose-100 p-4 rounded-xl shadow-sm">
                        <label className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">
                          Type <span className="underline font-mono">RESET</span> to confirm hard wiping election tallies:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder='RESET'
                            value={resetConfirmWord}
                            onChange={(e) => setResetConfirmWord(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-rose-200 rounded outline-none focus:border-rose-500 font-mono tracking-widest font-black uppercase"
                            id="reset_confirm_input"
                          />
                          <button
                            onClick={handleResetElectionAction}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded cursor-pointer"
                            id="confirm_reset_action_btn"
                          >
                            Wipe Tallies
                          </button>
                          <button
                            onClick={() => {
                              setShowResetConfirm(false);
                              setResetConfirmWord("");
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Database Lists (Grades & Sections and positions setup) */}
                <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Position setups */}
                  <div>
                    <h3 className="text-md font-bold text-slate-800 mb-1">Electoral Offices</h3>
                    <p className="text-xs text-slate-400 mb-3">Define offices contested in this election</p>
                    
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {settings.positions.map((pos) => (
                        <div key={pos.id} className="flex items-center justify-between text-xs font-bold bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
                          <span>{pos.name}</span>
                          <button 
                            onClick={() => handleRemovePosition(pos.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="E.g., Cultural Secretary"
                        value={newPositionInput}
                        onChange={(e) => setNewPositionInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 roundedoutline-none focus:border-indigo-500"
                        id="new_position_input"
                      />
                      <button 
                        onClick={handleAddPosition}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center cursor-pointer"
                        id="add_position_btn"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Grades setup */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-md font-bold text-slate-800 mb-1">Managed School Grades</h3>
                    <p className="text-xs text-slate-400 mb-3">Create list of eligible voter classes</p>
                    
                    <div className="flex flex-wrap gap-1.5 max-h-[130px] overflow-y-auto pr-1">
                      {settings.grades.map((g) => (
                        <span key={g} className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full">
                          <span>{g}</span>
                          <button 
                            onClick={() => handleRemoveGrade(g)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="E.g., Grade 9"
                        value={newGradeInput}
                        onChange={(e) => setNewGradeInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded outline-none focus:border-indigo-500"
                        id="new_grade_input"
                      />
                      <button 
                        onClick={handleAddGrade}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center cursor-pointer"
                        id="add_grade_btn"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sections setup */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-md font-bold text-slate-800 mb-1">Managed Sections</h3>
                    <p className="text-xs text-slate-400 mb-3">Sections / Class streams</p>
                    
                    <div className="flex flex-wrap gap-1.5 max-h-[130px] overflow-y-auto pr-1">
                      {settings.sections.map((sec) => (
                        <span key={sec} className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-100/40 text-indigo-700 border border-indigo-200/40 px-2.5 py-1 rounded-full">
                          <span>{sec}</span>
                          <button 
                            onClick={() => handleRemoveSection(sec)}
                            className="text-indigo-400 hover:text-rose-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder="E.g., Orion"
                        value={newSectionInput}
                        onChange={(e) => setNewSectionInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded outline-none focus:border-indigo-500"
                        id="new_section_input"
                      />
                      <button 
                        onClick={handleAddSection}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center cursor-pointer"
                        id="add_section_btn"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ---------------- MODALS LAYER ---------------- */}

      {/* 1. SINGLE VOTER CREATION MODAL */}
      <AnimatePresence>
        {showVoterModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              id="voter_form_modal"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider">
                  {editingVoter ? `Edit Voter: ${editingVoter.name}` : "Register Student Voter"}
                </h4>
                <button onClick={() => setShowVoterModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVoter} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={voterForm.name}
                    onChange={(e) => setVoterForm({ ...voterForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                    placeholder="E.g., Bhuvan Teja"
                    id="voter_form_name"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Admission Number *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingVoter}
                    value={voterForm.admissionNo}
                    onChange={(e) => setVoterForm({ ...voterForm, admissionNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 disabled:bg-slate-50 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold font-mono tracking-wider"
                    placeholder="E.g., EWS-2026-104"
                    id="voter_form_admission"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Grade *</label>
                    <select
                      value={voterForm.grade}
                      onChange={(e) => setVoterForm({ ...voterForm, grade: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                      id="voter_form_grade"
                    >
                      {settings.grades.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Section *</label>
                    <select
                      value={voterForm.section}
                      onChange={(e) => setVoterForm({ ...voterForm, section: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                      id="voter_form_section"
                    >
                      {settings.sections.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Roll Number</label>
                  <input
                    type="text"
                    value={voterForm.rollNo}
                    onChange={(e) => setVoterForm({ ...voterForm, rollNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                    placeholder="E.g., 24"
                    id="voter_form_roll"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    id="save_voter_modal_btn"
                  >
                    Save Student Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVoterModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. BULK UPLOAD EXCEL / CSV TEXT COPIER */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
              id="bulk_voters_modal"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider">Excel / CSV Bulk Voter Import</h4>
                <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-indigo-50 border border-indigo-100/50 p-4 rounded-xl text-xs space-y-2 text-indigo-900">
                  <p className="font-extrabold flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    <span>How to Bulk Upload from Excel:</span>
                  </p>
                  <p>
                    1. In your Excel spreadsheet, create columns in this exact sequence:
                  </p>
                  <p className="font-mono bg-white p-1 rounded border border-indigo-100 font-bold text-[11px] text-center">
                    AdmissionNumber, StudentName, Grade, Section, RollNumber
                  </p>
                  <p>
                    2. Copy the student rows from Excel (without headers) and paste them directly below as CSV rows (fields separated by commas).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Paste CSV Rows here:</label>
                  <textarea
                    rows={8}
                    value={bulkCsvText}
                    onChange={(e) => {
                      setBulkError("");
                      setBulkCsvText(e.target.value);
                    }}
                    placeholder={`EWS-1001,Ananya Roy,Grade 9,Orion,1
EWS-1002,Bhuvan Teja,Grade 9,Sirius,2
EWS-1003,Chaitanya S,Grade 10,Alpha,5`}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono"
                    id="bulk_voters_textarea"
                  />
                </div>

                {bulkError && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{bulkError}</span>
                  </div>
                )}

                {bulkSuccessMsg && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{bulkSuccessMsg}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={handleBulkUpload}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    id="submit_bulk_upload_btn"
                  >
                    Sync Records to Database
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. CANDIDATE CREATION / EDITING MODAL */}
      <AnimatePresence>
        {showCandidateModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
              id="candidate_form_modal"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider">
                  {editingCandidate ? `Edit Candidate: ${editingCandidate.name}` : "Register Candidate"}
                </h4>
                <button onClick={() => setShowCandidateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCandidate} className="p-6 space-y-4 max-h-[550px] overflow-y-auto">
                <div>
                  <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Competitor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                    placeholder="E.g., Abhinav Reddy"
                    id="candidate_form_name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Electoral Office / Position *</label>
                    <select
                      value={candidateForm.positionId}
                      onChange={(e) => setCandidateForm({ ...candidateForm, positionId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                      id="candidate_form_position"
                    >
                      {settings.positions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Candidate Symbol */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Election Symbol *</label>
                    <select
                      value={candidateForm.symbolName}
                      onChange={(e) => setCandidateForm({ ...candidateForm, symbolName: e.target.value, symbolUrl: "" })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold uppercase"
                      id="candidate_form_symbol_select"
                    >
                      {PREDEFINED_SYMBOLS.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="custom">★ Custom File Upload</option>
                    </select>
                  </div>
                </div>

                {/* Photo and custom symbol upload row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Photo upload */}
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                    <label className="text-xs font-extrabold text-slate-500 block mb-2">HD Student Photo</label>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-white rounded border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                        {candidateForm.photoUrl ? (
                          <img src={candidateForm.photoUrl} alt="Voter upload" className="h-full w-full object-cover rounded" referrerPolicy="no-referrer" />
                        ) : (
                          <Users className="h-6 w-6 text-slate-300" />
                        )}
                      </div>
                      <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded cursor-pointer transition-all">
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCandidatePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Custom symbol upload block (only shown if custom is selected) */}
                  {candidateForm.symbolName === "custom" && (
                    <div className="border border-indigo-50 rounded-xl p-3 bg-indigo-50/10">
                      <label className="text-xs font-extrabold text-slate-500 block mb-2">Custom Symbol Vector</label>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-white rounded border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                          {candidateForm.symbolUrl ? (
                            <img src={candidateForm.symbolUrl} alt="Custom Symbol" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <Award className="h-6 w-6 text-slate-300" />
                          )}
                        </div>
                        <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded cursor-pointer transition-all">
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomSymbolUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-500 block mb-1 uppercase tracking-wide">Election Manifesto (Optional)</label>
                  <textarea
                    rows={3}
                    value={candidateForm.manifesto}
                    onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                    placeholder="Provide a brief summary of student's objectives..."
                    id="candidate_form_manifesto"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    id="save_candidate_modal_btn"
                  >
                    Register / Sync Ballot Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCandidateModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
