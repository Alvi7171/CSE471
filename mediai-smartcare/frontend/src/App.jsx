import { useEffect, useMemo, useState } from "react";
import AnalyticsReports from "./components/AnalyticsReports";
import BedAllocationDashboard from "./components/BedAllocationDashboard";
import DoctorPortalSummary from "./components/DoctorPortalSummary";
import DoctorPrescriptions from "./components/DoctorPrescriptions";
import DoctorSchedule from "./components/DoctorSchedule";
import NotificationCenter from "./components/NotificationCenter";
import PatientBooking from "./components/PatientBooking";
import PatientRegistration from "./components/PatientRegistration";
import PatientTimeline from "./components/PatientTimeline";
import PatientSearchManagement from "./components/PatientSearchManagement";
import SymptomChecker from "./components/SymptomChecker";
import LabTestManagement from "./components/LabTestManagement";
import EmergencyResponse from "./components/EmergencyResponse";
import DoctorsList from "./components/DoctorsList";
import PatientLabReports from "./components/PatientLabReports";
import InventoryManagement from "./components/InventoryManagement";

import PatientDocuments from "./components/PatientDocuments";
import PatientPortalSummary from "./components/PatientPortalSummary";
import ProfileEditorModal from "./components/ProfileEditorModal";
import RosterManagement from "./components/RosterManagement";

import "./index.css";
import { authAPI } from "./services/api";
import { formatRoleUserId, getUserDisplayName } from "./utils/identity";

const DEPARTMENTS = [
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

const roleTabs = {
  patient: [
    { key: "symptom", label: "AI Symptom Checker" },
    { key: "booking", label: "Book Appointment" },
    { key: "doctors", label: "Doctors List" },
    { key: "labreports", label: "🧪 Lab Reports" },
    { key: "documents", label: "My Prescriptions" },
  ],
  doctor: [
    { key: "schedule", label: "Doctor Schedule" },
    { key: "prescriptions", label: "Prescriptions" },
    { key: "labtests", label: "Lab Tests" },
    { key: "emergency", label: "Emergency Response" },
    { key: "timeline", label: "Medical Timeline" },
  ],
  admin: [
    { key: "schedule", label: "Doctor Schedule" },
    { key: "registration", label: "Patient Registration" },
    { key: "analytics", label: "Analytics Dashboard" },
    { key: "prescriptions", label: "Prescriptions" },
    { key: "billing", label: "Billing & Payments" },
    { key: "roster", label: "Staff Roster" },
    { key: "labtests", label: "Lab Test Management" },
    { key: "emergency", label: "Emergency Response" },
    { key: "timeline", label: "Medical Timeline" },
    { key: "admin", label: "Admin Console" },
    { key: "doctors", label: "Doctors List" },
  ],
};

const initialAuthForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  role: "patient",
  degree: "",
  department: "Cardiology",
  experienceYears: "",
  medicalName: "",
  address: "",
  age: "",
  gender: "Male",
};

const roleCards = [
  { key: "doctor", icon: "Doctor", label: "Doctor" },
  { key: "patient", icon: "Patient", label: "Patient" },
  { key: "admin", icon: "Admin", label: "Admin" },
];

const buildRegisterPayload = (form, role) => {
  const basePayload = {
    fullName: form.fullName,
    email: form.email,
    password: form.password,
    role,
  };

  if (role === "doctor") {
    return {
      ...basePayload,
      phone: form.phone,
      degree: form.degree,
      department: form.department,
      experienceYears: form.experienceYears,
      medicalName: form.medicalName,
    };
  }

  if (role === "patient") {
    return {
      ...basePayload,
      phone: form.phone,
      address: form.address,
      age: form.age,
      gender: form.gender,
    };
  }

  return basePayload;
};

