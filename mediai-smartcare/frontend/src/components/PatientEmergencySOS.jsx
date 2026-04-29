import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:1355/api";

function PatientEmergencySOS({ currentUser }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    emergencyType: "Other",
    location: "",
    chiefComplaint: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        patientName: currentUser.fullName || "Anonymous Patient",
        patientPhone: currentUser.phone || "",
        patientAge: currentUser.age || "",
        patientGender: currentUser.gender || "Other",
        emergencyType: form.emergencyType,
        severity: "High", // Default to high for patient-initiated SOS
        location: form.location,
        chiefComplaint: form.chiefComplaint,
      };

      await axios.post(`${API_BASE_URL}/emergency`, payload);

      setSuccess("Your emergency request has been sent to the hospital. Help is on the way!");
      setForm({
        emergencyType: "Other",
        location: "",
        chiefComplaint: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send emergency request. Please call the hospital directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-8 shadow-xl text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🚑</span>
        </div>
        <h2 className="text-3xl font-bold text-red-700 mb-2">Emergency SOS</h2>
        <p className="text-red-600 mb-8 max-w-lg mx-auto">
          If you are experiencing a life-threatening emergency, please submit this form immediately to alert the hospital staff.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-xl mb-6 text-left">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-100 border border-green-500 text-green-800 p-6 rounded-2xl mb-6 shadow-sm animate-pulse">
            <h3 className="text-2xl font-bold mb-2">🚨 Alert Sent!</h3>
            <p className="text-lg">{success}</p>
            <button 
              onClick={() => setSuccess("")} 
              className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Report Another Emergency
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left bg-white p-6 rounded-2xl shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">What is the Emergency? *</label>
              <select
                value={form.emergencyType}
                onChange={(e) => setForm({ ...form, emergencyType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50 text-gray-800"
                required
              >
                <option value="Cardiac Emergency">Heart Attack / Cardiac Issue</option>
                <option value="Respiratory Emergency">Breathing Difficulty</option>
                <option value="Stroke">Stroke Symptoms</option>
                <option value="Trauma/Injury">Severe Injury or Trauma</option>
                <option value="Allergic Reaction">Severe Allergic Reaction</option>
                <option value="Other">Other Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Your Location (Optional but recommended)</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Home address, Street name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Additional Details</label>
              <textarea
                value={form.chiefComplaint}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                placeholder="Briefly describe what is happening..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 bg-gray-50"
                rows="3"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white text-xl font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 mt-4"
            >
              {loading ? "Sending Alert..." : "🚨 SEND EMERGENCY SOS"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default PatientEmergencySOS;
