import React, { useEffect, useMemo, useState } from "react";
import { appointmentAPI, scheduleAPI } from "../services/api";
import { formatDoctorProfileId, formatPatientUserId } from "../utils/identity";

const formatDoctorScope = (doctor) => {
  const specialization = String(doctor?.specialization || "").trim();
  const department = String(doctor?.department || "").trim();

  if (!specialization && !department) return "Doctor profile details pending";
  if (!department || specialization === department) return specialization;
  if (!specialization) return department;
  return `${specialization} | ${department}`;
};

const formatCurrency = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "Not provided";
  return `BDT ${numericValue.toLocaleString()}`;
};

const getScheduleStatusTone = (isActive) =>
  isActive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-100 text-slate-600";

const getAppointmentStatusTone = (status) => {
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "confirmed") return "bg-sky-100 text-sky-700";
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "declined" || status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-600";
};

const createInitialSchedule = (doctorId = "", consultationFee = "") => ({
  doctorId,
  dayOfWeek: "",
  startTime: "",
  endTime: "",
  slotDuration: 30,
  consultationFee,
});

const getAppointmentPatientUserId = (appointment) =>
  appointment?.patient_record_user_id || appointment?.patient_user_id || null;

const getRescheduleErrorMessage = (apiError) => {
  const status = apiError?.response?.status;
  const message = String(apiError?.response?.data?.message || "").toLowerCase();

  if (status === 403) return "Unauthorized action.";
  if (status === 409) return "Slot already booked.";
  if (message.includes("cancelled") || message.includes("completed")) {
    return "Appointment already cancelled or completed.";
  }
  if (message.includes("schedule")) {
    return "Invalid schedule for selected date/time.";
  }

  return "Unable to reschedule this appointment right now.";
};

