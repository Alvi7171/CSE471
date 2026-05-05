import React, { useEffect, useMemo, useState } from "react";
import {
  appointmentAPI,
  prescriptionAPI,
  symptomAPI,
} from "../services/api";

const parseDateTime = (dateValue, timeValue = "00:00:00") => {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T${String(timeValue).slice(0, 8)}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (dateValue, timeValue) => {
  const parsed = parseDateTime(dateValue, timeValue);
  if (!parsed) return "Unknown time";

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatHistoryDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function PatientTimeline({ currentUser }) {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [symptomChecks, setSymptomChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser?.userId) {
      setAppointments([]);
      setPrescriptions([]);
      setSymptomChecks([]);
      setLoading(false);
      return;
    }

    let active = true;

    const loadPatientRecords = async () => {
      setLoading(true);
      setError("");

      try {
        const requests = [
          appointmentAPI.getMyAppointments(),
          prescriptionAPI.getPatientPrescriptions(currentUser.userId),
        ];

        if (currentUser.fullName) {
          requests.push(symptomAPI.getHistory(currentUser.fullName));
        } else {
          requests.push(Promise.resolve({ data: [] }));
        }

        const [appointmentResponse, prescriptionResponse, symptomResponse] =
          await Promise.all(requests);

        if (!active) return;

        setAppointments(appointmentResponse.appointments || []);
        setPrescriptions(prescriptionResponse.prescriptions || []);
        setSymptomChecks(symptomResponse.data || []);
      } catch (apiError) {
        if (!active) return;
        setError(
          apiError.response?.data?.message ||
            "Failed to load your patient records",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPatientRecords();

    return () => {
      active = false;
    };
  }, [currentUser?.fullName, currentUser?.userId]);

  const nextAppointment = useMemo(() => {
    const now = new Date();

    return [...appointments]
      .filter((appointment) =>
        ["pending", "confirmed"].includes(String(appointment.status || "")),
      )
      .map((appointment) => ({
        ...appointment,
        appointmentDateTime: parseDateTime(
          appointment.appointment_date,
          appointment.appointment_time,
        ),
      }))
      .filter(
        (appointment) =>
          appointment.appointmentDateTime &&
          appointment.appointmentDateTime.getTime() >= now.getTime(),
      )
      .sort(
        (left, right) =>
          left.appointmentDateTime.getTime() -
          right.appointmentDateTime.getTime(),
      )[0];
  }, [appointments]);

  const timelineItems = useMemo(() => {
    const appointmentItems = appointments.map((appointment) => ({
      id: `appointment-${appointment.appointment_id}`,
      sortDate:
        parseDateTime(
          appointment.appointment_date,
          appointment.appointment_time,
        )?.getTime() || 0,
      type: "appointment",
      title: `Appointment with Dr. ${appointment.doctor_name || "Assigned Doctor"}`,
      subtitle: `${appointment.specialization || "General Medicine"} | ${appointment.department || "Hospital Visit"}`,
      status: appointment.status,
      body: appointment.symptoms || "No symptom notes recorded",
      notes: appointment.notes || "",
      meta: formatDateTime(
        appointment.appointment_date,
        appointment.appointment_time,
      ),
    }));

    const prescriptionItems = prescriptions.map((prescription) => ({
      id: `prescription-${prescription.prescription_id}`,
      sortDate: new Date(prescription.created_at || 0).getTime() || 0,
      type: "prescription",
      title: prescription.prescription_number || "Prescription Record",
      subtitle: `Dr. ${prescription.doctor_name || "Doctor"}${
        prescription.doctor_specialization
          ? ` | ${prescription.doctor_specialization}`
          : ""
      }`,
      status: "issued",
      body: prescription.diagnosis || "Prescription issued without diagnosis note",
      notes: prescription.advice || prescription.notes || "",
      meta: formatHistoryDate(prescription.created_at),
    }));

    const symptomItems = symptomChecks.map((check) => ({
      id: `symptom-${check.check_id}`,
      sortDate: new Date(check.check_date || 0).getTime() || 0,
      type: "symptom",
      title: "AI Symptom Assessment",
      subtitle: check.recommended_specialist || "Recommended Specialist Pending",
      status: check.urgency_level || "Medium",
      body: check.symptoms || "No symptom details available",
      notes: Array.isArray(check.predicted_diseases)
        ? check.predicted_diseases.join(", ")
        : "",
      meta: formatHistoryDate(check.check_date),
    }));

    return [...appointmentItems, ...prescriptionItems, ...symptomItems].sort(
      (left, right) => right.sortDate - left.sortDate,
    );
  }, [appointments, prescriptions, symptomChecks]);

  const summaryStats = useMemo(
    () => [
      {
        label: "Appointments",
        value: appointments.length,
        helper: "All booked visits",
      },
      {
        label: "Prescriptions",
        value: prescriptions.length,
        helper: "Issued records",
      },
      {
        label: "AI Checks",
        value: symptomChecks.length,
        helper: "Saved symptom assessments",
      },
      {
        label: "Upcoming",
        value: nextAppointment ? "1" : "0",
        helper: nextAppointment ? "Visit scheduled" : "No future visit",
      },
    ],
    [
      appointments.length,
      nextAppointment,
      prescriptions.length,
      symptomChecks.length,
    ],
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">
          Patient Records
        </h1>
        <p className="text-gray-600">
          Your appointments, prescriptions, and AI symptom history are kept here
          in one timeline.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.5fr] gap-6">
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">
                  Personal Snapshot
                </h2>
                <p className="text-sm text-gray-600">
                  Key details used across your care records
                </p>
              </div>
              <span className="text-xs uppercase tracking-wider text-gray-500">
                Patient
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Name
                </p>
                <p className="font-medium text-theme-ink">
                  {currentUser?.fullName || "Not provided"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Contact
                </p>
                <p className="font-medium text-theme-ink">
                  {currentUser?.phone || "No mobile number"}
                </p>
                <p className="text-gray-600 mt-1">
                  {currentUser?.email || "No email"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Demographics
                </p>
                <p className="font-medium text-theme-ink">
                  Age: {currentUser?.age || "Not provided"}
                </p>
                <p className="text-gray-600 mt-1">
                  Gender: {currentUser?.gender || "Not provided"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  Address
                </p>
                <p className="font-medium text-theme-ink">
                  {currentUser?.address || "Not provided"}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-theme-primary mb-4">
              Care Snapshot
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {summaryStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    {item.label}
                  </p>
                  <p className="text-2xl font-semibold text-theme-primary">
                    {loading ? "--" : item.value}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-theme-primary mb-3">
              Next Visit
            </h2>
            {loading ? (
              <p className="text-sm text-gray-500">Loading upcoming visit...</p>
            ) : nextAppointment ? (
              <div className="rounded-xl border border-slate-200 bg-theme-soft px-4 py-4">
                <p className="font-semibold text-theme-ink">
                  Dr. {nextAppointment.doctor_name || "Assigned Doctor"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {nextAppointment.specialization || "Consultation"}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {formatDateTime(
                    nextAppointment.appointment_date,
                    nextAppointment.appointment_time,
                  )}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  {nextAppointment.symptoms || "No consultation note provided."}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                You do not have a pending or confirmed appointment right now.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-theme-primary mb-4">
            Medical Activity Timeline
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading your timeline...</p>
          ) : timelineItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              No records have been added to your timeline yet.
            </p>
          ) : (
            <div className="space-y-4">
              {timelineItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs uppercase tracking-wider rounded-full bg-theme-soft px-2 py-1 text-theme-primary font-semibold">
                          {item.type}
                        </span>
                        <span className="text-xs uppercase tracking-wider text-gray-500">
                          {item.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-theme-ink">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.subtitle}
                      </p>
                    </div>

                    <p className="text-sm text-gray-500 whitespace-nowrap">
                      {item.meta}
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <p className="text-sm text-theme-ink">{item.body}</p>
                  </div>

                  {item.notes && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700">{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientTimeline;
