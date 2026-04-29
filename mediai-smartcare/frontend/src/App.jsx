import { useEffect, useMemo, useState } from "react";
import AnalyticsReports from "./components/AnalyticsReports";
import DoctorSchedule from "./components/DoctorSchedule";
import NotificationCenter from "./components/NotificationCenter";
import PatientBooking from "./components/PatientBooking";
import PatientRegistration from "./components/PatientRegistration";
import PatientTimeline from "./components/PatientTimeline";
import PatientSearchManagement from "./components/PatientSearchManagement";
import EnhancedMedicalTimeline from "./components/EnhancedMedicalTimeline";
import SymptomChecker from "./components/SymptomChecker";
import LabTestManagement from "./components/LabTestManagement";
import EmergencyResponse from "./components/EmergencyResponse";
import DoctorsList from "./components/DoctorsList";
import PatientEmergencySOS from "./components/PatientEmergencySOS";
import PatientLabReports from "./components/PatientLabReports";
import GlobalEmergencyAlert from "./components/GlobalEmergencyAlert";
import "./index.css";
import { authAPI } from "./services/api";

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
    { key: "sos", label: "🚨 Emergency SOS" },
  ],
  doctor: [
    { key: "schedule", label: "Doctor Schedule" },
    { key: "labtests", label: "Lab Tests" },
    { key: "emergency", label: "Emergency Response" },
    { key: "search", label: "Patient Search" },
    { key: "timeline", label: "Medical Timeline" },
  ],
  admin: [
    { key: "schedule", label: "Doctor Schedule" },
    { key: "registration", label: "Patient Registration" },
    { key: "analytics", label: "Analytics Dashboard" },
    { key: "billing", label: "Billing & Payments" },
    { key: "roster", label: "Staff Roster" },
    { key: "labtests", label: "Lab Test Management" },
    { key: "emergency", label: "Emergency Response" },
    { key: "search", label: "Patient Search" },
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
  { key: "doctor", icon: "🩺", label: "Doctor" },
  { key: "patient", icon: "🧑", label: "Patient" },
  { key: "admin", icon: "🛡️", label: "Admin" },
];

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
          const defaultTab =
            roleTabs[response.user.role]?.[0]?.key || "symptom";
          setActiveTab(defaultTab);
        }
      } catch (error) {
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

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload =
        authMode === "register"
          ? {
            fullName: authForm.fullName,
            password: authForm.password,
            role: selectedRegisterRole,
            email: authForm.email,
            phone: authForm.phone,
            degree: authForm.degree,
            department: authForm.department,
            experienceYears: authForm.experienceYears,
            medicalName: authForm.medicalName,
            address: authForm.address,
            age: authForm.age,
            gender: authForm.gender,
          }
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

    return (
      <>
        <input
          className="input-field"
          name="fullName"
          placeholder="Full Name"
          value={authForm.fullName}
          onChange={handleAuthField}
          required
        />
        <input
          className="input-field"
          type="email"
          name="email"
          placeholder="Email"
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
    );
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
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${authMode === "login"
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
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${authMode === "register"
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
                  onClick={() => setSelectedRegisterRole(item.key)}
                  className={`border rounded-xl p-3 text-center transition ${selectedRegisterRole === item.key
                    ? "border-theme-primary bg-theme-soft"
                    : "border-gray-200 bg-white"
                    }`}
                >
                  <div className="text-2xl mb-1">{item.icon}</div>
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
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab.key
                  ? "bg-white/15 border-l-4 border-theme-accent"
                  : "hover:bg-white/10"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="p-4 md:p-8">
          <header className="relative z-30 bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl px-6 py-4 shadow-sm flex items-center justify-between mb-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-gray-500">
                {user.role}
              </p>
              <h2 className="text-xl font-semibold text-theme-primary">
                {user.fullName}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg border border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </header>

          {user.role === "patient" && (
            <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-4 mb-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Patient Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-700">
                <div>Name: {user.fullName || "-"}</div>
                <div>Mobile: {user.phone || "-"}</div>
                <div>Email: {user.email || "-"}</div>
                <div>Address: {user.address || "-"}</div>
                <div>Age: {user.age || "-"}</div>
                <div>Gender: {user.gender || "-"}</div>
              </div>
            </div>
          )}
          <main className="py-6">
            {activeTab === "symptom" && user.role === "patient" && (
              <SymptomChecker />
            )}
            {activeTab === "booking" && user.role === "patient" && (
              <PatientBooking />
            )}
            {activeTab === "search" && (user.role === "doctor" || user.role === "admin") && (
              <PatientSearchManagement />
            )}
            {activeTab === "timeline" && (user.role === "doctor" || user.role === "admin") && (
              <EnhancedMedicalTimeline />
            )}
            {activeTab === "schedule" &&
              (user.role === "doctor" || user.role === "admin") && (
                <DoctorSchedule currentUser={user} />
              )}
            {activeTab === "registration" && user.role === "admin" && (
              <PatientRegistration />
            )}
            {(activeTab === "labtests") && (
              <LabTestManagement />
            )}
            {(activeTab === "emergency") && (
              <EmergencyResponse 
                currentUser={user}
                targetEmergencyId={targetEmergencyId} 
                clearTargetEmergency={() => setTargetEmergencyId(null)} 
              />
            )}
            {activeTab === "doctors" && (
              <DoctorsList currentUser={user} />
            )}
            {activeTab === "sos" && user.role === "patient" && (
              <PatientEmergencySOS currentUser={user} />
            )}
            {activeTab === "labreports" && user.role === "patient" && (
              <PatientLabReports currentUser={user} />
            )}
          </main>

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
        </section>
      </div>
      <GlobalEmergencyAlert 
        currentUser={user} 
        onNavigate={(tab, emergencyId) => {
          setActiveTab(tab);
          if (emergencyId) setTargetEmergencyId(emergencyId);
        }} 
      />
    </div>
  );
}

export default App;
