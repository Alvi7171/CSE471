import api from "../services/api";

function LabTestManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState("requests");
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form states
  const [showNewTestForm, setShowNewTestForm] = useState(false);
  const [sortOrder, setSortOrder] = useState("latest");
  const [newTest, setNewTest] = useState({
    patientId: "",
    patientName: "",
    testType: "Blood Test",
    testName: "Complete Blood Count (CBC)",
    priority: "Normal",
    notes: ""
  });

  const TEST_NAMES = [
    "Complete Blood Count (CBC)",
    "Lipid Profile",
    "Liver Function Test (LFT)",
    "Kidney Function Test (KFT)",
    "Blood Sugar (Fasting)",
    "Blood Sugar (Post Prandial)",
    "HbA1c",
    "Thyroid Profile (T3, T4, TSH)",
    "Urine Routine & Microscopy",
    "Vitamin D (25-OH)",
    "Vitamin B12",
    "C-Reactive Protein (CRP)",
    "Electrolytes (Na, K, Cl)",
    "Uric Acid",
    "Calcium",
    "Malaria Parasite (MP)",
    "Dengue NS1 Antigen",
    "Chest X-Ray",
    "ECG (Electrocardiogram)",
    "Ultrasound Whole Abdomen",
    "CT Scan Brain",
    "MRI Spine"
  ];
  
  // Results form
  const [showResultsForm, setShowResultsForm] = useState(false);
  const [resultParams, setResultParams] = useState([
    { parameterName: "", value: "", unit: "", referenceRange: "", isAbnormal: false }
  ]);

  // Stats
  const [stats, setStats] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError("");
    setSuccess("");
  };

  useEffect(() => {
    fetchTests();
    fetchStats();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/lab/tests");
      let data = response.data.tests || [];
      setTests(data);
    } catch (err) {
      setError("Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  };

  const getSortedTests = () => {
    return [...tests].sort((a, b) => {
      if (sortOrder === "latest") {
        return new Date(b.request_date) - new Date(a.request_date);
      } else {
        return new Date(a.request_date) - new Date(b.request_date);
      }
    });
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/lab/stats");
      setStats(response.data.stats);
    } catch (err) {
      console.error("Failed to load stats");
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // Use a default doctor ID (1) for now
      await api.post("/lab/tests", {
        ...newTest,
        doctorId: 1,
        patientId: parseInt(newTest.patientId) || 0
      });
      setSuccess("Lab test request created successfully!");
      setShowNewTestForm(false);
      setNewTest({ 
        patientId: "", 
        patientName: "", 
        testType: "Blood Test", 
        testName: TEST_NAMES[0], 
        priority: "Normal", 
        notes: "" 
      });
      fetchTests();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to create lab test");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (testId, newStatus) => {
    setLoading(true);
    try {
      await api.put(`/lab/tests/${testId}/status`, { status: newStatus });
      setSuccess(`Status updated to ${newStatus}`);
      fetchTests();
      fetchStats();
      if (selectedTest?.test?.test_id === testId) {
        fetchTestDetails(testId);
      }
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
      await api.post(`/lab/tests/${selectedTest.test.test_id}/results`, {
        results: resultParams.filter(p => p.parameterName && p.value)
      });
      setSuccess("Results added successfully!");
      setShowResultsForm(false);
      setResultParams([{ parameterName: "", value: "", unit: "", referenceRange: "", isAbnormal: false }]);
      fetchTestDetails(selectedTest.test.test_id);
      fetchTests();
    } catch (err) {
      setError("Failed to add results");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      await api.post(`/lab/tests/${selectedTest.test.test_id}/report`, {
        reportType: selectedTest.test.test_name,
        labTechnician: "Senior Pathologist"
      });
      setSuccess("Report generated successfully!");
      fetchTestDetails(selectedTest.test.test_id);
      fetchStats();
      fetchTests();
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverReport = async (reportId) => {
    try {
      await api.put(`/lab/reports/${reportId}/deliver`, { deliveredTo: "Patient" });
      setSuccess("Report delivered to patient!");
      fetchTestDetails(selectedTest.test.test_id);
    } catch (err) {
      setError("Failed to deliver report");
    }
  };

  const fetchTestDetails = async (testId) => {
    setLoading(true);
    try {
      const response = await api.get(`/lab/tests/${testId}`);
      setSelectedTest(response.data);
      // If we are in results tab, scroll to details
      if (activeTab === "requests") {
        setActiveTab("results");
      }
    } catch (err) {
      setError("Failed to load test details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "Sample Collected": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "In Progress": return "bg-purple-100 text-purple-800 border border-purple-200";
      case "Completed": return "bg-green-100 text-green-800 border border-green-200";
      case "Cancelled": return "bg-red-100 text-red-800 border border-red-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Emergency": return "bg-red-600 text-white shadow-sm";
      case "Urgent": return "bg-orange-500 text-white shadow-sm";
      case "Normal": return "bg-blue-500 text-white shadow-sm";
      default: return "bg-gray-500 text-white shadow-sm";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-3">
                <span className="bg-blue-100 p-2 rounded-2xl">🧪</span>
                Laboratory Test Management
              </h1>
              <p className="text-slate-500 mt-2 text-lg">Centralized diagnostic hub for requests, analysis, and reports</p>
            </div>
            <button
              onClick={() => setShowNewTestForm(true)}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
            >
              <span className="text-xl">+</span> New Test Request
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Tests", val: stats.totalTests, color: "blue", icon: "📋" },
              { label: "Pending", val: stats.pendingTests, color: "yellow", icon: "⏳" },
              { label: "Completed", val: stats.completedTests, color: "green", icon: "✅" },
              { label: "Emergency", val: stats.emergencyTests, color: "red", icon: "🚨" }
            ].map((s, i) => (
              <div key={i} className={`bg-white rounded-2xl shadow-md p-6 border-b-4 border-${s.color}-500 hover:shadow-lg transition-shadow`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-3xl font-black text-slate-800">{s.val}</div>
                    <div className="text-slate-500 font-medium">{s.label}</div>
                  </div>
                  <div className="text-2xl opacity-80">{s.icon}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs & Filters */}
        <div className="bg-white rounded-2xl shadow-md mb-8 overflow-hidden border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center p-2">
            <div className="flex w-full md:w-auto">
              <button
                onClick={() => handleTabChange("requests")}
                className={`flex-1 md:flex-none px-8 py-4 font-bold transition-all rounded-xl ${activeTab === "requests" ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:text-slate-600"}`}
              >
                Test Requests
              </button>
              <button
                onClick={() => handleTabChange("results")}
                className={`flex-1 md:flex-none px-8 py-4 font-bold transition-all rounded-xl ${activeTab === "results" ? "bg-blue-50 text-blue-700" : "text-slate-400 hover:text-slate-600"}`}
              >
                Results & Details
              </button>
            </div>
            
            {activeTab === "requests" && (
              <div className="p-4 flex items-center gap-3">
                <span className="text-slate-400 font-medium">Sort:</span>
                <select 
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 animate-pulse flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span> {error}
            </div>
            <button onClick={() => setError("")} className="bg-red-100 hover:bg-red-200 text-red-600 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span> {success}
            </div>
            <button onClick={() => setSuccess("")} className="bg-green-100 hover:bg-green-200 text-green-600 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all">✕</button>
          </div>
        )}

        {/* Test Requests Tab */}
        {activeTab === "requests" && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Test ID</th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Requested On</th>
                    <th className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && tests.length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-medium">Processing records...</td></tr>
                  ) : getSortedTests().length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-medium">No diagnostic requests found</td></tr>
                  ) : (
                    getSortedTests().map((test) => (
                      <tr key={test.test_id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5 text-sm font-bold text-slate-900">#{test.test_id}</td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-slate-800">{test.display_name}</div>
                          <div className="text-xs text-slate-500">{test.phone_number || "No contact"}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-semibold text-slate-800">{test.test_name}</div>
                          <div className="text-xs text-slate-400">{test.test_type}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(test.priority)}`}>
                            {test.priority}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStatusColor(test.status)}`}>
                            {test.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500 font-medium">{new Date(test.request_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => fetchTestDetails(test.test_id)}
                            className="bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all transform group-hover:scale-105"
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* List Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-lg font-black text-slate-800 px-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                Active Lab Work
              </h3>
              <div className="bg-white rounded-2xl shadow-lg p-2 border border-slate-100 max-h-[600px] overflow-y-auto">
                {tests.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No active work</div>
                ) : (
                  tests.map((test) => (
                    <div
                      key={test.test_id}
                      onClick={() => fetchTestDetails(test.test_id)}
                      className={`p-4 mb-2 rounded-xl border-2 cursor-pointer transition-all ${selectedTest?.test?.test_id === test.test_id ? "border-blue-500 bg-blue-50/50" : "border-transparent hover:bg-slate-50"}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">#{test.test_id}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${getStatusColor(test.status)}`}>{test.status}</span>
                      </div>
                      <div className="font-bold text-slate-800 truncate">{test.test_name}</div>
                      <div className="text-xs text-slate-500">{test.display_name}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-8">
              {selectedTest ? (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden min-h-[600px]">
                  {/* Test Info Header */}
                  <div className="bg-slate-900 p-8 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-blue-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Case ID: {selectedTest.test.test_id}</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${getPriorityColor(selectedTest.test.priority)}`}>{selectedTest.test.priority} Priority</span>
                        </div>
                        <h2 className="text-3xl font-black">{selectedTest.test.test_name}</h2>
                        <p className="text-slate-400 font-medium mt-1">Requested by Dr. {selectedTest.test.doctor_name || "Staff"}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-400 text-sm font-bold">Patient Records</div>
                        <div className="text-xl font-black">{selectedTest.test.display_name}</div>
                        <div className="text-sm text-blue-400 font-bold">{selectedTest.test.phone_number || "No contact"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    {/* Progress Bar */}
                    <div className="mb-8">
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        <span>Phase: {selectedTest.test.status}</span>
                        <span>Completion: {selectedTest.test.status === 'Completed' ? '100%' : '65%'}</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 bg-gradient-to-r from-blue-500 to-indigo-600`}
                          style={{ width: selectedTest.test.status === 'Completed' ? '100%' : selectedTest.test.status === 'In Progress' ? '75%' : '25%' }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Collection Details</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-slate-500">Sample Type:</span>
                            <span className="text-slate-800">{selectedTest.test.test_type}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-slate-500">Scheduled:</span>
                            <span className="text-slate-800">{selectedTest.test.scheduled_date ? new Date(selectedTest.test.scheduled_date).toLocaleDateString() : "Pending"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <button className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all">Print Label</button>
                          <button className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all">Notify Doctor</button>
                        </div>
                      </div>
                    </div>

                    {/* Results Analysis */}
                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <span className="text-xl">📊</span> Analysis Results
                        </h4>
                        {selectedTest.test.status !== 'Completed' && (
                          <button 
                            onClick={() => setShowResultsForm(true)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                          >
                            + Edit Results
                          </button>
                        )}
                      </div>

                      {selectedTest.results?.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Parameter</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Value</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Ref. Range</th>
                                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedTest.results.map((r, i) => (
                                <tr key={i} className={r.is_abnormal ? "bg-red-50/50" : ""}>
                                  <td className="px-4 py-4 text-sm font-bold text-slate-800">{r.parameter_name}</td>
                                  <td className="px-4 py-4 text-sm font-black text-slate-900">{r.value} <span className="text-[10px] text-slate-400">{r.unit}</span></td>
                                  <td className="px-4 py-4 text-xs font-medium text-slate-500">{r.reference_range}</td>
                                  <td className="px-4 py-4 text-right">
                                    {r.is_abnormal ? (
                                      <span className="text-red-500 font-black text-[10px] uppercase bg-red-100 px-2 py-1 rounded">Abnormal</span>
                                    ) : (
                                      <span className="text-green-500 font-black text-[10px] uppercase bg-green-100 px-2 py-1 rounded">Normal</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                          <div className="text-4xl mb-4">🧪</div>
                          <p className="text-slate-500 font-bold">Waiting for laboratory input</p>
                          <button 
                            onClick={() => setShowResultsForm(true)}
                            className="mt-4 bg-white border border-blue-200 text-blue-600 px-6 py-2 rounded-xl font-bold hover:bg-blue-50 transition-all"
                          >
                            Enter Results Manually
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Report Section */}
                    {selectedTest.report ? (
                      <div className="p-8 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl text-white shadow-xl shadow-blue-200">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                          <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                              <span className="text-2xl">📄</span>
                            </div>
                            <div>
                              <h4 className="text-xl font-black">Official Report Ready</h4>
                              <p className="text-blue-100 text-sm font-medium">Certified by {selectedTest.report.lab_technician}</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-bold transition-all backdrop-blur-md">Download PDF</button>
                            {selectedTest.report.is_delivered ? (
                              <button className="bg-green-400 text-green-900 px-6 py-3 rounded-xl font-black flex items-center gap-2">
                                <span>✅</span> Delivered
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleDeliverReport(selectedTest.report.report_id)}
                                className="bg-white text-blue-700 px-8 py-3 rounded-xl font-black hover:bg-slate-100 transition-all shadow-lg"
                              >
                                Deliver to Patient
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (selectedTest.test.status === 'Completed' || selectedTest.results?.length > 0) ? (
                      <button 
                        onClick={handleGenerateReport}
                        className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl hover:bg-slate-800 transition-all shadow-2xl flex items-center justify-center gap-3 transform hover:-translate-y-1"
                      >
                        Generate Final Diagnostic Report
                        <span className="text-sm bg-blue-500 px-3 py-1 rounded-full">DRAFTING</span>
                      </button>
                    ) : null}

                    {/* Doctor Status Overrides */}
                    {currentUser?.role === 'doctor' && (
                      <div className="mt-12 pt-8 border-t border-slate-100">
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Protocol Management</h5>
                        <div className="flex flex-wrap justify-center gap-3">
                          {["Pending", "Sample Collected", "In Progress", "Completed", "Cancelled"].map((s) => (
                            <button
                              key={s}
                              disabled={selectedTest.test.status === s}
                              onClick={() => handleUpdateStatus(selectedTest.test.test_id, s)}
                              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${selectedTest.test.status === s ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-slate-100 border-dashed min-h-[600px] flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center text-6xl mb-6">🔭</div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">No Record Selected</h3>
                  <p className="text-slate-500 max-w-sm mx-auto font-medium">Select a patient test from the sidebar to view comprehensive analytics and manage reports.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: New Test Form */}
        {showNewTestForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">New Diagnosis</h2>
                    <p className="text-slate-500 font-medium mt-1">Initiate a laboratory test request</p>
                  </div>
                  <button onClick={() => setShowNewTestForm(false)} className="bg-slate-100 hover:bg-red-50 hover:text-red-500 w-12 h-12 rounded-2xl text-2xl font-light transition-all flex items-center justify-center">&times;</button>
                </div>
                
                <form onSubmit={handleCreateTest} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Patient Database ID (Optional)</label>
                      <input
                        type="number"
                        value={newTest.patientId}
                        onChange={(e) => setNewTest({...newTest, patientId: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm"
                        placeholder="Enter ID..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Patient Full Name</label>
                      <input
                        type="text"
                        required
                        value={newTest.patientName}
                        onChange={(e) => setNewTest({...newTest, patientName: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm"
                        placeholder="Full Name..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Test Category</label>
                      <select
                        value={newTest.testType}
                        onChange={(e) => setNewTest({...newTest, testType: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm cursor-pointer"
                      >
                        <option>Blood Test</option>
                        <option>Urine Test</option>
                        <option>Imaging (X-Ray/CT/MRI)</option>
                        <option>Cardiology (ECG/Stress)</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Priority Level</label>
                      <div className="flex gap-2">
                        {["Normal", "Urgent", "Emergency"].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewTest({...newTest, priority: p})}
                            className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border-2 ${newTest.priority === p ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Medical Test Name</label>
                    <select
                      value={newTest.testName}
                      onChange={(e) => setNewTest({...newTest, testName: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm cursor-pointer"
                    >
                      {TEST_NAMES.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Clinical Notes</label>
                    <textarea
                      value={newTest.notes}
                      onChange={(e) => setNewTest({...newTest, notes: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-blue-500 focus:bg-white transition-all outline-none min-h-[100px] text-sm"
                      placeholder="Add specific clinical instructions..."
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {loading ? "Processing Diagnostic Request..." : "Deploy Diagnostic Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Results Entry Form */}
        {showResultsForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-top-8 duration-300">
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">Lab Analysis</h2>
                    <p className="text-slate-500 font-medium mt-1">Entering results for Case #{selectedTest?.test?.test_id}</p>
                  </div>
                  <button onClick={() => setShowResultsForm(false)} className="bg-slate-100 hover:bg-red-50 hover:text-red-500 w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all">&times;</button>
                </div>

                <form onSubmit={handleAddResults} className="space-y-6">
                  <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                    {resultParams.map((param, index) => (
                      <div key={index} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            placeholder="Parameter (e.g. Hemoglobin)"
                            value={param.parameterName}
                            onChange={(e) => {
                              const newList = [...resultParams];
                              newList[index].parameterName = e.target.value;
                              setResultParams(newList);
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                          />
                          <input
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) => {
                              const newList = [...resultParams];
                              newList[index].value = e.target.value;
                              setResultParams(newList);
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <input
                            placeholder="Unit (g/dL)"
                            value={param.unit}
                            onChange={(e) => {
                              const newList = [...resultParams];
                              newList[index].unit = e.target.value;
                              setResultParams(newList);
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                          />
                          <input
                            placeholder="Ref. Range"
                            value={param.referenceRange}
                            onChange={(e) => {
                              const newList = [...resultParams];
                              newList[index].referenceRange = e.target.value;
                              setResultParams(newList);
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
                          />
                          <div className="flex items-center justify-center bg-white border border-slate-200 rounded-xl px-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={param.isAbnormal}
                                onChange={(e) => {
                                  const newList = [...resultParams];
                                  newList[index].isAbnormal = e.target.checked;
                                  setResultParams(newList);
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-0"
                              />
                              <span className="text-[10px] font-black uppercase text-slate-500">Abnormal</span>
                            </label>
                          </div>
                        </div>
                        {resultParams.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => setResultParams(resultParams.filter((_, i) => i !== index))}
                            className="w-full py-2 text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-all"
                          >
                            Remove Parameter
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setResultParams([...resultParams, { parameterName: "", value: "", unit: "", referenceRange: "", isAbnormal: false }])}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 transition-all"
                  >
                    + Add Analysis Parameter
                  </button>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl disabled:opacity-50"
                    >
                      {loading ? "Saving Records..." : "Commit Analysis to Database"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LabTestManagement;
