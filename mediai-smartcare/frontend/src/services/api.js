import axios from "axios";

// Base API URL - Update this if backend is hosted elsewhere
const API_BASE_URL = "http://localhost:1355/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout for AI requests
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("[API Error]", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

// ============================================
// Doctor Scheduling APIs
// ============================================

export const scheduleAPI = {
  // Get all doctors
  getAllDoctors: async () => {
    const response = await api.get("/schedule/doctors");
    return response.data;
  },

  // Search doctors by specialization or department
  searchDoctors: async (params) => {
    const response = await api.get("/schedule/doctors/search", { params });
    return response.data;
  },

  // Get specific doctor's schedule
  getDoctorSchedule: async (doctorId) => {
    const response = await api.get(`/schedule/doctors/${doctorId}`);
    return response.data;
  },

  // Create new schedule
  createSchedule: async (scheduleData) => {
    const response = await api.post("/schedule/create", scheduleData);
    return response.data;
  },

  // Update schedule
  updateSchedule: async (scheduleId, scheduleData) => {
    const response = await api.put(`/schedule/${scheduleId}`, scheduleData);
    return response.data;
  },

  // Delete schedule
  deleteSchedule: async (scheduleId) => {
    const response = await api.delete(`/schedule/${scheduleId}`);
    return response.data;
  },
};

// ============================================
// AI Symptom Checker APIs
// ============================================

export const symptomAPI = {
  // Check symptoms with AI
  checkSymptoms: async (symptomData) => {
    const response = await api.post("/symptoms/check", symptomData);
    return response.data;
  },

  // Quick triage
  quickTriage: async (symptoms) => {
    const response = await api.post("/symptoms/triage", { symptoms });
    return response.data;
  },

  // Get symptom history
  getHistory: async (patientName = null, limit = 50) => {
    const params = { limit };
    if (patientName) params.patientName = patientName;
    const response = await api.get("/symptoms/history", { params });
    return response.data;
  },

  // Get specific symptom check
  getCheckById: async (checkId) => {
    const response = await api.get(`/symptoms/${checkId}`);
    return response.data;
  },

  // Get statistics
  getStatistics: async () => {
    const response = await api.get("/symptoms/stats/overview");
    return response.data;
  },
};

export default api;
