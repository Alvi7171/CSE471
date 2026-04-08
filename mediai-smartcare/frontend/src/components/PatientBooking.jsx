import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:1355/api";

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

  // Form data
  const [formData, setFormData] = useState({
    patientName: "",
    patientAge: "",
    patientGender: "Male",
    patientPhone: "",
    patientEmail: "",
    symptoms: "",
  });

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Set initial date to today
  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, []);

  // Fetch available doctors when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableDoctors();
    }
  }, [selectedDate]);

  const fetchAvailableDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${API_BASE_URL}/appointments/available-doctors?date=${selectedDate}`,
      );
      setAvailableDoctors(response.data.doctors || []);
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
      const response = await axios.get(
        `${API_BASE_URL}/appointments/available-slots?doctorId=${doctorId}&date=${selectedDate}`,
      );
      setAvailableSlots(response.data.slots || []);
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
    setSelectedSlot(slot);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedDoctor || !selectedSlot) {
      setError("Please select a doctor and time slot");
      return;
    }

    if (
      !formData.patientName ||
      !formData.patientAge ||
      !formData.patientPhone
    ) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bookingData = {
        scheduleId: selectedSlot.schedule_id,
        doctorId: selectedDoctor.doctor_id,
        patientName: formData.patientName,
        patientAge: parseInt(formData.patientAge),
        patientGender: formData.patientGender,
        patientPhone: formData.patientPhone,
        patientEmail: formData.patientEmail,
        symptoms: formData.symptoms,
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot.time,
      };

      const response = await axios.post(
        `${API_BASE_URL}/appointments/book`,
        bookingData,
      );

      setSuccessMessage(
        `Appointment booked successfully! Appointment ID: ${response.data.appointment.appointment_id}`,
      );

      // Reset form
      setFormData({
        patientName: "",
        patientAge: "",
        patientGender: "Male",
        patientPhone: "",
        patientEmail: "",
        symptoms: "",
      });
      setSelectedSlot(null);

      // Refresh available slots
      fetchAvailableSlots(selectedDoctor.doctor_id);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError("This time slot is now full. Please select another slot.");
      } else {
        setError(err.response?.data?.message || "Failed to book appointment");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter doctors by search query
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
          Search for available doctors and book your appointment
        </p>
      </div>

      {/* Date Selection */}
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
        <p className="text-sm text-gray-500 mt-2">
          Showing availability for:{" "}
          {new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Error/Success Messages */}
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
        {/* Left Panel - Available Doctors */}
        <div className="lg:col-span-1">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Available Doctors</h3>

            {/* Search */}
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
              <p className="text-gray-500 text-center">
                No doctors available on this date
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.doctor_id}
                    onClick={() => handleDoctorSelect(doctor)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedDoctor?.doctor_id === doctor.doctor_id
                        ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg transform scale-105"
                        : "border-gray-200 bg-white/60 backdrop-blur-sm hover:border-blue-300 hover:shadow-md hover:scale-102"
                    }`}
                  >
                    <h4 className="font-semibold text-gray-800">
                      {doctor.name.length > 30
                        ? doctor.name.substring(0, 30) + "..."
                        : doctor.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {doctor.specialization}
                    </p>
                    <p className="text-sm text-gray-500">{doctor.department}</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">
                      ৳{doctor.consultation_fee}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Time Slots & Booking Form */}
        <div className="lg:col-span-2">
          {!selectedDoctor ? (
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-12 text-center border border-white/40">
              <div className="text-6xl mb-4">🩺</div>
              <p className="text-gray-500">
                Select a doctor to view available time slots
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Doctor Info */}
              <div className="bg-gradient-to-br from-white/70 to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {selectedDoctor.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Specialization:</span>
                    <span className="ml-2 font-medium">
                      {selectedDoctor.specialization}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2 font-medium">
                      {selectedDoctor.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Experience:</span>
                    <span className="ml-2 font-medium">
                      {selectedDoctor.experience_years} years
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Consultation Fee:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      ৳{selectedDoctor.consultation_fee}
                    </span>
                  </div>
                </div>
              </div>

              {/* Available Time Slots */}
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Available Time Slots
                </h3>

                {loading ? (
                  <p className="text-gray-500 text-center">Loading slots...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    No available slots for this date
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleSlotSelect(slot)}
                        className={`p-3 border rounded-xl text-sm font-medium transition-all duration-300 ${
                          selectedSlot?.time === slot.time
                            ? "border-blue-500 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                            : "border-gray-300 bg-white/60 backdrop-blur-sm hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:shadow-md"
                        }`}
                      >
                        {slot.display_time}
                        <div className="text-xs mt-1 opacity-75">
                          {slot.available_spots} left
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking Form */}
              {selectedSlot && (
                <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/40">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Patient Information
                  </h3>
                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Patient Name *
                        </label>
                        <input
                          type="text"
                          name="patientName"
                          value={formData.patientName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                          placeholder="Enter full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Age *
                        </label>
                        <input
                          type="number"
                          name="patientAge"
                          value={formData.patientAge}
                          onChange={handleInputChange}
                          required
                          min="1"
                          max="120"
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Age"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender *
                        </label>
                        <select
                          name="patientGender"
                          value={formData.patientGender}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="patientPhone"
                          value={formData.patientPhone}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+880 1XXX-XXXXXX"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          name="patientEmail"
                          value={formData.patientEmail}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Symptoms / Reason for Visit
                        </label>
                        <textarea
                          name="symptoms"
                          value={formData.symptoms}
                          onChange={handleInputChange}
                          rows="3"
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Describe your symptoms or reason for consultation..."
                        />
                      </div>
                    </div>

                    {/* Appointment Summary */}
                    <div className="bg-gradient-to-br from-blue-50/80 to-purple-50/50 backdrop-blur-md p-4 rounded-2xl border border-blue-200/50 shadow-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Appointment Summary
                      </h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>Doctor:</strong> {selectedDoctor.name}
                        </p>
                        <p>
                          <strong>Date:</strong>{" "}
                          {new Date(selectedDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p>
                          <strong>Time:</strong> {selectedSlot.display_time}
                        </p>
                        <p>
                          <strong>Duration:</strong> {selectedSlot.duration}{" "}
                          minutes
                        </p>
                        <p>
                          <strong>Fee:</strong> ৳
                          {selectedDoctor.consultation_fee}
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
