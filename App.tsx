
import React, { useState, useEffect } from 'react';
import CitizenPortal from './components/CitizenPortal';
import AuthorityDashboard from './components/AuthorityDashboard';
import { Grievance, GrievanceStatus, Priority } from './types';
import { LayoutDashboard, UserCircle, ShieldCheck } from 'lucide-react';

const MOCK_GRIEVANCES: Grievance[] = [
  {
    id: 'G-1024',
    citizenName: 'Rahul Sharma',
    category: 'Road Transport & Highways',
    description: 'Deep pothole on the main crossroad near the metro station, causing traffic issues.',
    priority: Priority.HIGH,
    status: GrievanceStatus.PENDING,
    timestamp: new Date().toISOString(),
    department: 'Department of Public Works (PWD)',
    evidenceUrls: ['https://picsum.photos/400/300?random=1'],
    assignedTo: 'Rajesh Kumar',
    aiAnalysis: {
      sentiment: 'Anxious',
      suggestedResolution: 'Dispatch immediate asphalt repair crew.',
      urgencyReason: 'High risk of vehicular accidents near metro station.',
      urgencyScore: 85,
      language: 'English'
    }
  },
  {
    id: 'G-1025',
    citizenName: 'Anjali Gupta',
    category: 'Public Health & Family Welfare',
    description: 'Garbage collection has not happened in our society for the last 4 days. Foul smell spreading.',
    priority: Priority.MEDIUM,
    status: GrievanceStatus.IN_PROGRESS,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    department: 'Municipal Corporation',
    evidenceUrls: ['https://picsum.photos/400/300?random=2'],
    assignedTo: 'Sita Verma',
    aiAnalysis: {
      sentiment: 'Frustrated',
      suggestedResolution: 'Reroute secondary collection truck.',
      urgencyReason: 'Health hazard due to accumulating waste.',
      urgencyScore: 65,
      language: 'English'
    }
  },
  {
    id: 'G-1026',
    citizenName: 'Vikram Singh',
    category: 'Power & Energy',
    description: 'Live wire hanging from transformer pole outside primary school.',
    priority: Priority.CRITICAL,
    status: GrievanceStatus.PENDING,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    department: 'Electricity Board',
    evidenceUrls: [],
    aiAnalysis: {
      sentiment: 'Panicked',
      suggestedResolution: 'Immediate grid cutoff and emergency repair team dispatch.',
      urgencyReason: 'Immediate threat to life for school children.',
      urgencyScore: 98,
      language: 'Hindi'
    }
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<'citizen' | 'authority'>('citizen');
  const [grievances, setGrievances] = useState<Grievance[]>(MOCK_GRIEVANCES);

  const addGrievance = (newGrievance: Grievance) => {
    setGrievances(prev => [newGrievance, ...prev]);
  };

  const updateGrievanceStatus = (id: string, status: GrievanceStatus) => {
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, status } : g));
  };

  const assignGrievance = (id: string, officer: string) => {
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, assignedTo: officer } : g));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              CivicCare AI
            </span>
          </div>
          
          <nav className="flex gap-1 p-1 bg-slate-100 rounded-full">
            <button
              onClick={() => setView('citizen')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${
                view === 'citizen' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCircle size={18} />
              Citizen Portal
            </button>
            <button
              onClick={() => setView('authority')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${
                view === 'authority' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard size={18} />
              Authority Dashboard
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {view === 'citizen' ? (
          <CitizenPortal onGrievanceSubmit={addGrievance} />
        ) : (
          <AuthorityDashboard 
            grievances={grievances} 
            onUpdateStatus={updateGrievanceStatus}
            onAssignGrievance={assignGrievance}
          />
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2024 CivicCare AI. Powered by Gemini Models.</p>
          <p className="mt-2 text-slate-500">Aligned with CPGRAMS & India.gov.in standards for Digital Governance.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
