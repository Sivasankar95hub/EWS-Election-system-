import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp, 
  writeBatch, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Voter, Candidate, Position, ElectionSettings, LiveActivityLog } from "./types";

// ---------------- FIRESTORE ERROR HANDLING (MANDATORY SKILL PATTERN) ----------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Database Collection names
const SETTINGS_COLLECTION = "settings";
const VOTERS_COLLECTION = "voters";
const CANDIDATES_COLLECTION = "candidates";
const ACTIVITY_COLLECTION = "activity";

// Hardcoded doc ID for settings
const SETTINGS_DOC_ID = "config";

// Default Election Settings
export const DEFAULT_SETTINGS: ElectionSettings = {
  schoolName: "EDIFY WORLD SCHOOL – KURNOOL",
  electionTitle: "Student Council Election 2026",
  logoUrl: "", // Defaults to fallback school shield SVG if empty
  electionStatus: "draft",
  grades: [
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12"
  ],
  sections: [
    "Orion",
    "Sirius",
    "Alpha",
    "Beta",
    "Vega",
    "Galaxy",
    "Phoenix",
    "Ruby",
    "Emerald",
    "Diamond",
    "Lotus",
    "Pearl"
  ],
  positions: [
    { id: "head_boy", name: "Head Boy" },
    { id: "head_girl", name: "Head Girl" },
    { id: "sports_captain", name: "Sports Captain" },
    { id: "cultural_secretary", name: "Cultural Secretary" }
  ]
};

// Seed initial database structure if settings are missing
export async function seedInitialDataIfEmpty() {
  const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  const settingsSnap = await getDoc(settingsRef);
  
  if (!settingsSnap.exists()) {
    console.log("Seeding default election settings...");
    await setDoc(settingsRef, DEFAULT_SETTINGS);
    
    // Seed some sample candidates to make testing easy out-of-the-box
    const sampleCandidates = [
      {
        id: "c1",
        name: "Abhinav Reddy",
        positionId: "head_boy",
        symbolName: "phoenix",
        symbolUrl: "",
        photoUrl: "",
        manifesto: "Striving for absolute student empowerment and a high-tech smart campus.",
        votesCount: 0
      },
      {
        id: "c2",
        name: "Karthik Verma",
        positionId: "head_boy",
        symbolName: "sun",
        symbolUrl: "",
        photoUrl: "",
        manifesto: "To bridges gaps, spark creative arts, and introduce biweekly student sports meets.",
        votesCount: 0
      },
      {
        id: "c3",
        name: "Siri Chowdary",
        positionId: "head_girl",
        symbolName: "crown",
        symbolUrl: "",
        photoUrl: "",
        manifesto: "Encouraging voice, empathy, regular leadership workshops, and eco-clubs.",
        votesCount: 0
      },
      {
        id: "c4",
        name: "Meghana Naidu",
        positionId: "head_girl",
        symbolName: "star",
        symbolUrl: "",
        photoUrl: "",
        manifesto: "Creating an inclusive school environment with peer mentoring networks.",
        votesCount: 0
      },
      {
        id: "c5",
        name: "Rohan K.",
        positionId: "sports_captain",
        symbolName: "lightning",
        symbolUrl: "",
        photoUrl: "",
        manifesto: "Let's bring Kurnool's best sports league. Better equipment, expert coaching.",
        votesCount: 0
      },
      {
        id: "c6",
        name: "Sneha Reddy",
        positionId: "sports_captain",
        symbolName: "shield",
        symbolUrl: "",
        photoUrl: "",
        manifesto: "Championing female sports leagues, yoga sessions, and inter-house cups.",
        votesCount: 0
      }
    ];

    for (const cand of sampleCandidates) {
      await setDoc(doc(db, CANDIDATES_COLLECTION, cand.id), cand);
    }

    // Seed some sample voters for testing
    const sampleVoters = [
      { id: "EWS-1001", name: "Ananya Roy", admissionNo: "EWS-1001", grade: "Grade 9", section: "Orion", rollNo: "1", hasVoted: false },
      { id: "EWS-1002", name: "Bhuvan Teja", admissionNo: "EWS-1002", grade: "Grade 9", section: "Sirius", rollNo: "2", hasVoted: false },
      { id: "EWS-1003", name: "Chaitanya S.", admissionNo: "EWS-1003", grade: "Grade 10", section: "Alpha", rollNo: "5", hasVoted: false },
      { id: "EWS-1004", name: "Divya Naidu", admissionNo: "EWS-1004", grade: "Grade 10", section: "Beta", rollNo: "8", hasVoted: false },
      { id: "EWS-1005", name: "Eshwar Rao", admissionNo: "EWS-1005", grade: "Grade 11", section: "Vega", rollNo: "12", hasVoted: false },
      { id: "EWS-1006", name: "Farhan Khan", admissionNo: "EWS-1006", grade: "Grade 11", section: "Galaxy", rollNo: "14", hasVoted: false },
      { id: "EWS-1007", name: "Gautami Sen", admissionNo: "EWS-1007", grade: "Grade 12", section: "Phoenix", rollNo: "3", hasVoted: false }
    ];

    for (const voter of sampleVoters) {
      await setDoc(doc(db, VOTERS_COLLECTION, voter.id), voter);
    }
    console.log("Seeding complete.");
  }
}

