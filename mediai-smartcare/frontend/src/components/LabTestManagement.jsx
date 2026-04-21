import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:1355/api";

function LabTestManagement() {
  const [activeTab, setActiveTab] = useState("requests");
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form states
  const [showNewTestForm, setShowNewTestForm] = useState(false);
  const [newTest, setNewTest] = useState({
    patientId: "",
    testType: "Blood Test",
    testName: "",
    priority: "Normal",
    notes: ""
  });
  
  // Results form
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [resultParams, setResultParams] = useState([
    { parameterName: "", value: "", unit: "", referenceRange: "", isAbnormal: false }
  ]);

  // Stats
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchTests();
    fetchStats();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/lab/tests`);
      setTests(response.data.tests || []);
    } catch (err) {
      setError("Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/lab/stats`);
      setStats(response.data.stats);
    } catch (err) {
      console.error("Failed to load stats");
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Use a default doctor ID (1) for now
      await axios.post(`${API_BASE_URL}/lab/tests`, {
        ...newTest,
        doctorId: 1,
        patientId: parseInt(newTest.patientId) || 1
      });
      setSuccess("Lab test request created successfully!");
      setShowNewTestForm(false);
      setNewTest({ patientId: "", testType: "Blood Test", testName: "", priority: "Normal", notes: "" });
      fetchTests();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create lab test");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (testId, newStatus) => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/lab/tests/${testId}/status`, { status: newStatus });
      setSuccess(`Status updated to ${newStatus}`);
      fetchTests();
      fetchStats();
    } catch (err) {
      setError("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleAddResults = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/lab/tests/${selectedTest.test_id}/results`, {
        results: resultParams.filter(p => p.parameterName && p.value)
      });
      setSuccess("Results added successfully!");
      setShowResultsForm(false);
      setResultParams([{ parameterName: "", value: "", unit: "", referenceRange: "", isAbnormal: false }]);
      fetchTestDetails(selectedTest.test_id);
    } catch (err) {
      setError("Failed to add results");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/lab/tests/${selectedTest.test_id}/report`, {
        reportType: selectedTest.test_name,
        labTechnician: "Lab Technician"
      });
      setSuccess("Report generated successfully!");
      fetchTestDetails(selectedTest.test_id);
      fetchStats();
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverReport = async (reportId) => {
    try {
      await axios.put(`${API_BASE_URL}/lab/reports/${reportId}/deliver`, { deliveredTo: "Patient" });
      setSuccess("Report delivered to patient!");
      fetchTestDetails(selectedTest.test_id);
    } catch (err) {
      setError("Failed to deliver report");
    }
  };

  const fetchTestDetails = async (testId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/lab/tests/${testId}`);
      setSelectedTest(response.data);
    } catch (err) {
      setError("Failed to load test details");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Sample Collected": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-purple-100 text-purple-800";
      case "Completed": return "bg-green-100 text-green-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Emergency": return "bg-red-600 text-white";
      case "Urgent": return "bg-orange-500 text-white";
      case "Normal": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🧪 Laboratory Test Management</h1>
              <p className="text-gray-500 mt-1">Track lab tests, results, and report delivery</p>
            </div>
            <button
              onClick={() => setShowNewTestForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
            >
              + New Test Request
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
              <div className="text-3xl font-bold text-gray-800">{stats.totalTests}</div>
              <div className="text-gray-500">Total Tests</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-yellow-500">
              <div className="text-3xl font-bold text-gray-800">{stats.pendingTests}</div>
              <div className="text-gray-500">Pending</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
              <div className="text-3xl font-bold text-gray-800">{stats.completedTests}</div>
              <div className="text-gray-500">Completed</div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
              <div className="text-3xl font-bold text-gray-800">{stats.emergencyTests}</div>
              <div className="text-gray-500">Emergency</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === "requests" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              📋 Test Requests
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === "results" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              📊 Results & Reports
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

        {/* Test Requests Tab */}
        {activeTab === "requests" && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Test ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Patient</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Test Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Priority</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : tests.length === 0 ? (
                    <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No lab tests found</td></tr>
                  ) : (
                    tests.map((test) => (
                      <tr key={test.test_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">#{test.test_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{test.first_name} {test.last_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">{test.test_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{test.test_type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(test.priority)}`}>
                            {test.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                            {test.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(test.request_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => fetchTestDetails(test.test_id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Details
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

        {/* Results & Reports Tab */}
        {activeTab === "results" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test List */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Tests with Results</h3>
              <div className="space-y-3">
                {tests.filter(t => t.status === "In Progress" || t.status === "Completed").map((test) => (
                  <div
                    key={test.test_id}
                    onClick={() => fetchTestDetails(test.test_id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTest?.test?.test_id === test.test_id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">{test.test_name}</div>
                        <div className="text-sm text-gray-500">{test.first_name} {test.last_name}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(test.status)}`}>{test.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              {selectedTest ? (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Test Details #{selectedTest.test?.test_id}</h3>
                      <p className="text-gray-500">{selectedTest.test?.test_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedTest.test?.status)}`}>
                      {selectedTest.test?.status}
                    </span>
                  </div>

                  {/* Results */}
                  {selectedTest.results?.length > 0 ? (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 mb-3">Test Results</h4>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">Parameter</th>
                              <th className="px-3 py-2 text-left">Value</th>
                              <th className="px-3 py-2 text-left">Unit</th>
                              <th className="px-3 py-2 text-left">Reference</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTest.results.map((r, i) => (
                              <tr key={i} className={r.is_abnormal ? "bg-red-50" : ""}>
                                <td className="px-3 py-2">{r.parameter_name}</td>
                                <td className="px-3 py-2 font-medium">{r.value}</td>
                                <td className="px-3 py-2">{r.unit}</td>
                                <td className="px-3 py-2 text-gray-500">{r.reference_range}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg text-yellow-700">
                      No results added yet.
                    </div>
                  )}

                  {/* Report */}
                  {selectedTest.report ? (
                    <div className="mb-6 p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-green-800">Report Generated</div>
                          <div className="text-sm text-green-600">Date: {new Date(selectedTest.report.report_date).toLocaleDateString()}</div>
                        </div>
                        {selectedTest.report.is_delivered ? (
                          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm">✅ Delivered</span>
                        ) : (
                          <button
                            onClick={() => handleDeliverReport(selectedTest.report.report_id)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                          >
                            Deliver Report
                          </button>
                        )}
                      </div>
                    </div>
                  ) : selectedTest.test?.status === "In Progress" ? (
                    <button
                      onClick={handleGenerateReport}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-600"
                    >
                      Generate Report
                    </button>
                  ) : null}

                  {/* Status Update */}
                  {selectedTest.test?.status !== "Completed" && selectedTest.test?.status !== "Cancelled" && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                      <div className="flex gap-2">
                        {["Sample Collected", "In Progress", "Completed", "Cancelled"].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateStatus(selectedTest.test.test_id, status)}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a test to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Test Form Modal */}
        {showNewTestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">New Lab Test Request</h2>
                <button onClick={() => setShowNewTestForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <form onSubmit={handleCreateTest}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
                    <input
                      type="number"
                      value={newTest.patientId}
                      onChange={(e) => setNewTest({...newTest, patientId: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter patient ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                    <select
                      value={newTest.testType}
                      onChange={(e) => setNewTest({...newTest, testType: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Blood Test</option>
                      <option>Urine Test</option>
                      <option>X-Ray</option>
                      <option>ECG</option>
                      <option>MRI</option>
                      <option>CT Scan</option>
                      <option>Ultrasound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                    <input
                      type="text"
                      value={newTest.testName}
                      onChange={(e) => setNewTest({...newTest, testName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Complete Blood Count"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTest.priority}
                      onChange={(e) => setNewTest({...newTest, priority: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Normal</option>
                      <option>Urgent</option>
                      <option>Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={newTest.notes}
                      onChange={(e) => setNewTest({...newTest, notes: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Test Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTestForm(false)}
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

export default LabTestManagement;