
import React, { useState, useEffect } from 'react';
import CitizenPortal from './components/CitizenPortal';
import AuthorityDashboard from './components/AuthorityDashboard';
import WaitlistForm from './components/WaitlistForm';
import { Grievance, GrievanceStatus, Priority, Jurisdiction } from './types';
import { UserCircle, ShieldCheck, LogOut, Briefcase, ChevronRight, Building2, MapPin, ArrowRight, Info } from 'lucide-react';

// Enhanced Mock Data with City/State
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
    city: 'New Delhi',
    state: 'Delhi',
    aiAnalysis: {
      sentiment: 'Anxious',
      suggestedResolution: 'Dispatch immediate asphalt repair crew.',
      urgencyReason: 'High risk of vehicular accidents near metro station.',
      urgencyScore: 85,
      language: 'English'
    },
    location: { lat: 28.6139, lng: 77.2090, address: 'Connaught Place, New Delhi' },
    history: [{ timestamp: new Date().toISOString(), action: 'Created', details: 'Grievance reported by citizen' }]
  },
  {
    id: 'G-1025',
    citizenName: 'User Guest',
    category: 'Public Health & Family Welfare',
    description: 'Garbage collection has not happened in our society for the last 4 days. Foul smell spreading.',
    priority: Priority.MEDIUM,
    status: GrievanceStatus.IN_PROGRESS,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    department: 'Municipal Corporation',
    evidenceUrls: [],
    assignedTo: 'Sita Verma',
    city: 'Nagpur',
    state: 'Maharashtra',
    aiAnalysis: {
      sentiment: 'Frustrated',
      suggestedResolution: 'Reroute secondary collection truck.',
      urgencyReason: 'Health hazard due to accumulating waste.',
      urgencyScore: 65,
      language: 'English'
    },
    location: { lat: 21.1458, lng: 79.0882, address: 'Sitabuldi, Nagpur' },
    history: [{ timestamp: new Date(Date.now() - 86400000).toISOString(), action: 'Created', details: 'Reported' }]
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
    city: 'New Delhi',
    state: 'Delhi',
    aiAnalysis: {
      sentiment: 'Panicked',
      suggestedResolution: 'Immediate grid cutoff.',
      urgencyReason: 'Immediate threat to life.',
      urgencyScore: 98,
      language: 'Hindi'
    },
    location: { lat: 28.7041, lng: 77.1025, address: 'Pitampura, New Delhi' },
    history: [{ timestamp: new Date().toISOString(), action: 'Created', details: 'Reported' }]
  },
  {
    id: 'G-1027',
    citizenName: 'Priya Desai',
    category: 'Water Supply',
    description: 'Contaminated water supply in Sector 4 for past 2 days.',
    priority: Priority.HIGH,
    status: GrievanceStatus.RESOLVED,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    department: 'Jal Board',
    evidenceUrls: [],
    city: 'Pune',
    state: 'Maharashtra',
    assignedTo: 'Amit Singh',
    aiAnalysis: {
      sentiment: 'Concerned',
      suggestedResolution: 'Water quality test and pipe flush.',
      urgencyReason: 'Public health risk.',
      urgencyScore: 82,
      language: 'English'
    },
    location: { lat: 18.5204, lng: 73.8567, address: 'Shivajinagar, Pune' },
    history: [{ timestamp: new Date().toISOString(), action: 'Created', details: 'Reported' }]
  },
   {
    id: 'G-1028',
    citizenName: 'Anil Kapoor',
    category: 'Law & Order',
    description: 'Street lights not working on MG Road, creating safety issues at night.',
    priority: Priority.MEDIUM,
    status: GrievanceStatus.PENDING,
    timestamp: new Date(Date.now() - 40000000).toISOString(),
    department: 'Municipal Corporation',
    evidenceUrls: [],
    city: 'Nagpur',
    state: 'Maharashtra',
    aiAnalysis: {
      sentiment: 'Worried',
      suggestedResolution: 'Repair street light circuit.',
      urgencyReason: 'Night safety concern.',
      urgencyScore: 60,
      language: 'Marathi'
    },
    location: { lat: 21.1458, lng: 79.0882, address: 'MG Road, Nagpur' },
    history: [{ timestamp: new Date().toISOString(), action: 'Created', details: 'Reported' }]
  }
];