// ---------------- Settings Helpers ----------------

export function listenSettings(callback: (settings: ElectionSettings) => void) {
  const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  return onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as ElectionSettings);
    } else {
      callback(DEFAULT_SETTINGS);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${SETTINGS_DOC_ID}`);
  });
}

export async function updateSettings(settings: Partial<ElectionSettings>) {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await updateDoc(settingsRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SETTINGS_COLLECTION}/${SETTINGS_DOC_ID}`);
  }
}

// ---------------- Candidates Helpers ----------------

export function listenCandidates(callback: (candidates: Candidate[]) => void) {
  const candRef = collection(db, CANDIDATES_COLLECTION);
  return onSnapshot(candRef, (querySnap) => {
    const list: Candidate[] = [];
    querySnap.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id } as Candidate);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, CANDIDATES_COLLECTION);
  });
}

export async function addCandidate(cand: Omit<Candidate, "id" | "votesCount">) {
  const id = "cand_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const newCand: Candidate = {
    ...cand,
    id,
    votesCount: 0
  };
  try {
    await setDoc(doc(db, CANDIDATES_COLLECTION, id), newCand);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CANDIDATES_COLLECTION}/${id}`);
  }
}

export async function updateCandidate(id: string, cand: Partial<Candidate>) {
  try {
    await updateDoc(doc(db, CANDIDATES_COLLECTION, id), cand);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CANDIDATES_COLLECTION}/${id}`);
  }
}

export async function deleteCandidate(id: string) {
  try {
    await deleteDoc(doc(db, CANDIDATES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CANDIDATES_COLLECTION}/${id}`);
  }
}

// ---------------- Voters Helpers ----------------

export function listenVoters(callback: (voters: Voter[]) => void) {
  const votersRef = collection(db, VOTERS_COLLECTION);
  return onSnapshot(votersRef, (querySnap) => {
    const list: Voter[] = [];
    querySnap.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id } as Voter);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, VOTERS_COLLECTION);
  });
}

export async function addVoter(voter: Omit<Voter, "hasVoted" | "id">) {
  const newVoter: Voter = {
    ...voter,
    id: voter.admissionNo.trim().toUpperCase(), // Admission number is the ID
    hasVoted: false
  };
  try {
    await setDoc(doc(db, VOTERS_COLLECTION, newVoter.id), newVoter);
    return newVoter.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${VOTERS_COLLECTION}/${newVoter.id}`);
  }
}

export async function updateVoter(id: string, voter: Partial<Voter>) {
  try {
    const voterRef = doc(db, VOTERS_COLLECTION, id);
    await updateDoc(voterRef, voter);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${VOTERS_COLLECTION}/${id}`);
  }
}

export async function deleteVoter(id: string) {
  try {
    await deleteDoc(doc(db, VOTERS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${VOTERS_COLLECTION}/${id}`);
  }
}

// Bulk Upload Voters
export async function bulkUploadVoters(votersList: Omit<Voter, "hasVoted" | "id">[]) {
  try {
    const batch = writeBatch(db);
    for (const voter of votersList) {
      const docId = voter.admissionNo.trim().toUpperCase();
      const voterRef = doc(db, VOTERS_COLLECTION, docId);
      batch.set(voterRef, {
        ...voter,
        id: docId,
        hasVoted: false
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, VOTERS_COLLECTION);
  }
}

// ---------------- Live Activity / Feed Helpers ----------------

export function listenActivityFeed(callback: (logs: LiveActivityLog[]) => void) {
  const activityRef = collection(db, ACTIVITY_COLLECTION);
  const q = query(activityRef, orderBy("timestamp", "desc"), limit(50));
  return onSnapshot(q, (querySnap) => {
    const list: LiveActivityLog[] = [];
    querySnap.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id } as LiveActivityLog);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, ACTIVITY_COLLECTION);
  });
}

// ---------------- BALLOT CASTING TRANSACTION (CRITICAL FOR RELIABILITY & SECRECY) ----------------

/**
 * Casts a secure ballot.
 * Enforces atomic updates: checks if voter has already voted, updates voter status,
 * increments candidate vote aggregates, and logs live public feed.
 * NO voter ID is linked to the candidate ID inside database documents to preserve 100% ballot secrecy.
 */
export async function castBallot(admissionNo: string, selectedCandidateIds: string[], voterDetails: { name: string, grade: string, section: string }) {
  const id = admissionNo.trim().toUpperCase();
  const voterRef = doc(db, VOTERS_COLLECTION, id);
  
  try {
    return await runTransaction(db, async (transaction) => {
      // 1. READ voter status
      const voterSnap = await transaction.get(voterRef);
      if (!voterSnap.exists()) {
        throw new Error(`Student with Admission Number "${admissionNo}" does not exist in the database.`);
      }
      
      const voterData = voterSnap.data() as Voter;
      if (voterData.hasVoted) {
        throw new Error("This student has already voted. Duplicate submissions are strictly prevented.");
      }

      // 2. READ candidates to verify existence and get current votes
      const candSnaps = [];
      for (const candId of selectedCandidateIds) {
        const candRef = doc(db, CANDIDATES_COLLECTION, candId);
        const snap = await transaction.get(candRef);
        if (!snap.exists()) {
          throw new Error(`Candidate with ID "${candId}" does not exist.`);
        }
        candSnaps.push({ ref: candRef, currentVotes: (snap.data() as Candidate).votesCount || 0 });
      }

      // 3. WRITE: Update voter status to voted
      transaction.update(voterRef, {
        hasVoted: true,
        votedAt: serverTimestamp()
      });

      // 4. WRITE: Increment aggregate counts for selected candidates
      for (const item of candSnaps) {
        transaction.update(item.ref, {
          votesCount: item.currentVotes + 1
        });
      }

      // 5. WRITE: Append dynamic log in the active activity feed (without showing WHO they voted for)
      const logId = "log_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const logRef = doc(db, ACTIVITY_COLLECTION, logId);
      transaction.set(logRef, {
        id: logId,
        voterName: voterDetails.name,
        admissionNo: id,
        grade: voterDetails.grade,
        section: voterDetails.section,
        timestamp: serverTimestamp()
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `ballot_transaction/${id}`);
  }
}

// ---------------- ELECTION RECOVERY & YEARLY RESET HELPERS ----------------

/**
 * Resets the entire election system for reuse.
 * Sets all voter 'hasVoted' flags to false, clears timestamps.
 * Resets candidate votes to 0.
 * Clears the live activity feed logs.
 */
export async function resetElection() {
  try {
    const batch = writeBatch(db);

    // 1. Reset all Voters
    const votersRef = collection(db, VOTERS_COLLECTION);
    const votersSnap = await getDocs(votersRef);
    votersSnap.forEach((vSnap) => {
      batch.update(doc(db, VOTERS_COLLECTION, vSnap.id), {
        hasVoted: false,
        votedAt: null
      });
    });

    // 2. Reset all Candidates votesCount
    const candidatesRef = collection(db, CANDIDATES_COLLECTION);
    const candidatesSnap = await getDocs(candidatesRef);
    candidatesSnap.forEach((cSnap) => {
      batch.update(doc(db, CANDIDATES_COLLECTION, cSnap.id), {
        votesCount: 0
      });
    });

    // 3. Clear all Activity Logs
    const activityRef = collection(db, ACTIVITY_COLLECTION);
    const activitySnap = await getDocs(activityRef);
    activitySnap.forEach((aSnap) => {
      batch.delete(doc(db, ACTIVITY_COLLECTION, aSnap.id));
    });

    // 4. Reset status back to draft
    batch.update(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), {
      electionStatus: "draft"
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "reset_election_batch");
  }
}
