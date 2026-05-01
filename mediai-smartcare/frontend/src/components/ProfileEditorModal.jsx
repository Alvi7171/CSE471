import React, { useEffect, useMemo, useState } from "react";
import { authAPI } from "../services/api";

const DOCTOR_DEPARTMENTS = [
  "Cardiology",
  "Neurology",
  "Gynecology",
  "Pediatrics",
  "General Medicine",
  "Dermatology",
  "Orthopedics",
  "Psychiatry",
  "ENT",
  "Ophthalmology",
  "Urology",
  "Oncology",
  "Nephrology",
  "Emergency Medicine",
  "Other",
];

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const buildInitialForm = (currentUser) => {
  const doctorProfile = currentUser?.doctorProfile || {};

  return {
    fullName: currentUser?.fullName || doctorProfile.name || "",
    email: currentUser?.email || doctorProfile.email || "",
    phone: currentUser?.phone || doctorProfile.phone || "",
    address: currentUser?.address || "",
    age:
      currentUser?.age === undefined || currentUser?.age === null
        ? ""
        : String(currentUser.age),
    gender: currentUser?.gender || "",
    degree: doctorProfile.degree || "",
    specialization: doctorProfile.specialization || "",
    department: doctorProfile.department || "",
    medicalName: doctorProfile.medicalName || "",
    qualification: doctorProfile.qualification || "",
    experienceYears:
      doctorProfile.experienceYears === 0 || doctorProfile.experienceYears
        ? String(doctorProfile.experienceYears)
        : "",
    consultationFee:
      doctorProfile.consultationFee === 0 || doctorProfile.consultationFee
        ? String(doctorProfile.consultationFee)
        : "",
  };
};

const getFriendlyErrorMessage = (error) => {
  const message =
    error.response?.data?.message || "Unable to update profile right now.";

  if (/route not found/i.test(message)) {
    return "Profile update is unavailable right now.";
  }

  return message;
};

function ProfileEditorModal({ currentUser, isOpen, onClose, onSaved }) {
  const [formData, setFormData] = useState(() => buildInitialForm(currentUser));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const role = currentUser?.role || "";
  const isDoctor = role === "doctor";
  const isPatient = role === "patient";
  const isAdmin = role === "admin";
  const hasDoctorProfile = Boolean(
    currentUser?.doctorId || currentUser?.doctorProfile,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData(buildInitialForm(currentUser));
    setSaving(false);
    setError("");
  }, [currentUser, isOpen]);

  const roleTitle = useMemo(() => {
    if (isDoctor) return "Doctor Profile";
    if (isPatient) return "Patient Profile";
    if (isAdmin) return "Admin Profile";
    return "Profile";
  }, [isAdmin, isDoctor, isPatient]);

  const identityMeta = useMemo(() => {
    const items = [
      { label: "Role", value: role || "User" },
      { label: "User ID", value: currentUser?.userId || "Not available" },
    ];

    if (currentUser?.doctorProfileId) {
      items.push({
        label: "Doctor Profile ID",
        value: currentUser.doctorProfileId,
      });
    }

    return items;
  }, [currentUser?.doctorProfileId, currentUser?.userId, role]);

  if (!isOpen || !currentUser) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      };

      if (isPatient) {
        payload.age = formData.age;
        payload.gender = formData.gender;
      }

      if (isDoctor) {
        payload.degree = formData.degree;
        payload.specialization = formData.specialization;
        payload.department = formData.department;
        payload.medicalName = formData.medicalName;
        payload.qualification = formData.qualification;
        payload.experienceYears = formData.experienceYears;
        payload.consultationFee = formData.consultationFee;
      }

      const response = await authAPI.updateProfile(payload);
      onSaved?.(response.user);
    } catch (apiError) {
      setError(getFriendlyErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (!saving && event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-theme-soft via-white to-theme-soft px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-gray-500 mb-2">
                Self-Edit Profile
              </p>
              <h3 className="text-2xl font-semibold text-theme-primary">
                {roleTitle}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Update the identity and contact details used across your MediAI
                SmartCare dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[78vh] overflow-y-auto px-6 py-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {identityMeta.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    {item.label}
                  </p>
                  <p className="font-medium text-theme-ink break-words">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {isDoctor && !hasDoctorProfile && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your doctor account is not fully linked to a doctor profile yet.
                You can still update your account name, email, and mobile number
                here.
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-theme-primary">
                    Account Identity
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    These fields identify your login and dashboard profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      className="input-field"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required={isAdmin}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Mobile Number
                    </label>
                    <input
                      className="input-field"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your mobile number"
                    />
                  </div>

                  {(isPatient || isAdmin) && (
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <input
                        className="input-field"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your address"
                      />
                    </div>
                  )}

                  {isPatient && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Age
                        </label>
                        <input
                          className="input-field"
                          type="number"
                          min="1"
                          max="120"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          placeholder="Enter age"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Gender
                        </label>
                        <select
                          className="input-field"
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                        >
                          <option value="">Select gender</option>
                          {GENDER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isDoctor && hasDoctorProfile ? (
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-theme-primary">
                      Doctor Profile Details
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Keep your clinical profile aligned with schedules,
                      prescriptions, and hospital records.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Degree
                      </label>
                      <input
                        className="input-field"
                        name="degree"
                        value={formData.degree}
                        onChange={handleChange}
                        placeholder="MBBS, FCPS, MD"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Qualification
                      </label>
                      <input
                        className="input-field"
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleChange}
                        placeholder="Professional qualification"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Specialization
                      </label>
                      <input
                        className="input-field"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        placeholder="Cardiology, Neurology"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Department
                      </label>
                      <select
                        className="input-field"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                      >
                        <option value="">Select department</option>
                        {DOCTOR_DEPARTMENTS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Medical or Hospital Name
                      </label>
                      <input
                        className="input-field"
                        name="medicalName"
                        value={formData.medicalName}
                        onChange={handleChange}
                        placeholder="Hospital or chamber name"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Experience
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        max="80"
                        name="experienceYears"
                        value={formData.experienceYears}
                        onChange={handleChange}
                        placeholder="Years of practice"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Consultation Fee
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        step="0.01"
                        name="consultationFee"
                        value={formData.consultationFee}
                        onChange={handleChange}
                        placeholder="Enter fee in BDT"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-theme-soft via-white to-slate-50 p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-theme-primary">
                      Profile Guidance
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Complete details improve dashboard identity, booking
                      accuracy, and notification quality.
                    </p>
                  </div>

                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                      <p className="font-medium text-theme-ink">
                        Use your real name and mobile number
                      </p>
                      <p className="mt-1 text-gray-600">
                        This keeps appointments, prescriptions, and portal
                        records mapped correctly.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                      <p className="font-medium text-theme-ink">
                        Fill missing patient demographics
                      </p>
                      <p className="mt-1 text-gray-600">
                        Age, gender, and address support more accurate patient
                        identity and symptom records.
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                        <p className="font-medium text-theme-ink">
                          Keep your admin email current
                        </p>
                        <p className="mt-1 text-gray-600">
                          Admin accounts use email-based access and operational
                          notifications.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-theme-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-theme-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving profile..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileEditorModal;
