import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  AlertCircle, CheckCircle2, Clock, Search, 
  Map as MapIcon, TrendingUp, Users, XCircle, ShieldAlert,
  MapPin, Lightbulb, ChevronDown, ChevronUp, Image as ImageIcon, Phone, Navigation
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

// Mock "Central Office" locations for routing demo
const CITY_CENTERS: Record<string, { lat: number, lng: number }> = {
  'New Delhi': { lat: 28.6139, lng: 77.2090 }, // Connaught Place
  'Nagpur': { lat: 21.1458, lng: 79.0882 }, // Sitabuldi
  'Pune': { lat: 18.5204, lng: 73.8567 }, // Shivajinagar
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Noida': { lat: 28.5355, lng: 77.3910 }
};

const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ 
  grievances, 
  onUpdateStatus, 
  userRole = 'admin',
  jurisdiction 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Google Maps State
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const markersRef = useRef<any[]>([]);

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

  // 2. Statistics Calculation
  const stats = useMemo(() => {
    const total = relevantGrievances.length;
    const pending = relevantGrievances.filter(g => g.status === GrievanceStatus.PENDING).length;
    const inProgress = relevantGrievances.filter(g => g.status === GrievanceStatus.IN_PROGRESS).length;
    const resolved = relevantGrievances.filter(g => g.status === GrievanceStatus.RESOLVED).length;
    const critical = relevantGrievances.filter(g => g.priority === Priority.CRITICAL || g.priority === Priority.HIGH).length;
    
    // Simulate Escalations (e.g., pending > 7 days)
    const escalated = relevantGrievances.filter(g => {
        const diffTime = Math.abs(new Date().getTime() - new Date(g.timestamp).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return (g.status === GrievanceStatus.PENDING || g.status === GrievanceStatus.IN_PROGRESS) && diffDays > 7;
    }).length;

    // Simulate Avg Resolution Time
    const avgResolutionHours = resolved > 0 ? 48 : 0; // Simulated constant for demo

    return { total, pending, inProgress, resolved, critical, escalated, avgResolutionHours };
  }, [relevantGrievances]);

  // 3. Admin: City-wise Aggregation Data
  const cityStats = useMemo(() => {
    if (userRole !== 'admin') return [];
    
    // Base data from current grievances
    const cityMap: Record<string, { city: string, active: number, critical: number, avgRes: string, escalations: number }> = {};
    
    relevantGrievances.forEach(g => {
        if (!cityMap[g.city]) cityMap[g.city] = { city: g.city, active: 0, critical: 0, avgRes: '0 days', escalations: 0 };
        if (g.status !== GrievanceStatus.RESOLVED) cityMap[g.city].active++;
        if (g.priority === Priority.CRITICAL) cityMap[g.city].critical++;
        
        // Mock escalation logic
        const diffTime = Math.abs(new Date().getTime() - new Date(g.timestamp).getTime());
        if (diffTime > 7 * 24 * 60 * 60 * 1000 && g.status !== GrievanceStatus.RESOLVED) {
            cityMap[g.city].escalations++;
        }
    });

    // Populate mock data for demo visual completeness (Hardcoded as per prompt req)
    if (jurisdiction?.state === 'Maharashtra') {
       if(!cityMap['Nagpur']) cityMap['Nagpur'] = { city: 'Nagpur', active: 42, critical: 6, avgRes: '3.2 days', escalations: 4 };
       if(!cityMap['Pune']) cityMap['Pune'] = { city: 'Pune', active: 58, critical: 3, avgRes: '2.1 days', escalations: 1 };
       if(!cityMap['Mumbai']) cityMap['Mumbai'] = { city: 'Mumbai', active: 120, critical: 14, avgRes: '4.6 days', escalations: 9 };
    } else if (jurisdiction?.state === 'Delhi') {
       if(!cityMap['New Delhi']) cityMap['New Delhi'] = { city: 'New Delhi', active: 35, critical: 8, avgRes: '1.8 days', escalations: 2 };
       if(!cityMap['North Delhi']) cityMap['North Delhi'] = { city: 'North Delhi', active: 62, critical: 11, avgRes: '4.1 days', escalations: 7 };
    }

    // Merge existing calculations with mock if any overlap (prefer real data if > 0)
    return Object.values(cityMap);
  }, [relevantGrievances, userRole, jurisdiction]);

  const filteredGrievances = relevantGrievances.filter(g => {
    const matchesSearch = g.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.citizenName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'pending' && (g.status === GrievanceStatus.PENDING || g.status === GrievanceStatus.IN_PROGRESS)) ||
                       (activeTab === 'resolved' && g.status === GrievanceStatus.RESOLVED);
    return matchesSearch && matchesTab;
  });

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    relevantGrievances.forEach(g => {
      categories[g.category] = (categories[g.category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [relevantGrievances]);

  // Load Google Maps Script
  useEffect(() => {
    if ((window as any).google || isMapLoaded) {
      setIsMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup not typically needed for singleton script, but good practice to limit side effects if needed
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (isMapLoaded && mapRef.current && !mapInstance) {
      const defaultCenter = jurisdiction?.city && CITY_CENTERS[jurisdiction.city] 
        ? CITY_CENTERS[jurisdiction.city] 
        : { lat: 20.5937, lng: 78.9629 }; // India center fallback

      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: jurisdiction?.city ? 13 : 5,
        styles: [
            { "featureType": "poi", "stylers": [{ "visibility": "off" }] } // Cleaner map
        ],
        mapTypeControl: false,
        streetViewControl: false,
      });

      const renderer = new (window as any).google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: '#2563eb', strokeOpacity: 0.8, strokeWeight: 5 }
      });
      renderer.setMap(map);
      
      setMapInstance(map);
      setDirectionsRenderer(renderer);
    }
  }, [isMapLoaded, mapRef, jurisdiction]);

  // Update Markers
  useEffect(() => {
    if (!mapInstance || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    filteredGrievances.forEach(g => {
        if (g.location) {
            const marker = new (window as any).google.maps.Marker({
                position: g.location,
                map: mapInstance,
                title: g.description,
                icon: {
                    path: (window as any).google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: g.priority === Priority.CRITICAL ? '#ef4444' : g.priority === Priority.HIGH ? '#f97316' : '#3b82f6',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#ffffff',
                }
            });
            
            // Add click listener to select row
            marker.addListener('click', () => {
                setExpandedRow(g.id);
            });

            markersRef.current.push(marker);
        }
    });

  }, [mapInstance, filteredGrievances, isMapLoaded]);

  // Calculate Route when Expanded Row Changes
  useEffect(() => {
    if (!mapInstance || !directionsRenderer || !isMapLoaded || !(window as any).google) return;

    if (expandedRow) {
        const selectedGrievance = filteredGrievances.find(g => g.id === expandedRow);
        
        if (selectedGrievance && selectedGrievance.location) {
            const city = selectedGrievance.city || 'New Delhi';
            const origin = CITY_CENTERS[city] || CITY_CENTERS['New Delhi'];

            const directionsService = new (window as any).google.maps.DirectionsService();

            directionsService.route({
                origin: origin,
                destination: selectedGrievance.location,
                travelMode: (window as any).google.maps.TravelMode.DRIVING
            }, (result: any, status: any) => {
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                    // Extract duration and distance
                    const leg = result.routes[0].legs[0];
                    setRouteInfo({
                        distance: leg.distance.text,
                        duration: leg.duration.text
                    });
                } else {
                    console.error('Directions request failed due to ' + status);
                    setRouteInfo(null);
                }
            });
        }
    } else {
        // Clear route if closed
        directionsRenderer.setDirections({ routes: [] });
        setRouteInfo(null);
        // Reset zoom to city level
        if (jurisdiction?.city && CITY_CENTERS[jurisdiction.city]) {
             mapInstance.panTo(CITY_CENTERS[jurisdiction.city]);
             mapInstance.setZoom(13);
        }
    }
  }, [expandedRow, mapInstance, directionsRenderer, filteredGrievances, isMapLoaded]);


  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {userRole === 'officer' 
                ? `Jurisdiction: ${jurisdiction?.city}, ${jurisdiction?.state}` 
                : `State Overview: ${jurisdiction?.state}`}
          </h2>
          <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm">
             <ShieldAlert size={14} className="text-blue-600"/>
             {userRole === 'officer' 
              ? 'Real-time grievance prioritization & resolution dashboard.' 
              : 'Monitoring administrative performance and public satisfaction.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold uppercase tracking-widest border border-yellow-200 rounded-full">
                Pilot Simulation
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest border border-slate-200 rounded-full">
                Sample Data
            </span>
        </div>
      </div>

      {/* DASHBOARD CARDS - RENDER LOGIC BASED ON ROLE */}
      
      {userRole === 'officer' ? (
        // *** OFFICER DASHBOARD ***
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Grievances */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users size={60} className="text-blue-600" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Grievances (City)</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-extrabold text-slate-900">{stats.pending + stats.inProgress}</h3>
                    <span className="text-sm font-medium text-slate-500 mb-1">Assigned</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-xs font-medium text-blue-600 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Current Load
                </div>
            </div>

            {/* Critical Issues */}
            <div className="bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertCircle size={60} className="text-red-600" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Critical Issues</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-extrabold text-red-600">{stats.critical}</h3>
                    <span className="text-sm font-medium text-red-600 mb-1">Immediate</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-xs font-medium text-slate-500">
                    Requires immediate attention
                </div>
            </div>

            {/* Average Resolution Time */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clock size={60} className="text-green-600" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Resolution Time</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-extrabold text-slate-900">{stats.avgResolutionHours}</h3>
                    <span className="text-sm font-medium text-slate-500 mb-1">Hours</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-xs font-medium text-green-600">
                    Within City SLA
                </div>
            </div>

            {/* Escalated Cases */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldAlert size={60} className="text-orange-600" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Escalated Cases</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-extrabold text-slate-900">{stats.escalated}</h3>
                    <span className="text-sm font-medium text-slate-500 mb-1">Overdue</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-xs font-medium text-orange-600">
                    Pending beyond SLA
                </div>
            </div>
        </div>
      ) : (
        // *** ADMIN DASHBOARD ***
        <div className="space-y-8">
            {/* 1. Admin Insight Card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
                <div className="p-4 bg-white rounded-full text-indigo-600 shadow-sm shrink-0">
                    <Lightbulb size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="text-lg font-bold text-indigo-900 mb-1">System Insights</h4>
                    <p className="text-indigo-800 leading-relaxed">
                        "Nagpur shows a higher critical-to-resolution ratio compared to the state average. Recommend deploying additional resources to PWD sector."
                    </p>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                    AI Analysis
                </div>
            </div>

            {/* 2. City-Wise Stats Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">City-Wise Performance Oversight</h3>
                    <div className="text-xs text-slate-400 font-medium">Live Data Refresh</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">City</th>
                                <th className="px-6 py-4 text-center">Active Cases</th>
                                <th className="px-6 py-4 text-center">Critical Issues</th>
                                <th className="px-6 py-4 text-center">Avg Resolution</th>
                                <th className="px-6 py-4 text-center">Escalations</th>
                                <th className="px-6 py-4 text-right">Health Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {cityStats.map((city, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900">{city.city}</td>
                                    <td className="px-6 py-4 text-center font-medium text-slate-600">{city.active}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                            city.critical > 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {city.critical}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500">{city.avgRes}</td>
                                    <td className="px-6 py-4 text-center">
                                        {city.escalations > 0 && (
                                            <span className="text-orange-600 font-bold flex items-center justify-center gap-1">
                                                <AlertCircle size={12} /> {city.escalations}
                                            </span>
                                        )}
                                        {city.escalations === 0 && <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                            city.critical > 10 ? 'bg-red-50 text-red-700 border-red-100' :
                                            city.escalations > 5 ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            'bg-green-50 text-green-700 border-green-100'
                                        }`}>
                                            {city.critical > 10 ? 'Critical Attention' : city.escalations > 5 ? 'Delayed' : 'Healthy'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Main Content Grid (Shared Layout Structure) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* Grievance List (Left Column) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             {/* Header & Filters */}
             <div className="p-6 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">
                       {userRole === 'officer' ? 'My Action Queue' : 'Grievance Ledger'}
                   </h3>
                   <p className="text-xs text-slate-400 mt-1">
                       {userRole === 'officer' ? 'Prioritized by AI Public Safety Risk Score' : 'All records in state jurisdiction'}
                   </p>
                </div>
                <div className="flex gap-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search descriptions..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-3 py-1.5 bg-slate-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none w-48"
                        />
                     </div>
                </div>
             </div>
             
             {/* List */}
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold tracking-wider">
                      <tr>
                         <th className="px-6 py-3">Issue Detail</th>
                         <th className="px-6 py-3">Urgency</th>
                         <th className="px-6 py-3">Dept</th>
                         <th className="px-6 py-3">Action</th>
                         <th className="px-6 py-3 w-10"></th> 
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {filteredGrievances.length > 0 ? (
                        filteredGrievances.map(g => (
                            <React.Fragment key={g.id}>
                                <tr className="hover:bg-slate-50 group transition-colors cursor-pointer" onClick={() => toggleExpand(g.id)}>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{g.description}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{g.id} • {new Date(g.timestamp).toLocaleDateString()}</div>
                                        {g.evidenceUrls && g.evidenceUrls.length > 0 && (
                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 font-medium">
                                                <ImageIcon size={10} />
                                                {g.evidenceUrls.length} Image{g.evidenceUrls.length > 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${PRIORITY_COLORS[g.priority]}`}>
                                                {g.priority}
                                            </span>
                                            {g.aiAnalysis?.urgencyScore && (
                                                <span className="text-[10px] font-mono text-slate-400">Score: {g.aiAnalysis.urgencyScore}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{g.department}</td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            {Object.values(GrievanceStatus).slice(0, 3).map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => onUpdateStatus(g.id, status)}
                                                    className={`p-1.5 rounded transition-all ${
                                                        g.status === status 
                                                        ? 'bg-slate-900 text-white shadow-sm' 
                                                        : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                    }`}
                                                    title={STATUS_CONFIG[status].label}
                                                >
                                                    {STATUS_CONFIG[status].icon}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        {expandedRow === g.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </td>
                                </tr>
                                {/* Expanded Details Row */}
                                {expandedRow === g.id && (
                                    <tr className="bg-slate-50/50">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {/* Left: Contact & Location */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Citizen Details</h4>
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                            <div className="flex items-center gap-2 mb-1 font-semibold text-slate-900">
                                                                <Users size={14} className="text-blue-500" />
                                                                {g.citizenName}
                                                            </div>
                                                            {g.citizenPhone && (
                                                                <div className="flex items-center gap-2 text-slate-600 mb-2">
                                                                    <Phone size={14} className="text-slate-400" />
                                                                    {g.citizenPhone}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Updated Location Section */}
                                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                                                <div className="flex items-start gap-2 text-slate-700 mb-1">
                                                                    <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
                                                                    <span className="font-medium">{g.location ? g.location.address : 'No address provided'}</span>
                                                                </div>
                                                                {g.location && (
                                                                    <div className="flex gap-2 pl-6 mt-1">
                                                                        <span className="text-[10px] font-mono bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                                            Lat: {g.location.lat.toFixed(5)}
                                                                        </span>
                                                                        <span className="text-[10px] font-mono bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                                            Lng: {g.location.lng.toFixed(5)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {g.aiAnalysis?.imageAnalysis && (
                                                        <div>
                                                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">AI Image Insights</h4>
                                                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm">
                                                                <div className="flex items-center gap-2 font-semibold text-indigo-900 mb-1">
                                                                    <Lightbulb size={14} />
                                                                    Status: {g.aiAnalysis.imageAnalysis.status}
                                                                </div>
                                                                <div className="text-indigo-800 text-xs leading-relaxed mb-2">
                                                                    {g.aiAnalysis.imageAnalysis.description}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                                                        g.aiAnalysis.imageAnalysis.quality === 'Good' 
                                                                        ? 'bg-green-100 text-green-700 border-green-200' 
                                                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                                                    }`}>
                                                                        Quality: {g.aiAnalysis.imageAnalysis.quality}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2 text-[10px] text-indigo-400 italic">
                                                                    *AI assists in relevance check only.
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Evidence Gallery */}
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Evidence Gallery</h4>
                                                    {g.evidenceUrls && g.evidenceUrls.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {g.evidenceUrls.map((url, idx) => (
                                                                <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200 bg-white">
                                                                    <img src={url} alt={`Evidence ${idx}`} className="w-full h-full object-cover" />
                                                                    <a 
                                                                        href={url} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium text-xs"
                                                                    >
                                                                        View Full
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-24 bg-slate-100 rounded-lg border border-slate-200 border-dashed flex items-center justify-center text-slate-400 text-xs">
                                                            No images attached
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))
                      ) : (
                          <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">No active grievances found for this view.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* Sidebar (Right Column) */}
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-1 text-white overflow-hidden relative shadow-lg h-[400px] flex flex-col">
                <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                        <MapIcon size={16} />
                        <h3>Geospatial Intelligence</h3>
                    </div>
                </div>
                
                {routeInfo && (
                     <div className="absolute bottom-4 left-4 right-4 z-10 bg-white text-slate-900 p-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <Navigation size={20} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Estimated Travel</div>
                                <div className="font-bold text-lg leading-none">{routeInfo.duration} <span className="text-sm font-normal text-slate-400">({routeInfo.distance})</span></div>
                            </div>
                        </div>
                        <div className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded">
                            Fastest Route
                        </div>
                     </div>
                )}
                
                {/* Google Map Container */}
                <div ref={mapRef} className="w-full h-full rounded-lg" />
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-slate-400"/>
                    Category Distribution
                </h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={chartData} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={50} 
                                outerRadius={70} 
                                paddingAngle={5} 
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {chartData.slice(0, 3).map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            {entry.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
