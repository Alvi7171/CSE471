import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:1355/api";

function EmergencyResponse({ currentUser, targetEmergencyId, clearTargetEmergency }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [showDoctorList, setShowDoctorList] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state
  const [showNewEmergencyForm, setShowNewEmergencyForm] = useState(false);
  const [newEmergency, setNewEmergency] = useState({
    patientName: "",
    patientPhone: "",
    patientAge: "",
    patientGender: "Male",
    emergencyType: "Cardiac Emergency",
    severity: "High",
    location: "",
    chiefComplaint: ""
  });
  
  // Stats
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchEmergencies();
    fetchAlerts();
    fetchStats();
    fetchDoctors();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchEmergencies();
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (targetEmergencyId) {
      setActiveTab("dashboard");
      fetchEmergencyDetails(targetEmergencyId);
      if (clearTargetEmergency) clearTargetEmergency();
    }
  }, [targetEmergencyId]);

  const fetchEmergencies = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/emergency`);
      setEmergencies(response.data.cases || []);
    } catch (err) {
      setError("Failed to load emergencies");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveEmergencies = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/emergency/active`);
      setEmergencies(response.data.cases || []);
    } catch (err) {
      console.error("Failed to load active emergencies");
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/emergency/alerts?unreadOnly=true`);
      setAlerts(response.data.alerts || []);
    } catch (err) {
      console.error("Failed to load alerts");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/emergency/stats`);
      setStats(response.data.stats);
    } catch (err) {
      console.error("Failed to load stats");
    }
  };
  
  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/schedule/doctors`);
      setDoctors(response.data.doctors || []);
    } catch (err) {
      console.error("Failed to load doctors");
    }
  };

  const handleCreateEmergency = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API_BASE_URL}/emergency`, newEmergency);
      setSuccess(`Emergency case created! Triage Category: ${response.data.triageCategory}`);
      setShowNewEmergencyForm(false);
      setNewEmergency({
        patientName: "",
        patientPhone: "",
        patientAge: "",
        patientGender: "Male",
        emergencyType: "Cardiac Emergency",
        severity: "High",
        location: "",
        chiefComplaint: ""
      });
      fetchEmergencies();
      fetchStats();
      fetchAlerts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create emergency case");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (emergencyId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/emergency/${emergencyId}/status`, { status: newStatus });
      setSuccess(`Status updated to ${newStatus}`);
      fetchEmergencies();
      fetchStats();
      fetchAlerts();
    } catch (err) {
      setError("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDoctor = async (emergencyId, doctorId) => {
    try {
      await axios.put(`${API_BASE_URL}/emergency/${emergencyId}/assign-doctor`, { doctorId });
      setSuccess("Doctor assigned successfully!");
      setShowDoctorList(false);
      fetchEmergencies();
      fetchAlerts();
      if (selectedEmergency?.emergencyCase?.emergency_id === emergencyId) {
        fetchEmergencyDetails(emergencyId);
      }
    } catch (err) {
      setError("Failed to assign doctor");
    }
  };

  const handleAcceptEmergency = async (emergencyId) => {
    setLoading(true);
    try {
      // 1. Update status to Active
      await axios.put(`${API_BASE_URL}/emergency/${emergencyId}/status`, { status: "Active" });
      
      // 2. If current user is a doctor, assign themselves
      if (currentUser?.role === "doctor" && currentUser.doctorId) {
        await axios.put(`${API_BASE_URL}/emergency/${emergencyId}/assign-doctor`, { doctorId: currentUser.doctorId });
      }
      
      setSuccess("Emergency accepted successfully!");
      fetchEmergencies();
      fetchStats();
      fetchAlerts();
      fetchEmergencyDetails(emergencyId);
    } catch (err) {
      setError("Failed to accept emergency");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAlertRead = async (alertId) => {
    try {
      await axios.put(`${API_BASE_URL}/emergency/alerts/${alertId}/read`);
      fetchAlerts();
    } catch (err) {
      console.error("Failed to mark alert as read");
    }
  };

  const fetchEmergencyDetails = async (emergencyId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/emergency/${emergencyId}`);
      setSelectedEmergency(response.data);
    } catch (err) {
      setError("Failed to load emergency details");
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "Critical": return "bg-red-600 text-white";
      case "High": return "bg-orange-500 text-white";
      case "Medium": return "bg-yellow-500 text-white";
      case "Low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getTriageColor = (triage) => {
    switch (triage) {
      case "Resuscitation": return "bg-red-600 text-white";
      case "Emergency": return "bg-orange-500 text-white";
      case "Urgent": return "bg-yellow-500 text-white";
      case "Less Urgent": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "bg-red-100 text-red-800";
      case "Reported": return "bg-purple-100 text-purple-800 animate-pulse";
      case "In Treatment": return "bg-yellow-100 text-yellow-800";
      case "Admitted": return "bg-blue-100 text-blue-800";
      case "Discharged": return "bg-green-100 text-green-800";
      case "Transferred": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const activeEmergencies = emergencies.filter(e => ["Reported", "Active", "In Treatment"].includes(e.status));
  const criticalCount = activeEmergencies.filter(e => e.severity === "Critical").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Alert Badge */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🚨 Emergency Response Center</h1>
              <p className="text-gray-500 mt-1">Manage emergency cases, triage, and alerts</p>
            </div>
            <div className="flex items-center gap-4">
              {alerts.length > 0 && (
                <button
                  onClick={() => setActiveTab("cases")}
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold animate-pulse hover:bg-red-200 transition-colors cursor-pointer"
                >
                  🔔 {alerts.length} New Alerts
                </button>
              )}
              <button
                onClick={() => setShowNewEmergencyForm(true)}
                className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition-all shadow-md"
              >
                ⚠️ Report Emergency
              </button>
            </div>
          </div>
        </div>

        {/* Critical Alert Banner */}
        {criticalCount > 0 && (
          <div className="bg-red-600 text-white rounded-xl shadow-lg p-4 mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <div className="font-bold text-lg">CRITICAL: {criticalCount} Active Critical Emergency{criticalCount > 1 ? "s" : ""}</div>
                <div className="text-red-100">Immediate attention required!</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
              <div className="text-3xl font-bold text-gray-800">{stats.totalCases}</div>
              <div className="text-gray-500">Total Cases</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-orange-500">
              <div className="text-3xl font-bold text-gray-800">{stats.activeCases}</div>
              <div className="text-gray-500">Active Cases</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-600">
              <div className="text-3xl font-bold text-gray-800">{stats.criticalCases}</div>
              <div className="text-gray-500">Critical</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
              <div className="text-3xl font-bold text-gray-800">
                {stats.casesByStatus?.find(s => s.status === "Discharged")?.count || 0}
              </div>
              <div className="text-gray-500">Discharged</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => { setActiveTab("dashboard"); fetchActiveEmergencies(); }}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === "dashboard" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              🚑 Emergency Dashboard
            </button>
            <button
              onClick={() => setActiveTab("cases")}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === "cases" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              📋 All Cases
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === "alerts" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              🔔 Alerts {alerts.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{alerts.length}</span>}
            </button>
            <button
              onClick={() => setActiveTab("triage")}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === "triage" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              🏥 Triage Guide
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <span className="mr-2">❌</span> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <span className="mr-2">✅</span> {success}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Emergencies */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
                <h3 className="text-xl font-bold text-gray-800">Active Emergencies</h3>
                <p className="text-sm text-gray-500">Sorted by severity</p>
              </div>
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : activeEmergencies.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No active emergencies</div>
                ) : (
                  activeEmergencies.map((emergency) => (
                    <div
                      key={emergency.emergency_id}
                      onClick={() => fetchEmergencyDetails(emergency.emergency_id)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${emergency.severity === "Critical" || emergency.status === "Reported" ? "bg-red-50" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(emergency.severity)}`}>
                              {emergency.severity}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTriageColor(emergency.triage_category)}`}>
                              {emergency.triage_category}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-800">{emergency.patient_name}</div>
                          <div className="text-sm text-gray-600">{emergency.emergency_type}</div>
                          {emergency.location && (
                            <div className="text-xs text-gray-500 mt-1">📍 {emergency.location}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(emergency.status)}`}>
                            {emergency.status}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(emergency.arrival_time).toLocaleTimeString()}
                          </div>
                          {emergency.assigned_doctor_name && (
                            <div className="text-xs text-blue-600 mt-1">👨‍⚕️ {emergency.assigned_doctor_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="font-bold text-gray-800 mb-4">⚡ Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowNewEmergencyForm(true)}
                    className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
                  >
                    + New Emergency
                  </button>
                  <button
                    onClick={fetchEmergencies}
                    className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Recent Alerts */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="font-bold text-gray-800 mb-4">🔔 Recent Alerts</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.alert_id}
                      onClick={() => handleMarkAlertRead(alert.alert_id)}
                      className={`p-3 rounded-lg text-sm cursor-pointer ${alert.priority === "Critical" ? "bg-red-50 border-l-4 border-red-500" : "bg-yellow-50 border-l-4 border-yellow-500"}`}
                    >
                      <div className="font-medium text-gray-800">{alert.alert_type}</div>
                      <div className="text-gray-600 truncate">{alert.message}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-gray-500 text-sm">No new alerts</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Cases Tab */}
        {activeTab === "cases" && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Patient</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Severity</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Triage</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Arrival</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : emergencies.length === 0 ? (
                    <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No emergency cases found</td></tr>
                  ) : (
                    emergencies.map((emergency) => (
                      <tr key={emergency.emergency_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">#{emergency.emergency_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{emergency.patient_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{emergency.emergency_type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(emergency.severity)}`}>
                            {emergency.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTriageColor(emergency.triage_category)}`}>
                            {emergency.triage_category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(emergency.status)}`}>
                            {emergency.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(emergency.arrival_time).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => fetchEmergencyDetails(emergency.emergency_id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">All Emergency Alerts</h3>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.alert_id}
                  className={`p-4 rounded-lg border-l-4 ${alert.priority === "Critical" ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-800">{alert.alert_type}</div>
                      <div className="text-gray-600 mt-1">{alert.message}</div>
                      <div className="text-sm text-gray-500 mt-2">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkAlertRead(alert.alert_id)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Mark as Read
                    </button>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">No alerts to display</div>
              )}
            </div>
          </div>
        )}

        {/* Triage Guide Tab */}
        {activeTab === "triage" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">🏥 Emergency Triage Categories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-red-50 rounded-xl border-2 border-red-500">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🚨</span>
                  <div>
                    <div className="text-xl font-bold text-red-800">Resuscitation</div>
                    <div className="text-red-600">Immediate - 0 minutes</div>
                  </div>
                </div>
                <div className="text-gray-700">
                  <p className="font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>Cardiac arrest</li>
                    <li>Severe respiratory distress</li>
                    <li>Major trauma</li>
                    <li>Severe bleeding</li>
                    <li>Unconscious</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-orange-50 rounded-xl border-2 border-orange-500">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <div className="text-xl font-bold text-orange-800">Emergency</div>
                    <div className="text-orange-600">Very Urgent - 10 minutes</div>
                  </div>
                </div>
                <div className="text-gray-700">
                  <p className="font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>Chest pain</li>
                    <li>Stroke symptoms</li>
                    <li>Severe abdominal pain</li>
                    <li>High fever with confusion</li>
                    <li>Severe asthma</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-yellow-50 rounded-xl border-2 border-yellow-500">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⚡</span>
                  <div>
                    <div className="text-xl font-bold text-yellow-800">Urgent</div>
                    <div className="text-yellow-600">Urgent - 60 minutes</div>
                  </div>
                </div>
                <div className="text-gray-700">
                  <p className="font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>Moderate pain</li>
                    <li>Minor fractures</li>
                    <li>Moderate bleeding</li>
                    <li>Dehydration</li>
                    <li>Fever</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-green-50 rounded-xl border-2 border-green-500">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">✅</span>
                  <div>
                    <div className="text-xl font-bold text-green-800">Less Urgent</div>
                    <div className="text-green-600">Standard - 120 minutes</div>
                  </div>
                </div>
                <div className="text-gray-700">
                  <p className="font-semibold mb-2">Examples:</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>Minor injuries</li>
                    <li>Cold/flu symptoms</li>
                    <li>Minor burns</li>
                    <li>Rashes</li>
                    <li>Mild pain</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Details Modal */}
        {selectedEmergency && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Emergency Case #{selectedEmergency.emergencyCase?.emergency_id}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(selectedEmergency.emergencyCase?.severity)}`}>
                      {selectedEmergency.emergencyCase?.severity}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${getTriageColor(selectedEmergency.emergencyCase?.triage_category)}`}>
                      {selectedEmergency.emergencyCase?.triage_category}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedEmergency.emergencyCase?.status)}`}>
                      {selectedEmergency.emergencyCase?.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedEmergency(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Patient Name</div>
                    <div className="font-medium text-gray-800">{selectedEmergency.emergencyCase?.patient_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Emergency Type</div>
                    <div className="font-medium text-gray-800">{selectedEmergency.emergencyCase?.emergency_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium text-gray-800">{selectedEmergency.emergencyCase?.location || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Arrival Time</div>
                    <div className="font-medium text-gray-800">
                      {new Date(selectedEmergency.emergencyCase?.arrival_time).toLocaleString()}
                    </div>
                  </div>
                </div>

                {selectedEmergency.emergencyCase?.chief_complaint && (
                  <div>
                    <div className="text-sm text-gray-500">Chief Complaint</div>
                    <div className="font-medium text-gray-800">{selectedEmergency.emergencyCase.chief_complaint}</div>
                  </div>
                )}

                {selectedEmergency.emergencyCase?.assigned_doctor_name && (
                  <div>
                    <div className="text-sm text-gray-500">Assigned Doctor</div>
                    <div className="font-medium text-gray-800">👨‍⚕️ {selectedEmergency.emergencyCase.assigned_doctor_name}</div>
                  </div>
                )}

                {/* Status Update & Actions */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Actions & Status</label>
                    {selectedEmergency.emergencyCase.status === "Reported" && (
                      <button
                        onClick={() => handleAcceptEmergency(selectedEmergency.emergencyCase.emergency_id)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md animate-bounce"
                      >
                        ✅ Accept Emergency
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {["Active", "In Treatment", "Admitted", "Discharged", "Transferred"].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(selectedEmergency.emergencyCase.emergency_id, status)}
                        disabled={loading || selectedEmergency.emergencyCase.status === status}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedEmergency.emergencyCase.status === status ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:opacity-50`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {currentUser?.role === "admin" && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowDoctorList(!showDoctorList)}
                        className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 flex items-center justify-center gap-2"
                      >
                        👨‍⚕️ {showDoctorList ? "Close Doctor List" : "Assign Doctor to Case"}
                      </button>
                      
                      {showDoctorList && (
                        <div className="mt-2 border rounded-lg overflow-hidden bg-gray-50 max-h-48 overflow-y-auto">
                          {doctors.map(doc => (
                            <div 
                              key={doc.doctor_id} 
                              className="p-3 border-b last:border-b-0 flex justify-between items-center hover:bg-white"
                            >
                              <div>
                                <div className="font-semibold text-gray-800">{doc.name}</div>
                                <div className="text-xs text-gray-500">{doc.specialization}</div>
                              </div>
                              <button
                                onClick={() => handleAssignDoctor(selectedEmergency.emergencyCase.emergency_id, doc.doctor_id)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                Assign
                              </button>
                            </div>
                          ))}
                          {doctors.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">No doctors found</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Alerts History */}
                {selectedEmergency.alerts?.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Alert History</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedEmergency.alerts.map((alert) => (
                        <div key={alert.alert_id} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="font-medium">{alert.alert_type}</div>
                          <div className="text-gray-600 text-xs">{alert.message}</div>
                          <div className="text-gray-400 text-xs">{new Date(alert.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Emergency Form Modal */}
        {showNewEmergencyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">🚨 Report Emergency</h2>
                <button onClick={() => setShowNewEmergencyForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <form onSubmit={handleCreateEmergency}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                    <input
                      type="text"
                      value={newEmergency.patientName}
                      onChange={(e) => setNewEmergency({...newEmergency, patientName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={newEmergency.patientPhone}
                        onChange={(e) => setNewEmergency({...newEmergency, patientPhone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={newEmergency.patientAge}
                        onChange={(e) => setNewEmergency({...newEmergency, patientAge: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Type *</label>
                    <select
                      value={newEmergency.emergencyType}
                      onChange={(e) => setNewEmergency({...newEmergency, emergencyType: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option>Cardiac Emergency</option>
                      <option>Respiratory Emergency</option>
                      <option>Trauma/Injury</option>
                      <option>Stroke</option>
                      <option>Allergic Reaction</option>
                      <option>Poisoning</option>
                      <option>Burns</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
                    <select
                      value={newEmergency.severity}
                      onChange={(e) => setNewEmergency({...newEmergency, severity: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={newEmergency.location}
                      onChange={(e) => setNewEmergency({...newEmergency, location: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="e.g., Emergency Room, Ward 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                    <textarea
                      value={newEmergency.chiefComplaint}
                      onChange={(e) => setNewEmergency({...newEmergency, chiefComplaint: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      rows="3"
                      placeholder="Describe the emergency situation..."
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-semibold hover:from-red-700 hover:to-orange-700 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "🚨 Create Emergency"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewEmergencyForm(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmergencyResponse;