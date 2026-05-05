import React, { useEffect, useMemo, useState } from "react";
import {
  appointmentAPI,
  notificationAPI,
  prescriptionAPI,
} from "../services/api";
import { formatRoleUserId, getUserDisplayName } from "../utils/identity";

const getDisplayValue = (value) => {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "string" && value.trim().length === 0) {
    return "Not provided";
  }
  return value;
};

const getStatusTone = (statusKey) => {
  if (statusKey === "complete") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  return "bg-amber-100 text-amber-700 border-amber-200";
};

const toDateTime = (dateValue, timeValue = "00:00:00") => {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T${String(timeValue).slice(0, 8)}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (dateValue, timeValue) => {
  const parsed = toDateTime(dateValue, timeValue);
  if (!parsed) return "Not scheduled";

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDoctorDescriptor = (appointment) => {
  const name = String(appointment?.doctor_name || "").trim();
  const specialization = String(appointment?.specialization || "").trim();
  const department = String(appointment?.department || "").trim();
  const consultationFee = Number(appointment?.consultation_fee);
  const details = [specialization, department].filter(Boolean).join(" | ");

  return {
    name: name ? `Dr. ${name}` : "Doctor details unavailable",
    details: details || "Specialization and department not available",
    fee: Number.isFinite(consultationFee)
      ? `Fee: BDT ${consultationFee.toLocaleString()}`
      : "Fee not available",
  };
};

function PatientPortalSummary({
  currentUser,
  onNavigate,
  onEditProfile,
  refreshNonce = 0,
}) {
  const [appointments, setAppointments] = useState([]);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasSummaryError, setHasSummaryError] = useState(false);

  useEffect(() => {
    if (!currentUser?.userId) {
      setAppointments([]);
      setPrescriptionCount(0);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let active = true;

    const loadPortalSummary = async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setHasSummaryError(false);

      try {
        const [appointmentResponse, prescriptionResponse, notificationResponse] =
          await Promise.all([
            appointmentAPI.getMyAppointments(),
            prescriptionAPI.getPatientPrescriptions(currentUser.userId),
            notificationAPI.getUnreadCount(),
          ]);

        if (!active) return;

        setAppointments(appointmentResponse.appointments || []);
        setPrescriptionCount(
          Array.isArray(prescriptionResponse.prescriptions)
            ? prescriptionResponse.prescriptions.length
            : 0,
        );
        setUnreadCount(Number(notificationResponse.unreadCount || 0));
      } catch (_error) {
        if (!active) return;
        setHasSummaryError(true);
        setAppointments([]);
        setPrescriptionCount(0);
        setUnreadCount(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPortalSummary();
    const intervalId = window.setInterval(() => loadPortalSummary(true), 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [currentUser?.userId, refreshNonce]);

  const nextAppointment = useMemo(() => {
    const now = new Date();

    return [...appointments]
      .filter((appointment) =>
        ["pending", "confirmed"].includes(String(appointment.status || "")),
      )
      .map((appointment) => ({
        ...appointment,
        appointmentDateTime: toDateTime(
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

  const completedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => String(appointment.status) === "completed",
      ).length,
    [appointments],
  );

  const patientDisplayName = useMemo(
    () => getUserDisplayName(currentUser),
    [currentUser?.fullName, currentUser?.doctorProfile?.name, currentUser?.role],
  );

  const formattedPatientId = useMemo(
    () =>
      formatRoleUserId(currentUser?.role || "patient", currentUser?.userId) ||
      currentUser?.userId,
    [currentUser?.role, currentUser?.userId],
  );

  const nextAppointmentDoctor = useMemo(
    () => getDoctorDescriptor(nextAppointment),
    [nextAppointment],
  );

  const profileStatus = currentUser?.profileStatus || {
    key: "incomplete",
    label: "Patient profile needs updates",
    missingFields: [],
  };

  const identityFields = useMemo(
    () => [
      { label: "Patient Name", value: patientDisplayName },
      { label: "Patient ID", value: formattedPatientId },
      { label: "Email", value: currentUser?.email, isEmail: true },
      { label: "Mobile Number", value: currentUser?.phone },
      { label: "Age", value: currentUser?.age },
      { label: "Gender", value: currentUser?.gender },
      { label: "Address", value: currentUser?.address },
      { label: "Profile Status", value: profileStatus.label, isStatus: true },
    ],
    [
      currentUser?.address,
      currentUser?.age,
      currentUser?.email,
      currentUser?.gender,
      currentUser?.phone,
      formattedPatientId,
      patientDisplayName,
      profileStatus.label,
    ],
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "Total Appointments",
        value: loading || hasSummaryError ? "--" : appointments.length,
        helper: "All booked visits",
      },
      {
        label: "Completed Appointments",
        value: loading || hasSummaryError ? "--" : completedAppointments,
        helper: "Finished consultations",
      },
      {
        label: "Upcoming Appointment",
        value: loading || hasSummaryError
          ? "--"
          : nextAppointment
            ? formatDateTime(
                nextAppointment.appointment_date,
                nextAppointment.appointment_time,
              )
            : "None scheduled",
        helper: nextAppointment
          ? `${nextAppointmentDoctor.name} | ${nextAppointmentDoctor.details} | ${nextAppointmentDoctor.fee}`
          : "Book your next visit from available slots",
      },
      {
        label: "Total Prescriptions",
        value: loading || hasSummaryError ? "--" : prescriptionCount,
        helper: "Issued medical records",
      },
      {
        label: "Unread Alerts",
        value: loading || hasSummaryError ? "--" : unreadCount,
        helper: "Notification center",
      },
    ],
    [
      appointments.length,
      completedAppointments,
      hasSummaryError,
      loading,
      nextAppointment,
      nextAppointmentDoctor.details,
      nextAppointmentDoctor.fee,
      nextAppointmentDoctor.name,
      prescriptionCount,
      unreadCount,
    ],
  );

  const quickActions = [
    { label: "Book Appointment", tab: "booking" },
    { label: "AI Symptom Checker", tab: "symptom" },
    { label: "View Patient Records", tab: "timeline" },
    { label: "My Prescriptions", tab: "documents" },
    ...(onEditProfile
      ? [{ label: "Edit Profile", onClick: onEditProfile }]
      : []),
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-gray-500 mb-2">
              Patient Dashboard
            </p>
            <h3 className="text-2xl font-semibold text-theme-primary break-words">
              {patientDisplayName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Review your identity details, care activity, and essential portal
              actions in one place.
            </p>
          </div>

          <div className="rounded-2xl bg-theme-soft px-4 py-3 min-w-[280px]">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Next Appointment
            </p>
            {loading ? (
              <p className="text-sm text-theme-ink">Loading upcoming visit...</p>
            ) : hasSummaryError ? (
              <p className="text-sm text-gray-600">
                Summary data is unavailable right now.
              </p>
            ) : nextAppointment ? (
              <>
                <p className="font-semibold text-theme-ink break-words">
                  {nextAppointmentDoctor.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {nextAppointmentDoctor.details}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {nextAppointmentDoctor.fee}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDateTime(
                    nextAppointment.appointment_date,
                    nextAppointment.appointment_time,
                  )}
                </p>
                <p className="text-xs uppercase tracking-wider mt-2 text-gray-500">
                  {nextAppointment.status}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                No upcoming appointment found.
              </p>
            )}
          </div>
        </div>

        {hasSummaryError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Patient overview is temporarily unavailable. Your profile details are
            still shown below.
          </div>
        )}

        {Array.isArray(profileStatus.missingFields) &&
          profileStatus.missingFields.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Complete your {profileStatus.missingFields.join(", ")} to keep
              booking and medical records accurate.
            </div>
          )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {summaryCards.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                {item.label}
              </p>
              <p className="text-lg font-semibold text-theme-primary break-words">
                {item.value}
              </p>
              <p className="text-sm text-gray-600 mt-2">{item.helper}</p>
            </div>
          ))}
        </div>

        {!loading && !hasSummaryError && appointments.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
            <p className="font-medium text-theme-ink">No appointment history yet</p>
            <p className="text-sm text-gray-600 mt-1">
              Start by booking your first consultation to populate timeline,
              prescriptions, and alerts.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.("booking")}
              className="mt-3 rounded-lg border border-theme-primary bg-white px-3 py-2 text-sm font-medium text-theme-primary hover:bg-theme-soft transition-colors"
            >
              Book Appointment
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-4">
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-lg font-semibold text-theme-primary">
              Patient Identity
            </h4>
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Hospital Profile
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            {identityFields.map((field) => (
              <div
                key={field.label}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                  {field.label}
                </p>
                {field.isStatus ? (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(profileStatus.key)}`}
                  >
                    {field.value}
                  </span>
                ) : (
                  <p
                    className={`font-medium text-theme-ink ${field.isEmail ? "break-all" : "break-words"}`}
                  >
                    {getDisplayValue(field.value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-lg font-semibold text-theme-primary">
              Quick Actions
            </h4>
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Patient Tools
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() =>
                  action.onClick ? action.onClick() : onNavigate?.(action.tab)
                }
                className="rounded-xl border border-theme-primary bg-white px-4 py-3 text-left text-theme-primary font-medium hover:bg-theme-soft transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientPortalSummary;
