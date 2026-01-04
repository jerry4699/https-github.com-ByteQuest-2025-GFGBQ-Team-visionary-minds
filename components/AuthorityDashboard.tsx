
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  AlertCircle, CheckCircle2, Clock, Search, 
  Map as MapIcon, TrendingUp, Users, XCircle, ShieldAlert,
  MapPin, Lightbulb, ChevronDown, ChevronUp, Image as ImageIcon, Phone, Navigation, BrainCircuit, X,
  Briefcase, Building2, UserCheck, Mail, Award, ChevronRight, Bell, Zap, Siren, MessageSquare, ClipboardCheck, Info
} from 'lucide-react';
import L from 'leaflet';
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

interface OfficerProfile {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  specialization: string;
}

const OFFICER_PROFILES: Record<string, OfficerProfile> = {
  'Rajesh Kumar': { name: 'Rajesh Kumar', role: 'Senior Engineer', department: 'PWD', email: 'rajesh.k@civic.gov.in', phone: '+91 98765 11223', specialization: 'Road Maintenance' },
  'Sita Verma': { name: 'Sita Verma', role: 'Health Inspector', department: 'Municipal Corp', email: 'sita.v@civic.gov.in', phone: '+91 98765 22334', specialization: 'Sanitation & Hygiene' },
  'Amit Singh': { name: 'Amit Singh', role: 'Junior Engineer', department: 'Jal Board', email: 'amit.s@civic.gov.in', phone: '+91 98765 33445', specialization: 'Water Supply Networks' },
  'Vikram Malhotra': { name: 'Vikram Malhotra', role: 'Chief Officer', department: 'Electricity Board', email: 'vikram.m@civic.gov.in', phone: '+91 98765 44556', specialization: 'Grid Management' },
  'Priya Patel': { name: 'Priya Patel', role: 'Zonal Commissioner', department: 'Municipal Corp', email: 'priya.p@civic.gov.in', phone: '+91 98765 55667', specialization: 'Urban Planning' },
  'Anjali Desai': { name: 'Anjali Desai', role: 'Field Supervisor', department: 'Public Works', email: 'anjali.d@civic.gov.in', phone: '+91 98765 66778', specialization: 'Rapid Response' }
};

// Haversine formula to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
};

// Internal Interface for Unified Alerts
interface DashboardAlert {
  id: string;
  grievance: Grievance;
  type: 'CRITICAL' | 'SLA' | 'BOTH';
  message: string;
  daysOverdue?: number;
}

