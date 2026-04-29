import React, { useState, useEffect } from "react";
import axios from "axios";

function PatientRegistration() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "Male",
    bloodType: "O+",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    nationalId: "",
    allergies: "",
    chronicDiseases: "",
    currentMedications: "",
  });

  const [registeredPatient, setRegisteredPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load registered patient from localStorage on mount
  useEffect(() => {
    const savedPatient = localStorage.getItem("lastRegisteredPatient");
    if (savedPatient) {
      try {
        setRegisteredPatient(JSON.parse(savedPatient));
        setSuccess(`Last registered patient loaded: ${JSON.parse(savedPatient).smartPatientId}`);
      } catch (e) {
        console.error("Error loading saved patient:", e);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName.trim()) {
      setError("❌ First name is required");
      return;
    }
    if (!formData.lastName.trim()) {
      setError("❌ Last name is required");
      return;
    }
    if (!formData.dateOfBirth) {
      setError("❌ Date of birth is required");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setError("❌ Phone number is required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("📤 Sending registration request:", formData);
      // First create user account
      const authResponse = await axios.post(
        "http://localhost:1355/api/auth/register",
        {
          fullName: `${formData.firstName} ${formData.lastName}`,
          email: formData.email || null,
          password: "default123", // Default password that should be changed
          phone: formData.phoneNumber,
          role: "patient",
          address: formData.address,
          age: new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear(),
          gender: formData.gender,
        },
      );

      // Then create patient record
      const patientResponse = await axios.post(
        "http://localhost:1355/api/patients/register",
        formData,
      );

      const response = {
        success: true,
        user: authResponse.data.user,
        patient: patientResponse.data.patient,
        token: authResponse.data.token
      };

      console.log("📥 Response:", response);

      if (response.success) {
        const patientData = response.patient;
        setSuccess(`✅ Patient registered successfully! Smart ID: ${patientData.smartPatientId}`);
        setRegisteredPatient(patientData);
        
        // Save to localStorage so it persists across tab switches
        localStorage.setItem("lastRegisteredPatient", JSON.stringify(patientData));
        
        setFormData({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "Male",
          bloodType: "O+",
          phoneNumber: "",
          email: "",
          address: "",
          city: "",
          stateProvince: "",
          postalCode: "",
          country: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
          nationalId: "",
          allergies: "",
          chronicDiseases: "",
          currentMedications: "",
        });
      } else {
        setError(`❌ ${response.data.message || "Registration failed"}`);
      }
    } catch (err) {
      console.error("❌ Registration error:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Unknown error";
      const errorDetails = err.response?.data?.error ? ` (${err.response.data.error})` : "";
      setError(`❌ Error registering patient: ${errorMsg}${errorDetails}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCard = () => {
    if (registeredPatient) {
      const cardContent = `
MEDIAI SMARTCARE - PATIENT ID CARD
================================
Smart Patient ID: ${registeredPatient.smartPatientId}
Patient ID: ${registeredPatient.patientId}

Name: ${registeredPatient.firstName} ${registeredPatient.lastName}
Phone: ${registeredPatient.phoneNumber}
Email: ${registeredPatient.email}

Generated: ${new Date().toLocaleString()}
Keep this card safe for future appointments.
`;
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(cardContent));
      element.setAttribute("download", `patient_${registeredPatient.smartPatientId}.txt`);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                🏥 Patient Registration
              </h2>
              <p className="text-gray-600">
                Register for digital health records with a unique Smart Patient ID
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-medium">⚠️ {error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-medium">✅ {success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Personal Information Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 font-bold">
                    1
                  </span>
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name *"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name *"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <select
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Blood Type</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="Phone Number *"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email (Optional)"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Address Information Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3 font-bold">
                    2
                  </span>
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea
                    name="address"
                    placeholder="Street Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="stateProvince"
                    placeholder="State/Province"
                    value={formData.stateProvince}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="postalCode"
                    placeholder="Postal Code"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="country"
                    placeholder="Country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3 font-bold">
                    3
                  </span>
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="emergencyContactName"
                    placeholder="Emergency Contact Name"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    placeholder="Emergency Contact Phone"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Medical Information Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 font-bold">
                    4
                  </span>
                  Medical Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    name="nationalId"
                    placeholder="National ID (Optional)"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    name="allergies"
                    placeholder="Allergies (comma-separated)"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                  <textarea
                    name="chronicDiseases"
                    placeholder="Chronic/Pre-existing Diseases"
                    value={formData.chronicDiseases}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                  <textarea
                    name="currentMedications"
                    placeholder="Current Medications"
                    value={formData.currentMedications}
                    onChange={handleInputChange}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                {loading ? "🔄 Registering..." : "✅ Register Patient"}
              </button>
            </form>
          </div>
        </div>

        {/* Patient ID Card Display */}
        <div className="lg:col-span-1">
          {registeredPatient ? (
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-6 text-white sticky top-8">
              <div className="mb-6">
                <div className="text-4xl font-bold mb-2">🆔</div>
                <h3 className="text-xl font-bold">Patient ID Card</h3>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-100 mb-1">Smart Patient ID</p>
                <p className="text-2xl font-bold break-words">
                  {registeredPatient.smartPatientId}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-100 mb-1">Patient Name</p>
                <p className="text-lg font-semibold">
                  {registeredPatient.firstName} {registeredPatient.lastName}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-100 mb-1">Contact</p>
                <p className="text-sm font-mono">{registeredPatient.phoneNumber}</p>
                {registeredPatient.email && (
                  <p className="text-sm font-mono break-words">{registeredPatient.email}</p>
                )}
              </div>

              <div className="border-t border-white/20 pt-4 mb-4">
                <p className="text-xs text-blue-100">
                  Registered: {new Date().toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={handleDownloadCard}
                className="w-full bg-white text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                📥 Download Card
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-dashed border-blue-300 p-8 text-center sticky top-8">
              <div className="text-5xl mb-4">🏥</div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">
                Patient Card Preview
              </h3>
              <p className="text-sm text-gray-600">
                Once registered, your unique Smart Patient ID will be displayed here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientRegistration;
