/**
 * Hospital Analytics Reports Dashboard
 * Author: MD Shafiur Rahman Alvi (ID: 23201355)
 * Purpose: Display admin dashboards with analytics on patient visits,
 *          department performance, doctor workload, and revenue statistics
 */

import axios from "axios";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";

function AnalyticsReports() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Patient search states
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientAnalytics, setPatientAnalytics] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Initialize date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(lastMonth.toISOString().split("T")[0]);
  }, []);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await axios.get(
        `${API_BASE_URL}/analytics/comprehensive?${params}`
      );

      if (response.data.success) {
        setAnalytics(response.data);
      } else {
        setError("Failed to fetch analytics data");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(
        err.response?.data?.error ||
        "Failed to fetch analytics data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch on component mount and when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics();
    }
  }, [startDate, endDate]);

  const handleSearch = () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before end date");
      return;
    }
    fetchAnalytics();
  };

  const handleResetDates = () => {
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(lastMonth.toISOString().split("T")[0]);
  };

  // Search for patients
  const handlePatientSearch = async (query) => {
    setPatientSearchQuery(query);
    if (query.trim().length === 0) {
      setPatientSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/analytics/search/patients?q=${encodeURIComponent(query)}`
      );
      setPatientSearchResults(response.data.data || []);
    } catch (err) {
      console.error("Error searching patients:", err);
      setPatientSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load selected patient's details and timeline
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setPatientSearchResults([]);
    setPatientSearchQuery("");

    try {
      setSearchLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/analytics/patient/${patient.smart_patient_id || patient.patient_id}`
      );
      setPatientAnalytics(response.data);
    } catch (err) {
      console.error("Error loading patient details:", err);
      setError("Failed to load patient details");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientAnalytics(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          📊 Hospital Analytics Dashboard
        </h2>
        <p className="text-gray-600">
          Comprehensive insights into hospital performance, patient metrics, and revenue
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🗓️ Date Range Filter</h3>
        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "⏳ Loading..." : "🔍 Search"}
          </button>
          <button
            onClick={handleResetDates}
            className="px-6 py-2 bg-gray-500 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300"
          >
            ↺ Reset (30 days)
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Patient Search & Timeline Drill-down */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6 mb-8 pb-80">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 Patient Search & Medical Timeline</h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by patient name or Smart ID (SPC-XXXXX)..."
            value={patientSearchQuery}
            onChange={(e) => handlePatientSearch(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Search Results Dropdown */}
          {patientSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border-2 border-blue-400 rounded-lg shadow-2xl mt-1 z-[9999] max-h-80 overflow-y-auto">
              {patientSearchResults.map((patient) => (
                <button
                  key={patient.user_id}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-100 border-b border-gray-200 last:border-b-0 transition-colors font-medium hover:shadow-md"
                >
                  <div className="font-semibold text-gray-800">
                    {patient.full_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    ID: <span className="text-blue-600 font-mono font-bold">{patient.user_id}</span> • {patient.phone}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Patient Medical Timeline */}
      {selectedPatient && patientAnalytics && (
        <PatientTimelineView
          patient={patientAnalytics.patient}
          timeline={patientAnalytics.appointmentHistory}
          contribution={patientAnalytics.analyticsContribution}
          onClose={handleClearPatient}
        />
      )}

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon="👥"
            title="Total Visits"
            value={analytics.summary.totalVisits}
          />
          <SummaryCard
            icon="🏥"
            title="Total Patients"
            value={analytics.summary.totalPatients}
          />
          <SummaryCard
            icon="💰"
            title="Total Revenue"
            value={`₹${analytics.summary.totalRevenue.toLocaleString()}`}
          />
          <SummaryCard
            icon="👨‍⚕️"
            title="Active Doctors"
            value={analytics.summary.activeDoctors}
          />
        </div>
      )}

      {/* Consolidated Analytics Views - All in One */}
      {analytics && (
        <div className="space-y-8">
          <OverviewView analytics={analytics} />
          <DepartmentsView departments={analytics.departments} />
          <DoctorsView doctors={analytics.doctors} />
          <RevenueView revenue={analytics.revenue} />
          <PatientsView patients={analytics.patients} />
          <DiagnosticsView diagnostics={analytics.diagnostics} />
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ icon, title, value }) {
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6 hover:shadow-xl transition-all duration-300">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-gray-600 font-medium text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {value}
      </p>
    </div>
  );
}

// Overview View Component
function OverviewView({ analytics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Performing Doctors */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          👨‍⚕️ Top Performing Doctors
        </h3>
        {analytics.doctors.length > 0 ? (
          <div className="space-y-3">
            {analytics.doctors.slice(0, 5).map((doctor, index) => (
              <div
                key={doctor.doctor_id}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{doctor.name}</p>
                    <p className="text-xs text-gray-600">
                      {doctor.department} • {doctor.total_visits} visits
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">
                    ₹{doctor.doctor_revenue || 0}
                  </p>
                  <p className="text-xs text-gray-600">revenue</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No data available</p>
        )}
      </div>

      {/* Department Performance */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          🏢 Department Performance
        </h3>
        {analytics.departments.length > 0 ? (
          <div className="space-y-3">
            {analytics.departments.map((dept) => (
              <div
                key={dept.department}
                className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {dept.department}
                    </p>
                    <p className="text-xs text-gray-600">
                      {dept.total_doctors} doctors • {dept.total_visits} visits
                    </p>
                  </div>
                  <p className="font-bold text-green-600">
                    ₹{dept.department_revenue || 0}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(dept.total_visits /
                          Math.max(
                            ...analytics.departments.map((d) => d.total_visits)
                          )) *
                        100
                        }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No data available</p>
        )}
      </div>

      {/* Visit Trends */}
      <div className="lg:col-span-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          📈 Visit Trends
        </h3>
        {analytics.visits.trend.length > 0 ? (
          <div className="space-y-2">
            {analytics.visits.trend.slice(-7).map((trend) => (
              <div key={trend.visit_day} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600">{trend.visit_day}</div>
                <div className="flex-1 flex items-center">
                  <div className="h-8 bg-blue-500 rounded" style={{
                    width: `${(trend.visits / Math.max(...analytics.visits.trend.map(t => t.visits))) * 100}%`
                  }}></div>
                  <span className="ml-2 text-sm font-semibold text-gray-700">{trend.visits}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No trend data available</p>
        )}
      </div>
    </div>
  );
}

// Departments View Component
function DepartmentsView({ departments }) {
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        🏢 Department Performance Metrics
      </h3>
      {departments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">
                  Department
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">
                  Doctors
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">
                  Visits
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">
                  Avg Fee
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((dept) => (
                <tr
                  key={dept.department}
                  className="hover:bg-white/50 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {dept.department}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {dept.total_doctors}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {dept.total_visits}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    ₹{dept.avg_consultation_fee}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    ₹{dept.department_revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600 text-center py-8">No department data available</p>
      )}
    </div>
  );
}

// Doctors View Component
function DoctorsView({ doctors }) {
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        👨‍⚕️ Doctor Workload Analysis
      </h3>
      {doctors.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-800">
                  Doctor
                </th>
                <th className="px-4 py-3 text-center font-bold text-gray-800">
                  Visits
                </th>
                <th className="px-4 py-3 text-center font-bold text-gray-800">
                  Patients
                </th>
                <th className="px-4 py-3 text-center font-bold text-gray-800">
                  Experience
                </th>
                <th className="px-4 py-3 text-right font-bold text-gray-800">
                  Revenue
                </th>
                <th className="px-4 py-3 text-center font-bold text-gray-800">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doctors.map((doctor) => (
                <tr key={doctor.doctor_id} className="hover:bg-white/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-800">{doctor.name}</p>
                      <p className="text-xs text-gray-600">
                        {doctor.department} • {doctor.specialization}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {doctor.total_visits}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {doctor.unique_patients}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {doctor.experience_years} yrs
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    ₹{doctor.doctor_revenue}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {doctor.is_available ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        ✓ Available
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                        Unavailable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600 text-center py-8">No doctor data available</p>
      )}
    </div>
  );
}

// Revenue View Component
function RevenueView({ revenue }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue by Department */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          💰 Revenue by Department
        </h3>
        {revenue.byDepartment.length > 0 ? (
          <div className="space-y-3">
            {revenue.byDepartment.map((dept) => {
              const maxRevenue = Math.max(
                ...revenue.byDepartment.map((d) => d.department_revenue)
              );
              const percentage = (dept.department_revenue / maxRevenue) * 100;
              return (
                <div key={dept.department}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-gray-800">
                      {dept.department}
                    </p>
                    <p className="font-bold text-green-600">
                      ₹{dept.department_revenue}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {dept.visit_count} visits
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No revenue data available</p>
        )}
      </div>

      {/* Revenue Trend */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          📊 Revenue Trend (Daily)
        </h3>
        {revenue.trend.length > 0 ? (
          <div className="space-y-2">
            {revenue.trend.slice(-10).map((day) => (
              <div key={day.revenue_date} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-600 font-medium">
                  {new Date(day.revenue_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="flex-1">
                  <div
                    className="h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded text-white text-xs flex items-center justify-end pr-2"
                    style={{
                      width: `${(day.daily_revenue / Math.max(...revenue.trend.map(t => t.daily_revenue))) * 100}%`,
                    }}
                  >
                    {day.daily_revenue > 100 && (
                      <span className="text-xs font-bold">₹{day.daily_revenue}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No trend data available</p>
        )}
      </div>

      {/* Summary */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
          <p className="text-gray-600 text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">
            ₹{revenue.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-4">
          <p className="text-gray-600 text-sm mb-1">Total Paid Visits</p>
          <p className="text-3xl font-bold text-blue-600">
            {revenue.totalPaidVisits}
          </p>
        </div>
      </div>
    </div>
  );
}

// Patients View Component
function PatientsView({ patients }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Stats */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
          <p className="text-gray-600 text-sm mb-1">Total Patients</p>
          <p className="text-3xl font-bold text-blue-600">
            {patients.totalPatients}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-4">
          <p className="text-gray-600 text-sm mb-1">New Patients</p>
          <p className="text-3xl font-bold text-green-600">
            {patients.newPatients}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4">
          <p className="text-gray-600 text-sm mb-1">With Visits</p>
          <p className="text-3xl font-bold text-purple-600">
            {patients.patientsWithVisits}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-4">
          <p className="text-gray-600 text-sm mb-1">Avg Visits/Patient</p>
          <p className="text-3xl font-bold text-orange-600">
            {patients.avgVisitsPerPatient}
          </p>
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          👥 Gender Distribution
        </h3>
        {patients.genderDistribution.length > 0 ? (
          <div className="space-y-3">
            {patients.genderDistribution.map((gender) => {
              const total = patients.genderDistribution.reduce(
                (sum, g) => sum + g.count,
                0
              );
              const percentage = (gender.count / total) * 100;
              return (
                <div key={gender.gender}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-gray-800">
                      {gender.gender}
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      {gender.count} ({percentage.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-pink-400 to-rose-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No gender data available</p>
        )}
      </div>

      {/* Patient Insights */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          📊 Patient Insights
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-600 mb-1">Engagement Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {patients.totalPatients > 0
                ? (
                  (patients.patientsWithVisits / patients.totalPatients) *
                  100
                ).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-xs text-gray-600 mt-1">
              of patients have visited
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-gray-600 mb-1">Patient Retention</p>
            <p className="text-2xl font-bold text-green-600">
              {patients.patientsWithVisits > 0
                ? ((patients.patientsWithVisits / patients.totalPatients) * 100).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-xs text-gray-600 mt-1">
              active patient base
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Diagnostics View Component
function DiagnosticsView({ diagnostics }) {
  if (!diagnostics) {
    return (
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <p className="text-gray-600 text-center py-8">No diagnostic data available</p>
      </div>
    );
  }

  const byType = diagnostics.byType || [];
  const byUrgency = diagnostics.byUrgency || [];
  const totalReports = diagnostics.totalReports || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Reports by Type */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          🔬 Reports by Type
        </h3>
        {byType && byType.length > 0 ? (
          <div className="space-y-3">
            {byType.map((type) => {
              const total = byType.reduce(
                (sum, t) => sum + (t.count || 0),
                0
              );
              const percentage = total > 0 ? (type.count / total) * 100 : 0;
              return (
                <div key={type.report_type}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-gray-800">
                      {type.report_type}
                    </p>
                    <p className="text-sm font-bold">
                      {type.count} reports
                      {type.critical_count > 0 && (
                        <span className="text-red-600 ml-2">
                          ({type.critical_count} critical)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-indigo-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No diagnostic data available</p>
        )}
      </div>

      {/* Urgency Distribution */}
      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/60 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          ⚠️ Urgency Distribution
        </h3>
        {byUrgency && byUrgency.length > 0 ? (
          <div className="space-y-3">
            {byUrgency.map((urgency) => {
              const colors = {
                Normal: "#4ade80",
                Abnormal: "#f59e0b",
                Critical: "#ef4444",
              };
              const labels = {
                Normal: "✓ Normal",
                Abnormal: "⚠️ Abnormal",
                Critical: "🚨 Critical",
              };
              return (
                <div
                  key={urgency.urgency_level}
                  className="p-4 rounded-lg border-2"
                  style={{
                    borderColor: colors[urgency.urgency_level] || "#999",
                    backgroundColor: (colors[urgency.urgency_level] || "#999") + "15",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-gray-800">
                      {labels[urgency.urgency_level] || urgency.urgency_level}
                    </p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: colors[urgency.urgency_level] || "#999" }}
                    >
                      {urgency.count}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No urgency data available</p>
        )}
      </div>

      {/* Total Reports Summary */}
      <div className="lg:col-span-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 mb-1">Total Diagnostic Reports</p>
            <p className="text-4xl font-bold text-indigo-600">
              {totalReports}
            </p>
          </div>
          <div className="text-5xl">🔬</div>
        </div>
      </div>
    </div>
  );
}

// Patient Timeline Component
function PatientTimelineView({ patient, timeline, contribution, onClose }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-xl p-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            👤 {patient.fullName}
          </h2>
          <p className="text-gray-600">
            <span className="font-mono bg-white px-3 py-1 rounded text-blue-600 font-semibold">ID: {patient.userId}</span>
            {patient.gender && ` • Gender: ${patient.gender}`}
            {patient.age && ` • Age: ${patient.age}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Contribution Stats */}
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">Registered</div>
          <p className="text-lg font-bold text-gray-800">
            {new Date(patient.registrationDate).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">Total Appointments</div>
          <p className="text-2xl font-bold text-green-600">{contribution.appointmentCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-1">Doctors Visited</div>
          <p className="text-2xl font-bold text-purple-600">{contribution.doctorCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 mb-1">Last Appointment</div>
          <p className="text-lg font-bold text-gray-800">
            {contribution.lastAppointmentDate ? new Date(contribution.lastAppointmentDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Medical Timeline */}
      <div className="space-y-6">
        {/* Appointments */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Appointment History</h3>
          {timeline && timeline.appointments && timeline.appointments.length > 0 ? (
            <div className="space-y-3">
              {timeline.appointments.map((appointment) => (
                <div
                  key={appointment.appointment_id}
                  className="bg-white p-4 rounded-lg border-l-4 border-blue-500 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-800">
                        Dr. {appointment.doctor_name} ({appointment.department})
                      </div>
                      <div className="text-sm text-gray-600">
                        Specialization: {appointment.specialization}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    📅 {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                  </p>
                  {appointment.symptoms && <p className="text-sm text-gray-700 mt-2">Symptoms: {appointment.symptoms}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No appointment records found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsReports;