const STATES = ['Maharashtra', 'Delhi', 'Uttar Pradesh'];
const CITIES: Record<string, string[]> = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur'],
  'Delhi': ['New Delhi', 'North Delhi'],
  'Uttar Pradesh': ['Noida', 'Lucknow']
};

type Role = 'citizen' | 'officer' | 'admin' | null;

const App: React.FC = () => {
  // Initialize state from local storage if available
  const [userRole, setUserRole] = useState<Role>(() => {
    return (localStorage.getItem('civic_role') as Role) || null;
  });
  
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(() => {
    const saved = localStorage.getItem('civic_jurisdiction');
    return saved ? JSON.parse(saved) : { state: '', city: '' };
  });

  const [selectedRoleForForm, setSelectedRoleForForm] = useState<Role>(null);
  const [grievances, setGrievances] = useState<Grievance[]>(MOCK_GRIEVANCES);

  // Persistence Effects
  useEffect(() => {
    if (userRole) localStorage.setItem('civic_role', userRole);
    else localStorage.removeItem('civic_role');
  }, [userRole]);

  useEffect(() => {
    if (jurisdiction.state) localStorage.setItem('civic_jurisdiction', JSON.stringify(jurisdiction));
    else localStorage.removeItem('civic_jurisdiction');
  }, [jurisdiction]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRoleForForm(role);
    // Do not reset jurisdiction immediately if it exists, allow user to change it
  };

  const handleLogin = () => {
    if (jurisdiction.state) {
      setUserRole(selectedRoleForForm);
      setSelectedRoleForForm(null);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setJurisdiction({ state: '', city: '' });
    localStorage.clear();
  };

  const addGrievance = (newGrievance: Grievance) => {
    const grievanceWithMeta = {
        ...newGrievance,
        // If user is a citizen, assign to default demo jurisdiction or infer from location in a real app
        // For simulation, we pin it to the active officer/admin view or default to New Delhi
        city: jurisdiction.city || 'New Delhi',
        state: jurisdiction.state || 'Delhi',
        history: [{ timestamp: new Date().toISOString(), action: 'Created', details: 'Grievance reported by citizen' }]
    };
    setGrievances(prev => [grievanceWithMeta, ...prev]);
  };

  const updateGrievanceStatus = (id: string, status: GrievanceStatus) => {
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, status } : g));
  };

  const assignGrievance = (id: string, officer: string) => {
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, assignedTo: officer || undefined } : g));
  };

  const myGrievances = grievances.filter(g => g.citizenName === 'User Guest');

  // Landing Page with Role & Jurisdiction Selector
  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Brand & Waitlist */}
          <div className="space-y-8 lg:pr-8">
             <div className="space-y-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <ShieldCheck className="text-white w-10 h-10" />
                </div>
                <div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        <span className="text-blue-600">CivicCare AI</span>
                        <span className="block text-3xl md:text-4xl mt-2 text-slate-700">Governance Intelligence Platform</span>
                    </h1>
                    <p className="text-lg text-slate-600 mt-6 leading-relaxed max-w-lg border-l-4 border-blue-200 pl-4">
                        "Public grievance systems fail not because complaints are missing, but because officers lack timely, jurisdiction-specific prioritization."
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                        CivicCare AI introduces jurisdiction-aware grievance intelligence, enabling city-level action with state-level oversight.
                    </p>
                </div>
             </div>
             
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2">Join Pilot Program</h3>
                <p className="text-sm text-slate-500 mb-4">Request access for your municipal corporation.</p>
                <WaitlistForm />
             </div>
          </div>

          {/* Right Side: Role Selection Cards */}
          <div className="space-y-6">
            {!selectedRoleForForm ? (
                <>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Select Role for Simulation</p>
                    <div className="grid gap-4">
                        {[
                            { id: 'citizen', icon: <UserCircle size={28} />, title: 'Citizen', desc: 'Report grievances & track resolution status', color: 'blue' },
                            { id: 'officer', icon: <Briefcase size={28} />, title: 'Grievance Officer', desc: 'Actionable city-level priority dashboard', color: 'orange' },
                            { id: 'admin', icon: <Building2 size={28} />, title: 'Administrator', desc: 'State-level oversight & performance analytics', color: 'indigo' }
                        ].map((role) => (
                            <button 
                                key={role.id}
                                onClick={() => handleRoleSelect(role.id as Role)}
                                className={`flex items-center gap-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 text-left group relative overflow-hidden`}
                            >
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-${role.color}-50 text-${role.color}-600 group-hover:bg-${role.color}-600 group-hover:text-white transition-colors`}>
                                    {role.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900">{role.title}</h3>
                                    <p className="text-sm text-slate-500">{role.desc}</p>
                                </div>
                                <div className={`text-${role.color}-600 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    <ChevronRight />
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl animate-in fade-in slide-in-from-right-8 duration-300">
                    <button onClick={() => setSelectedRoleForForm(null)} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1">
                        &larr; Back to Role Selection
                    </button>
                    
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            {selectedRoleForForm === 'citizen' ? 'Citizen Portal Access' : selectedRoleForForm === 'officer' ? 'Officer Jurisdiction' : 'Administrative Oversight'}
                        </h2>
                        <p className="text-slate-500 text-sm border-l-2 border-blue-500 pl-3">
                            {selectedRoleForForm === 'citizen' ? 'Grievances are routed automatically based on administrative jurisdiction.' : 
                             selectedRoleForForm === 'officer' ? 'You will only see grievances assigned to your specific city jurisdiction.' : 
                             'Monitor grievance redressal performance across all cities in the state.'}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Select State</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    value={jurisdiction.state}
                                    onChange={(e) => setJurisdiction({ state: e.target.value, city: '' })}
                                >
                                    <option value="">Select State...</option>
                                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        {jurisdiction.state && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    {selectedRoleForForm === 'admin' ? 'Primary City Context (Optional)' : 'Select City Jurisdiction'}
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select 
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        value={jurisdiction.city}
                                        onChange={(e) => setJurisdiction({ ...jurisdiction, city: e.target.value })}
                                    >
                                        <option value="">{selectedRoleForForm === 'admin' ? 'View All Cities' : 'Select City...'}</option>
                                        {CITIES[jurisdiction.state]?.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleLogin}
                            disabled={!jurisdiction.state || (selectedRoleForForm !== 'admin' && !jurisdiction.city)}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl mt-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20"
                        >
                            Enter Simulation <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
        
        <div className="mt-12 text-center text-xs text-slate-400 max-w-2xl">
            <p>Aligned with CPGRAMS & Digital India Standards. This is a pilot simulation for evaluation purposes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
               <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 leading-none">
                CivicCare AI
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                {userRole === 'citizen' ? 'Citizen Portal' : userRole === 'officer' ? 'Officer Workspace' : 'Admin Dashboard'}
                <span className="text-slate-300">|</span>
                <span className="text-blue-600">{jurisdiction.city ? jurisdiction.city : jurisdiction.state}</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {userRole === 'officer' && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-xs font-semibold">Jurisdiction Active: {jurisdiction.city}</span>
                </div>
             )}
             <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {userRole === 'citizen' ? (
          <CitizenPortal 
             onGrievanceSubmit={addGrievance} 
             recentGrievances={myGrievances}
          />
        ) : (
          <AuthorityDashboard 
            grievances={grievances} 
            onUpdateStatus={updateGrievanceStatus}
            onAssignGrievance={assignGrievance}
            userRole={userRole}
            jurisdiction={jurisdiction}
          />
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2024 CivicCare AI. Powered by Gemini Models.</p>
          <p className="mt-2 text-slate-500">
             Disclaimer: This is a pilot simulation for evaluation purposes. AI assists officers by prioritizing issues; final decisions remain with human authorities.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
