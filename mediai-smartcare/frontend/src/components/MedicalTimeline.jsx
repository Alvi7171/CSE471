import React, { useState, useEffect } from "react";
import axios from "axios";

function MedicalTimeline() {
  const [patientId, setPatientId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("visits");

  // Load last registered patient from localStorage on mount
  useEffect(() => {
    const savedPatient = localStorage.getItem("lastRegisteredPatient");
    if (savedPatient) {
      try {
        const patient = JSON.parse(savedPatient);
        setSearchInput(patient.smartPatientId);
        console.log("📋 Auto-loading last registered patient:", patient.smartPatientId);
        // Auto-search for this patient
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
      console.log("🔍 Searching for patient:", idToUse);
      const response = await axios.get(
        `http://localhost:1355/api/patients/${idToUse}/complete-history`,
      );

      console.log("📥 Medical history response:", response.data);

      if (response.data.success) {
        setMedicalHistory(response.data.medicalHistory);
        setPatientId(idToUse);
        setError("");
      } else {
        setError(`❌ ${response.data.message || "Patient not found"}`);
      }
    } catch (err) {
      console.error("❌ Search error:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Patient not found";
      setError(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Render visit records
  const renderVisits = () => {
    const visits = medicalHistory?.visits || [];
    if (visits.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">📅 No visit records found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {visits.map((visit) => (
          <div
            key={visit.visit_id}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {visit.visit_reason}
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  🗓️ {new Date(visit.visit_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  visit.status === "completed"
                    ? "bg-green-200 text-green-800"
                    : visit.status === "cancelled"
                      ? "bg-red-200 text-red-800"
                      : "bg-yellow-200 text-yellow-800"
                }`}
              >
                {visit.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {visit.doctor_name && (
                <div>
                  <p className="text-gray-600 font-medium">👨‍⚕️ Doctor</p>
                  <p className="text-gray-800">
                    {visit.doctor_name}
                    {visit.specialization && ` (${visit.specialization})`}
                  </p>
                </div>
              )}
              {visit.chief_complaint && (
                <div>
                  <p className="text-gray-600 font-medium">📝 Chief Complaint</p>
                  <p className="text-gray-800">{visit.chief_complaint}</p>
                </div>
              )}
              {visit.diagnosis && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 font-medium">⚕️ Diagnosis</p>
                  <p className="text-gray-800">{visit.diagnosis}</p>
                </div>
              )}
              {visit.clinical_notes && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 font-medium">📋 Clinical Notes</p>
                  <p className="text-gray-800 italic">{visit.clinical_notes}</p>
                </div>
              )}
              {visit.vital_signs && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 font-medium">💓 Vital Signs</p>
                  <p className="text-gray-800 font-mono text-xs">
                    {typeof visit.vital_signs === "string"
                      ? visit.vital_signs
                      : JSON.stringify(visit.vital_signs)}
                  </p>
                </div>
              )}
              {visit.follow_up_required && (
                <div>
                  <p className="text-gray-600 font-medium">⏰ Follow-up</p>
                  <p className="text-orange-700 font-semibold">
                    {visit.follow_up_date
                      ? new Date(visit.follow_up_date).toLocaleDateString()
                      : "Pending"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render diagnostic reports
  const renderReports = () => {
    const reports = medicalHistory?.diagnosticReports || [];
    if (reports.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">🔬 No diagnostic reports found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.report_id}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {report.test_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {report.report_type}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  report.urgency_level === "Critical"
                    ? "bg-red-200 text-red-800"
                    : report.urgency_level === "Abnormal"
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-green-200 text-green-800"
                }`}
              >
                {report.urgency_level || "Normal"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 font-medium">📅 Report Date</p>
                <p className="text-gray-800">
                  {new Date(report.report_date).toLocaleDateString()}
                </p>
              </div>
              {report.lab_name && (
                <div>
                  <p className="text-gray-600 font-medium">🏥 Laboratory</p>
                  <p className="text-gray-800">{report.lab_name}</p>
                </div>
              )}
              {report.doctor_name && (
                <div>
                  <p className="text-gray-600 font-medium">👨‍⚕️ Doctor</p>
                  <p className="text-gray-800">{report.doctor_name}</p>
                </div>
              )}
              {report.results && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 font-medium">📊 Results</p>
                  <div className="bg-white p-3 rounded border border-green-200 font-mono text-xs overflow-auto max-h-40">
                    {typeof report.results === "string"
                      ? report.results
                      : JSON.stringify(JSON.parse(report.results), null, 2)}
                  </div>
                </div>
              )}
              {report.abnormalities && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 font-medium">⚠️ Abnormalities</p>
                  <p className="text-red-700">{report.abnormalities}</p>
                </div>
              )}
              {report.interpretation && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 font-medium">💭 Interpretation</p>
                  <p className="text-gray-800 italic">{report.interpretation}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render prescriptions
  const renderPrescriptions = () => {
    const prescriptions = medicalHistory?.prescriptions || [];
    if (prescriptions.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">💊 No prescriptions found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {prescriptions.map((prescription) => (
          <div
            key={prescription.prescription_id}
            className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {prescription.medication_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {prescription.dosage}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  prescription.is_active
                    ? "bg-green-200 text-green-800"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {prescription.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 font-medium">📅 Date Prescribed</p>
                <p className="text-gray-800">
                  {new Date(prescription.prescription_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">⏱️ Frequency</p>
                <p className="text-gray-800">{prescription.frequency}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">⏳ Duration</p>
                <p className="text-gray-800">{prescription.duration}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">💉 Route</p>
                <p className="text-gray-800">{prescription.route}</p>
              </div>
              {prescription.doctor_name && (
                <div>
                  <p className="text-gray-600 font-medium">👨‍⚕️ Prescribed By</p>
                  <p className="text-gray-800">{prescription.doctor_name}</p>
                </div>
              )}
              {prescription.refills_allowed > 0 && (
                <div>
                  <p className="text-gray-600 font-medium">🔄 Refills</p>
                  <p className="text-gray-800">
                    {prescription.refills_used}/{prescription.refills_allowed}
                  </p>
                </div>
              )}
              {prescription.instructions && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 font-medium">📝 Special Instructions</p>
                  <p className="text-gray-800 italic">{prescription.instructions}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render treatment timeline
  const renderTimeline = () => {
    const timeline = medicalHistory?.treatmentTimeline || [];
    if (timeline.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">📊 No treatment timeline found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {timeline.map((entry, index) => (
          <div key={entry.timeline_id} className="flex gap-4">
            {/* Timeline dot and line */}
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full border-4 border-white shadow-md"></div>
              {index < timeline.length - 1 && (
                <div className="w-1 h-20 bg-gradient-to-b from-blue-200 to-purple-200 mt-2"></div>
              )}
            </div>

            {/* Timeline content */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-5 flex-1 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {entry.treatment_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {entry.treatment_type}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
                    entry.status === "completed"
                      ? "bg-green-200 text-green-800"
                      : entry.status === "cancelled"
                        ? "bg-red-200 text-red-800"
                        : entry.status === "ongoing"
                          ? "bg-blue-200 text-blue-800"
                          : entry.status === "paused"
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-purple-200 text-purple-800"
                  }`}
                >
                  {entry.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">📅 Start Date</p>
                  <p className="text-gray-800">
                    {new Date(entry.treatment_date).toLocaleDateString()}
                  </p>
                </div>
                {entry.duration && (
                  <div>
                    <p className="text-gray-600 font-medium">⏳ Duration</p>
                    <p className="text-gray-800">{entry.duration}</p>
                  </div>
                )}
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
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          📋 Medical Timeline & History
        </h2>
        <p className="text-gray-600">
          View complete medical history including visits, diagnostic reports, prescriptions, and treatment timeline
        </p>
      </div>

      {/* Search Section */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-blue-100"
      >
        <div className="flex flex-col md:flex-row gap-4">
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
                  {medicalHistory.patient.first_name}{" "}
                  {medicalHistory.patient.last_name}
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
                { id: "visits", label: "📅 Visits", count: medicalHistory.visits?.length || 0 },
                { id: "reports", label: "🔬 Reports", count: medicalHistory.diagnosticReports?.length || 0 },
                { id: "prescriptions", label: "💊 Prescriptions", count: medicalHistory.prescriptions?.length || 0 },
                { id: "timeline", label: "📊 Timeline", count: medicalHistory.treatmentTimeline?.length || 0 },
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
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm font-bold">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-2xl shadow-lg p-8">
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
            Enter a patient's Smart Patient ID (format: SPC-XXXXX) or Patient ID to view their complete medical timeline, including all visits, diagnostic reports, prescriptions, and treatment history.
          </p>
        </div>
      )}
    </div>
  );
}

export default MedicalTimeline;
