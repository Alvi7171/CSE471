import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:1355/api";

const TOKEN_KEY = "mediai_token";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

export const authAPI = {
  register: async (payload) => {
    const response = await api.post("/auth/register", payload);
    return response.data;
  },

  login: async (payload) => {
    const response = await api.post("/auth/login", payload);
    return response.data;
  },

  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await api.put("/auth/profile", payload);
    return response.data;
  },

  saveToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),

  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export const scheduleAPI = {
  getAllDoctors: async () => {
    const response = await api.get("/schedule/doctors");
    return response.data;
  },

  searchDoctors: async (params) => {
    const response = await api.get("/schedule/doctors/search", { params });
    return response.data;
  },

  getDoctorSchedule: async (doctorId) => {
    const response = await api.get(`/schedule/doctors/${doctorId}`);
    return response.data;
  },

  createSchedule: async (scheduleData) => {
    const response = await api.post("/schedule/create", scheduleData);
    return response.data;
  },

  updateSchedule: async (scheduleId, scheduleData) => {
    const response = await api.put(`/schedule/${scheduleId}`, scheduleData);
    return response.data;
  },

  deleteSchedule: async (scheduleId) => {
    const response = await api.delete(`/schedule/${scheduleId}`);
    return response.data;
  },
};

export const appointmentAPI = {
  getAvailableDoctors: async (date) => {
    const response = await api.get("/appointments/available-doctors", {
      params: { date },
    });
    return response.data;
  },

  getAvailableSlots: async (doctorId, date) => {
    const response = await api.get("/appointments/available-slots", {
      params: { doctorId, date },
    });
    return response.data;
  },

  bookAppointment: async (payload) => {
    const response = await api.post("/appointments/book", payload);
    return response.data;
  },

  getMyAppointments: async () => {
    const response = await api.get("/appointments/my");
    return response.data;
  },

  getDoctorAppointments: async (doctorId, params = {}) => {
    const response = await api.get(`/appointments/doctor/${doctorId}`, {
      params,
    });
    return response.data;
  },

  updateAppointmentStatus: async (appointmentId, status) => {
    const response = await api.put(`/appointments/${appointmentId}/status`, {
      status,
    });
    return response.data;
  },

  rescheduleAppointment: async (appointmentId, payload) => {
    const response = await api.put(
      `/appointments/${appointmentId}/reschedule`,
      payload,
    );
    return response.data;
  },
};

export const prescriptionAPI = {
  createPrescription: async (payload) => {
    const response = await api.post("/prescriptions", payload);
    return response.data;
  },

  getPrescriptionById: async (prescriptionId) => {
    const response = await api.get(`/prescriptions/${prescriptionId}`);
    return response.data;
  },

  getPatientPrescriptions: async (patientId) => {
    const response = await api.get(`/prescriptions/patient/${patientId}`);
    return response.data;
  },

  getDoctorPrescriptionSummary: async (doctorId) => {
    const response = await api.get(`/prescriptions/doctor/${doctorId}/summary`);
    return response.data;
  },

  getPrescriptionPrintHtml: async (prescriptionId) => {
    const response = await api.get(`/prescriptions/${prescriptionId}/print`, {
      responseType: "text",
    });
    return response.data;
  },
};

export const symptomAPI = {
  checkSymptoms: async (symptomData) => {
    const response = await api.post("/symptoms/check", symptomData);
    return response.data;
  },

  quickTriage: async (symptoms) => {
    const response = await api.post("/symptoms/triage", { symptoms });
    return response.data;
  },

  getHistory: async (patientName = null, limit = 50) => {
    const params = { limit };
    if (patientName) params.patientName = patientName;
    const response = await api.get("/symptoms/history", { params });
    return response.data;
  },

  getCheckById: async (checkId) => {
    const response = await api.get(`/symptoms/${checkId}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get("/symptoms/stats/overview");
    return response.data;
  },
};

export const notificationAPI = {
  list: async (limit = 20) => {
    const response = await api.get("/notifications", {
      params: { limit },
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put("/notifications/read-all");
    return response.data;
  },

  getPreferences: async () => {
    const response = await api.get("/notifications/preferences");
    return response.data;
  },

  updatePreferences: async (payload) => {
    const response = await api.put("/notifications/preferences", payload);
    return response.data;
  },
};

export const adminAPI = {
  getInventorySummary: async () => {
    const response = await api.get("/admin/inventory/summary");
    return response.data;
  },

  getInventoryAlerts: async (expiryWindowDays = 30) => {
    const response = await api.get("/admin/inventory/alerts", {
      params: { expiryWindowDays },
    });
    return response.data;
  },

  listMedicines: async (search = "") => {
    const response = await api.get("/admin/inventory/medicines", {
      params: search ? { search } : {},
    });
    return response.data;
  },

  createMedicine: async (payload) => {
    const response = await api.post("/admin/inventory/medicines", payload);
    return response.data;
  },

  updateMedicine: async (medicineId, payload) => {
    const response = await api.put(
      `/admin/inventory/medicines/${medicineId}`,
      payload,
    );
    return response.data;
  },

  adjustMedicineStock: async (medicineId, adjustment) => {
    const response = await api.put(
      `/admin/inventory/medicines/${medicineId}/stock`,
      { adjustment },
    );
    return response.data;
  },

  deleteMedicine: async (medicineId) => {
    const response = await api.delete(
      `/admin/inventory/medicines/${medicineId}`,
    );
    return response.data;
  },

  getBedSummary: async () => {
    const response = await api.get("/admin/beds/summary");
    return response.data;
  },

  listBeds: async (filters = {}) => {
    const response = await api.get("/admin/beds", { params: filters });
    return response.data;
  },

  suggestBed: async (payload) => {
    const response = await api.post("/admin/beds/suggest", payload);
    return response.data;
  },

  allocateBed: async (payload) => {
    const response = await api.post("/admin/beds/allocate", payload);
    return response.data;
  },

  releaseBed: async (allocationId) => {
    const response = await api.put(
      `/admin/beds/allocations/${allocationId}/release`,
    );
    return response.data;
  },
};

export { api };
export default api;
