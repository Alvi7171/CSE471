import React, { useState, useEffect } from "react";
import api from "../services/api";

function EnhancedMedicalTimeline() {
  const [patientId, setPatientId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showFilters, setShowFilters] = useState(false);

  // Load last registered patient from localStorage on mount
  useEffect(() => {
    const savedPatient = localStorage.getItem("lastRegisteredPatient");
    if (savedPatient) {
      try {
        const patient = JSON.parse(savedPatient);
        setSearchInput(patient.smartPatientId);
        handleSearch(null, patient.smartPatientId);
      } catch (e) {
        console.error("Error loading saved patient:", e);
      }
    }
  }, []);

  const handleSearch = async (e, patientIdToSearch = null) => {
    if (e) e.preventDefault();
    
    const idToUse = patientIdToSearch || searchInput;
    
    if (!idToUse.trim()) {
      setError("❌ Please enter a Patient ID or Smart Patient ID");
      return;
    }

    setLoading(true);
    setError("");
    setMedicalHistory(null);

    try {
      const response = await api.get(`/patients/${idToUse}/complete-history`);

      if (response.data.success) {
        setMedicalHistory(response.data.medicalHistory);
        setPatientId(idToUse);
        setError("");
      } else {
        setError(`❌ ${response.data.message || "Patient not found"}`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Patient not found";
      setError(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter timeline based on date range and type
  const getFilteredTimeline = () => {
    if (!medicalHistory?.treatmentTimeline) return [];
    
    let filtered = medicalHistory.treatmentTimeline;
    
    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.treatment_date);
        const fromDate = dateRange.from ? new Date(dateRange.from) : new Date('1900-01-01');
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date('2100-12-31');
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }
    
    // Apply type filter
    if (timelineFilter !== "all") {
      filtered = filtered.filter(item => item.treatment_type === timelineFilter);
    }
    
    return filtered.sort((a, b) => new Date(b.treatment_date) - new Date(a.treatment_date));
  };

  // Export medical history
  const exportMedicalHistory = async (format = 'pdf') => {
    if (!medicalHistory) return;
    
    try {
      const exportData = {
        patient: medicalHistory.patient,
        visits: medicalHistory.visits || [],
        diagnosticReports: medicalHistory.diagnosticReports || [],
        prescriptions: medicalHistory.prescriptions || [],
        treatmentTimeline: medicalHistory.treatmentTimeline || [],
        exportedAt: new Date().toISOString(),
        format: format
      };

      if (format === 'json') {
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `medical_history_${medicalHistory.patient.smart_patient_id}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvData = convertToCSV(exportData);
        const csvBlob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `medical_history_${medicalHistory.patient.smart_patient_id}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // For PDF, show message (would need additional library)
        alert("PDF export requires additional setup. Please use JSON or CSV format.");
      }
    } catch (err) {
      setError("Failed to export medical history.");
      console.error(err);
    }
  };

  // Convert data to CSV format
  const convertToCSV = (data) => {
    const headers = [
      'Type', 'Date', 'Description', 'Doctor', 'Status', 'Details'
    ];
    
    const rows = [];
    
    // Add visits
    data.visits.forEach(visit => {
      rows.push([
        'Visit',
        visit.visit_date,
        visit.visit_reason,
        visit.doctor_name || '',
        visit.status,
        visit.clinical_notes || ''
      ]);
    });
    
    // Add diagnostic reports
    data.diagnosticReports.forEach(report => {
      rows.push([
        'Diagnostic Report',
        report.report_date,
        report.test_name,
        report.doctor_name || '',
        report.urgency_level || 'Normal',
        report.results || ''
      ]);
    });
    
    // Add prescriptions
    data.prescriptions.forEach(prescription => {
      rows.push([
        'Prescription',
        prescription.prescription_date,
        prescription.medication_name,
        prescription.doctor_name || '',
        prescription.is_active ? 'Active' : 'Inactive',
        `${prescription.dosage} - ${prescription.frequency}`
      ]);
    });
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
  };

  // Render overview dashboard
  const renderOverview = () => {
    if (!medicalHistory) return null;

    const totalVisits = medicalHistory.visits?.length || 0;
    const totalReports = medicalHistory.diagnosticReports?.length || 0;
    const totalPrescriptions = medicalHistory.prescriptions?.length || 0;
    const activePrescriptions = medicalHistory.prescriptions?.filter(p => p.is_active).length || 0;
    const lastVisit = medicalHistory.visits?.[0];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Visits</p>
              <p className="text-3xl font-bold">{totalVisits}</p>
            </div>
            <div className="text-4xl opacity-20">🏥</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Lab Reports</p>
              <p className="text-3xl font-bold">{totalReports}</p>
            </div>
            <div className="text-4xl opacity-20">🔬</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Prescriptions</p>
              <p className="text-3xl font-bold">{totalPrescriptions}</p>
            </div>
            <div className="text-4xl opacity-20">💊</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Active Meds</p>
              <p className="text-3xl font-bold">{activePrescriptions}</p>
            </div>
            <div className="text-4xl opacity-20">⚠️</div>
          </div>
        </div>

        {lastVisit && (
          <div className="md:col-span-2 lg:col-span-4 bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Last Visit Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 font-medium">Date</p>
                <p className="text-gray-800">{new Date(lastVisit.visit_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Doctor</p>
                <p className="text-gray-800">{lastVisit.doctor_name}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Reason</p>
                <p className="text-gray-800">{lastVisit.visit_reason}</p>
              </div>
              {lastVisit.diagnosis && (
                <div className="md:col-span-3">
                  <p className="text-gray-600 font-medium">Diagnosis</p>
                  <p className="text-gray-800">{lastVisit.diagnosis}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render visits tab
  const renderVisits = () => {
    const visits = medicalHistory?.visits || [];
    if (visits.length === 0) {
      return <div className="text-center py-8 text-gray-500"><p className="text-lg">📅 No visit records found</p></div>;
    }
    return (
      <div className="space-y-4">
        {visits.map((visit) => (
          <div key={visit.visit_id} className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-800 text-lg">{visit.visit_reason}</h4>
                <p className="text-sm text-gray-500">👨‍⚕️ {visit.doctor_name || "N/A"} {visit.specialization ? `· ${visit.specialization}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{new Date(visit.visit_date).toLocaleDateString()}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full font-semibold mt-1 ${
                  visit.status === "completed" ? "bg-green-100 text-green-700" :
                  visit.status === "cancelled" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>{visit.status}</span>
              </div>
            </div>
            {visit.diagnosis && <p className="text-sm text-gray-700"><span className="font-medium">Diagnosis:</span> {visit.diagnosis}</p>}
            {visit.clinical_notes && <p className="text-sm text-gray-600 mt-1 italic">📋 {visit.clinical_notes}</p>}
            {visit.follow_up_required ? (
              <p className="text-sm text-orange-600 mt-2 font-medium">⚠️ Follow-up required {visit.follow_up_date ? `on ${new Date(visit.follow_up_date).toLocaleDateString()}` : ""}</p>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  // Render diagnostic reports tab
  const renderReports = () => {
    const diagnosticReports = medicalHistory?.diagnosticReports || [];
    const labTests = medicalHistory?.labTests || [];
    
    if (diagnosticReports.length === 0 && labTests.length === 0) {
      return <div className="text-center py-8 text-gray-500"><p className="text-lg">🔬 No diagnostic reports found</p></div>;
    }

    return (
      <div className="space-y-8">
        {/* New Lab Module Reports */}
        {labTests.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Laboratory Diagnostics</h4>
            {labTests.map((test) => (
              <div key={`lab-${test.test_id}`} className="bg-white rounded-2xl p-6 border-2 border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{test.test_name}</h4>
                    <p className="text-sm text-slate-500">🧪 {test.test_type} · #{test.test_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{new Date(test.request_date).toLocaleDateString()}</p>
                    <span className={`inline-block px-3 py-1 text-[10px] rounded-full font-black uppercase tracking-tighter mt-2 ${
                      test.is_delivered ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {test.is_delivered ? "Delivered" : test.status || "Pending"}
                    </span>
                  </div>
                </div>
                
                {test.summary && (
                  <div className="p-4 bg-slate-50 rounded-xl mb-4">
                    <p className="text-sm text-slate-700 font-medium">Summary: <span className="font-normal text-slate-600">{test.summary}</span></p>
                  </div>
                )}

                {test.interpretation && (
                  <p className="text-sm text-slate-600 italic mt-2">💡 Interpretation: {test.interpretation}</p>
                )}

                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Technician: {test.lab_technician || "Staff"}</span>
                  <button 
                    onClick={() => {
                      // We can add a modal or detail view here if needed
                      alert(`Full results for ${test.test_name} can be viewed in the Lab Test Management module.`);
                    }}
                    className="text-blue-600 font-bold text-xs hover:underline"
                  >
                    View Full Analysis →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legacy/Other Diagnostic Reports */}
        {diagnosticReports.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">General Diagnostic Records</h4>
            {diagnosticReports.map((report) => (
              <div key={`diag-${report.report_id}`} className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{report.test_name}</h4>
                    <p className="text-sm text-gray-500">🏥 {report.lab_name || "N/A"} · 👨‍⚕️ {report.doctor_name || "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{new Date(report.report_date).toLocaleDateString()}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-semibold mt-1 ${
                      report.urgency_level === "Critical" ? "bg-red-100 text-red-700" :
                      report.urgency_level === "Abnormal" ? "bg-orange-100 text-orange-700" :
                      "bg-green-100 text-green-700"
                    }`}>{report.urgency_level || "Normal"}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600"><span className="font-medium">Type:</span> {report.report_type}</p>
                {report.results && <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Results:</span> {typeof report.results === "string" ? report.results : JSON.stringify(report.results)}</p>}
                {report.abnormalities && <p className="text-sm text-red-600 mt-1 font-medium">⚠️ Abnormalities: {report.abnormalities}</p>}
                {report.interpretation && <p className="text-sm text-gray-600 mt-1 italic">💡 {report.interpretation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render prescriptions tab
  const renderPrescriptions = () => {
    const prescriptions = medicalHistory?.prescriptions || [];
    if (prescriptions.length === 0) {
      return <div className="text-center py-8 text-gray-500"><p className="text-lg">💊 No prescriptions found</p></div>;
    }
    return (
      <div className="space-y-4">
        {prescriptions.map((rx) => (
          <div key={rx.prescription_id} className={`rounded-xl p-5 border hover:shadow-md transition-shadow ${rx.is_active ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-800 text-lg">💊 {rx.medication_name}</h4>
                <p className="text-sm text-gray-500">👨‍⚕️ {rx.doctor_name || "N/A"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{new Date(rx.prescription_date).toLocaleDateString()}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full font-semibold mt-1 ${rx.is_active ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                  {rx.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-700">
              <div><span className="font-medium">Dosage:</span> {rx.dosage}</div>
              <div><span className="font-medium">Frequency:</span> {rx.frequency}</div>
              <div><span className="font-medium">Duration:</span> {rx.duration}</div>
              <div><span className="font-medium">Route:</span> {rx.route}</div>
              {rx.pharmacy_name && <div><span className="font-medium">Pharmacy:</span> {rx.pharmacy_name}</div>}
              {rx.expiry_date && <div><span className="font-medium">Expires:</span> {new Date(rx.expiry_date).toLocaleDateString()}</div>}
            </div>
            {rx.instructions && <p className="text-sm text-gray-600 mt-2 italic">📋 {rx.instructions}</p>}
          </div>
        ))}
      </div>
    );
  };

  // Render enhanced timeline
  const renderTimeline = () => {
    const filteredTimeline = getFilteredTimeline();
    
    if (filteredTimeline.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">📊 No timeline entries found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-transparent"></div>
          
          {filteredTimeline.map((entry, index) => (
            <div key={entry.timeline_id} className="relative flex items-start gap-6">
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-16 h-16 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  entry.status === 'completed' ? 'bg-green-500' :
                  entry.status === 'ongoing' ? 'bg-blue-500' :
                  entry.status === 'paused' ? 'bg-yellow-500' :
                  entry.status === 'cancelled' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}>
                  {entry.treatment_type === 'medication' ? '💊' :
                   entry.treatment_type === 'surgery' ? '🏥' :
                   entry.treatment_type === 'therapy' ? '🧘' :
                   entry.treatment_type === 'test' ? '🔬' : '📋'}
                </div>
              </div>

              {/* Timeline content */}
              <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{entry.treatment_name}</h3>
                    <p className="text-sm text-gray-600">{entry.treatment_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {new Date(entry.treatment_date).toLocaleDateString()}
                    </p>
                    <span className={`inline-block px-3 py-1 text-xs rounded-full font-bold ${
                      entry.status === 'completed' ? 'bg-green-100 text-green-700' :
                      entry.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                      entry.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      entry.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">📅 Duration</p>
                    <p className="text-gray-800">{entry.duration || 'N/A'}</p>
                  </div>
                  {entry.doctor_name && (
                    <div>
                      <p className="text-gray-600 font-medium">👨‍⚕️ Doctor</p>
                      <p className="text-gray-800">{entry.doctor_name}</p>
                    </div>
                  )}
                  {entry.treatment_description && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600 font-medium">📝 Description</p>
                      <p className="text-gray-800">{entry.treatment_description}</p>
                    </div>
                  )}
                  {entry.outcome && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600 font-medium">✅ Outcome</p>
                      <p className="text-gray-800">{entry.outcome}</p>
                    </div>
                  )}
                  {entry.notes && (
                    <div className="md:col-span-2">
                      <p className="text-gray-600 font-medium">📋 Notes</p>
                      <p className="text-gray-800 italic">{entry.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          📋 Enhanced Medical Timeline
        </h1>
        <p className="text-gray-600 text-lg">
          Module 1: Comprehensive medical history with advanced filtering and analytics
        </p>
      </div>

      {/* Search Section */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Enter Smart Patient ID (SPC-XXXXX) or Patient ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? "🔄 Loading..." : "🔍 Search"}
          </button>
        </div>

        {/* Filters */}
        {medicalHistory && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <span>{showFilters ? '🔼' : '🔽'}</span>
                <span>Filters</span>
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportMedicalHistory('json')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📄 Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => exportMedicalHistory('csv')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📊 Export CSV
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timeline Filter</label>
                  <select
                    value={timelineFilter}
                    onChange={(e) => setTimelineFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Entries</option>
                    <option value="medication">Medications</option>
                    <option value="surgery">Surgeries</option>
                    <option value="therapy">Therapy</option>
                    <option value="test">Tests</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </form>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">⚠️ {error}</p>
        </div>
      )}

      {medicalHistory && (
        <div>
          {/* Patient Info Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-blue-100 text-sm">Patient Name</p>
                <p className="text-2xl font-bold">
                  {medicalHistory.patient.first_name} {medicalHistory.patient.last_name}
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Smart Patient ID</p>
                <p className="text-xl font-mono font-bold">
                  {medicalHistory.patient.smart_patient_id}
                </p>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Contact</p>
                <p className="text-lg font-semibold">
                  {medicalHistory.patient.phone_number}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-300 rounded-t-2xl overflow-hidden mb-0">
            <div className="flex gap-4 px-6 pt-6">
              {[
                { id: "overview", label: "📊 Overview", count: "" },
                { id: "visits", label: "📅 Visits", count: medicalHistory.visits?.length || 0 },
                { id: "reports", label: "🔬 Reports", count: medicalHistory.diagnosticReports?.length || 0 },
                { id: "prescriptions", label: "💊 Prescriptions", count: medicalHistory.prescriptions?.length || 0 },
                { id: "timeline", label: "📈 Timeline", count: getFilteredTimeline().length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-semibold transition-all duration-300 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-4 border-blue-600"
                      : "text-gray-600 hover:text-gray-800 border-b-2 border-transparent"
                  }`}
                >
                  {tab.label}
                  {tab.count && (
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-2xl shadow-lg p-8">
            {activeTab === "overview" && renderOverview()}
            {activeTab === "visits" && renderVisits()}
            {activeTab === "reports" && renderReports()}
            {activeTab === "prescriptions" && renderPrescriptions()}
            {activeTab === "timeline" && renderTimeline()}
          </div>
        </div>
      )}

      {!medicalHistory && !error && !loading && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-dashed border-blue-300 p-12 text-center">
          <div className="text-6xl mb-4">🏥</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">
            Search Medical Records
          </h3>
          <p className="text-gray-600 mb-4">
            Enter a patient's Smart Patient ID (format: SPC-XXXXX) or Patient ID to view their complete medical timeline with advanced filtering and analytics.
          </p>
        </div>
      )}
    </div>
  );
}

export default EnhancedMedicalTimeline;
