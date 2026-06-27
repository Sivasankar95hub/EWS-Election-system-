export interface Voter {
  id: string; // Admission Number (or UID)
  name: string;
  admissionNo: string;
  grade: string;
  section: string;
  rollNo: string;
  hasVoted: boolean;
  votedAt?: any; // Firestore Timestamp
}

export interface Candidate {
  id: string;
  name: string;
  positionId: string; // Links to a position, e.g., "head_boy"
  symbolName: string; // E.g. "Lotus", "Lion", "Sun", "Bicycle", etc.
  symbolUrl: string; // Base64 or standard URL
  photoUrl: string; // Base64 or standard URL
  manifesto?: string;
  votesCount: number; // Aggregate vote counts (hidden from public, visible to admin)
}

export interface Position {
  id: string; // e.g. "head_boy", "head_girl", "sports_captain"
  name: string; // e.g. "Head Boy", "Head Girl", "Sports Captain"
}

export interface ElectionSettings {
  schoolName: string;
  electionTitle: string;
  logoUrl: string; // Base64 encoded logo image
  electionStatus: 'draft' | 'active' | 'completed';
  grades: string[];
  sections: string[];
  positions: Position[];
}

export interface LiveActivityLog {
  id: string;
  voterName: string;
  admissionNo: string;
  grade: string;
  section: string;
  timestamp: any; // Firestore Timestamp
}
