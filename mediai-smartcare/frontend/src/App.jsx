import React, { useState } from "react";
import SymptomChecker from "./components/SymptomChecker";
import DoctorSchedule from "./components/DoctorSchedule";
import PatientBooking from "./components/PatientBooking";
import PatientRegistration from "./components/PatientRegistration";
import MedicalTimeline from "./components/MedicalTimeline";
import AnalyticsReports from "./components/AnalyticsReports";
import "./index.css";

function App() {
  const [activeTab, setActiveTab] = useState("symptom");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🏥 MediAI SmartCare
              </h1>
              <p className="text-sm text-gray-600">
                AI-Integrated Hospital Management System
              </p>
            </div>
            <div className="text-right bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/60 shadow-sm">
              <p className="text-sm font-medium text-gray-800">MD Shafiur Rahman Alvi</p>
              <p className="text-xs text-gray-600">Student ID: 23201355</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white/60 backdrop-blur-lg border-b border-white/30 sticky top-[73px] z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto pb-0">
            <button
              onClick={() => setActiveTab("symptom")}
              className={`px-6 py-3 font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === "symptom"
                  ? "text-blue-600 bg-white/80 backdrop-blur-sm shadow-md border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/40"
              }`}
            >
              🤖 AI Symptom Checker
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-6 py-3 font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === "schedule"
                  ? "text-blue-600 bg-white/80 backdrop-blur-sm shadow-md border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/40"
              }`}
            >
              🩺 Doctor Schedule
            </button>
            <button
              onClick={() => setActiveTab("booking")}
              className={`px-6 py-3 font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === "booking"
                  ? "text-blue-600 bg-white/80 backdrop-blur-sm shadow-md border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/40"
              }`}
            >
              📅 Book Appointment
            </button>
            <button
              onClick={() => setActiveTab("registration")}
              className={`px-6 py-3 font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === "registration"
                  ? "text-blue-600 bg-white/80 backdrop-blur-sm shadow-md border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/40"
              }`}
            >
              ✅ Patient Registration
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-6 py-3 font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === "timeline"
                  ? "text-blue-600 bg-white/80 backdrop-blur-sm shadow-md border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/40"
              }`}
            >
              📋 Medical Timeline
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-6 py-3 font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === "analytics"
                  ? "text-blue-600 bg-white/80 backdrop-blur-sm shadow-md border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/40"
              }`}
            >
              📊 Analytics Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-6">
        {activeTab === "symptom" && <SymptomChecker />}
        {activeTab === "schedule" && <DoctorSchedule />}
        {activeTab === "booking" && <PatientBooking />}
        {activeTab === "registration" && <PatientRegistration />}
        {activeTab === "timeline" && <MedicalTimeline />}
        {activeTab === "analytics" && <AnalyticsReports />}
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-md border-t border-white/30 mt-12 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="text-center text-sm text-gray-600">
            <p>© {new Date().getFullYear()} MediAI SmartCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
