import React, { useEffect, useMemo, useState } from "react";
import {
  appointmentAPI,
  notificationAPI,
  prescriptionAPI,
} from "../services/api";
import {
  formatDoctorProfileId,
  formatPatientUserId,
  formatRoleUserId,
  getUserDisplayName,
} from "../utils/identity";

const getDisplayValue = (value) => {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "string" && value.trim().length === 0) {
    return "Not provided";
  }
  return value;
};

const getStatusTone = (statusKey) => {
  if (statusKey === "linked" || statusKey === "ready") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  return "bg-amber-100 text-amber-700 border-amber-200";
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "Not provided";
  }

  return `BDT ${numericValue.toLocaleString()}`;
};

const getLocalIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function DoctorPortalSummary({
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

  const doctorProfile = currentUser?.doctorProfile || null;
  const hasLinkedDoctorId = Boolean(currentUser?.doctorId);

  const doctorDisplayName = useMemo(
    () => getUserDisplayName(currentUser),
    [currentUser?.fullName, currentUser?.doctorProfile?.name, currentUser?.role],
  );

  const formattedDoctorUserId = useMemo(
    () =>
      formatRoleUserId(currentUser?.role || "doctor", currentUser?.userId) ||
      currentUser?.userId,
    [currentUser?.role, currentUser?.userId],
  );

  const formattedDoctorProfileId = useMemo(
    () =>
      formatDoctorProfileId(
        doctorProfile?.doctorProfileId || currentUser?.doctorProfileId,
      ) ||
      doctorProfile?.doctorProfileId ||
      currentUser?.doctorProfileId,
    [currentUser?.doctorProfileId, doctorProfile?.doctorProfileId],
  );

  useEffect(() => {
    if (!hasLinkedDoctorId) {
      setAppointments([]);
      setPrescriptionCount(0);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let active = true;

    const loadDoctorSummary = async () => {
      setLoading(true);
      setHasSummaryError(false);

      try {
        const [appointmentResponse, prescriptionResponse, notificationResponse] =
          await Promise.all([
            appointmentAPI.getDoctorAppointments(currentUser.doctorId),
            prescriptionAPI.getDoctorPrescriptionSummary(currentUser.doctorId),
            notificationAPI.getUnreadCount(),
          ]);

        if (!active) return;

        setAppointments(appointmentResponse.appointments || []);
        setPrescriptionCount(
          Number(prescriptionResponse.summary?.totalPrescriptions || 0),
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

    loadDoctorSummary();

    return () => {
      active = false;
    };
  }, [currentUser?.doctorId, hasLinkedDoctorId, refreshNonce]);

  const todayAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.appointment_date === getLocalIsoDate(),
      ).length,
    [appointments],
  );

  const pendingAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => String(appointment.status) === "pending",
      ).length,
    [appointments],
  );

  const completedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => String(appointment.status) === "completed",
      ).length,
    [appointments],
  );

  const profileStatus = currentUser?.profileStatus || {
    key: "unlinked",
    label: "Doctor profile not linked",
    missingFields: [],
  };

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

  const identityFields = useMemo(
    () => [
      { label: "Doctor Name", value: doctorDisplayName },
      { label: "Doctor User ID", value: formattedDoctorUserId },
      {
        label: "Doctor Profile ID",
        value: formattedDoctorProfileId,
      },
      {
        label: "Email",
        value: doctorProfile?.email || currentUser?.email,
        isEmail: true,
      },
      {
        label: "Mobile Number",
        value: doctorProfile?.phone || currentUser?.phone,
      },
      { label: "Specialization", value: doctorProfile?.specialization },
      { label: "Department", value: doctorProfile?.department },
      {
        label: "Experience",
        value:
          doctorProfile?.experienceYears === 0 ||
          doctorProfile?.experienceYears
            ? `${doctorProfile.experienceYears} years`
            : null,
      },
      {
        label: "Consultation Fee",
        value: formatCurrency(doctorProfile?.consultationFee),
      },
      { label: "Profile Status", value: profileStatus.label, isStatus: true },
    ],
    [
      currentUser?.doctorProfileId,
      currentUser?.email,
      currentUser?.phone,
      doctorDisplayName,
      doctorProfile?.consultationFee,
      doctorProfile?.department,
      doctorProfile?.email,
      doctorProfile?.experienceYears,
      doctorProfile?.phone,
      doctorProfile?.specialization,
      formattedDoctorProfileId,
      formattedDoctorUserId,
      profileStatus.label,
    ],
  );

  const nextAppointmentPatientUserId =
    nextAppointment?.patient_record_user_id || nextAppointment?.patient_user_id;
  const nextAppointmentPatientId = formatPatientUserId(
    nextAppointmentPatientUserId,
  );

