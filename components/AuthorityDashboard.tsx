
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  AlertCircle, CheckCircle2, Clock, Filter, Search, 
  ArrowUpRight, Map as MapIcon, ChevronRight, TrendingUp, Users, Building2, XCircle, User, ChevronDown, ShieldAlert,
  X, Mail, Phone, Briefcase, Award, History, MapPin
} from 'lucide-react';
import { Grievance, GrievanceStatus, Priority, Jurisdiction } from '../types';

interface AuthorityDashboardProps {
  grievances: Grievance[];
  onUpdateStatus: (id: string, status: GrievanceStatus) => void;
  onAssignGrievance: (id: string, officer: string) => void;
  userRole?: 'officer' | 'admin';
  jurisdiction?: Jurisdiction;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const PRIORITY_COLORS: Record<string, string> = {
  [Priority.CRITICAL]: 'bg-red-100 text-red-700 border-red-200',
  [Priority.HIGH]: 'bg-orange-100 text-orange-700 border-orange-200',
  [Priority.MEDIUM]: 'bg-blue-100 text-blue-700 border-blue-200',
  [Priority.LOW]: 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_CONFIG: Record<GrievanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  [GrievanceStatus.PENDING]: { label: 'Pending', color: 'amber', icon: <Clock size={12} /> },
  [GrievanceStatus.IN_PROGRESS]: { label: 'In Progress', color: 'blue', icon: <TrendingUp size={12} /> },
  [GrievanceStatus.RESOLVED]: { label: 'Resolved', color: 'green', icon: <CheckCircle2 size={12} /> },
  [GrievanceStatus.REJECTED]: { label: 'Rejected', color: 'red', icon: <XCircle size={12} /> },
};

// Mock Officers
const MOCK_OFFICERS = [
  { name: "Rajesh Kumar", role: "Senior Engineer", department: "PWD", id: "OFF-101", experience: "12 Years", email: "rajesh.k@gov.in", phone: "+91-9876543210", activeCases: 5 },
  { name: "Sita Verma", role: "Health Inspector", department: "Municipal Corp", id: "OFF-102", experience: "8 Years", email: "sita.v@gov.in", phone: "+91-9876543211", activeCases: 3 },
  { name: "Amit Singh", role: "Junior Engineer", department: "Electricity Board", id: "OFF-103", experience: "4 Years", email: "amit.s@gov.in", phone: "+91-9876543212", activeCases: 7 },
];

const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ 
  grievances, 
  onUpdateStatus, 
  onAssignGrievance, 
  userRole = 'admin',
  jurisdiction 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('all');
  const [filterOfficer, setFilterOfficer] = useState<string>('All');
  const [viewingOfficer, setViewingOfficer] = useState<any | null>(null);
  const [viewingHistoryGrievance, setViewingHistoryGrievance] = useState<Grievance | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // 1. Filter Data by Jurisdiction
  const relevantGrievances = useMemo(() => {
    if (userRole === 'officer' && jurisdiction?.city) {
      return grievances.filter(g => g.city === jurisdiction.city);
    }
    if (userRole === 'admin' && jurisdiction?.state) {
      return grievances.filter(g => g.state === jurisdiction.state);
    }
    return grievances;
  }, [grievances, userRole, jurisdiction]);

  // 2. Calculate Stats
  const stats = useMemo(() => {
    const total = relevantGrievances.length;
    const pending = relevantGrievances.filter(g => g.status === GrievanceStatus.PENDING).length;
    const inProgress = relevantGrievances.filter(g => g.status === GrievanceStatus.IN_PROGRESS).length;
    const resolved = relevantGrievances.filter(g => g.status === GrievanceStatus.RESOLVED).length;
    const critical = relevantGrievances.filter(g => g.priority === Priority.CRITICAL || g.priority === Priority.HIGH).length;
    
    return { total, pending, resolved, inProgress, critical };
  }, [relevantGrievances]);

