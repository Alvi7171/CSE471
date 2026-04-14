import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:1355/api";

function PatientTimeline() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/patients`);
      setPatients(response.data.patients || []);
    } catch (err) {
      setError("Failed to load patient records.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setAiSummary(null); // Reset when selecting new patient
    setSummaryError(null);
    try {
      setLoading(true);
      const encPhone = encodeURIComponent(patient.phone);
      const response = await axios.get(`${API_BASE_URL}/patients/${encPhone}/timeline`);
      setTimeline(response.data.timeline || []);
    } catch (err) {
      setError("Failed to load patient timeline.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    if (!selectedPatient) return;
    try {
      setLoadingSummary(true);
      setSummaryError(null);
      const encPhone = encodeURIComponent(selectedPatient.phone);
      const response = await axios.get(`${API_BASE_URL}/patients/${encPhone}/summary`);
      setAiSummary(response.data.summary);
    } catch (err) {
      setSummaryError("Failed to generate AI summary.");
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSaveNote = async (appointmentId) => {
    try {
      setSavingNote(true);
      await axios.put(`${API_BASE_URL}/appointments/${appointmentId}/notes`, {
        notes: noteContent
      });
      // Update local state
      setTimeline(prev =>
        prev.map(item =>
          item.type === 'appointment' && item.id === appointmentId
            ? { ...item, notes: noteContent, status: item.status === 'pending' ? 'completed' : item.status }
            : item
        )
      );
      setEditingNoteId(null);
      setNoteContent("");
    } catch (err) {
      setError("Failed to save note.");
      console.error(err);
    } finally {
      setSavingNote(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          👥 Patient Records & Timeline
        </h2>
        <p className="text-gray-600 mt-1">
          Search for patients to view their complete medical history and manage their doctor prescriptions.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Patients List */}
        <div className="lg:col-span-1">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Patient Directory</h3>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
              />
            </div>

            {loading && !selectedPatient ? (
              <p className="text-gray-500 text-center">Loading patients...</p>
            ) : filteredPatients.length === 0 ? (
              <p className="text-gray-500 text-center">No patients found</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredPatients.map((patient, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPatient(patient)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 ${selectedPatient?.phone === patient.phone
                        ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg transform scale-105"
                        : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-purple-300 hover:shadow-md hover:scale-102"
                      }`}
                  >
                    <h4 className="font-semibold text-gray-800">{patient.name}</h4>
                    <p className="text-sm text-gray-600">📱 {patient.phone}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">Last visit: {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'N/A'}</p>
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                        {patient.total_appointments} visits
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="lg:col-span-2">
          {!selectedPatient ? (
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-12 text-center border border-white/40">
              <div className="text-6xl mb-4">🩺</div>
              <p className="text-gray-500">
                Select a patient from the directory to view their complete medical timeline
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Info Card */}
              <div className="bg-gradient-to-br from-white/70 to-purple-50/50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                      {selectedPatient.name}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      {selectedPatient.age} years old • {selectedPatient.gender}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600 bg-white/50 px-4 py-2 rounded-lg">
                    <p>Contact: <span className="font-medium text-gray-800">{selectedPatient.phone}</span></p>
                    <p>{selectedPatient.email || 'No email provided'}</p>
                  </div>
                </div>
                
                {/* AI Action Button */}
                <div className="mt-4 pt-4 border-t border-purple-100/50 flex justify-end">
                  <button 
                    onClick={generateAISummary}
                    disabled={loadingSummary}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg ${
                      loadingSummary 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-105'
                    }`}
                  >
                    {loadingSummary ? (
                      <>
                        <span className="animate-spin text-lg">⏳</span> Scanning History...
                      </>
                    ) : (
                      <>
                        <span className="text-lg">✨</span> Generate AI History Summary
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Summary Dashboard */}
              {summaryError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  ⚠️ {summaryError}
                </div>
              )}
              {aiSummary && (
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border-l-4 border-l-purple-500 border-t border-t-white relative animate-fade-in-up">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl pointer-events-none">✨</div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-800 to-purple-800 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                    Executive Medical Summary
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* Overview */}
                      <div className="bg-white/60 p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-2">🩺 Overview</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{aiSummary.overview}</p>
                      </div>
                      
                      {/* Alerts */}
                      <div className="bg-orange-50/80 p-4 rounded-xl border border-orange-100 shadow-sm">
                        <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2">💡 AI Clinical Alerts</h4>
                        {aiSummary.alerts && aiSummary.alerts.length > 0 ? (
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            {aiSummary.alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No specific alerts detected.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Chronic Conditions */}
                      <div className="bg-red-50/60 p-4 rounded-xl border border-red-100 shadow-sm">
                        <h4 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-2">⚠️ Chronic / Recurring Issues</h4>
                        {aiSummary.chronicConditions && aiSummary.chronicConditions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {aiSummary.chronicConditions.map((cond, i) => (
                              <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">{cond}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No chronic conditions identified.</p>
                        )}
                      </div>

                      {/* Medications */}
                      <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 shadow-sm">
                        <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">💊 Recent Medications</h4>
                        {aiSummary.recentMedications && aiSummary.recentMedications.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {aiSummary.recentMedications.map((med, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Rx: {med}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No recent medications found in notes.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* The Timeline */}
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                <h3 className="text-xl font-semibold mb-8 text-gray-800 border-b border-gray-200 pb-4">Medical Journey Timeline</h3>

                {loading ? (
                  <p className="text-center text-gray-500">Loading timeline...</p>
                ) : timeline.length === 0 ? (
                  <p className="text-center text-gray-500">No medical history found for this patient.</p>
                ) : (
                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-purple-200 before:via-blue-200 before:to-transparent">
                    {timeline.map((item, index) => (
                      <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white text-xl shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform hover:scale-110">
                          {item.type === 'appointment' ? '👨‍⚕️' : '🤖'}
                        </div>

                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-white shadow-sm hover:shadow-lg transition-all duration-300">
                          <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                            <div className="text-sm font-semibold text-purple-600">
                              {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {item.type === 'appointment' && (
                              <span className={`px-3 py-1 text-xs rounded-full font-bold shadow-sm ${item.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  item.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                }`}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                            )}
                          </div>

                          {item.type === 'appointment' ? (
                            <div>
                              <h4 className="font-bold text-gray-800 text-lg mb-1">Dr. {item.doctorInfo}</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <strong>Reason for Visit:</strong> {item.reason || 'Routine checkup'}
                              </p>

                              <div className="mt-4 pt-3 border-t border-gray-100">
                                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  📝 Doctor's Medical Notes / Prescription
                                </h5>

                                {editingNoteId === item.id ? (
                                  <div className="mt-2 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                    <textarea
                                      className="w-full text-sm border-0 bg-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 shadow-sm"
                                      rows="4"
                                      value={noteContent}
                                      onChange={(e) => setNoteContent(e.target.value)}
                                      placeholder="Write prescriptions, diagnoses, instructions..."
                                    />
                                    <div className="flex gap-2 mt-3">
                                      <button
                                        disabled={savingNote}
                                        onClick={() => handleSaveNote(item.id)}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium text-xs rounded-lg shadow-md hover:shadow-lg transition-all">
                                        {savingNote ? 'Saving...' : '💾 Save Prescription'}
                                      </button>
                                      <button
                                        onClick={() => { setEditingNoteId(null); setNoteContent(""); }}
                                        className="px-4 py-2 bg-white text-gray-700 font-medium text-xs rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-all">
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {item.notes ? (
                                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.notes}</p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400 italic mb-2">No notes have been added for this session yet.</p>
                                    )}

                                    {item.status !== 'cancelled' && (
                                      <button
                                        onClick={() => { setEditingNoteId(item.id); setNoteContent(item.notes || ""); }}
                                        className="mt-2 inline-flex items-center gap-1 text-sm text-purple-600 font-semibold hover:text-purple-800 hover:bg-purple-50 px-2 py-1 rounded transition-colors">
                                        ✏️ {item.notes ? 'Edit Prescription' : 'Add Medical Note'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2">
                                AI Triage Assessment
                              </h4>
                              <div className="space-y-2 mt-3">
                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                  <p className="text-sm text-gray-700"><strong>Symptoms Logged:</strong> {item.symptoms}</p>
                                </div>
                                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                  <p className="text-sm text-gray-700">
                                    <strong>AI Prediction:</strong> {
                                      item.predictedDiseases ? JSON.parse(item.predictedDiseases).join(', ') : 'Diagnosis pending'
                                    }
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase">Urgency Assessment:</span>
                                <span className={`px-2 py-1 text-xs rounded shadow-sm font-bold ${item.urgency === 'High' || item.urgency === 'Emergency' ? 'bg-red-500 text-white' :
                                    item.urgency === 'Medium' ? 'bg-yellow-400 text-yellow-900' :
                                      'bg-green-500 text-white'
                                  }`}>
                                  {item.urgency}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientTimeline;