//  const nextAppointmentPatientId = nextAppointment?.patient_user_id
//   ? `PT-${String(nextAppointment.patient_user_id).padStart(4, "0")}`
//   : "Not provided";


  const summaryCards = useMemo(
    () => [
      {
        label: "Total Appointments",
        value:
          loading || hasSummaryError || !hasLinkedDoctorId
            ? "--"
            : appointments.length,
        helper: "All assigned visits",
      },
      {
        label: "Pending Appointments",
        value:
          loading || hasSummaryError || !hasLinkedDoctorId
            ? "--"
            : pendingAppointments,
        helper: "Awaiting response",
      },
      {
        label: "Completed Appointments",
        value:
          loading || hasSummaryError || !hasLinkedDoctorId
            ? "--"
            : completedAppointments,
        helper: "Consultations finished",
      },
      {
        label: "Today's Appointments",
        value:
          loading || hasSummaryError || !hasLinkedDoctorId
            ? "--"
            : todayAppointments,
        helper: "Scheduled for today",
      },
      {
        label: "Prescriptions Issued",
        value:
          loading || hasSummaryError || !hasLinkedDoctorId
            ? "--"
            : prescriptionCount,
        helper: "Doctor-generated records",
      },
      {
        label: "Unread Alerts",
        value:
          loading || hasSummaryError || !hasLinkedDoctorId
            ? "--"
            : unreadCount,
        helper: "Notification center",
      },
    ],
    [
      appointments.length,
      completedAppointments,
      hasSummaryError,
      hasLinkedDoctorId,
      loading,
      pendingAppointments,
      prescriptionCount,
      todayAppointments,
      unreadCount,
    ],
  );

  const quickActions = [
    { label: "Add Schedule", tab: "schedule", action: "createSchedule" },
    { label: "View Appointments", tab: "schedule", action: "viewAppointments" },
    { label: "Create Prescription", tab: "prescriptions" },
    { label: "Manage Lab Tests", tab: "labtests" },
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
              Doctor Dashboard
            </p>
            <h3 className="text-2xl font-semibold text-theme-primary break-words">
              {doctorDisplayName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Review your linked doctor profile, appointment load, and daily
              operational actions from one hospital-style overview.
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
                Appointment summary is unavailable right now.
              </p>
            ) : !hasLinkedDoctorId ? (
              <p className="text-sm text-gray-600">
                Link your doctor profile to view upcoming appointments.
              </p>
            ) : nextAppointment ? (
              <>
                <p className="font-semibold text-theme-ink break-words">
                  {nextAppointment.patient_name || "Patient name unavailable"}
                </p>
                <p className="text-sm font-semibold text-theme-primary mt-1">
                  {nextAppointmentPatientId
                    ? `Patient ID: ${nextAppointmentPatientId}`
                    : nextAppointmentPatientUserId
                      ? `Patient User ID: ${nextAppointmentPatientUserId}`
                      : "Patient ID unavailable"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDateTime(
                    nextAppointment.appointment_date,
                    nextAppointment.appointment_time,
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-1 break-all">
                  {nextAppointment.patient_phone || "Mobile number not provided"}
                </p>
                <p className="text-xs uppercase tracking-wider mt-2 text-gray-500">
                  {nextAppointment.status}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate?.("prescriptions", "createPrescription", {
                        patientId: nextAppointmentPatientUserId,
                        appointmentId: nextAppointment.appointment_id,
                      })
                    }
                    className="rounded-lg bg-theme-primary px-3 py-2 text-xs font-semibold text-white hover:bg-theme-primary-deep"
                  >
                    Create Prescription
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate?.("schedule", "rescheduleAppointment", {
                        appointmentId: nextAppointment.appointment_id,
                      })
                    }
                    className="rounded-lg border border-theme-primary bg-white px-3 py-2 text-xs font-semibold text-theme-primary hover:bg-theme-soft"
                  >
                    Reschedule
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                No pending or confirmed appointment.
              </p>
            )}

            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                Linking Status
              </p>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(profileStatus.key)}`}
              >
                {profileStatus.label}
              </span>
              {Array.isArray(profileStatus.missingFields) &&
                profileStatus.missingFields.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Missing: {profileStatus.missingFields.join(", ")}
                  </p>
                )}
            </div>
          </div>
        </div>

        {hasSummaryError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Doctor overview is temporarily unavailable. Your profile details are
            still shown below.
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
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

        {!loading && !hasSummaryError && hasLinkedDoctorId && appointments.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
            <p className="font-medium text-theme-ink">No appointments yet</p>
            <p className="text-sm text-gray-600 mt-1">
              Create or update your schedule so patients can book available
              slots and appointments will start appearing here.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.("schedule", "createSchedule")}
              className="mt-3 rounded-lg border border-theme-primary bg-white px-3 py-2 text-sm font-medium text-theme-primary hover:bg-theme-soft transition-colors"
            >
              Add Schedule
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.9fr] gap-4">
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-lg font-semibold text-theme-primary">
              Doctor Identity
            </h4>
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Linked Profile
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
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
                    {field.label === "Consultation Fee"
                      ? field.value
                      : getDisplayValue(field.value)}
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
              Doctor Tools
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() =>
                  action.onClick
                    ? action.onClick()
                    : onNavigate?.(action.tab, action.action || null)
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

export default DoctorPortalSummary;
