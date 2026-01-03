
export enum GrievanceStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED'
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface GrievanceHistory {
  timestamp: string;
  action: string;
  details: string;
}

export interface Grievance {
  id: string;
  citizenName: string;
  category: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  city: string;   // Added for jurisdiction filtering
  state: string;  // Added for jurisdiction filtering
  priority: Priority;
  status: GrievanceStatus;
  timestamp: string;
  department: string;
  evidenceUrls: string[];
  assignedTo?: string;
  aiAnalysis?: {
    sentiment: string;
    suggestedResolution: string;
    urgencyReason: string;
    language?: string;
    urgencyScore: number; // 0-100 score based on risk assessment
  };
  history?: GrievanceHistory[];
}

export interface DashboardStats {
  total: number;
  pending: number;
  resolved: number;
  criticalCount: number;
  avgResolutionTime: number; // in hours
}

export interface Jurisdiction {
  state: string;
  city: string;
}