function DoctorSchedule({
  currentUser,
  dashboardIntent,
  profileRefreshNonce = 0,
  onAppointmentsChanged,
}) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [newSchedule, setNewSchedule] = useState(createInitialSchedule());
  const [pendingRescheduleAppointmentId, setPendingRescheduleAppointmentId] =
    useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const isDoctorSelfView = currentUser?.role === "doctor";

  useEffect(() => {
    if (isDoctorSelfView) {
      if (!currentUser?.doctorId) {
        setError("Doctor profile is not linked. Please contact admin.");
        return;
      }

      loadDoctorWorkspace(currentUser.doctorId);
      return;
    }

    loadDoctors();
  }, [currentUser?.doctorId, isDoctorSelfView, profileRefreshNonce]);

  useEffect(() => {
    if (isDoctorSelfView) return;

    const timeoutId = window.setTimeout(() => {
      handleSearch();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [isDoctorSelfView, searchTerm]);

  useEffect(() => {
    if (!dashboardIntent?.nonce) return;
    if (dashboardIntent.tabKey !== "schedule") return;

    if (dashboardIntent.action === "createSchedule") {
      setShowCreateForm(true);
      setShowAppointments(false);
    } else if (dashboardIntent.action === "viewAppointments") {
      setShowAppointments(true);
      setShowCreateForm(false);
    } else if (dashboardIntent.action === "rescheduleAppointment") {
      setShowAppointments(true);
      setShowCreateForm(false);
      setPendingRescheduleAppointmentId(dashboardIntent.appointmentId || null);
    }
  }, [dashboardIntent]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    setError("");

    try {
      const response = await scheduleAPI.getAllDoctors();
      setDoctors(response.data || []);
    } catch (_error) {
      setError("Unable to load doctor directory right now.");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const loadDoctorWorkspace = async (doctorId) => {
    setLoadingDetail(true);
    setError("");

    try {
      const [scheduleResponse, appointmentResponse] = await Promise.all([
        scheduleAPI.getDoctorSchedule(doctorId),
        appointmentAPI.getDoctorAppointments(doctorId),
      ]);

      const doctor = scheduleResponse.data?.doctor || null;

      setSelectedDoctor(doctor);
      setSchedules(scheduleResponse.data?.schedules || []);
      setAppointments(appointmentResponse.appointments || []);
      setNewSchedule(
        createInitialSchedule(
          doctorId,
          doctor?.consultation_fee === undefined ||
            doctor?.consultation_fee === null
            ? ""
            : doctor.consultation_fee,
        ),
      );
    } catch (_error) {
      setError("Unable to load doctor schedule details right now.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSearch = async () => {
    if (isDoctorSelfView) return;

    if (!searchTerm.trim()) {
      loadDoctors();
      return;
    }

    setLoadingDoctors(true);
    setError("");

    try {
      const response = await scheduleAPI.searchDoctors({
        q: searchTerm.trim(),
      });
      setDoctors(response.data || []);
    } catch (_error) {
      setError("Unable to search doctors right now.");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleCreateSchedule = async (event) => {
    event.preventDefault();
    setLoadingDetail(true);
    setError("");
    setFeedbackMessage("");

    try {
      await scheduleAPI.createSchedule(newSchedule);
      setFeedbackMessage("Schedule created successfully.");
      setShowCreateForm(false);

      if (selectedDoctor?.doctor_id) {
        await loadDoctorWorkspace(selectedDoctor.doctor_id);
      }
    } catch (apiError) {
      setError(
        apiError.response?.status === 409
          ? "This schedule overlaps with an existing active schedule."
          : "Unable to create the schedule right now.",
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Delete this schedule?")) {
      return;
    }

    setLoadingDetail(true);
    setError("");
    setFeedbackMessage("");

    try {
      await scheduleAPI.deleteSchedule(scheduleId);
      setFeedbackMessage("Schedule removed successfully.");
      if (selectedDoctor?.doctor_id) {
        await loadDoctorWorkspace(selectedDoctor.doctor_id);
      }
    } catch (_error) {
      setError("Unable to remove this schedule right now.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAppointmentStatusChange = async (appointmentId, status) => {
    setError("");
    setFeedbackMessage("");

    try {
      await appointmentAPI.updateAppointmentStatus(appointmentId, status);
      setFeedbackMessage(
        status === "confirmed"
          ? "Appointment approved successfully."
          : "Appointment declined successfully.",
      );

      if (selectedDoctor?.doctor_id) {
        const data = await appointmentAPI.getDoctorAppointments(
          selectedDoctor.doctor_id,
        );
        setAppointments(data.appointments || []);
      }
      onAppointmentsChanged?.();
    } catch (_error) {
      setError("Unable to update appointment status right now.");
    }
  };

  const openRescheduleModal = (appointment) => {
    setError("");
    setFeedbackMessage("");
    setRescheduleTarget(appointment);
    setRescheduleDate(String(appointment.appointment_date || "").slice(0, 10));
    setRescheduleTime("");
    setRescheduleSlots([]);
  };

  const closeRescheduleModal = (force = false) => {
    if (submittingReschedule && !force) return;
    setRescheduleTarget(null);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleSlots([]);
  };

  const loadRescheduleSlots = async (targetDate) => {
    if (!selectedDoctor?.doctor_id || !targetDate) {
      setRescheduleSlots([]);
      return;
    }

    setLoadingRescheduleSlots(true);
    try {
      const response = await appointmentAPI.getAvailableSlots(
        selectedDoctor.doctor_id,
        targetDate,
      );
      setRescheduleSlots(response.slots || []);
    } catch (_error) {
      setRescheduleSlots([]);
      setError("Unable to load available slots for that date.");
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  const handleSubmitReschedule = async (event) => {
    event.preventDefault();
    if (!rescheduleTarget) return;

    setError("");
    setFeedbackMessage("");

    if (!rescheduleDate || !rescheduleTime) {
      setError("Select a new date and available time slot.");
      return;
    }

    setSubmittingReschedule(true);
    try {
      await appointmentAPI.rescheduleAppointment(
        rescheduleTarget.appointment_id,
        {
          new_date: rescheduleDate,
          new_time: String(rescheduleTime).slice(0, 5),
        },
      );

      setFeedbackMessage("Appointment rescheduled successfully.");
      closeRescheduleModal(true);

      if (selectedDoctor?.doctor_id) {
        await loadDoctorWorkspace(selectedDoctor.doctor_id);
      }
      onAppointmentsChanged?.();
    } catch (apiError) {
      setError(getRescheduleErrorMessage(apiError));
    } finally {
      setSubmittingReschedule(false);
    }
  };

  useEffect(() => {
    if (!pendingRescheduleAppointmentId) return;
    const target = appointments.find(
      (appointment) =>
        Number(appointment.appointment_id) ===
        Number(pendingRescheduleAppointmentId),
    );
    if (!target) return;

    openRescheduleModal(target);
    setPendingRescheduleAppointmentId(null);
  }, [appointments, pendingRescheduleAppointmentId]);

  useEffect(() => {
    if (!rescheduleTarget || !rescheduleDate) return;
    loadRescheduleSlots(rescheduleDate);
  }, [rescheduleTarget?.appointment_id, rescheduleDate, selectedDoctor?.doctor_id]);

  const availableRescheduleSlots = useMemo(
    () => rescheduleSlots.filter((slot) => slot.status === "available"),
    [rescheduleSlots],
  );

  const doctorSummaryFields = useMemo(
    () =>
      selectedDoctor
        ? [
            { label: "Doctor ID", value: selectedDoctor.doctor_id },
            { label: "Name", value: selectedDoctor.name },
            {
              label: "Doctor Code",
              value:
                formatDoctorProfileId(selectedDoctor.doctor_id) ||
                selectedDoctor.doctor_id,
            },
            {
              label: "Email",
              value: selectedDoctor.email || "Not provided",
              isEmail: true,
            },
            {
              label: "Specialization",
              value: selectedDoctor.specialization || "Not provided",
            },
            {
              label: "Department",
              value: selectedDoctor.department || "Not provided",
            },
            {
              label: "Experience",
              value:
                selectedDoctor.experience_years === 0 ||
                selectedDoctor.experience_years
                  ? `${selectedDoctor.experience_years} years`
                  : "Not provided",
            },
            {
              label: "Fee",
              value: formatCurrency(selectedDoctor.consultation_fee),
            },
          ]
        : [],
    [selectedDoctor],
  );

  const doctorCards = doctors.map((doctor) => (
    <button
      key={doctor.doctor_id}
      type="button"
      onClick={() => loadDoctorWorkspace(doctor.doctor_id)}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selectedDoctor?.doctor_id === doctor.doctor_id
          ? "border-theme-primary bg-theme-soft shadow-md"
          : "border-slate-200 bg-white/80 hover:border-theme-primary hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-theme-ink break-words">
            {doctor.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {formatDoctorScope(doctor)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {doctor.experience_years || 0} years experience
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ID: {formatDoctorProfileId(doctor.doctor_id) || doctor.doctor_id}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {formatCurrency(doctor.consultation_fee)}
        </span>
      </div>
    </button>
  ));

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">
          Doctor Schedule Management
        </h1>
        <p className="text-gray-600">
          Review doctor profiles, manage schedule availability, and monitor
          appointment flow.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {feedbackMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedbackMessage}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-6 ${isDoctorSelfView ? "xl:grid-cols-1" : "xl:grid-cols-[320px_1fr]"}`}
      >
        {!isDoctorSelfView && (
          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-theme-primary">
                Doctor Directory
              </h2>
              <span className="text-xs uppercase tracking-wider text-gray-500">
                Admin View
              </span>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search doctors by name, specialization, or department"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) =>
                  event.key === "Enter" ? handleSearch() : null
                }
                className="input-field text-sm"
              />
              <button type="button" onClick={handleSearch} className="btn-primary">
                Search
              </button>
            </div>

            {loadingDoctors ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Loading doctors...
              </p>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No doctors matched your search.
              </p>
            ) : (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {doctorCards}
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {!selectedDoctor ? (
            <div className="card flex min-h-[420px] items-center justify-center">
              <div className="text-center text-gray-500 max-w-sm">
                <p className="text-lg font-medium text-theme-ink mb-2">
                  No doctor selected
                </p>
                <p>
                  Select a doctor from the directory to review their hospital
                  profile and schedule availability.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.28em] text-gray-500 mb-2">
                      {isDoctorSelfView ? "Doctor Workspace" : "Selected Doctor"}
                    </p>
                    <h2 className="text-2xl font-semibold text-theme-primary break-words">
                      {selectedDoctor.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDoctorScope(selectedDoctor)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm((current) => !current);
                        setShowAppointments(false);
                      }}
                      className="rounded-xl border border-theme-primary bg-white px-4 py-2 text-theme-primary font-medium hover:bg-theme-soft transition-colors"
                    >
                      {showCreateForm ? "Hide Form" : "Add Schedule"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAppointments((current) => !current);
                        setShowCreateForm(false);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                      {showAppointments ? "View Schedules" : "View Appointments"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                  {doctorSummaryFields.map((field) => (
                    <div
                      key={field.label}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                        {field.label}
                      </p>
                      <p className="font-medium text-theme-ink break-words">
                        <span className={field.isEmail ? "break-all" : ""}>
                          {field.value}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {showCreateForm && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-theme-primary mb-4">
                    Add Schedule
                  </h3>
                  <form onSubmit={handleCreateSchedule} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                      <select
                        value={newSchedule.dayOfWeek}
                        onChange={(event) =>
                          setNewSchedule((current) => ({
                            ...current,
                            dayOfWeek: event.target.value,
                          }))
                        }
                        required
                        className="input-field text-sm"
                      >
                        <option value="">Select day</option>
                        {daysOfWeek.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>

                      <input
                        type="time"
                        value={newSchedule.startTime}
                        onChange={(event) =>
                          setNewSchedule((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        required
                        className="input-field text-sm"
                      />

                      <input
                        type="time"
                        value={newSchedule.endTime}
                        onChange={(event) =>
                          setNewSchedule((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        required
                        className="input-field text-sm"
                      />

                      <input
                        type="number"
                        min="15"
                        max="60"
                        value={newSchedule.slotDuration}
                        onChange={(event) =>
                          setNewSchedule((current) => ({
                            ...current,
                            slotDuration: Number(event.target.value),
                          }))
                        }
                        required
                        className="input-field text-sm"
                        placeholder="Slot duration"
                      />

                      <input
                        type="number"
                        min="0"
                        value={newSchedule.consultationFee}
                        onChange={(event) =>
                          setNewSchedule((current) => ({
                            ...current,
                            consultationFee: event.target.value,
                          }))
                        }
                        required
                        className="input-field text-sm"
                        placeholder="Consultation fee"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loadingDetail}
                      className="btn-primary disabled:opacity-60"
                    >
                      {loadingDetail ? "Saving..." : "Create Schedule"}
                    </button>
                  </form>
                </div>
              )}

              <div className="card">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-theme-primary">
                    {showAppointments
                      ? "Doctor Appointments"
                      : "Schedule Availability"}
                  </h3>
                  {loadingDetail && (
                    <span className="text-sm text-gray-500">Loading...</span>
                  )}
                </div>

                {showAppointments ? (
                  appointments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                      <p className="font-medium text-theme-ink mb-2">
                        No appointments booked yet
                      </p>
                      <p className="text-sm text-gray-600">
                        Patient bookings will appear here once they are assigned
                        to this doctor.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                      {appointments.map((appointment) => (
                        <div
                          key={appointment.appointment_id}
                          className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAppointmentStatusTone(appointment.status)}`}
                                >
                                  {appointment.status}
                                </span>
                              </div>
                              <h4 className="font-semibold text-theme-ink">
                                {appointment.patient_name}
                              </h4>
                              <p className="text-sm font-semibold text-theme-primary mt-1">
                                {formatPatientUserId(
                                  getAppointmentPatientUserId(appointment),
                                )
                                  ? `Patient ID: ${formatPatientUserId(
                                      getAppointmentPatientUserId(appointment),
                                    )}`
                                  : getAppointmentPatientUserId(appointment)
                                    ? `Patient User ID: ${getAppointmentPatientUserId(
                                        appointment,
                                      )}`
                                    : "Patient ID unavailable"}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {appointment.patient_age || "N/A"} years |{" "}
                                {appointment.patient_gender || "Not provided"}
                              </p>
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>
                                {new Date(
                                  appointment.appointment_date,
                                ).toLocaleDateString()}{" "}
                                at {String(appointment.appointment_time).slice(0, 5)}
                              </p>
                              <p className="mt-1">
                                {appointment.patient_phone || "No mobile number"}
                              </p>
                            </div>
                          </div>

                          {appointment.patient_email && (
                            <p className="text-sm text-gray-600 mt-3">
                              {appointment.patient_email}
                            </p>
                          )}

                          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                            <p className="text-sm text-theme-ink">
                              {appointment.symptoms || "No symptom details provided."}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {!["cancelled", "completed"].includes(
                              String(appointment.status || "").toLowerCase(),
                            ) && (
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(appointment)}
                                className="rounded-lg border border-theme-primary bg-white px-3 py-2 text-sm font-semibold text-theme-primary hover:bg-theme-soft"
                              >
                                Reschedule
                              </button>
                            )}
                            {appointment.status === "pending" && (
                              <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAppointmentStatusChange(
                                    appointment.appointment_id,
                                    "confirmed",
                                  )
                                }
                                className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAppointmentStatusChange(
                                    appointment.appointment_id,
                                    "declined",
                                  )
                                }
                                className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-200"
                              >
                                Decline
                              </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : schedules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <p className="font-medium text-theme-ink mb-2">
                      No active schedule available
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Add a schedule for this doctor to enable booking and time
                      slot management.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(true);
                        setShowAppointments(false);
                      }}
                      className="btn-primary"
                    >
                      Add Schedule
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.schedule_id}
                        className="rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-theme-primary">
                              {schedule.day_of_week}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {String(schedule.start_time).slice(0, 5)} -{" "}
                              {String(schedule.end_time).slice(0, 5)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSchedule(schedule.schedule_id)
                            }
                            className="text-sm text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                            {schedule.slot_duration} min slots
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 font-semibold ${getScheduleStatusTone(schedule.is_active)}`}
                          >
                            {schedule.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {rescheduleTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
                  Appointment
                </p>
                <h3 className="mt-1 text-xl font-semibold text-theme-primary">
                  Reschedule Visit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => closeRescheduleModal()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-theme-ink">
                {rescheduleTarget.patient_name || "Patient"}
              </p>
              <p className="mt-1 text-theme-primary font-semibold">
                {formatPatientUserId(getAppointmentPatientUserId(rescheduleTarget))
                  ? `Patient ID: ${formatPatientUserId(
                      getAppointmentPatientUserId(rescheduleTarget),
                    )}`
                  : getAppointmentPatientUserId(rescheduleTarget)
                    ? `Patient User ID: ${getAppointmentPatientUserId(
                        rescheduleTarget,
                      )}`
                    : "Patient ID unavailable"}
              </p>
              <p className="mt-1 text-gray-600">
                Current: {String(rescheduleTarget.appointment_date).slice(0, 10)}{" "}
                at {String(rescheduleTarget.appointment_time).slice(0, 5)}
              </p>
            </div>

            <form onSubmit={handleSubmitReschedule} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  New date
                </span>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(event) => {
                    setRescheduleDate(event.target.value);
                    setRescheduleTime("");
                  }}
                  className="input-field"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Available time slot
                </span>
                <select
                  value={rescheduleTime}
                  onChange={(event) => setRescheduleTime(event.target.value)}
                  className="input-field"
                  required
                  disabled={loadingRescheduleSlots}
                >
                  <option value="">
                    {loadingRescheduleSlots
                      ? "Loading slots..."
                      : "Select available slot"}
                  </option>
                  {availableRescheduleSlots.map((slot) => (
                    <option
                      key={`${slot.schedule_id}-${slot.time}`}
                      value={slot.time}
                    >
                      {slot.display_time || String(slot.time).slice(0, 5)}
                    </option>
                  ))}
                </select>
              </label>

              {!loadingRescheduleSlots &&
                rescheduleDate &&
                availableRescheduleSlots.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    No available slots found for this date.
                  </div>
                )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => closeRescheduleModal()}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReschedule || loadingRescheduleSlots}
                  className="rounded-xl bg-theme-primary px-4 py-2 font-semibold text-white hover:bg-theme-primary-deep disabled:opacity-60"
                >
                  {submittingReschedule ? "Rescheduling..." : "Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorSchedule;
