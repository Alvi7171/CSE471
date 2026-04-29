import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:1355/api";

function PatientProfile({ currentUser }) {
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role === "patient") {
      fetchPatientData();
    }
  }, [currentUser]);

  const fetchPatientData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/patients/${currentUser.phone}/complete-history`);
      if (response.data.success) {
        setPatientData(response.data.medicalHistory);
      }
    } catch (err) {
      console.error("Error fetching patient data:", err);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.delete(`${API_BASE_URL}/patients/${currentUser.phone}`);
      
      if (response.data.success) {
        setSuccess("Your account and all medical records have been deleted successfully.");
        setPatientData(null);
        setShowDeleteConfirm(false);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete account. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== "patient") {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-600">This page is only accessible to patients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Profile</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            <strong>Success:</strong> {success}
          </div>
        )}

        {patientData ? (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <span className="ml-2 text-gray-800">
                    {patientData.patient.first_name} {patientData.patient.last_name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Smart Patient ID:</span>
                  <span className="ml-2 text-gray-800 font-mono">{patientData.patient.smart_patient_id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Phone:</span>
                  <span className="ml-2 text-gray-800">{patientData.patient.phone_number}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Date of Birth:</span>
                  <span className="ml-2 text-gray-800">{patientData.patient.date_of_birth}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Gender:</span>
                  <span className="ml-2 text-gray-800">{patientData.patient.gender}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Blood Type:</span>
                  <span className="ml-2 text-gray-800">{patientData.patient.blood_type || "Not specified"}</span>
                </div>
              </div>
            </div>

            {/* Medical Summary */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Medical Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{patientData.visits?.length || 0}</div>
                  <div className="text-sm text-gray-600">Medical Visits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{patientData.prescriptions?.length || 0}</div>
                  <div className="text-sm text-gray-600">Prescriptions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{patientData.diagnosticReports?.length || 0}</div>
                  <div className="text-sm text-gray-600">Lab Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{patientData.labTests?.length || 0}</div>
                  <div className="text-sm text-gray-600">Lab Tests</div>
                </div>
              </div>
            </div>

            {/* Account Management */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-700 mb-4">Account Management</h2>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notice</h3>
                  <p className="text-yellow-700 text-sm">
                    Deleting your account will permanently remove all your medical records, including:
                  </p>
                  <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
                    <li>All personal information</li>
                    <li>Medical visit history</li>
                    <li>Prescriptions and treatments</li>
                    <li>Lab reports and test results</li>
                    <li>Emergency records</li>
                  </ul>
                  <p className="text-yellow-700 text-sm mt-2 font-semibold">
                    This action cannot be undone.
                  </p>
                </div>
                
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  🗑️ Delete My Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Loading your profile information...</p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-red-700 mb-4">Confirm Account Deletion</h3>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you absolutely sure you want to delete your account? This will permanently remove:
                </p>
                <ul className="text-gray-600 text-sm mb-4 ml-4 list-disc">
                  <li>All your personal information</li>
                  <li>Complete medical history</li>
                  <li>All prescriptions and treatments</li>
                  <li>Lab reports and test results</li>
                  <li>Emergency records</li>
                </ul>
                <p className="text-red-600 font-semibold text-sm">
                  This action cannot be undone and cannot be recovered.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Deleting..." : "Yes, Delete My Account"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientProfile;
