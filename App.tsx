
import React, { useState } from 'react';
import CitizenPortal from './components/CitizenPortal';
import AuthorityDashboard from './components/AuthorityDashboard';
import WaitlistForm from './components/WaitlistForm';
import { Grievance, GrievanceStatus, Priority, Jurisdiction } from './types';
import { UserCircle, ShieldCheck, LogOut, Briefcase, ChevronRight, Building2, MapPin, ArrowRight } from 'lucide-react';

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
  const [userRole, setUserRole] = useState<Role>(null);
  const [selectedRoleForForm, setSelectedRoleForForm] = useState<Role>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>({ state: '', city: '' });
  const [grievances, setGrievances] = useState<Grievance[]>(MOCK_GRIEVANCES);

  const handleRoleSelect = (role: Role) => {
    setSelectedRoleForForm(role);
    setJurisdiction({ state: '', city: '' }); // Reset
  };

  const handleLogin = () => {
    if (jurisdiction.state) {
      setUserRole(selectedRoleForForm);
      setSelectedRoleForForm(null);
    }
  };

  const addGrievance = (newGrievance: Grievance) => {
    const grievanceWithMeta = {
        ...newGrievance,
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
                        Access <span className="text-blue-600">CivicCare AI</span>
                    </h1>
                    <p className="text-xl text-slate-500 mt-4 leading-relaxed max-w-lg">
                        An intelligent governance platform that separates citizen reporting, officer action, and administrative oversight.
                    </p>
                </div>
             </div>
             
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2">Join our Pilot Program</h3>
                <p className="text-sm text-slate-500 mb-4">Get early access for your municipality.</p>
                <WaitlistForm />
             </div>
          </div>

          {/* Right Side: Role Selection Cards */}
          <div className="space-y-6">
            {!selectedRoleForForm ? (
                <>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Select your role to continue</p>
                    <div className="grid gap-4">
                        {[
                            { id: 'citizen', icon: <UserCircle size={28} />, title: 'Citizen', desc: 'Report issues & track status', color: 'blue' },
                            { id: 'officer', icon: <Briefcase size={28} />, title: 'Grievance Officer', desc: 'Act on city-level priorities', color: 'orange' },
                            { id: 'admin', icon: <Building2 size={28} />, title: 'Administrator', desc: 'State-level oversight', color: 'indigo' }
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
                    <button onClick={() => setSelectedRoleForForm(null)} className="text-sm text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1">
                        &larr; Back to roles
                    </button>
                    
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            {selectedRoleForForm === 'citizen' ? 'Citizen Details' : selectedRoleForForm === 'officer' ? 'Officer Jurisdiction' : 'Admin Oversight'}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {selectedRoleForForm === 'citizen' ? 'Your grievance will be routed to the appropriate local authority.' : 
                             selectedRoleForForm === 'officer' ? 'You will see grievances assigned to your city jurisdiction.' : 
                             'You will oversee grievance performance across jurisdictions.'}
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
                                    {selectedRoleForForm === 'admin' ? 'Select City (Optional)' : 'Select City'}
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select 
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        value={jurisdiction.city}
                                        onChange={(e) => setJurisdiction({ ...jurisdiction, city: e.target.value })}
                                    >
                                        <option value="">{selectedRoleForForm === 'admin' ? 'All Cities' : 'Select City...'}</option>
                                        {CITIES[jurisdiction.state]?.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleLogin}
                            disabled={!jurisdiction.state || (selectedRoleForForm !== 'admin' && !jurisdiction.city)}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl mt-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Continue to Dashboard <ArrowRight size={18} />
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
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-xs font-semibold text-slate-600">Live Jurisdiction: {jurisdiction.city}</span>
                </div>
             )}
             <button
              onClick={() => { setUserRole(null); setJurisdiction({ state: '', city: '' }); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Switch Role</span>
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
          <p className="mt-2 text-slate-500">Aligned with CPGRAMS & India.gov.in standards for Digital Governance.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
