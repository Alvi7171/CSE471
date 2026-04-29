import React, { useState, useEffect } from "react";
import api from "../services/api";

function PatientSearchManagement() {
  // Search state
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Search filters state
  const [searchFilters, setSearchFilters] = useState({
    query: "",
    patientId: "",
    phone: "",
    email: "",
    name: "",
    dateOfBirth: "",
    gender: "",
    bloodType: "",
    city: "",
    registrationDateFrom: "",
    registrationDateTo: "",
    lastVisitFrom: "",
    lastVisitTo: "",
    hasChronicDiseases: "",
    sortBy: "last_updated",
    sortOrder: "DESC",
    limit: "20"
  });

  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Recently active patients
  const [recentlyActive, setRecentlyActive] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showStatistics, setShowStatistics] = useState(false);

  useEffect(() => {
    loadStatistics();
    loadRecentlyActive();
  }, []);

  // Load statistics
  const loadStatistics = async () => {
    try {
      setLoadingStats(true);
      const response = await api.get("/patients/statistics");
      setStatistics(response.data.data);
    } catch (err) {
      console.error("Error loading statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load recently active patients
  const loadRecentlyActive = async () => {
    try {
      setLoadingRecent(true);
      const response = await api.get("/patients/recently-active", { params: { days: 30, limit: 5 } });
      setRecentlyActive(response.data.data);
    } catch (err) {
      console.error("Error loading recently active patients:", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  // Handle search
  const handleSearch = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams();
      
      // Add all filters to params
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value && value !== "") {
          params.append(key, value);
        }
      });
      
      params.append('page', page);

      const response = await api.get("/patients/search", { params: Object.fromEntries(params) });
      
      setSearchResults(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotalResults(response.data.pagination.totalResults);
      setCurrentPage(response.data.pagination.currentPage);
    } catch (err) {
      setError("Failed to search patients. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setSearchFilters({
      query: "",
      patientId: "",
      phone: "",
      email: "",
      name: "",
      dateOfBirth: "",
      gender: "",
      bloodType: "",
      city: "",
      registrationDateFrom: "",
      registrationDateTo: "",
      lastVisitFrom: "",
      lastVisitTo: "",
      hasChronicDiseases: "",
      sortBy: "last_updated",
      sortOrder: "DESC",
      limit: "20"
    });
    setCurrentPage(1);
    setSearchResults([]);
  };

  // Export patients
  const exportPatients = async (format = 'csv') => {
    try {
      const response = await api.post("/patients/export", {
        format,
        searchCriteria: searchFilters
      }, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Create download link for CSV
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON export (could open new window or download)
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `patients_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError("Failed to export patient data.");
      console.error(err);
    }
  };

  // Get patient dashboard
  const viewPatientDashboard = async (patient) => {
    try {
      const response = await api.get(`/patients/${patient.patient_id}/dashboard`);
      setSelectedPatient(response.data.data);
    } catch (err) {
      setError("Failed to load patient dashboard.");
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
          👥 Patient Search & Management
        </h1>
        <p className="text-gray-600 mt-2 text-lg">
          Module 1: Comprehensive patient search, filtering, analytics, and timeline management
        </p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loadingStats ? (
          <div className="col-span-full text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2">Loading statistics...</p>
          </div>
        ) : statistics && (
          <>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Patients</p>
                  <p className="text-3xl font-bold">{statistics.totalPatients.toLocaleString()}</p>
                </div>
                <div className="text-4xl opacity-20">👥</div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">New This Month</p>
                  <p className="text-3xl font-bold">{statistics.newRegistrations?.reduce((sum, day) => sum + day.count, 0) || 0}</p>
                </div>
                <div className="text-4xl opacity-20">📈</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Chronic Conditions</p>
                  <p className="text-3xl font-bold">{statistics.chronicDiseasesCount}</p>
                </div>
                <div className="text-4xl opacity-20">⚠️</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Recently Active</p>
                  <p className="text-3xl font-bold">{recentlyActive.length}</p>
                </div>
                <div className="text-4xl opacity-20">🔄</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🔍 Advanced Patient Search</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showAdvancedFilters ? '🔼 Simple' : '🔽 Advanced'}
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              🔄 Reset
            </button>
            <button
              onClick={() => handleSearch(currentPage)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 Searching...' : '🔍 Search'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Basic Search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Quick search by name, phone, email, or patient ID..."
              value={searchFilters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={searchFilters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <>
              <input
                type="text"
                placeholder="Patient ID or Smart Patient ID"
                value={searchFilters.patientId}
                onChange={(e) => handleFilterChange('patientId', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Phone Number"
                value={searchFilters.phone}
                onChange={(e) => handleFilterChange('phone', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={searchFilters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="date"
                value={searchFilters.dateOfBirth}
                onChange={(e) => handleFilterChange('dateOfBirth', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={searchFilters.bloodType}
                onChange={(e) => handleFilterChange('bloodType', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Blood Types</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>

              <input
                type="text"
                placeholder="City"
                value={searchFilters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-2">
                <input
                  type="date"
                  placeholder="Registration From"
                  value={searchFilters.registrationDateFrom}
                  onChange={(e) => handleFilterChange('registrationDateFrom', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  placeholder="Registration To"
                  value={searchFilters.registrationDateTo}
                  onChange={(e) => handleFilterChange('registrationDateTo', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={searchFilters.hasChronicDiseases}
                onChange={(e) => handleFilterChange('hasChronicDiseases', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Patients</option>
                <option value="true">With Chronic Diseases</option>
                <option value="false">Without Chronic Diseases</option>
              </select>

              <div className="flex gap-2">
                <select
                  value={searchFilters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="last_updated">Last Updated</option>
                  <option value="first_name">First Name</option>
                  <option value="last_name">Last Name</option>
                  <option value="registration_date">Registration Date</option>
                  <option value="last_visit_date">Last Visit</option>
                  <option value="total_visits">Total Visits</option>
                </select>
                <select
                  value={searchFilters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DESC">Newest First</option>
                  <option value="ASC">Oldest First</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Export Options */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => exportPatients('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📊 Export CSV
          </button>
          <button
            onClick={() => exportPatients('json')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📄 Export JSON
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* Results Summary */}
      {totalResults > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700">
            Found <span className="font-bold">{totalResults.toLocaleString()}</span> patients
            {totalPages > 1 && (
              <span> - Page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span></span>
            )}
          </p>
        </div>
      )}

      {/* Search Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4">Searching patients...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {searchResults.map((patient) => (
            <div
              key={patient.patient_id}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 cursor-pointer"
              onClick={() => viewPatientDashboard(patient)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {patient.first_name} {patient.last_name}
                  </h3>
                  <p className="text-sm text-gray-600 font-mono">
                    {patient.smart_patient_id}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                  {patient.total_visits} visits
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">📱 Phone:</span>
                  <span className="font-medium">{patient.phone_number}</span>
                </div>
                {patient.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">📧 Email:</span>
                    <span className="font-medium truncate">{patient.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">👤 Gender:</span>
                  <span className="font-medium">{patient.gender}</span>
                </div>
                {patient.blood_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">🩸 Blood Type:</span>
                    <span className="font-medium">{patient.blood_type}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">📅 Registered:</span>
                  <span className="font-medium">
                    {new Date(patient.registration_date).toLocaleDateString()}
                  </span>
                </div>
                {patient.last_visit_date && patient.last_visit_date !== 'Never' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">🏥 Last Visit:</span>
                    <span className="font-medium">
                      {new Date(patient.last_visit_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => viewPatientDashboard(patient)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📋 View Full Dashboard
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500 text-lg">
            No patients found matching your search criteria
          </p>
          <p className="text-gray-400 mt-2">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-8">
          <button
            onClick={() => handleSearch(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => handleSearch(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Patient Dashboard Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  📋 Patient Dashboard - {selectedPatient.patient.first_name} {selectedPatient.patient.last_name}
                </h2>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Patient Info */}
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-bold text-blue-800 mb-2">Patient Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>ID:</strong> {selectedPatient.patient.smart_patient_id}</div>
                      <div><strong>Phone:</strong> {selectedPatient.patient.phone_number}</div>
                      <div><strong>Email:</strong> {selectedPatient.patient.email || 'N/A'}</div>
                      <div><strong>Age:</strong> {selectedPatient.patient.date_of_birth}</div>
                      <div><strong>Gender:</strong> {selectedPatient.patient.gender}</div>
                      <div><strong>Blood Type:</strong> {selectedPatient.patient.blood_type || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-bold text-green-800 mb-2">Visit Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Total Visits:</strong> {selectedPatient.visitStats.total_visits}</div>
                      <div><strong>Completed:</strong> {selectedPatient.visitStats.completed_visits}</div>
                      <div><strong>Cancelled:</strong> {selectedPatient.visitStats.cancelled_visits}</div>
                      <div><strong>Last Visit:</strong> {selectedPatient.visitStats.last_visit_date}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientSearchManagement;
