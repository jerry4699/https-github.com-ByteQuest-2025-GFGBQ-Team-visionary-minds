
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
  citizenPhone?: string; // Optional: For updates only
  category: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  city: string;   
  state: string;  
  priority: Priority;
  status: GrievanceStatus;
  timestamp: string;
  department: string;
  evidenceUrls: string[];
  assignedTo?: string;
  resolutionNote?: string; // Human-in-the-loop requirement
  aiAnalysis?: {
    sentiment: string;
    suggestedResolution: string;
    urgencyReason: string;
    riskFactors?: string[]; // Bullet points for explainability
    isCriticalFacility?: boolean; // Context awareness
    language?: string;
    urgencyScore: number; 
    imageAnalysis?: {
        status: 'Relevant' | 'Unclear' | 'Review Needed' | 'No Image';
        quality: 'Good' | 'Blurry' | 'Dark' | 'Low Resolution' | 'N/A';
        description: string;
    };
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
