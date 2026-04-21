import React, { useState, useEffect } from "react";
import { scheduleAPI, appointmentAPI } from "../services/api";

const DoctorSchedule = ({ currentUser }) => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);

  const [newSchedule, setNewSchedule] = useState({
    doctorId: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    slotDuration: 30,
    consultationFee: "",
  });

  const isDoctorSelfView = currentUser?.role === "doctor";

  // Fetch all doctors on component mount
  useEffect(() => {
    if (isDoctorSelfView) {
      if (!currentUser?.doctorId) {
        setError("Doctor profile is not linked. Please contact admin.");
        return;
      }

      fetchDoctorSchedule(currentUser.doctorId);
      return;
    }

    fetchDoctors();
  }, [isDoctorSelfView, currentUser?.doctorId]);

  useEffect(() => {
    if (isDoctorSelfView) {
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await scheduleAPI.getAllDoctors();
      setDoctors(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load doctors");
      setLoading(false);
    }
  };

  const fetchDoctorSchedule = async (doctorId) => {
    setLoading(true);
    try {
      const response = await scheduleAPI.getDoctorSchedule(doctorId);
      setSelectedDoctor(response.data.doctor);
      setSchedules(response.data.schedules);
      setNewSchedule((prev) => ({
        ...prev,
        doctorId,
        consultationFee: response.data.doctor?.consultation_fee || "",
      }));

      // Also fetch appointments for this doctor
      fetchDoctorAppointments(doctorId);

      setLoading(false);
    } catch (err) {
      setError("Failed to load doctor schedule");
      setLoading(false);
    }
  };

  const fetchDoctorAppointments = async (doctorId) => {
    try {
      const data = await appointmentAPI.getDoctorAppointments(doctorId);
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error("Failed to load appointments:", err);
    }
  };

  const handleAppointmentStatusChange = async (appointmentId, status) => {
    try {
      await appointmentAPI.updateAppointmentStatus(appointmentId, status);
      if (selectedDoctor?.doctor_id) {
        fetchDoctorAppointments(selectedDoctor.doctor_id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update appointment");
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await scheduleAPI.createSchedule(newSchedule);
      alert("Schedule created successfully!");
      setShowCreateForm(false);
      // Refresh the schedule
      if (selectedDoctor) {
        fetchDoctorSchedule(selectedDoctor.doctor_id);
      }
      // Reset form
      setNewSchedule({
        doctorId: selectedDoctor?.doctor_id || "",
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        slotDuration: 30,
        consultationFee: selectedDoctor?.consultation_fee || "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      await scheduleAPI.deleteSchedule(scheduleId);
      alert("Schedule deleted successfully!");
      fetchDoctorSchedule(selectedDoctor.doctor_id);
    } catch (err) {
      setError("Failed to delete schedule");
    }
  };

  const handleSearch = async () => {
    if (isDoctorSelfView) {
      return;
    }

    if (!searchTerm) {
      fetchDoctors();
      return;
    }

    setLoading(true);
    try {
      const response = await scheduleAPI.searchDoctors({
        q: searchTerm,
      });
      setDoctors(response.data);
      setLoading(false);
    } catch (err) {
      setError("Search failed");
      setLoading(false);
    }
  };

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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">
          🩺 Doctor Scheduling & Availability Management
        </h1>
        <p className="text-gray-600">
          Manage doctor schedules and view availability
        </p>
      </div>

      <div
        className={`grid grid-cols-1 gap-6 ${isDoctorSelfView ? "lg:grid-cols-1" : "lg:grid-cols-3"}`}
      >
        {!isDoctorSelfView && (
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Doctors</h2>

              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by name, specialization, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="input-field text-sm"
                  />
                  <button
                    onClick={handleSearch}
                    className="btn-primary text-sm"
                  >
                    🔍
                  </button>
                </div>
              </div>

              {loading && !selectedDoctor ? (
                <p className="text-center text-gray-500">Loading...</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {doctors.map((doctor) => (
                    <div
                      key={doctor.doctor_id}
                      onClick={() => fetchDoctorSchedule(doctor.doctor_id)}
                      className={`p-4 border rounded-lg cursor-pointer transition hover:shadow-md ${
                        selectedDoctor?.doctor_id === doctor.doctor_id
                          ? "border-blue-500 bg-gradient-to-br from-blue-50/80 to-purple-50/50 backdrop-blur-md shadow-lg transform scale-105"
                          : "border-gray-200"
                      }`}
                    >
                      <h3 className="font-semibold text-gray-800">
                        {doctor.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {doctor.specialization}
                      </p>
                      <p className="text-sm text-gray-500">
                        {doctor.department}
                      </p>
                      <p className="text-sm text-primary font-medium mt-1">
                        ৳{doctor.consultation_fee}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Details */}
        <div className={isDoctorSelfView ? "lg:col-span-1" : "lg:col-span-2"}>
          {selectedDoctor ? (
            <div className="card">
              {/* Doctor Info */}
              <div className="border-b pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {selectedDoctor.name}
                    </h2>
                    <p className="text-gray-600">
                      {selectedDoctor.specialization}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedDoctor.qualification}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedDoctor.experience_years} years experience
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="btn-primary text-sm"
                  >
                    {showCreateForm ? "Cancel" : "+ Add Schedule"}
                  </button>
                </div>
              </div>

              {/* Create Schedule Form */}
              {showCreateForm && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <h3 className="font-bold mb-4">Create New Schedule</h3>
                  <form onSubmit={handleCreateSchedule} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Day of Week
                        </label>
                        <select
                          value={newSchedule.dayOfWeek}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              dayOfWeek: e.target.value,
                            })
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Slot Duration (min)
                        </label>
                        <input
                          type="number"
                          value={newSchedule.slotDuration}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              slotDuration: parseInt(e.target.value),
                            })
                          }
                          min="15"
                          max="60"
                          required
                          className="input-field text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Consultation Fee
                        </label>
                        <input
                          type="number"
                          value={newSchedule.consultationFee}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              consultationFee: e.target.value,
                            })
                          }
                          min="0"
                          required
                          className="input-field text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={newSchedule.startTime}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              startTime: e.target.value,
                            })
                          }
                          required
                          className="input-field text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={newSchedule.endTime}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              endTime: e.target.value,
                            })
                          }
                          required
                          className="input-field text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full disabled:opacity-50"
                    >
                      {loading ? "Creating..." : "Create Schedule"}
                    </button>
                  </form>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Schedules */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">Weekly Schedule</h3>
                <button
                  onClick={() => setShowAppointments(!showAppointments)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showAppointments
                    ? "📅 View Schedules"
                    : "📋 View Appointments"}
                </button>
              </div>

              {showAppointments ? (
                // Appointments View
                <div>
                  <h4 className="font-semibold mb-3">Patient Appointments</h4>
                  {appointments.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No appointments booked yet
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {appointments.map((apt) => (
                        <div
                          key={apt.appointment_id}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-lg backdrop-blur-sm transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-semibold text-gray-800">
                                {apt.patient_name}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {apt.patient_age} years, {apt.patient_gender}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                apt.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : apt.status === "confirmed"
                                    ? "bg-green-100 text-green-800"
                                    : apt.status === "declined"
                                      ? "bg-red-100 text-red-800"
                                      : apt.status === "cancelled"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>📅 Date:</strong>{" "}
                            {new Date(
                              apt.appointment_date,
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>🕐 Time:</strong>{" "}
                            {apt.appointment_time.slice(0, 5)}
                          </p>
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>📞 Phone:</strong> {apt.patient_phone}
                          </p>
                          {apt.patient_email && (
                            <p className="text-sm text-gray-700 mb-1">
                              <strong>📧 Email:</strong> {apt.patient_email}
                            </p>
                          )}
                          {apt.symptoms && (
                            <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                              <strong>Symptoms:</strong> {apt.symptoms}
                            </p>
                          )}

                          {apt.status === "pending" && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() =>
                                  handleAppointmentStatusChange(
                                    apt.appointment_id,
                                    "confirmed",
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleAppointmentStatusChange(
                                    apt.appointment_id,
                                    "declined",
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Schedules View
                <div>
                  {loading && !showCreateForm ? (
                    <p className="text-center text-gray-500">
                      Loading schedule...
                    </p>
                  ) : schedules.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No schedules available. Add a new schedule above.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {schedules.map((schedule) => (
                        <div
                          key={schedule.schedule_id}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-lg backdrop-blur-sm transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-primary">
                              {schedule.day_of_week}
                            </h4>
                            <button
                              onClick={() =>
                                handleDeleteSchedule(schedule.schedule_id)
                              }
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                          <p className="text-sm text-gray-700">
                            <strong>Time:</strong>{" "}
                            {schedule.start_time.slice(0, 5)} -{" "}
                            {schedule.end_time.slice(0, 5)}
                          </p>
                          <p className="text-sm text-gray-700">
                            <strong>Slot Duration:</strong>{" "}
                            {schedule.slot_duration} minutes
                          </p>
                          <p className="text-sm">
                            <span
                              className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                                schedule.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {schedule.is_active ? "✓ Active" : "Inactive"}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card flex items-center justify-center h-96">
              <div className="text-center text-gray-500">
                <p className="text-xl mb-2">👈</p>
                <p>Select a doctor to view their schedule</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorSchedule;