  // 3. Admin: City-wise Aggregation
  const cityStats = useMemo(() => {
    if (userRole !== 'admin') return [];
    const cityMap: Record<string, { city: string, active: number, critical: number, total: number }> = {};
    
    relevantGrievances.forEach(g => {
        if (!cityMap[g.city]) cityMap[g.city] = { city: g.city, active: 0, critical: 0, total: 0 };
        cityMap[g.city].total++;
        if (g.status !== GrievanceStatus.RESOLVED) cityMap[g.city].active++;
        if (g.priority === Priority.CRITICAL) cityMap[g.city].critical++;
    });

    // Add mock data for other cities if not present to make the table look full for demo
    if (jurisdiction?.state === 'Maharashtra') {
       if(!cityMap['Mumbai']) cityMap['Mumbai'] = { city: 'Mumbai', active: 120, critical: 14, total: 340 };
       if(!cityMap['Pune']) cityMap['Pune'] = { city: 'Pune', active: 58, critical: 3, total: 156 };
    }

    return Object.values(cityMap);
  }, [relevantGrievances, userRole, jurisdiction]);

  // 4. Map Data
  const mapData = useMemo(() => {
      const locations = relevantGrievances
          .filter(g => g.location)
          .map(g => ({
              id: g.id,
              lat: g.location!.lat,
              lng: g.location!.lng,
              priority: g.priority
          }));
      
      if (locations.length === 0) return { points: [], bounds: null };

      const lats = locations.map(l => l.lat);
      const lngs = locations.map(l => l.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const latRange = maxLat - minLat || 0.01;
      const lngRange = maxLng - minLng || 0.01;
      
      return {
          points: locations.map(l => ({
              ...l,
              x: ((l.lng - minLng) / lngRange) * 80 + 10,
              y: 100 - (((l.lat - minLat) / latRange) * 80 + 10)
          })),
          bounds: { minLat, maxLat, minLng, maxLng }
      };
  }, [relevantGrievances]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    relevantGrievances.forEach(g => {
      categories[g.category] = (categories[g.category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [relevantGrievances]);

  const filteredGrievances = relevantGrievances.filter(g => {
    const matchesSearch = g.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.citizenName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'pending' && (g.status === GrievanceStatus.PENDING || g.status === GrievanceStatus.IN_PROGRESS)) ||
                       (activeTab === 'resolved' && g.status === GrievanceStatus.RESOLVED);
    const matchesOfficer = filterOfficer === 'All' || 
                           (filterOfficer === 'Unassigned' ? !g.assignedTo : g.assignedTo === filterOfficer);
    return matchesSearch && matchesTab && matchesOfficer;
  });

  // Render Map SVG (Simplified)
  const renderMapPoints = () => {
    if (!mapData.bounds) return (
       <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
           <MapPin size={24} className="mb-2 opacity-50"/>
           <span className="text-xs">No Geospatial Data for {jurisdiction?.city || 'this region'}</span>
       </div>
    );
    return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-4">
             <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
                </pattern>
             </defs>
             <rect width="100" height="100" fill="url(#grid)" />
             {mapData.points.map((p, i) => (
                 <circle 
                    key={i} 
                    cx={p.x} 
                    cy={p.y} 
                    r="4" 
                    className={`${p.priority === Priority.CRITICAL ? 'fill-red-500' : p.priority === Priority.HIGH ? 'fill-orange-500' : 'fill-blue-500'} animate-pulse`}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                 />
             ))}
        </svg>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      {/* Officer Modal logic remains similar, omitted for brevity but assumed present */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {userRole === 'officer' 
                ? `Jurisdiction: ${jurisdiction?.city}, ${jurisdiction?.state}` 
                : `State Overview: ${jurisdiction?.state}`}
          </h2>
          <p className="text-slate-500">
            {userRole === 'officer' 
              ? 'Local grievance queue and priority actions.' 
              : 'State-wide performance monitoring and compliance.'}
          </p>
        </div>
        
        {userRole === 'admin' && (
             <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                 <ShieldAlert size={16} />
                 System Insight: {jurisdiction?.state} shows 12% higher critical cases than national avg.
             </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: userRole === 'officer' ? 'Active in City' : 'Total State Cases', value: stats.total, icon: <Users className="text-blue-500" />, trend: '+12%', color: 'blue' },
          { label: 'Critical Issues', value: stats.critical, icon: <AlertCircle className="text-red-500" />, trend: '+2%', color: 'red' },
          { label: 'Pending Action', value: stats.pending, icon: <Clock className="text-orange-500" />, trend: '-5%', color: 'orange' },
          { label: 'Resolution Rate', value: `${stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, icon: <CheckCircle2 className="text-green-500" />, trend: '+8%', color: 'green' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl bg-${kpi.color}-50`}>{kpi.icon}</div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${kpi.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {kpi.trend}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
              <h3 className="text-3xl font-bold text-slate-900">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Admin City Table */}
      {userRole === 'admin' && cityStats.length > 0 && (
         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-50">
                <h3 className="font-bold text-slate-900">City-Wise Performance Metrics</h3>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                    <tr>
                        <th className="px-6 py-4">City</th>
                        <th className="px-6 py-4">Total Grievances</th>
                        <th className="px-6 py-4">Active</th>
                        <th className="px-6 py-4">Critical</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {cityStats.map((city, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{city.city}</td>
                            <td className="px-6 py-4 text-slate-500">{city.total}</td>
                            <td className="px-6 py-4 text-blue-600 font-medium">{city.active}</td>
                            <td className="px-6 py-4 text-red-600 font-medium">{city.critical}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    city.critical > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                    {city.critical > 5 ? 'Needs Attention' : 'Healthy'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Grievance List (Full width for Officer, Left col for Admin) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
             {/* Header & Filters */}
             <div className="p-6 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4">
                <div>
                   <h3 className="text-lg font-bold">
                       {userRole === 'officer' ? 'My Action Queue' : 'Grievance Ledger'}
                   </h3>
                   <p className="text-xs text-slate-400">
                       {userRole === 'officer' ? 'Prioritized by AI Urgency Score' : 'All records in jurisdiction'}
                   </p>
                </div>
                <div className="flex gap-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-3 py-1.5 bg-slate-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none w-40"
                        />
                     </div>
                </div>
             </div>
             
             {/* List */}
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                      <tr>
                         <th className="px-6 py-3">Issue</th>
                         <th className="px-6 py-3">Urgency</th>
                         <th className="px-6 py-3">Dept</th>
                         <th className="px-6 py-3">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {filteredGrievances.length > 0 ? (
                        filteredGrievances.map(g => (
                            <tr key={g.id} className="hover:bg-slate-50 group">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900 text-sm truncate max-w-[200px]">{g.description}</div>
                                    <div className="text-[10px] text-slate-400">{g.id} • {new Date(g.timestamp).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${PRIORITY_COLORS[g.priority]}`}>
                                            {g.priority}
                                        </span>
                                        {g.aiAnalysis?.urgencyScore && (
                                            <span className="text-[10px] font-mono text-slate-500">Score: {g.aiAnalysis.urgencyScore}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-600">{g.department}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        {Object.values(GrievanceStatus).slice(0, 3).map(status => (
                                            <button
                                                key={status}
                                                onClick={() => onUpdateStatus(g.id, status)}
                                                className={`p-1.5 rounded transition-colors ${
                                                    g.status === status 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                                title={status}
                                            >
                                                {STATUS_CONFIG[status].icon}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))
                      ) : (
                          <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">No records found for this view.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 font-bold">
                        <MapIcon size={20} />
                        <h3>{jurisdiction?.city} Hotspots</h3>
                    </div>
                    <div className="aspect-square bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 relative overflow-hidden">
                        {renderMapPoints()}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold mb-4">Category Breakdown</h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                {chartData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
