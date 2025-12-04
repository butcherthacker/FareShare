import { useState, useEffect } from "react";
import { motion,AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import Background from "../components/Background";

import { 
  BarChart3,
  Users,
  Car,
  DollarSign,
  Download,
  Filter,
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

// ============================================================
// CONFIGURATION - MOCK DATA TOGGLE
// ============================================================
const USE_MOCK_DATA = false; // Set to false when backend is ready
const API_BASE_URL = "http://127.0.0.1:8000"; 



// ============================================================
// TYPE DEFINITIONS 
// ============================================================
interface Report {
  rides_total: number;
  bookings_total: number;
  completed_rides: number;
  cancelled_rides: number;
  denied_bookings: number;
  earnings_total: number;
  active_drivers: number;
  active_riders: number;
  avg_driver_rating: number;
}

interface UsageBucket {
  period: string;
  rides: number;
  bookings: number;
  earnings: number;
}

interface UsageReport {
  summary: Report;
  buckets: UsageBucket[];
}

interface Ride {
  ride_id: string;
  status: string;
  departure_time: string;
  origin_label: string;
  destination_label: string;
  driver: { id: string; name: string };
  passengers_count: number;
  bookings_confirmed: number;
  bookings_denied: number;
}

interface Incident {
  incident_id: string;
  created_at: string;
  status: string;
  category: string;
  summary: string;
  user: { id: string; name: string };
  ride_id: string;
}



// ============================================================
// MOCK DATA
// ============================================================
const MOCK_USAGE_DATA: UsageReport = {
  summary: {
    rides_total: 1247,
    bookings_total: 2893,
    completed_rides: 1089,
    cancelled_rides: 98,
    denied_bookings: 45,
    active_drivers: 342,
    active_riders: 1876,
    earnings_total: 45892.50,
    avg_driver_rating: 4.6
  },
  buckets: [
    { period: "2025-10-22", rides: 145, bookings: 342, earnings: 5234.20 },
    { period: "2025-10-29", rides: 189, bookings: 421, earnings: 6891.40 },
    { period: "2025-11-05", rides: 267, bookings: 589, earnings: 8234.90 },
    { period: "2025-11-12", rides: 321, bookings: 698, earnings: 9876.30 }
  ]
};

const generateMockRides = (page: number, limit: number): Ride[] => {
  const statuses = ["completed", "confirmed", "cancelled", "denied"];
  const origins = ["Downtown Toronto", "Milton, ON", "Mississauga", "Brampton", "Oakville", "Burlington"];
  const destinations = ["Pearson Airport", "University of Toronto", "Downtown Toronto", "York University", "Sheridan College"];
  const drivers = ["John Smith", "Sarah Johnson", "Mike Chen", "Emily Davis", "David Lee", "Lisa Wang", "Tom Brown", "Anna Martinez"];
  
  return Array.from({ length: limit }, (_, i) => {
    const index = (page - 1) * limit + i;
    const status = statuses[index % statuses.length];
    return {
      ride_id: `ride_${String(index + 1).padStart(3, '0')}`,
      status: status,
      departure_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      origin_label: origins[index % origins.length],
      destination_label: destinations[index % destinations.length],
      driver: { id: `usr_${index}`, name: drivers[index % drivers.length] },
      passengers_count: status === "cancelled" ? 0 : Math.floor(Math.random() * 4) + 1,
      bookings_confirmed: status === "cancelled" ? 0 : Math.floor(Math.random() * 4) + 1,
      bookings_denied: Math.floor(Math.random() * 2)
    };
  });
};

const generateMockIncidents = (page: number, limit: number): Incident[] => {
  const statuses = ["open", "reviewed", "resolved"];
  const categories = ["safety", "payment", "behavior", "vehicle", "route"];
  const summaries = [
    "Driver was speeding and driving recklessly",
    "Payment amount different from agreed price",
    "Passenger was rude and disrespectful",
    "Vehicle was not clean and had mechanical issues",
    "Driver took a different route than planned",
    "Late pickup without notification",
    "Uncomfortable conversation during ride",
    "Requested extra stops not agreed upon"
  ];
  const users = ["Emily Davis", "David Lee", "Lisa Wang", "Tom Brown", "Anna Martinez", "Chris Taylor", "Sam Wilson", "Kate Moore"];
  
  return Array.from({ length: limit }, (_, i) => {
    const index = (page - 1) * limit + i;
    return {
      incident_id: `inc_${String(index + 1).padStart(3, '0')}`,
      created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: statuses[index % statuses.length],
      category: categories[index % categories.length],
      summary: summaries[index % summaries.length],
      user: { id: `usr_${index}`, name: users[index % users.length] },
      ride_id: `ride_${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`
    };
  });
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminDashboard() {
  
  const { token } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "rides" | "incidents">("overview");
  
  // Filters
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("week");
  const [moderationStatusFilter, setModerationStatusFilter] = useState<"all" | "open" | "reviewed" | "resolved">("all");
  
  // Data states
  const [usageData, setUsageData] = useState<UsageReport | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showName, setShowName] = useState(true); // Toggle for driver name/id display
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Incident moderation states
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [resolveText, setResolveText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ============================================================
  // API FUNCTIONS
  // ============================================================
  
  const fetchUsageData = async () => {
  setLoading(true);
  setError(null);

  try {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setUsageData(MOCK_USAGE_DATA);
    } else {
      const params = new URLSearchParams({
        from_date: dateRange.from,
        to_date: dateRange.to,
        status: statusFilter === "all" ? "" : statusFilter,
        group_by: groupBy,
      });


      const response = await fetch(
        `${API_BASE_URL}/admin/reports/usage?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch usage data: ${response.status}`);
      }

      const data: UsageReport = await response.json();
      setUsageData(data);
    }
  } catch (err: any) {
    setError(err.message);
    console.error("Error fetching usage data:", err);
  } finally {
    setLoading(false);
  }
};


const fetchRides = async (page: number) => {
  
  setLoading(true);
  setError(null);

  try {
    // -----------------------------
    // MOCK MODE
    // -----------------------------
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 600));

      const mockRides = generateMockRides(page, itemsPerPage);
      setRides(mockRides);

      // Mock pagination = 100 fake rides
      setTotalPages(Math.ceil(100 / itemsPerPage));
      return;
    }

    // -----------------------------
    // REAL API MODE
    // -----------------------------
    const params = new URLSearchParams({
      page: (page - 1).toString(),  // ← Convert to 0-based for backend
      limit: itemsPerPage.toString(),
      from_date: dateRange.from || "",
      to_date: dateRange.to || "",
      status: statusFilter !== "all" ? statusFilter : "",  // ← Fixed filter logic
    });

    const response = await fetch(`${API_BASE_URL}/admin/rides?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rides: ${response.status}`);
    }

    const data = await response.json();

    setRides(data.results);

    if (data.results.length === itemsPerPage) {
      setTotalPages(page + 1); 
    } else {
      setTotalPages(page); 
    }
    
  } catch (err: any) {
    console.error("Error fetching rides:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

const fetchIncidents = async (page: number) => {
  setLoading(true);
  setError(null);

  try {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const mockIncidents = generateMockIncidents(page, itemsPerPage);
      setIncidents(mockIncidents);
      setTotalPages(Math.ceil(50 / itemsPerPage));
    } else {
      const params = new URLSearchParams();
      if (dateRange.from) params.append("from_date", dateRange.from);
      if (dateRange.to) params.append("to_date", dateRange.to);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      params.append("page", page.toString());
      params.append("limit", itemsPerPage.toString());

      const response = await fetch(`${API_BASE_URL}/admin/incidents?${params}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch incidents: ${response.status}`);

      const data = await response.json();
      setIncidents(data.results); 
      if (data.results.length === itemsPerPage) {
      setTotalPages(page + 1); 
    } else {
      setTotalPages(page); 
    }
    }
  } catch (err: any) {
    setError(err instanceof Error ? err.message : String(err));
    console.error("Error fetching incidents:", err);
  } finally {
    setLoading(false);
  }
};

  const downloadCSV = async () => {
    if (USE_MOCK_DATA) {
      alert("CSV download would trigger here (backend not connected)");
      return;
    }

    try {
      const params = new URLSearchParams({
        from_date: dateRange.from,
        to_date: dateRange.to,
        status: statusFilter === "all" ? "" : statusFilter,
        group_by: groupBy,
      });

      const response = await fetch(`${API_BASE_URL}/admin/reports/usage.csv?${params}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usage-report-${dateRange.from}-to-${dateRange.to}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading CSV:", err);
      setError(err.message);
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================
    
  useEffect(() => {
    if (!token) return; 
    if (activeTab === "overview") {
      fetchUsageData();
    } else if (activeTab === "rides") {
      fetchRides(currentPage);
    } else if (activeTab === "incidents") {
      fetchIncidents(currentPage);
    }
  }, [token, activeTab, dateRange, statusFilter, groupBy, currentPage, itemsPerPage]);

  // ============================================================
  // HELPER COMPONENTS
  // ============================================================
  
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { bg: string; text: string }> = {
      completed: { bg: "bg-green-100", text: "text-green-800" },
      confirmed: { bg: "bg-blue-100", text: "text-blue-800" },
      cancelled: { bg: "bg-red-100", text: "text-red-800" },
      denied: { bg: "bg-red-100", text: "text-red-800" },
      open: { bg: "bg-yellow-100", text: "text-yellow-800" },
      reviewed: { bg: "bg-blue-100", text: "text-blue-800" },
      resolved: { bg: "bg-green-100", text: "text-green-800" },
      full: { bg: "bg-purple-100", text: "text-purple-800" }
    };
    const color = colors[status] || { bg: "bg-gray-100", text: "text-gray-800" };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const handleReviewSubmit = async (incidentId: string) => {
  if (!reviewText.trim()) {
    alert("Please enter review notes");
    return;
  }

  setSubmitting(true);
  try {
    // TODO: Replace with actual API call when backend is ready
    const response = await fetch(`${API_BASE_URL}/admin/incidents/${incidentId}/review`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "reviewed",
        notes: reviewText
      })
    });

    if (!response.ok) throw new Error("Failed to submit review");

    // Update local state
    setIncidents(incidents.map(inc => 
      inc.incident_id === incidentId 
        ? { ...inc, status: "reviewed" }
        : inc
    ));

    // Reset form
    setReviewText("");
    setExpandedIncidentId(null);
    alert("Review submitted successfully");
  } catch (err: any) {
    console.error("Error submitting review:", err);
    alert("Failed to submit review: " + err.message);
  } finally {
    setSubmitting(false);
  }
};

const handleResolveSubmit = async (incidentId: string) => {
  if (!resolveText.trim()) {
    alert("Please enter resolution notes");
    return;
  }

  setSubmitting(true);
  try {
    // TODO: Replace with actual API call when backend is ready
    const response = await fetch(`${API_BASE_URL}/admin/incidents/${incidentId}/resolve`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "resolved",
        resolution: resolveText
      })
    });

    if (!response.ok) throw new Error("Failed to resolve incident");

    // Update local state
    setIncidents(incidents.map(inc => 
      inc.incident_id === incidentId 
        ? { ...inc, status: "resolved" }
        : inc
    ));

    // Reset form
    setResolveText("");
    setExpandedIncidentId(null);
    alert("Incident resolved successfully");
  } catch (err: any) {
    console.error("Error resolving incident:", err);
    alert("Failed to resolve incident: " + err.message);
  } finally {
    setSubmitting(false);
  }
};



  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="min-h-screen p-4 md:p-8">
      <Background />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor platform activity, manage rides, and review incidents
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                max={dateRange.to || undefined}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ border: '1px solid var(--color-secondary)' }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                min={dateRange.from || undefined}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2"
                style={{ border: '1px solid var(--color-secondary)' }}
              />
            </div>

            {/* Status Filter */}
            {(activeTab !== "incidents" && 
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ border: '1px solid var(--color-secondary)' }}
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="full">Full</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="denied">Denied</option>
              </select>
            </div>
            )}
            {/* Group By (Overview only) */}
            {activeTab === "overview" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group By
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as "day" | "week" | "month")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ border: '1px solid var(--color-secondary)' }}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            )}
            {activeTab === "incidents" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moderation Status
                </label>
                <select
                  value={moderationStatusFilter}
                  onChange={(e) => setModerationStatusFilter(e.target.value as "all" | "open" | "reviewed" | "resolved")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ border: '1px solid var(--color-secondary)' }}
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm mb-6"
        >
          <div className="flex border-b">
            <button
              onClick={() => { setActiveTab("overview"); setCurrentPage(1); }}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "overview"
                  ? "text-orange-600 border-b-4 border-orange-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 size={20} />
                Overview
              </div>
            </button>
            <button
              onClick={() => { setActiveTab("rides"); setCurrentPage(1); }}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "rides"
                  ? "text-orange-600 border-b-4 border-orange-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Car size={20} />
                Rides
              </div>
            </button>
            <button
              onClick={() => { setActiveTab("incidents"); setCurrentPage(1); }}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "incidents"
                  ? "text-orange-600 border-b-4 border-orange-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle size={20} />
                Incidents
              </div>
            </button>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-orange-600" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {/* Overview Tab — Empty State */}
        {!loading && activeTab === "overview" && (!usageData || usageData.buckets.length === 0) && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">There is no usage data for the selected date range.</p>
          </div>
        )}

        {/* Overview Tab */}
        {!loading && activeTab === "overview" && usageData && usageData.buckets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Car size={24} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">Total Rides</p>
                <p className="text-3xl font-bold text-gray-900">{usageData.summary.rides_total.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {usageData.summary.completed_rides} completed
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users size={24} className="text-purple-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(usageData.summary.active_drivers + usageData.summary.active_riders).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {usageData.summary.active_drivers} drivers • {usageData.summary.active_riders} riders
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign size={24} className="text-green-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${usageData.summary.earnings_total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {usageData.summary.bookings_total} bookings
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Star size={24} className="text-yellow-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">Avg Driver Rating</p>
                <p className="text-3xl font-bold text-gray-900">
                  {usageData.summary.avg_driver_rating.toFixed(1)} ★
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Based on {usageData.summary.active_drivers} drivers
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Activity Over Time</h2>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              
              {/* Simple bar chart */}
              <div className="space-y-6">
                {usageData.buckets.map((bucket, index) => {
                  const maxRides = Math.max(...usageData.buckets.map(b => b.rides));
                  const maxEarnings = Math.max(...usageData.buckets.map(b => b.earnings));
                  
                  return (
                    <div key={index} className="space-y-3">
                      <div className="font-medium text-gray-700 text-sm">
                        {bucket.period}
                      </div>
                      
                      {/* Rides Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Rides</span>
                          <span className="font-semibold text-gray-900">{bucket.rides}</span>
                        </div>
                        <div className="relative h-6 bg-gray-100 rounded-lg overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(bucket.rides / maxRides) * 100}%` }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600 to-orange-400 rounded-lg"
                          />
                        </div>
                      </div>
                      
                      
                      {/* Earnings Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Earnings</span>
                          <span className="font-semibold text-gray-900">${bucket.earnings.toFixed(2)}</span>
                        </div>
                        <div className="relative h-6 bg-gray-100 rounded-lg overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(bucket.earnings / maxEarnings) * 100}%` }}
                            transition={{ delay: index * 0.1 + 0.1, duration: 0.5 }}
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle size={20} className="text-green-600" />
                  <h3 className="font-semibold text-gray-900">Completed</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{usageData.summary.completed_rides}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <XCircle size={20} className="text-red-600" />
                  <h3 className="font-semibold text-gray-900">Cancelled</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{usageData.summary.cancelled_rides}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <XCircle size={20} className="text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Denied Bookings</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{usageData.summary.denied_bookings}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rides Tab */}
        {!loading && activeTab === "rides" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            {rides.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rides Found</h3>
                <p className="text-gray-600">There are no rides for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ride ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Route</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Driver</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Departure</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Passenger(s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rides.map((ride, index) => (
                      <motion.tr
                        key={ride.ride_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">{ride.ride_id}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={ride.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin size={14} className="text-gray-400" />
                            <span className="text-gray-900 break-words max-w-[120px]">{ride.origin_label}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-900 break-words max-w-[120px]">{ride.destination_label}</span>
                          </div>
                        </td>
                        <td
                          className="px-6 py-4 text-sm text-gray-900 cursor-pointer w-32"
                          onClick={() => setShowName(!showName)}
                        >
                          {showName ? ride.driver.name : ride.driver.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock size={14} />
                            {new Date(ride.departure_time).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {ride.passengers_count == 1 ? "1 Passenger" : `${ride.passengers_count} Passengers`}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Show:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1); // Reset to first page when changing items per page
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Incidents Tab */}
        {!loading && activeTab === "incidents" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {incidents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Incidents Found</h3>
                <p className="text-gray-600">There are no incidents in the selected date range.</p>
              </div>
            ) : (
              incidents.map((incident, index) => {
                const isExpanded = expandedIncidentId === incident.incident_id;
                
                return (
                  <motion.div
                    key={incident.incident_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-sm overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <AlertTriangle size={20} className="text-orange-600" />
                            <h3 className="font-semibold text-gray-900">{incident.category.toUpperCase()}</h3>
                            <StatusBadge status={incident.status} />
                          </div>
                          
                          <p className="text-gray-700 mb-4">{incident.summary}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Reported by:</span> {incident.user.name}
                            </div>
                            <div>
                              <span className="font-medium">Ride ID:</span> {incident.ride_id}
                            </div>
                            <div>
                              <span className="font-medium">Reported:</span> {new Date(incident.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {incident.status === "open" && (
                            <>
                              <motion.button
                                onClick={() => {
                                  setExpandedIncidentId(isExpanded ? null : incident.incident_id);
                                  setReviewText("");
                                  setResolveText("");
                                }}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {isExpanded ? "Cancel" : "Review"}
                              </motion.button>
                              <motion.button
                                onClick={() => {
                                  setExpandedIncidentId(isExpanded && expandedIncidentId === incident.incident_id ? null : incident.incident_id);
                                  setReviewText("");
                                  setResolveText("");
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Resolve
                              </motion.button>
                            </>
                          )}
                          
                          {incident.status === "reviewed" && (
                            <motion.button
                              onClick={() => {
                                setExpandedIncidentId(isExpanded ? null : incident.incident_id);
                                setReviewText("");
                                setResolveText("");
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Resolve
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Review/Resolve Form */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t"
                          style={{ borderTopColor: 'var(--color-secondary)' }}
                        >
                          <div className="p-6 bg-gray-50">
                            {/* Review Form */}
                            {incident.status === "open" && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Review Notes
                                  </label>
                                  <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Enter your review notes here... Document your findings, any actions taken, and next steps."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                    rows={4}
                                    style={{ border: '1px solid var(--color-secondary)' }}
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500">
                                    This will mark the incident as "Reviewed" and notify relevant parties.
                                  </p>
                                  <motion.button
                                    onClick={() => handleReviewSubmit(incident.incident_id)}
                                    disabled={submitting || !reviewText.trim()}
                                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    whileHover={{ scale: submitting ? 1 : 1.05 }}
                                    whileTap={{ scale: submitting ? 1 : 0.95 }}
                                  >
                                    {submitting ? (
                                      <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Submitting...
                                      </>
                                    ) : (
                                      "Submit Review"
                                    )}
                                  </motion.button>
                                </div>
                              </div>
                            )}

                            {/* Resolve Form */}
                            {(incident.status === "open" || incident.status === "reviewed") && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Resolution Notes
                                  </label>
                                  <textarea
                                    value={resolveText}
                                    onChange={(e) => setResolveText(e.target.value)}
                                    placeholder="Enter resolution details... Describe how the incident was resolved and any final actions taken."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                    rows={4}
                                    style={{ border: '1px solid var(--color-secondary)' }}
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500">
                                    This will mark the incident as "Resolved" and close the case.
                                  </p>
                                  <motion.button
                                    onClick={() => handleResolveSubmit(incident.incident_id)}
                                    disabled={submitting || !resolveText.trim()}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    whileHover={{ scale: submitting ? 1 : 1.05 }}
                                    whileTap={{ scale: submitting ? 1 : 0.95 }}
                                  >
                                    {submitting ? (
                                      <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Submitting...
                                      </>
                                    ) : (
                                      "Resolve Incident"
                                    )}
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}

            {/* Pagination - same as before */}
            <div className="bg-white rounded-xl shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Show:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}