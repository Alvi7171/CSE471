import React, { useCallback, useEffect, useMemo, useState } from "react";
import { prescriptionAPI } from "../services/api";

const createPrescriptionItem = () => ({
  medicineName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
});

const openPrintWindow = (html) => {
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
};

function DoctorPrescriptions({ currentUser, dashboardIntent }) {
  const isDoctorUser = currentUser?.role === "doctor";
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [visitId, setVisitId] = useState("");
  const [doctorIdInput, setDoctorIdInput] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionItems, setPrescriptionItems] = useState([
    createPrescriptionItem(),
  ]);
  const [createdPrescription, setCreatedPrescription] = useState(null);
  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [historyError, setHistoryError] = useState("");

  const resolvedDoctorId = useMemo(() => {
    if (isDoctorUser) {
      return currentUser?.doctorId || "";
    }
    return doctorIdInput;
  }, [isDoctorUser, currentUser?.doctorId, doctorIdInput]);

  const parsedPatientId = useMemo(() => {
    const id = Number(patientId);
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }
    return id;
  }, [patientId]);

  useEffect(() => {
    if (!dashboardIntent?.nonce) return;
    if (dashboardIntent.tabKey !== "prescriptions") return;
    if (dashboardIntent.action !== "createPrescription") return;

    if (dashboardIntent.patientId) {
      setPatientId(String(dashboardIntent.patientId));
    }

    if (dashboardIntent.appointmentId) {
      setAppointmentId(String(dashboardIntent.appointmentId));
    }

    if (dashboardIntent.patientId || dashboardIntent.appointmentId) {
      setInfoMessage("Visit context loaded from the selected appointment.");
    }
  }, [dashboardIntent]);

  const loadPatientHistory = useCallback(async (targetPatientId) => {
    if (!targetPatientId) {
      setPrescriptionHistory([]);
      setHistoryError("");
      return;
    }

    setLoadingHistory(true);
    setHistoryError("");

    try {
      const response =
        await prescriptionAPI.getPatientPrescriptions(targetPatientId);
      setPrescriptionHistory(
        Array.isArray(response.prescriptions) ? response.prescriptions : [],
      );
    } catch (apiError) {
      setHistoryError(
        apiError.response?.data?.message ||
          "Failed to load patient prescription history",
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!parsedPatientId) {
      setPrescriptionHistory([]);
      setHistoryError("");
      setLoadingHistory(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadPatientHistory(parsedPatientId);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [parsedPatientId, loadPatientHistory]);

  const mergedPrescriptionHistory = useMemo(() => {
    const map = new Map();

    if (createdPrescription?.prescription_id) {
      map.set(Number(createdPrescription.prescription_id), {
        ...createdPrescription,
        medicineCount: Array.isArray(createdPrescription.items)
          ? createdPrescription.items.length
          : null,
      });
    }

    for (const item of prescriptionHistory) {
      const key = Number(item.prescription_id);
      if (!map.has(key)) {
        map.set(key, item);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [createdPrescription, prescriptionHistory]);

  const updatePrescriptionItem = (index, key, value) => {
    setPrescriptionItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  };

  const addPrescriptionItem = () => {
    setPrescriptionItems((current) => [...current, createPrescriptionItem()]);
  };

  const removePrescriptionItem = (index) => {
    setPrescriptionItems((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index),
    );
  };

  const handleCreatePrescription = async (event) => {
    event.preventDefault();
    setError("");
    setInfoMessage("");

    if (!patientId) {
      setError("Patient ID is required for prescription");
      return;
    }

    if (!resolvedDoctorId && !appointmentId) {
      setError(
        "Doctor ID is required for admin unless a valid appointment ID is provided",
      );
      return;
    }

    setLoadingPrescription(true);
    try {
      const payload = {
        patientId: Number(patientId),
        doctorId: resolvedDoctorId ? Number(resolvedDoctorId) : undefined,
        appointmentId: appointmentId ? Number(appointmentId) : undefined,
        visitId: visitId ? Number(visitId) : undefined,
        diagnosis,
        advice,
        notes: prescriptionNotes,
        items: prescriptionItems,
      };

      const response = await prescriptionAPI.createPrescription(payload);
      setCreatedPrescription(response.prescription);

      if (parsedPatientId) {
        await loadPatientHistory(parsedPatientId);
      }

      if (response.notificationWarning) {
        setInfoMessage(response.notificationWarning);
      } else if (response.notificationResult) {
        setInfoMessage("Prescription created and patient notification sent.");
      } else {
        setInfoMessage("Prescription created.");
      }
    } catch (apiError) {
      setError(
        apiError.response?.data?.message || "Failed to create prescription",
      );
    } finally {
      setLoadingPrescription(false);
    }
  };

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
          Prescriptions
        </h1>
        <p className="text-gray-600">
          Create prescriptions and review prescription history for a patient.
        </p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Visit Context</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input-field"
            type="number"
            placeholder="Patient User ID *"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            required
          />
          <input
            className="input-field"
            type="number"
            placeholder="Appointment ID (optional)"
            value={appointmentId}
            onChange={(event) => setAppointmentId(event.target.value)}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Visit ID (optional)"
            value={visitId}
            onChange={(event) => setVisitId(event.target.value)}
          />
          <input
            className={`input-field ${isDoctorUser ? "bg-gray-50" : ""}`}
            type="number"
            placeholder={
              isDoctorUser
                ? "Doctor ID (auto)"
                : "Doctor ID (optional if Appointment ID provided)"
            }
            value={resolvedDoctorId}
            onChange={(event) => {
              if (!isDoctorUser) {
                setDoctorIdInput(event.target.value);
              }
            }}
            disabled={isDoctorUser}
          />
        </div>
        {!isDoctorUser && (
          <p className="text-xs text-gray-500 mt-2">
            Admin tip: provide appointmentId to auto-detect doctor, or enter
            doctor profile ID manually.
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-sm">
          {infoMessage}
        </div>
      )}

      {historyError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          {historyError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form className="card space-y-4" onSubmit={handleCreatePrescription}>
          <h2 className="text-xl font-semibold text-theme-primary">
            Create Prescription
          </h2>
          <textarea
            className="input-field"
            rows="2"
            placeholder="Diagnosis"
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
          />
          <textarea
            className="input-field"
            rows="2"
            placeholder="Advice"
            value={advice}
            onChange={(event) => setAdvice(event.target.value)}
          />
          <textarea
            className="input-field"
            rows="2"
            placeholder="Notes"
            value={prescriptionNotes}
            onChange={(event) => setPrescriptionNotes(event.target.value)}
          />

          <div className="space-y-2">
            {prescriptionItems.map((item, index) => (
              <div
                key={`rx-item-${index}`}
                className="border border-gray-200 rounded-xl p-3 space-y-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    className="input-field"
                    placeholder="Medicine Name"
                    value={item.medicineName}
                    onChange={(event) =>
                      updatePrescriptionItem(
                        index,
                        "medicineName",
                        event.target.value,
                      )
                    }
                    required
                  />
                  <input
                    className="input-field"
                    placeholder="Dosage"
                    value={item.dosage}
                    onChange={(event) =>
                      updatePrescriptionItem(index, "dosage", event.target.value)
                    }
                    required
                  />
                  <input
                    className="input-field"
                    placeholder="Frequency"
                    value={item.frequency}
                    onChange={(event) =>
                      updatePrescriptionItem(
                        index,
                        "frequency",
                        event.target.value,
                      )
                    }
                    required
                  />
                  <input
                    className="input-field"
                    placeholder="Duration"
                    value={item.duration}
                    onChange={(event) =>
                      updatePrescriptionItem(
                        index,
                        "duration",
                        event.target.value,
                      )
                    }
                    required
                  />
                </div>
                <input
                  className="input-field"
                  placeholder="Instructions"
                  value={item.instructions}
                  onChange={(event) =>
                    updatePrescriptionItem(
                      index,
                      "instructions",
                      event.target.value,
                    )
                  }
                />
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => removePrescriptionItem(index)}
                >
                  Remove Medicine
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-theme-primary text-theme-primary"
            onClick={addPrescriptionItem}
          >
            + Add Medicine
          </button>

          <button
            type="submit"
            disabled={loadingPrescription}
            className="w-full py-3 rounded-xl bg-theme-primary text-white font-semibold disabled:opacity-60"
          >
            {loadingPrescription ? "Creating..." : "Create Prescription"}
          </button>
        </form>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Prescription History</h3>
            {loadingHistory && parsedPatientId && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
          </div>

          {!parsedPatientId ? (
            <p className="text-sm text-gray-500">
              Enter Patient User ID to view prescription history.
            </p>
          ) : mergedPrescriptionHistory.length === 0 ? (
            <p className="text-sm text-gray-500">
              No prescriptions found for this patient.
            </p>
          ) : (
            <div className="space-y-3">
              {mergedPrescriptionHistory.slice(0, 5).map((item, index) => (
                <div
                  key={`rx-history-${item.prescription_id}`}
                  className={`border rounded-xl p-3 text-sm ${
                    index === 0
                      ? "border-theme-primary/40 bg-theme-primary/5"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-theme-primary">
                      {item.prescription_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                  <div className="text-gray-700 mt-1">
                    Diagnosis: {item.diagnosis || "-"}
                  </div>
                  <div className="text-gray-600">
                    Doctor: {item.doctor_name || "-"}
                  </div>
                  {item.medicineCount !== null &&
                    item.medicineCount !== undefined && (
                      <div className="text-gray-600">
                        Medicines: {item.medicineCount}
                      </div>
                    )}
                  <div className="mt-2 flex items-center gap-2">
                    {index === 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        Latest
                      </span>
                    )}
                    <button
                      className="px-3 py-1.5 rounded-lg bg-theme-primary text-white text-xs"
                      onClick={() =>
                        handlePrintPrescription(item.prescription_id)
                      }
                      type="button"
                    >
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorPrescriptions;
