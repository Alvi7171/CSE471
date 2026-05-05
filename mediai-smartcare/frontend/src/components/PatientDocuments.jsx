import React, { useEffect, useState } from "react";
import { prescriptionAPI } from "../services/api";

const openPrintWindow = (html) => {
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};

function PatientDocuments({ currentUser }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!currentUser?.userId) return;

    setLoading(true);
    setError("");
    try {
      const prescriptionRes = await prescriptionAPI.getPatientPrescriptions(
        currentUser.userId,
      );
      setPrescriptions(prescriptionRes.prescriptions || []);
    } catch (apiError) {
      setError(
        apiError.response?.data?.message || "Failed to load prescriptions",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.userId]);

  const handlePrintPrescription = async (prescriptionId) => {
    try {
      const html = await prescriptionAPI.getPrescriptionPrintHtml(
        prescriptionId,
      );
      openPrintWindow(html);
    } catch (_error) {
      setError("Failed to load printable prescription");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">
          My Prescriptions
        </h1>
        <p className="text-gray-600">
          View your prescription history and print copies when needed.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Prescriptions</h2>
          <button
            type="button"
            onClick={loadData}
            className="text-sm text-theme-primary"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-sm text-gray-500">No prescriptions found.</p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.prescription_id}
                className="border border-gray-200 rounded-xl p-3 text-sm"
              >
                <div className="font-semibold">
                  {prescription.prescription_number}
                </div>
                <div className="text-gray-500">
                  Dr. {prescription.doctor_name}
                </div>
                <div className="mt-2">
                  Diagnosis: {prescription.diagnosis || "-"}
                </div>
                <button
                  type="button"
                  className="mt-2 text-theme-primary text-sm"
                  onClick={() =>
                    handlePrintPrescription(prescription.prescription_id)
                  }
                >
                  Print Prescription
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDocuments;
