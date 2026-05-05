import React, { useState, useEffect } from "react";
import api, { patientAPI } from "../services/api";

function PatientLabReports({ currentUser }) {
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTest, setSelectedTest] = useState(null);
  const [searchId, setSearchId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    
    setLoading(true);
    setError("");
    setHasSearched(true);
    setSelectedTest(null);
    try {
      const response = await api.get(`/lab/tests?patientId=${searchId.trim()}`);
      setLabTests(response.data.tests || []);
      if (response.data.tests?.length === 0) {
        setError("No lab tests found for this Patient ID.");
      }
    } catch (err) {
      console.error("Error fetching lab tests:", err);
      setError("Failed to load lab reports. Please check the Patient ID and try again.");
      setLabTests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestDetails = async (testId) => {
    try {
      const response = await api.get(`/lab/tests/${testId}`);
      setSelectedTest(response.data);
    } catch (err) {
      console.error("Error fetching test details:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Diagnostic History</h2>
          <p className="text-slate-500 font-medium mt-2">Track your laboratory analysis and medical reports</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Enter Patient ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none w-full md:w-64"
          />
          <button 
            type="submit"
            className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {!hasSearched && !loading ? (
        <div className="bg-slate-50 rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
          <div className="text-6xl mb-6">🔍</div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Search Lab Reports</h3>
          <p className="text-slate-500 font-medium">Enter your Patient ID above to view your laboratory test progress and reports.</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="text-6xl mb-4">🧪</div>
          <div className="text-slate-400 font-bold text-xl tracking-widest uppercase">Searching Laboratory Records...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center font-medium">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Test Timeline */}
          <div className="lg:col-span-7 space-y-6">
          {labTests.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center shadow-xl border border-slate-100 border-dashed">
              <div className="text-6xl mb-6">📂</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">No Reports Yet</h3>
              <p className="text-slate-500 font-medium">Your laboratory diagnostics will appear here once requested by your physician.</p>
            </div>
          ) : (
            labTests.map((test) => (
              <div 
                key={test.test_id}
                onClick={() => test.is_delivered && fetchTestDetails(test.test_id)}
                className={`group relative bg-white rounded-3xl p-8 shadow-md border-2 transition-all cursor-pointer ${test.is_delivered ? "border-transparent hover:border-blue-500 hover:shadow-2xl" : "border-slate-50 opacity-70"}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${test.is_delivered ? "bg-green-100" : "bg-slate-100"}`}>
                      {test.is_delivered ? "📄" : "⏳"}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">{test.test_name}</h4>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{test.test_type} • Case #{test.test_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-400">{new Date(test.request_date).toLocaleDateString()}</div>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${test.is_delivered ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {test.is_delivered ? "DELIVERED" : "PROCESSING"}
                    </span>
                  </div>
                </div>

                {test.is_delivered ? (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-slate-600 text-sm font-medium line-clamp-1 max-w-[70%]">
                      {test.summary || "Medical report is available for review."}
                    </p>
                    <button className="text-blue-600 font-black text-sm group-hover:underline flex items-center gap-2">
                      View Report <span>→</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400 italic">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                      Your sample is currently undergoing analysis in the laboratory.
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Report Details Sidebar */}
        <div className="lg:col-span-5">
          {selectedTest ? (
            <div className="sticky top-10 bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl text-white">
              <div className="p-8 border-b border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-blue-600 px-3 py-1 rounded-full">Official Result</span>
                  <button onClick={() => setSelectedTest(null)} className="text-white/40 hover:text-white">&times;</button>
                </div>
                <h3 className="text-3xl font-black mb-2">{selectedTest.test.test_name}</h3>
                <div className="flex items-center gap-3 text-white/60 text-xs font-bold">
                  <span>DATE: {new Date(selectedTest.report?.report_date).toLocaleDateString()}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                  <span>REF: {selectedTest.test.test_id}</span>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Laboratory Findings</h4>
                  <div className="space-y-4">
                    {selectedTest.results.map((r, i) => (
                      <div key={i} className="flex justify-between items-center group/item">
                        <div>
                          <div className="text-sm font-bold text-white/90">{r.parameter_name}</div>
                          <div className="text-[10px] font-medium text-white/40 italic">Range: {r.reference_range}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-base font-black ${r.is_abnormal ? "text-red-400" : "text-green-400"}`}>
                            {r.value} <span className="text-[10px] opacity-60 font-medium">{r.unit}</span>
                          </div>
                          {r.is_abnormal && <span className="text-[8px] font-black text-red-400 uppercase tracking-tighter bg-red-400/10 px-1 rounded">Abnormal</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Physician's Interpretation</h4>
                  <p className="text-sm text-white/80 font-medium leading-relaxed">
                    {selectedTest.report?.interpretation || "No specific interpretation provided. Please consult with your attending physician for a detailed breakdown."}
                  </p>
                </div>

                <button 
                  className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl flex items-center justify-center gap-3"
                  onClick={() => window.print()}
                >
                  <span>🖨️</span> Print Medical Report
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-6 opacity-30">🛡️</div>
              <h4 className="text-xl font-black text-slate-800 mb-2">Secure Report Viewer</h4>
              <p className="text-slate-500 font-medium text-sm">Select a delivered laboratory report to view detailed analysis and findings.</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

export default PatientLabReports;
