
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
}

export interface DashboardStats {
  total: number;
  pending: number;
  resolved: number;
  criticalCount: number;
  avgResolutionTime: number; // in hours
}
