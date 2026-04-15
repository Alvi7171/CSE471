import React, { useState, useEffect } from "react";
import { appointmentAPI } from "../services/api";

function PatientBooking() {
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [symptoms, setSymptoms] = useState("");

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableDoctors();
    }
  }, [selectedDate]);

  const fetchAvailableDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await appointmentAPI.getAvailableDoctors(selectedDate);
      setAvailableDoctors(response.doctors || []);
      setSelectedDoctor(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
    } catch (err) {
      setError("Failed to fetch available doctors");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (doctorId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await appointmentAPI.getAvailableSlots(doctorId, selectedDate);
      setAvailableSlots(response.slots || []);
      setSelectedSlot(null);
    } catch (err) {
      setError("Failed to fetch available slots");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    fetchAvailableSlots(doctor.doctor_id);
  };

  const handleSlotSelect = (slot) => {
    if (slot.status === "booked") {
      return;
    }
    setSelectedSlot(slot);
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    if (!selectedDoctor || !selectedSlot) {
      setError("Please select a doctor and time slot");
      return;
    }

    if (!symptoms.trim()) {
      setError("Please describe your symptoms");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bookingData = {
        scheduleId: selectedSlot.schedule_id,
        doctorId: selectedDoctor.doctor_id,
        symptoms: symptoms.trim(),
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot.time,
      };

      const response = await appointmentAPI.bookAppointment(bookingData);

      setSuccessMessage(
        `Appointment booked successfully! Appointment ID: ${response.appointment.appointment_id}`,
      );

      setSymptoms("");
      setSelectedSlot(null);
      fetchAvailableSlots(selectedDoctor.doctor_id);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError("This time slot is already booked. Please select another slot.");
      } else {
        setError(err.response?.data?.message || "Failed to book appointment");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = availableDoctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          📅 Book an Appointment
        </h2>
        <p className="text-gray-600 mt-1">
          Select a doctor and slot, then submit your symptoms for consultation
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Appointment Date
        </label>
        <input
          type="date"
          value={selectedDate}
          min={getTodayDate()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          ✅ {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Available Doctors</h3>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>

            {loading && !selectedDoctor ? (
              <p className="text-gray-500 text-center">Loading doctors...</p>
            ) : filteredDoctors.length === 0 ? (
              <p className="text-gray-500 text-center">No doctors available on this date</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.doctor_id}
                    onClick={() => handleDoctorSelect(doctor)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedDoctor?.doctor_id === doctor.doctor_id
                        ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg"
                        : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <h4 className="font-semibold text-gray-800">{doctor.name}</h4>
                    <p className="text-sm text-gray-600">{doctor.specialization}</p>
                    <p className="text-sm text-gray-500">{doctor.department}</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">৳{doctor.consultation_fee}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedDoctor ? (
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-12 text-center border border-white/40">
              <div className="text-6xl mb-4">🩺</div>
              <p className="text-gray-500">Select a doctor to view available time slots</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-white/70 to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{selectedDoctor.name}</h3>
                <p className="text-sm text-gray-600">{selectedDoctor.specialization}</p>
                <p className="text-sm text-blue-600 font-semibold mt-1">Consultation Fee: ৳{selectedDoctor.consultation_fee}</p>
              </div>

              <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Available Time Slots</h3>

                {loading ? (
                  <p className="text-gray-500 text-center">Loading slots...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-gray-500 text-center">No available slots for this date</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        disabled={slot.status === "booked"}
                        className={`p-3 border rounded-xl text-sm font-medium transition-all duration-300 ${
                          slot.status === "booked"
                            ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                            : selectedSlot?.time === slot.time &&
                                selectedSlot?.schedule_id === slot.schedule_id
                              ? "border-blue-500 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
                              : "border-gray-300 bg-white/60 backdrop-blur-sm hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50"
                        }`}
                      >
                        {slot.display_time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSlot && (
                <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Consultation Description</h3>
                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    <textarea
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows="4"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your symptoms and concerns..."
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? "Booking..." : "Confirm Booking"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientBooking;