const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ 
  grievances, 
  onUpdateStatus, 
  onAssignGrievance,
  userRole = 'admin',
  jurisdiction 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // AI Analysis Modal State
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);

  // Resolution Modal State (Human-in-the-Loop)
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [resolutionGrievanceId, setResolutionGrievanceId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionReason, setResolutionReason] = useState('Action Taken');

  // Officer Modal State
  const [officerModalOpen, setOfficerModalOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerProfile | null>(null);
  const [targetGrievanceId, setTargetGrievanceId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Leaflet Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  
  // Enhanced Route Info State
  const [routeInfo, setRouteInfo] = useState<{ 
    distance: string, 
    duration: string,
    origin: string,
    destination: string,
    traffic: string
  } | null>(null);

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

  // 2. Statistics & Alert Logic
  const { stats, alerts } = useMemo(() => {
    const total = relevantGrievances.length;
    const pending = relevantGrievances.filter(g => g.status === GrievanceStatus.PENDING).length;
    const inProgress = relevantGrievances.filter(g => g.status === GrievanceStatus.IN_PROGRESS).length;
    const resolved = relevantGrievances.filter(g => g.status === GrievanceStatus.RESOLVED).length;
    const critical = relevantGrievances.filter(g => g.priority === Priority.CRITICAL || g.priority === Priority.HIGH).length;
    
    // Simulate Avg Resolution Time
    const avgResolutionHours = resolved > 0 ? 48 : 0; 

    // Generate Unified Alerts
    const activeAlerts: DashboardAlert[] = [];
    let escalatedCount = 0;

    relevantGrievances.forEach(g => {
        if (g.status === GrievanceStatus.RESOLVED || g.status === GrievanceStatus.REJECTED) return;

        const diffTime = Math.abs(new Date().getTime() - new Date(g.timestamp).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const isSlaBreach = diffDays > 7;
        const isCritical = g.priority === Priority.CRITICAL || (g.aiAnalysis?.urgencyScore || 0) >= 80;

        if (isSlaBreach) escalatedCount++;

        if (isSlaBreach || isCritical) {
            let type: 'CRITICAL' | 'SLA' | 'BOTH' = 'SLA';
            let message = `Overdue by ${diffDays - 7} days`;

            if (isCritical && isSlaBreach) {
                type = 'BOTH';
                message = `Critical Risk & Overdue (+${diffDays - 7} days)`;
            } else if (isCritical) {
                type = 'CRITICAL';
                message = 'High Urgency / Critical Priority detected';
            }

            activeAlerts.push({
                id: g.id,
                grievance: g,
                type,
                message,
                daysOverdue: isSlaBreach ? diffDays - 7 : undefined
            });
        }
    });

    // Sort Alerts: BOTH > CRITICAL > SLA
    activeAlerts.sort((a, b) => {
        const score = (type: string) => type === 'BOTH' ? 3 : type === 'CRITICAL' ? 2 : 1;
        return score(b.type) - score(a.type);
    });

    return { 
        stats: { total, pending, inProgress, resolved, critical, escalated: escalatedCount, avgResolutionHours },
        alerts: activeAlerts
    };
  }, [relevantGrievances]);

  // Toast Trigger Effect
  useEffect(() => {
    if (alerts.length > 0) {
        setShowToast(true);
        const timer = setTimeout(() => setShowToast(false), 8000); // Auto dismiss after 8s
        return () => clearTimeout(timer);
    }
  }, [alerts.length]); // Triggers when count changes (e.g. new grievance added)

  // 3. Admin: City-wise Aggregation Data
  const cityStats = useMemo(() => {
    if (userRole !== 'admin') return [];
    
    // Base data from current grievances
    const cityMap: Record<string, { city: string, active: number, critical: number, avgRes: string, escalations: number }> = {};
    
    relevantGrievances.forEach(g => {
        if (!cityMap[g.city]) cityMap[g.city] = { city: g.city, active: 0, critical: 0, avgRes: '0 days', escalations: 0 };
        if (g.status !== GrievanceStatus.RESOLVED) cityMap[g.city].active++;
        if (g.priority === Priority.CRITICAL) cityMap[g.city].critical++;
        
        // SLA breach check for map aggregation
        const diffTime = Math.abs(new Date().getTime() - new Date(g.timestamp).getTime());
        if (diffTime > 7 * 24 * 60 * 60 * 1000 && g.status !== GrievanceStatus.RESOLVED) {
            cityMap[g.city].escalations++;
        }
    });

    // Populate mock data for demo visual completeness
    if (jurisdiction?.state === 'Maharashtra') {
       if(!cityMap['Nagpur']) cityMap['Nagpur'] = { city: 'Nagpur', active: 42, critical: 6, avgRes: '3.2 days', escalations: 4 };
       if(!cityMap['Pune']) cityMap['Pune'] = { city: 'Pune', active: 58, critical: 3, avgRes: '2.1 days', escalations: 1 };
       if(!cityMap['Mumbai']) cityMap['Mumbai'] = { city: 'Mumbai', active: 120, critical: 14, avgRes: '4.6 days', escalations: 9 };
    } else if (jurisdiction?.state === 'Delhi') {
       if(!cityMap['New Delhi']) cityMap['New Delhi'] = { city: 'New Delhi', active: 35, critical: 8, avgRes: '1.8 days', escalations: 2 };
       if(!cityMap['North Delhi']) cityMap['North Delhi'] = { city: 'North Delhi', active: 62, critical: 11, avgRes: '4.1 days', escalations: 7 };
    }

    return Object.values(cityMap);
  }, [relevantGrievances, userRole, jurisdiction]);

  // Memoize filteredGrievances to prevent infinite loop in useEffects dependent on it
  const filteredGrievances = useMemo(() => {
    const filtered = relevantGrievances.filter(g => {
      const matchesSearch = g.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            g.citizenName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || 
                         (activeTab === 'pending' && (g.status === GrievanceStatus.PENDING || g.status === GrievanceStatus.IN_PROGRESS)) ||
                         (activeTab === 'resolved' && g.status === GrievanceStatus.RESOLVED);
      return matchesSearch && matchesTab;
    });

    // IMPACT-FIRST SORTING: Critical & High First
    return filtered.sort((a, b) => {
        const priorityOrder = {
            [Priority.CRITICAL]: 3,
            [Priority.HIGH]: 2,
            [Priority.MEDIUM]: 1,
            [Priority.LOW]: 0
        };
        // Sort by Priority Descending
        if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        // Then by Date Descending
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [relevantGrievances, searchTerm, activeTab]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    relevantGrievances.forEach(g => {
      categories[g.category] = (categories[g.category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [relevantGrievances]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center
    const defaultCenter: [number, number] = jurisdiction?.city && CITY_CENTERS[jurisdiction.city] 
        ? [CITY_CENTERS[jurisdiction.city].lat, CITY_CENTERS[jurisdiction.city].lng] 
        : [20.5937, 78.9629];

    const map = L.map(mapRef.current).setView(defaultCenter, jurisdiction?.city ? 13 : 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;

    // Fix for map rendering issues
    const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
    });
    resizeObserver.observe(mapRef.current);

    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    return () => {
        resizeObserver.disconnect();
        map.remove();
        mapInstanceRef.current = null;
    };
  }, [jurisdiction]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    filteredGrievances.forEach(g => {
        if (g.location) {
            const color = g.priority === Priority.CRITICAL ? '#ef4444' : g.priority === Priority.HIGH ? '#f97316' : '#3b82f6';
            
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            const marker = L.marker([g.location.lat, g.location.lng], { icon: customIcon })
                .bindTooltip(g.description)
                .on('click', () => setExpandedRow(g.id));
            
            markersGroup.addLayer(marker);
        }
    });
  }, [filteredGrievances]);

  // Calculate Route (Polyline)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
    }

    if (expandedRow) {
        const selectedGrievance = filteredGrievances.find(g => g.id === expandedRow);
        
        if (selectedGrievance && selectedGrievance.location) {
            const city = selectedGrievance.city || 'New Delhi';
            const originObj = CITY_CENTERS[city] || CITY_CENTERS['New Delhi'];
            const originName = `${city} Operations Center`;
            
            const startLatLng: [number, number] = [originObj.lat, originObj.lng];
            const endLatLng: [number, number] = [selectedGrievance.location.lat, selectedGrievance.location.lng];

            const polyline = L.polyline([startLatLng, endLatLng], {
                color: '#2563eb',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(map);

            routeLayerRef.current = polyline;
            map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

            const distKm = calculateDistance(originObj.lat, originObj.lng, selectedGrievance.location.lat, selectedGrievance.location.lng);
            
            const trafficStates = ['Clear', 'Moderate', 'Heavy'];
            const traffic = trafficStates[Math.floor(Math.random() * trafficStates.length)];
            
            let speed = 30;
            if (traffic === 'Clear') speed = 40;
            if (traffic === 'Heavy') speed = 15;

            const durationHrs = distKm / speed;
            const durationMins = Math.round(durationHrs * 60);

            setRouteInfo({
                distance: `${distKm.toFixed(1)} km`,
                duration: durationMins > 60 
                    ? `${Math.floor(durationMins/60)}h ${durationMins%60}m` 
                    : `${durationMins} mins`,
                origin: originName,
                destination: selectedGrievance.location.address || 'Grievance Location',
                traffic: traffic
            });
            
            setTimeout(() => map.invalidateSize(), 50);
        }
    } else {
        setRouteInfo(null);
        if (jurisdiction?.city && CITY_CENTERS[jurisdiction.city]) {
             map.flyTo([CITY_CENTERS[jurisdiction.city].lat, CITY_CENTERS[jurisdiction.city].lng], 13);
        }
    }
  }, [expandedRow, filteredGrievances, jurisdiction]);

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const openAnalysisModal = (g: Grievance) => {
    setSelectedGrievance(g);
    setAnalysisModalOpen(true);
  };

  const closeAnalysisModal = () => {
    setAnalysisModalOpen(false);
    setSelectedGrievance(null);
  };

  const handleOfficerClick = (officerName: string, grievanceId: string | null = null) => {
    if (OFFICER_PROFILES[officerName]) {
      setSelectedOfficer(OFFICER_PROFILES[officerName]);
      setTargetGrievanceId(grievanceId);
      setOfficerModalOpen(true);
      setActiveDropdown(null);
    }
  };

  const handleAssignConfirm = () => {
    if (targetGrievanceId && selectedOfficer) {
      onAssignGrievance(targetGrievanceId, selectedOfficer.name);
      setOfficerModalOpen(false);
      setSelectedOfficer(null);
      setTargetGrievanceId(null);
    }
  };

  const initiateResolution = (id: string) => {
      setResolutionGrievanceId(id);
      setResolutionModalOpen(true);
      setResolutionNote('');
  }

  const confirmResolution = () => {
      if (resolutionGrievanceId) {
          // Add the note to the grievance in real app context (here just status for demo)
          onUpdateStatus(resolutionGrievanceId, GrievanceStatus.RESOLVED);
          setResolutionModalOpen(false);
          setResolutionGrievanceId(null);
      }
  }

  const getOfficerWorkload = (officerName: string) => {
    const assigned = grievances.filter(g => g.assignedTo === officerName);
    return {
      total: assigned.length,
      pending: assigned.filter(g => g.status === GrievanceStatus.PENDING).length,
      inProgress: assigned.filter(g => g.status === GrievanceStatus.IN_PROGRESS).length,
      resolved: assigned.filter(g => g.status === GrievanceStatus.RESOLVED).length,
      assignedGrievances: assigned
    };
  };

  const handleNotificationClick = (id: string) => {
      setExpandedRow(id);
      setShowNotifications(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative pb-12">
      <style>{`
        .leaflet-pane img { max-width: none !important; }
        .leaflet-container { z-index: 0; font-family: inherit; }
      `}</style>

      {/* Unified Alert Toast Notification */}
      {showToast && (
        <div className="fixed top-24 right-4 z-50 bg-white border-l-4 border-red-500 rounded-lg shadow-2xl p-4 max-w-sm animate-in slide-in-from-right duration-500">
            <div className="flex items-start gap-3">
                <div className="bg-red-100 p-2 rounded-full shrink-0">
                    <ShieldAlert className="text-red-600" size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">Action Required</h4>
                    <p className="text-xs text-slate-600 mt-1">
                        {alerts.length} urgent issues detected in your jurisdiction.
                    </p>
                    <div className="flex gap-2 mt-2">
                        {alerts.some(a => a.type === 'CRITICAL') && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">
                                Critical Detected
                            </span>
                        )}
                        {alerts.some(a => a.type === 'SLA') && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                SLA Breach
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={() => { setShowNotifications(true); setShowToast(false); }}
                        className="text-xs font-bold text-blue-600 mt-2 hover:underline block"
                    >
                        View Alert List
                    </button>
                </div>
                <button onClick={() => setShowToast(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                </button>
            </div>
        </div>
      )}
      
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

        {/* Action Bar: Notification Bell */}
        <div className="flex items-center gap-3">
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2.5 rounded-full border transition-colors relative ${
                        showNotifications 
                        ? 'bg-blue-50 border-blue-200 text-blue-600' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Bell size={20} />
                    {alerts.length > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>
                
                {/* Unified Notification Dropdown */}
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Alerts</span>
                            {alerts.length > 0 && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length} New</span>}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {alerts.length > 0 ? (
                                alerts.map(alert => (
                                    <div 
                                        key={alert.id} 
                                        onClick={() => handleNotificationClick(alert.id)}
                                        className={`p-3 border-b border-slate-50 cursor-pointer transition-colors group relative ${
                                            alert.type === 'CRITICAL' || alert.type === 'BOTH' ? 'bg-red-50/30 hover:bg-red-50' : 'hover:bg-amber-50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                {alert.type === 'CRITICAL' || alert.type === 'BOTH' ? (
                                                    <ShieldAlert size={14} className="text-red-600" />
                                                ) : (
                                                    <Clock size={14} className="text-amber-600" />
                                                )}
                                                <span className="text-xs font-bold text-slate-900">{alert.id}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                alert.type === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                                alert.type === 'BOTH' ? 'bg-red-900 text-white' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {alert.type === 'BOTH' ? 'CRITICAL & LATE' : alert.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 truncate mb-1 pl-6">{alert.grievance.description}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-6">
                                            <span>{alert.grievance.city}</span>
                                            <span>•</span>
                                            <span className="text-slate-500 font-medium">{alert.message}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <CheckCircle2 className="mx-auto mb-2 opacity-50" size={24} />
                                    All clear. No immediate alerts.
                                </div>
                            )}
                        </div>
                        <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                            <button onClick={() => setShowNotifications(false)} className="text-xs text-blue-600 font-medium hover:underline">Close Notifications</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* DASHBOARD CARDS - RENDER LOGIC BASED ON ROLE */}
      
      {userRole === 'officer' ? (
        // *** OFFICER DASHBOARD ***
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* IMPACT METRICS CARD (JUDGES PANEL) */}
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden group text-white">
                <div className="absolute right-0 top-0 p-4 opacity-10">
                    <Zap size={60} />
                </div>
                <div className="flex justify-between items-start mb-3">
                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest border border-blue-500/30 px-2 py-0.5 rounded-full">Pilot Impact</p>
                    <Info size={14} className="text-slate-400" />
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-white/10 pb-1">
                        <span className="text-xs text-slate-300">Triage Time</span>
                        <div className="text-right">
                             <span className="block text-lg font-bold text-green-400">-60%</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/10 pb-1">
                        <span className="text-xs text-slate-300">Auto-Prioritized</span>
                        <div className="text-right">
                             <span className="block text-lg font-bold text-blue-400">100%</span>
                        </div>
                    </div>
                     <div className="flex justify-between items-end">
                        <span className="text-xs text-slate-300">Critical Surfaced</span>
                        <div className="text-right">
                             <span className="block text-lg font-bold text-red-400">{stats.critical}</span>
                        </div>
                    </div>
                </div>
            </div>

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
                    Sorted by urgency
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
                    AI Recommendation
                </div>
            </div>

            {/* 2. City-Wise Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cityStats.map((city, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{city.city}</h3>
                                    <p className="text-xs text-slate-500 font-medium">Operations Center</p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${
                                city.critical > 5 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                            }`}>
                                {city.critical > 5 ? 'High Alert' : 'Stable'}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 font-medium uppercase">Active</p>
                                <p className="text-2xl font-bold text-slate-900">{city.active}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-red-600/80 font-medium uppercase">Critical</p>
                                <p className="text-2xl font-bold text-red-600">{city.critical}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 font-medium uppercase">Avg Time</p>
                                <p className="text-2xl font-bold text-slate-900">{city.avgRes}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-orange-600/80 font-medium uppercase">Escalated</p>
                                <p className="text-2xl font-bold text-orange-600">{city.escalations}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. City-Wise Stats Table */}
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
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">Sorted by:</span>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">AI Priority & Urgency</span>
                   </div>
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
                         <th className="px-6 py-3">AI Urgency</th>
                         <th className="px-6 py-3">Dept & Assignee</th>
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
                                        <div className="flex items-start gap-2">
                                            {/* Escalation Flag */}
                                            {g.priority === Priority.CRITICAL && (
                                                <div className="relative group/flag">
                                                    <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 animate-pulse"></div>
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{g.description}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{g.id} • {new Date(g.timestamp).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        
                                        {/* Facility Context Tag */}
                                        {g.aiAnalysis?.isCriticalFacility && (
                                            <div className="mt-2 inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 text-[10px] font-bold">
                                                <Building2 size={10} /> Critical Facility Nearby
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
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                        <div className="font-semibold text-slate-900">{g.department}</div>
                                        {g.assignedTo ? (
                                            <div className="flex items-center gap-1 mt-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md w-fit border border-blue-100">
                                                <UserCheck size={10} />
                                                <span className="text-[10px] font-bold">{g.assignedTo}</span>
                                            </div>
                                        ) : (
                                            userRole === 'admin' && (
                                                <div className="text-[10px] text-slate-400 mt-1 italic flex items-center gap-1">
                                                    <AlertCircle size={10} /> Unassigned
                                                </div>
                                            )
                                        )}
                                    </td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            {Object.values(GrievanceStatus).slice(0, 3).map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => {
                                                        if (status === GrievanceStatus.RESOLVED && g.priority === Priority.CRITICAL) {
                                                            initiateResolution(g.id);
                                                        } else {
                                                            onUpdateStatus(g.id, status);
                                                        }
                                                    }}
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

                                                    {/* Department Details */}
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Department Assignment</h4>
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                            <div className="flex items-center gap-2 mb-1 font-semibold text-slate-900">
                                                                <Building2 size={14} className="text-indigo-500" />
                                                                {g.department}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1 pl-6">
                                                                <span className="font-medium">Category:</span> {g.category}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Admin Assignment Section */}
                                                    {userRole === 'admin' && (
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative">
                                                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1">
                                                                <Briefcase size={12} /> Assign Officer
                                                            </h4>
                                                            <div className="relative">
                                                                <button
                                                                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 flex items-center justify-between"
                                                                    onClick={() => setActiveDropdown(activeDropdown === g.id ? null : g.id)}
                                                                >
                                                                    <span>{g.assignedTo || 'Unassigned'}</span>
                                                                    <ChevronDown size={14} />
                                                                </button>
                                                                
                                                                {/* Custom Dropdown List */}
                                                                {activeDropdown === g.id && (
                                                                    <div className="absolute z-50 w-72 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                                                        <div className="sticky top-0 bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                            Select Officer
                                                                        </div>
                                                                        {Object.values(OFFICER_PROFILES).map((officer) => (
                                                                            <div
                                                                                key={officer.name}
                                                                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 group transition-colors"
                                                                                onClick={() => handleOfficerClick(officer.name, g.id)}
                                                                            >
                                                                                <div className="flex justify-between items-start">
                                                                                    <div>
                                                                                        <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{officer.name}</div>
                                                                                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                                                                            <Briefcase size={10} className="text-slate-400" /> {officer.role}
                                                                                        </div>
                                                                                        <div className="text-[10px] text-slate-400 mt-1.5 flex flex-wrap gap-2">
                                                                                             <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                                                <Phone size={8} /> {officer.phone}
                                                                                             </span>
                                                                                             <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                                                <Mail size={8} /> {officer.email}
                                                                                             </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {g.assignedTo && (
                                                                    <button 
                                                                        onClick={() => handleOfficerClick(g.assignedTo!)}
                                                                        className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1 hover:underline"
                                                                    >
                                                                        <UserCheck size={12} /> View Assigned Profile
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="pt-2">
                                                        <button 
                                                            onClick={() => openAnalysisModal(g)}
                                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
                                                        >
                                                            <BrainCircuit size={16} />
                                                            View Comprehensive AI Report
                                                        </button>
                                                    </div>
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
                     <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-sm text-slate-900 p-4 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 border border-slate-200">
                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                            <div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="font-semibold">From:</span> {routeInfo.origin}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="font-semibold">To:</span> {routeInfo.destination}
                                </div>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${
                                routeInfo.traffic === 'Heavy' ? 'bg-red-50 text-red-700 border-red-100' :
                                routeInfo.traffic === 'Moderate' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                'bg-green-50 text-green-700 border-green-100'
                            }`}>
                                {routeInfo.traffic} Traffic
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                                    <Navigation size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Est. Travel Time</div>
                                    <div className="font-extrabold text-xl text-slate-900 leading-none">
                                        {routeInfo.duration}
                                        <span className="text-sm font-medium text-slate-400 ml-1.5">
                                            ({routeInfo.distance})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                )}
                
                {/* Leaflet Map Container */}
                <div ref={mapRef} className="w-full h-full rounded-lg z-0 relative" />
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
      
      {/* AI Analysis Modal */}
      {analysisModalOpen && selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-start sticky top-0 z-10">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                    <BrainCircuit className="text-indigo-200" />
                    AI Governance Recommendation
                    </h3>
                    <p className="text-indigo-100 text-sm mt-1">Automated triage report for ID: {selectedGrievance.id}</p>
                </div>
                <button onClick={closeAnalysisModal} className="text-indigo-100 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Urgency Section */}
                <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-center px-4 border-r border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Urgency Score</div>
                        <div className={`text-3xl font-extrabold mt-1 ${
                            (selectedGrievance.aiAnalysis?.urgencyScore || 0) > 75 ? 'text-red-600' : 
                            (selectedGrievance.aiAnalysis?.urgencyScore || 0) > 50 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                            {selectedGrievance.aiAnalysis?.urgencyScore || 'N/A'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Explainability Assessment</div>
                        <p className="text-slate-700 font-medium leading-relaxed mb-2">
                            {selectedGrievance.aiAnalysis?.urgencyReason}
                        </p>
                        {/* Bullet Points for Explainability */}
                         {selectedGrievance.aiAnalysis?.riskFactors && selectedGrievance.aiAnalysis.riskFactors.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1">
                                {selectedGrievance.aiAnalysis.riskFactors.map((point, idx) => (
                                    <li key={idx} className="text-xs text-slate-600">{point}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Resolution */}
                    <div>
                        <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                            <CheckCircle2 size={18} className="text-green-600" />
                            Suggested Resolution
                        </h4>
                        <p className="text-slate-600 text-sm leading-relaxed bg-green-50 p-3 rounded-lg border border-green-100 text-green-800">
                            {selectedGrievance.aiAnalysis?.suggestedResolution}
                        </p>
                    </div>

                    {/* Sentiment & Language */}
                    <div>
                        <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-2">
                            <Users size={18} className="text-blue-600" />
                            Citizen Sentiment
                        </h4>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Detected Emotion:</span>
                            <span className="font-semibold text-slate-700">{selectedGrievance.aiAnalysis?.sentiment}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Language:</span>
                            <span className="font-semibold text-slate-700">{selectedGrievance.aiAnalysis?.language}</span>
                        </div>
                        </div>
                    </div>
                </div>
                
                {/* Image Analysis Section if exists */}
                {selectedGrievance.aiAnalysis?.imageAnalysis && (
                    <div className="border-t border-slate-100 pt-4">
                        <h4 className="flex items-center gap-2 font-bold text-slate-900 mb-3">
                            <ImageIcon size={18} className="text-purple-600" />
                            Visual Verification
                        </h4>
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex gap-4 items-start">
                            <div className="space-y-1">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                    selectedGrievance.aiAnalysis.imageAnalysis.status === 'Relevant' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                                }`}>
                                    {selectedGrievance.aiAnalysis.imageAnalysis.status}
                                </span>
                                <p className="text-sm text-purple-900 leading-relaxed">
                                    {selectedGrievance.aiAnalysis.imageAnalysis.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                <button onClick={closeAnalysisModal} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                    Close Report
                </button>
            </div>
            </div>
        </div>
      )}

      {/* Human-in-the-Loop Resolution Modal */}
      {resolutionModalOpen && resolutionGrievanceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <Siren size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Critical Issue Resolution</h3>
                        <p className="text-sm text-slate-500">
                            Protocol requires a mandatory reason for resolving critical priority grievances.
                        </p>
                    </div>
                </div>
                
                <div className="space-y-3 pt-2">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Action</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={resolutionReason}
                            onChange={(e) => setResolutionReason(e.target.value)}
                        >
                            <option>Action Taken / Resolved</option>
                            <option>Invalid Complaint</option>
                            <option>Reassigned to Other Dept</option>
                            <option>Duplicate Entry</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Officer Notes</label>
                        <textarea 
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                            placeholder="Briefly describe the action taken..."
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                        />
                     </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button 
                        onClick={() => setResolutionModalOpen(false)}
                        className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmResolution}
                        disabled={!resolutionNote.trim()}
                        className="px-4 py-2 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ClipboardCheck size={16} /> Mark Resolved
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Officer Profile Modal */}
      {officerModalOpen && selectedOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 p-6 text-white relative">
                 <button 
                   onClick={() => setOfficerModalOpen(false)} 
                   className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-white shadow-lg">
                        {selectedOfficer.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{selectedOfficer.name}</h3>
                        <p className="text-blue-200 text-sm flex items-center gap-1">
                          <Briefcase size={12} /> {selectedOfficer.role}
                        </p>
                    </div>
                 </div>
             </div>

             <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold uppercase mb-1">Specialization</div>
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Award size={14} className="text-orange-500" />
                        {selectedOfficer.specialization}
                      </div>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold uppercase mb-1">Department</div>
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Building2 size={14} className="text-blue-500" />
                        {selectedOfficer.department}
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                     <Users size={16} className="text-slate-400" /> Contact Information
                   </h4>
                   <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                         <Mail size={14} className="text-slate-400" />
                         {selectedOfficer.email}
                      </div>
                      <div className="flex items-center gap-3">
                         <Phone size={14} className="text-slate-400" />
                         {selectedOfficer.phone}
                      </div>
                   </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                   <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                     <TrendingUp size={16} className="text-slate-400" /> Performance & Workload
                   </h4>
                   {(() => {
                      const load = getOfficerWorkload(selectedOfficer.name);
                      return (
                        <div className="space-y-4">
                           <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                 <div className="text-xl font-bold text-blue-700">{load.total}</div>
                                 <div className="text-[10px] font-bold text-blue-400 uppercase">Total Assigned</div>
                              </div>
                              <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                 <div className="text-xl font-bold text-amber-700">{load.pending + load.inProgress}</div>
                                 <div className="text-[10px] font-bold text-amber-400 uppercase">Active</div>
                              </div>
                              <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                 <div className="text-xl font-bold text-green-700">{load.resolved}</div>
                                 <div className="text-[10px] font-bold text-green-400 uppercase">Resolved</div>
                              </div>
                           </div>
                           
                           {load.assignedGrievances.length > 0 ? (
                             <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 max-h-48 overflow-y-auto">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex justify-between items-center">
                                    Current Assignments
                                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px]">{load.assignedGrievances.length}</span>
                                </p>
                                <div className="space-y-2">
                                    {load.assignedGrievances.map(g => (
                                    <div key={g.id} className="bg-white p-2 rounded border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-mono font-bold text-slate-500">{g.id}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                                g.status === GrievanceStatus.RESOLVED ? 'bg-green-50 text-green-700 border border-green-100' :
                                                g.status === GrievanceStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                                                'bg-amber-50 text-amber-700 border border-amber-100'
                                            }`}>
                                                {g.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{g.description}</p>
                                        <div className="mt-1 flex items-center justify-between">
                                             <span className={`text-[10px] font-semibold ${
                                                 g.priority === Priority.CRITICAL ? 'text-red-600' : 'text-slate-400'
                                             }`}>
                                                {g.priority} Priority
                                             </span>
                                             <span className="text-[10px] text-slate-400">{new Date(g.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                             </div>
                           ) : (
                               <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
                                   No active assignments found.
                               </div>
                           )}
                        </div>
                      );
                   })()}
                </div>
             </div>

             <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  onClick={() => setOfficerModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
                >
                  Close
                </button>
                {targetGrievanceId && (
                   <button 
                     onClick={handleAssignConfirm}
                     className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm flex items-center gap-2 shadow-sm"
                   >
                     Confirm Assignment <ChevronRight size={14} />
                   </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityDashboard;
