
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { 
  AlertCircle, CheckCircle2, Clock, Filter, Search, 
  ArrowUpRight, Map as MapIcon, ChevronRight, MoreHorizontal,
  TrendingUp, Users, Building2
} from 'lucide-react';
import { Grievance, GrievanceStatus, Priority } from '../types';

interface AuthorityDashboardProps {
  grievances: Grievance[];
  onUpdateStatus: (id: string, status: GrievanceStatus) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const PRIORITY_COLORS: Record<string, string> = {
  [Priority.CRITICAL]: 'bg-red-100 text-red-700 border-red-200',
  [Priority.HIGH]: 'bg-orange-100 text-orange-700 border-orange-200',
  [Priority.MEDIUM]: 'bg-blue-100 text-blue-700 border-blue-200',
  [Priority.LOW]: 'bg-slate-100 text-slate-700 border-slate-200',
};

const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ grievances, onUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('all');

  const stats = useMemo(() => {
    const total = grievances.length;
    const pending = grievances.filter(g => g.status === GrievanceStatus.PENDING).length;
    const inProgress = grievances.filter(g => g.status === GrievanceStatus.IN_PROGRESS).length;
    const resolved = grievances.filter(g => g.status === GrievanceStatus.RESOLVED).length;
    const critical = grievances.filter(g => g.priority === Priority.CRITICAL || g.priority === Priority.HIGH).length;
    
    return { total, pending, resolved, inProgress, critical };
  }, [grievances]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    grievances.forEach(g => {
      categories[g.category] = (categories[g.category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [grievances]);

  const filteredGrievances = grievances.filter(g => {
    const matchesSearch = g.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.citizenName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'pending' && (g.status === GrievanceStatus.PENDING || g.status === GrievanceStatus.IN_PROGRESS)) ||
                       (activeTab === 'resolved' && g.status === GrievanceStatus.RESOLVED);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Governance Overview</h2>
          <p className="text-slate-500">Real-time grievances data and AI analytics</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Filter size={16} /> Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md">
            Generate Report <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Grievances', value: stats.total, icon: <Users className="text-blue-500" />, trend: '+12%', color: 'blue' },
          { label: 'Unresolved Cases', value: stats.pending + stats.inProgress, icon: <Clock className="text-orange-500" />, trend: '-5%', color: 'orange' },
          { label: 'Resolution Rate', value: `${Math.round((stats.resolved / stats.total) * 100 || 0)}%`, icon: <CheckCircle2 className="text-green-500" />, trend: '+8%', color: 'green' },
          { label: 'High Priority', value: stats.critical, icon: <AlertCircle className="text-red-500" />, trend: '+2%', color: 'red' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              Departmental Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-bold">Grievance Backlog</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all w-64"
                  />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {(['all', 'pending', 'resolved'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                        activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Grievance</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredGrievances.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{g.id}</span>
                          <span className="text-xs text-slate-500 line-clamp-1">{g.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${PRIORITY_COLORS[g.priority]}`}>
                          {g.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 flex items-center gap-2">
                          <Building2 size={14} className="text-slate-400" />
                          {g.department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={g.status}
                          onChange={(e) => onUpdateStatus(g.id, e.target.value as GrievanceStatus)}
                          className="text-xs font-medium bg-slate-100 border-none rounded px-2 py-1 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.values(GrievanceStatus).map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                          <MoreHorizontal size={18} className="text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredGrievances.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                  <p>No grievances found matching the criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <PieChart size={20} className="text-indigo-600" />
              Category Breakdown
            </h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <MapIcon size={20} />
                <h3>Complaint Hotspots</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Visualizing geospatial clusters to identify infrastructure vulnerabilities.
              </p>
              <div className="aspect-square bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-[0.2em]">Map Visualization</span>
              </div>
              <button className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-medium">
                View Heatmap
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 blur-3xl rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
