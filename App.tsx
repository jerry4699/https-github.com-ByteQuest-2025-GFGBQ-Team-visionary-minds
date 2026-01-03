
import React, { useState, useEffect } from 'react';
import CitizenPortal from './components/CitizenPortal';
import AuthorityDashboard from './components/AuthorityDashboard';
import { Grievance, GrievanceStatus, Priority } from './types';
import { LayoutDashboard, UserCircle, ShieldCheck } from 'lucide-react';

const MOCK_GRIEVANCES: Grievance[] = [
  {
    id: 'G-1024',
    citizenName: 'Rahul Sharma',
    category: 'Civic Infrastructure',
    description: 'Deep pothole on the main crossroad near the metro station, causing traffic issues.',
    priority: Priority.HIGH,
    status: GrievanceStatus.PENDING,
    timestamp: new Date().toISOString(),
    department: 'Public Works Department (PWD)',
    evidenceUrls: ['https://picsum.photos/400/300?random=1'],
    aiAnalysis: {
      sentiment: 'Anxious',
      suggestedResolution: 'Dispatch immediate asphalt repair crew.',
      urgencyReason: 'High risk of vehicular accidents.'
    }
  },
  {
    id: 'G-1025',
    citizenName: 'Anjali Gupta',
    category: 'Sanitation',
    description: 'Garbage collection has not happened in our society for the last 4 days.',
    priority: Priority.MEDIUM,
    status: GrievanceStatus.IN_PROGRESS,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    department: 'Municipal Corporation',
    evidenceUrls: ['https://picsum.photos/400/300?random=2'],
    aiAnalysis: {
      sentiment: 'Frustrated',
      suggestedResolution: 'Reroute secondary collection truck.',
      urgencyReason: 'Health hazard due to accumulating waste.'
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
          />
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2024 CivicCare AI. Empowering Governance with Intelligent Automation.</p>
          <p className="mt-2">Connecting Citizens to Authorities through Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