function App() {
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [selectedRegisterRole, setSelectedRegisterRole] = useState("patient");
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("symptom");
  const [targetEmergencyId, setTargetEmergencyId] = useState(null);
  const [dashboardIntent, setDashboardIntent] = useState(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileRefreshNonce, setProfileRefreshNonce] = useState(0);
  const [dashboardRefreshNonce, setDashboardRefreshNonce] = useState(0);

  const userDisplayName = useMemo(
    () => getUserDisplayName(user),
    [user?.fullName, user?.doctorProfile?.name, user?.role],
  );

  const formattedUserId = useMemo(
    () => formatRoleUserId(user?.role, user?.userId),
    [user?.role, user?.userId],
  );

  const showEmailSubtitle = Boolean(user?.email);

  const tabs = useMemo(() => {
    if (!user) return [];
    return roleTabs[user.role] || [];
  }, [user]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (!authAPI.getToken()) {
          return;
        }

        const response = await authAPI.me();
        if (response.success) {
          setUser(response.user);
          const defaultTab = roleTabs[response.user.role]?.[0]?.key || "symptom";
          setActiveTab(defaultTab);
        }
      } catch (_error) {
        authAPI.clearToken();
      } finally {
        setLoadingSession(false);
      }
    };

    bootstrap();
  }, []);

  const handleAuthField = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNavigate = (tabKey, action = null, context = {}) => {
    setActiveTab(tabKey);
    setDashboardIntent({
      tabKey,
      action,
      nonce: Date.now(),
      ...context,
    });
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload =
        authMode === "register"
          ? buildRegisterPayload(authForm, selectedRegisterRole)
          : {
              identifier: authForm.email,
              password: authForm.password,
            };

      const response =
        authMode === "register"
          ? await authAPI.register(payload)
          : await authAPI.login(payload);

      authAPI.saveToken(response.token);
      setUser(response.user);
      setAuthForm(initialAuthForm);
      setSelectedRegisterRole("patient");
      setDashboardIntent(null);
      setShowProfileEditor(false);
      setActiveTab(roleTabs[response.user.role]?.[0]?.key || "symptom");
    } catch (error) {
      setAuthError(error.response?.data?.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.clearToken();
    setUser(null);
    setAuthMode("login");
    setSelectedRegisterRole("patient");
    setAuthForm(initialAuthForm);
    setActiveTab("symptom");
    setDashboardIntent(null);
    setShowProfileEditor(false);
  };

  const handleProfileSaved = (updatedUser) => {
    setUser(updatedUser);
    setProfileRefreshNonce(Date.now());
    setShowProfileEditor(false);
  };

  const handleDashboardDataChanged = () => {
    setDashboardRefreshNonce(Date.now());
  };

  const renderRegisterFields = () => {
    if (selectedRegisterRole === "doctor") {
      return (
        <>
          <input
            className="input-field"
            name="fullName"
            placeholder="Doctor Name"
            value={authForm.fullName}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            name="degree"
            placeholder="Degree (MBBS, FCPS, etc.)"
            value={authForm.degree}
            onChange={handleAuthField}
            required
          />
          <select
            className="input-field"
            name="department"
            value={authForm.department}
            onChange={handleAuthField}
            required
          >
            {DEPARTMENTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            name="experienceYears"
            type="number"
            min="0"
            max="80"
            placeholder="Experience Years"
            value={authForm.experienceYears}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            name="medicalName"
            placeholder="Medical/Hospital Name"
            value={authForm.medicalName}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            name="phone"
            placeholder="Mobile Number"
            value={authForm.phone}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            type="email"
            name="email"
            placeholder="Email (optional)"
            value={authForm.email}
            onChange={handleAuthField}
          />
          <input
            className="input-field"
            type="password"
            name="password"
            placeholder="Password"
            value={authForm.password}
            onChange={handleAuthField}
            required
          />
        </>
      );
    }

    if (selectedRegisterRole === "patient") {
      return (
        <>
          <input
            className="input-field"
            name="fullName"
            placeholder="Patient Name"
            value={authForm.fullName}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            name="phone"
            placeholder="Mobile Number"
            value={authForm.phone}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            type="email"
            name="email"
            placeholder="Email (optional)"
            value={authForm.email}
            onChange={handleAuthField}
          />
          <input
            className="input-field"
            name="address"
            placeholder="Address"
            value={authForm.address}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            type="number"
            min="1"
            max="120"
            name="age"
            placeholder="Age"
            value={authForm.age}
            onChange={handleAuthField}
            required
          />
          <select
            className="input-field"
            name="gender"
            value={authForm.gender}
            onChange={handleAuthField}
            required
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <input
            className="input-field"
            type="password"
            name="password"
            placeholder="Password"
            value={authForm.password}
            onChange={handleAuthField}
            required
          />
        </>
      );
    }

    if (selectedRegisterRole === "admin") {
      return (
        <>
          <input
            className="input-field"
            name="fullName"
            placeholder="Admin Name"
            value={authForm.fullName}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            type="email"
            name="email"
            placeholder="Admin Email"
            value={authForm.email}
            onChange={handleAuthField}
            required
          />
          <input
            className="input-field"
            type="password"
            name="password"
            placeholder="Password"
            value={authForm.password}
            onChange={handleAuthField}
            required
          />
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Admin accounts use email-based login and do not require patient or
            doctor profile details.
          </div>
        </>
      );
    }

    return null;
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center text-theme-ink">
        Loading your workspace...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white/85 backdrop-blur-md rounded-3xl border border-white/60 shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">
            MediAI SmartCare
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Railway-ready hospital system with role-based access
          </p>

          <div className="flex rounded-xl bg-theme-soft p-1 mb-5">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                authMode === "login"
                  ? "bg-white text-theme-primary shadow"
                  : "text-gray-600"
              }`}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                authMode === "register"
                  ? "bg-white text-theme-primary shadow"
                  : "text-gray-600"
              }`}
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
            >
              Register
            </button>
          </div>

          {authMode === "register" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {roleCards.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedRegisterRole(item.key);
                    setAuthError("");
                  }}
                  className={`border rounded-xl p-3 text-center transition ${
                    selectedRegisterRole === item.key
                      ? "border-theme-primary bg-theme-soft"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="font-semibold text-sm">{item.icon}</div>
                  <div className="font-semibold text-sm">{item.label}</div>
                </button>
              ))}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleAuthSubmit}>
            {authMode === "login" ? (
              <>
                <input
                  className="input-field"
                  type="text"
                  name="email"
                  placeholder="Email or Mobile Number"
                  value={authForm.email}
                  onChange={handleAuthField}
                  required
                />
                <input
                  className="input-field"
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={handleAuthField}
                  required
                />
              </>
            ) : (
              renderRegisterFields()
            )}

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-theme-primary text-white font-semibold hover:bg-theme-primary-deep transition-colors disabled:opacity-60"
            >
              {authLoading
                ? "Please wait..."
                : authMode === "register"
                  ? "Create Account"
                  : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg text-theme-ink">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[270px_1fr]">
        <aside className="bg-theme-sidebar text-white p-6 lg:p-8">
          <h1 className="text-4xl tracking-[0.2em] font-semibold text-theme-accent mb-12">
            MEDIAI
          </h1>

          <div className="space-y-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleNavigate(tab.key)}
                aria-current={activeTab === tab.key ? "page" : undefined}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white font-semibold border border-white/30 shadow-md"
                    : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="p-4 md:p-8">
          <header className="relative z-30 bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl px-6 py-4 shadow-sm mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-widest text-gray-500">
                {user.role}
              </p>
              <h2 className="text-xl font-semibold text-theme-primary break-words">
                {userDisplayName}
              </h2>
              {formattedUserId && (
                <p className="text-sm text-gray-500 mt-1">ID: {formattedUserId}</p>
              )}
              {showEmailSubtitle && (
                <p className="mt-1 max-w-[34rem] break-all text-[11px] leading-relaxed text-gray-400">
                  {user.email}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <NotificationCenter />
              <button
                onClick={() => setShowProfileEditor(true)}
                className="px-4 py-2 rounded-lg border border-theme-primary bg-theme-soft text-theme-primary hover:bg-theme-primary hover:text-white transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg border border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </header>

          {user.role === "patient" && (
            <PatientPortalSummary
              currentUser={user}
              onEditProfile={() => setShowProfileEditor(true)}
              onNavigate={handleNavigate}
              refreshNonce={dashboardRefreshNonce}
            />
          )}

          {user.role === "doctor" && (
            <DoctorPortalSummary
              currentUser={user}
              onEditProfile={() => setShowProfileEditor(true)}
              onNavigate={handleNavigate}
              refreshNonce={dashboardRefreshNonce}
            />
          )}

          {activeTab === "symptom" && user.role === "patient" && (
            <SymptomChecker currentUser={user} />
          )}
          {activeTab === "booking" && user.role === "patient" && (
            <PatientBooking />
          )}
          {activeTab === "timeline" && user.role === "patient" && (
            <PatientTimeline currentUser={user} />
          )}
          {activeTab === "documents" && user.role === "patient" && (
            <PatientDocuments currentUser={user} />
          )}
          {activeTab === "schedule" &&
            (user.role === "doctor" || user.role === "admin") && (
              <DoctorSchedule
                currentUser={user}
                dashboardIntent={dashboardIntent}
                profileRefreshNonce={profileRefreshNonce}
                onAppointmentsChanged={handleDashboardDataChanged}
              />
            )}
          {activeTab === "prescriptions" &&
            (user.role === "doctor" || user.role === "admin") && (
              <DoctorPrescriptions
                currentUser={user}
                dashboardIntent={dashboardIntent}
              />
            )}
          {activeTab === "timeline" && (user.role === "doctor" || user.role === "admin") && (
            <PatientSearchManagement />
          )}
          {activeTab === "registration" && user.role === "admin" && (
            <PatientRegistration />
          )}
          {activeTab === "labtests" && (
            <LabTestManagement currentUser={user} />
          )}
          {activeTab === "emergency" && (
            <EmergencyResponse 
              currentUser={user}
              targetEmergencyId={targetEmergencyId} 
              clearTargetEmergency={() => setTargetEmergencyId(null)} 
            />
          )}
          {activeTab === "doctors" && (
            <DoctorsList currentUser={user} />
          )}
          {activeTab === "labreports" && user.role === "patient" && (
            <PatientLabReports currentUser={user} />
          )}
          {activeTab === "analytics" && user.role === "admin" && (
            <AnalyticsReports />
          )}
          {activeTab === "admin" && user.role === "admin" && (
            <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-theme-primary mb-3">
                Admin Console
              </h3>
              <p className="text-gray-700 mb-4">
                Admin area is ready. You can add user management, reports, and
                operational tools next.
              </p>
              <ul className="text-gray-700 space-y-2 list-disc pl-5">
                <li>Manage doctors and role assignments</li>
                <li>Review appointment analytics</li>
                <li>Configure hospital-level settings</li>
              </ul>
            </div>
          )}
          {activeTab === "inventory" && user.role === "admin" && (
            <InventoryManagement />
          )}
          {activeTab === "beds" && user.role === "admin" && (
            <BedAllocationDashboard />
          )}
          {activeTab === "roster" && user.role === "admin" && (
            <RosterManagement />
          )}
          {activeTab === "billing" && user.role === "admin" && (
            <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-8 shadow-sm">
              <h3 className="text-2xl font-semibold text-theme-primary mb-3">
                Billing & Payments
              </h3>
              <p className="text-gray-700">
                Billing dashboard placeholder is active. Connect billing APIs and
                invoice views to enable this section.
              </p>
            </div>
          )}
        </section>
      </div>

      <ProfileEditorModal
        currentUser={user}
        isOpen={showProfileEditor}
        onClose={() => setShowProfileEditor(false)}
        onSaved={handleProfileSaved}
      />
    </div>
  );
}

export default App;
