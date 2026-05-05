import React, { useState, useEffect } from "react";
import { scheduleAPI, adminAPI, authAPI } from "../services/api";

const DEPARTMENTS = [
  "Cardiology", "Neurology", "Gynecology", "Pediatrics",
  "General Medicine", "Dermatology", "Orthopedics", "Psychiatry",
  "ENT", "Ophthalmology", "Urology", "Oncology", "Nephrology",
  "Emergency Medicine", "Other",
];

function DoctorsList({ currentUser }) {
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    degree: "",
    department: "Cardiology",
    experienceYears: "",
    medicalName: "MediAI SmartCare",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetchDoctorsAndSchedules();
  }, []);

  const fetchDoctorsAndSchedules = async () => {
    try {
      setLoading(true);
      const docsRes = await scheduleAPI.getAllDoctors();
      const docs = docsRes.data || [];
      setDoctors(docs);

      // Fetch schedules for all doctors
      const schedulesMap = {};
      await Promise.all(
        docs.map(async (doc) => {
          try {
            const schedRes = await scheduleAPI.getDoctorSchedule(doc.doctor_id);
            schedulesMap[doc.doctor_id] = schedRes.data.schedules || [];
          } catch (e) {
            schedulesMap[doc.doctor_id] = [];
          }
        })
      );
      setSchedules(schedulesMap);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load doctors list.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to remove this doctor?")) return;
    try {
      await adminAPI.removeDoctor(doctorId);
      fetchDoctorsAndSchedules();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove doctor.");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      await authAPI.register({
        ...addForm,
        role: "doctor",
      });
      setShowAddModal(false);
      setAddForm({
        fullName: "", email: "", password: "", phone: "",
        degree: "", department: "Cardiology", experienceYears: "", medicalName: "MediAI SmartCare"
      });
      fetchDoctorsAndSchedules();
    } catch (err) {
      setAddError(err.response?.data?.message || "Failed to add doctor.");
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Doctors...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            👨‍⚕️ Doctors List
          </h2>
          <p className="text-gray-600 mt-1">
            View available doctors and their schedules.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700 transition"
          >
            + Add Doctor
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 p-8 bg-white/60 rounded-2xl">
            No doctors available at the moment.
          </div>
        ) : (
          doctors.map((doc) => (
            <div key={doc.doctor_id} className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{doc.name}</h3>
                  <p className="text-sm font-medium text-blue-600">{doc.specialization} • {doc.department}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleRemoveDoctor(doc.doctor_id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                    title="Remove Doctor"
                  >
                    🗑️
                  </button>
                )}
              </div>
              
              <div className="mb-4 text-sm text-gray-600 flex-1">
                <p>🎓 {doc.qualification || doc.degree || "N/A"}</p>
                <p>💼 {doc.experience_years} years experience</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Weekly Schedule</h4>
                {(!schedules[doc.doctor_id] || schedules[doc.doctor_id].length === 0) ? (
                  <p className="text-xs text-gray-500 italic">No schedule set</p>
                ) : (
                  <div className="space-y-1 mt-2">
                    {schedules[doc.doctor_id].map((sched) => (
                      <div key={sched.schedule_id} className="flex justify-between text-xs text-gray-700">
                        <span className="font-medium">{sched.day_of_week}</span>
                        <span>{sched.start_time.slice(0, 5)} - {sched.end_time.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Add New Doctor</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{addError}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                  <input required value={addForm.fullName} onChange={e => setAddForm({...addForm, fullName: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1" />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                  <input required value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Degree</label>
                  <input required placeholder="e.g. MBBS, MD" value={addForm.degree} onChange={e => setAddForm({...addForm, degree: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Department</label>
                  <select required value={addForm.department} onChange={e => setAddForm({...addForm, department: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Experience (Years)</label>
                  <input required type="number" min="0" value={addForm.experienceYears} onChange={e => setAddForm({...addForm, experienceYears: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
                  <input required type="password" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={addLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {addLoading ? "Saving..." : "Add Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorsList;
