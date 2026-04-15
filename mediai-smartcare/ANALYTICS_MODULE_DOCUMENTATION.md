# Hospital Analytics Reports Module
**Author:** MD Shafiur Rahman Alvi (ID: 23201355)  
**Date:** April 2026  
**Purpose:** Comprehensive admin dashboards for hospital performance analysis and data-driven decision making

---

## 📋 Module Overview

The Hospital Analytics Reports module provides administrators with powerful dashboards to monitor and analyze hospital operations, including:

- **Total Patient Visits** - Daily/weekly/monthly visit trends with customizable date filtering
- **Department Performance** - Metrics including doctor count, visit volume, and revenue contribution
- **Doctor Workload** - Individual doctor statistics including patient load and revenue generation
- **Revenue Statistics** - Comprehensive financial analytics with department and daily breakdowns
- **Patient Demographics** - Patient population analysis with gender distribution and engagement metrics
- **Diagnostic Reports** - Analysis of diagnostic reports by type and urgency level

---

## 🏗️ Architecture

### Backend Structure

**Location:** `backend/controllers/analyticsController.js`

**Core Functions:**

1. **getTotalPatientVisits(startDate, endDate)**
   - Returns total completed visits and daily trend data
   - Supports date range filtering
   - Returns: `{ totalVisits, trend: [{visit_day, visits}] }`

2. **getDepartmentPerformance(startDate, endDate)**
   - Aggregates metrics per department
   - Shows doctor count, visit volume, revenue, and availability
   - Returns array of department objects with performance metrics

3. **getDoctorWorkload(startDate, endDate)**
   - Individual doctor statistics
   - Calculates visits, unique patients, revenue, and availability status
   - Returns: Array of doctors with workload metrics

4. **getRevenueStatistics(startDate, endDate)**
   - Total, departmental, and daily revenue
   - Based on consultation fees × visit count
   - Returns: `{ totalRevenue, totalPaidVisits, byDepartment[], trend[] }`

5. **getPatientStatistics(startDate, endDate)**
   - Total patients, new patients, engagement metrics
   - Gender distribution analysis
   - Returns: `{ totalPatients, newPatients, patientsWithVisits, avgVisitsPerPatient, genderDistribution[] }`

6. **getDiagnosticStatistics(startDate, endDate)**
   - Reports categorized by type and urgency level
   - Tracks critical findings
   - Returns: `{ byType[], byUrgency[], totalReports }`

7. **getComprehensiveAnalytics(startDate, endDate)**
   - Combines all analytics in one call
   - Includes summary, visits, departments, doctors, revenue, and patients
   - **Most commonly used endpoint**

8. **getTopPerformingDoctors(limit, startDate, endDate)**
   - Ranks doctors by visit volume and revenue
   - Returns: Array of top doctors sorted by visits (DESC)

---

### API Routes

**Location:** `backend/routes/analytics.js`

| Endpoint | Method | Parameters | Description |
|----------|--------|-----------|-------------|
| `/api/analytics/comprehensive` | GET | startDate?, endDate? | Full dashboard data |
| `/api/analytics/visits` | GET | startDate?, endDate? | Visit statistics and trends |
| `/api/analytics/departments` | GET | startDate?, endDate? | Department performance |
| `/api/analytics/doctors-workload` | GET | startDate?, endDate? | Doctor workload metrics |
| `/api/analytics/revenue` | GET | startDate?, endDate? | Revenue statistics and trends |
| `/api/analytics/patients` | GET | startDate?, endDate? | Patient demographics |
| `/api/analytics/top-doctors` | GET | limit?, startDate?, endDate? | Top performing doctors |
| `/api/analytics/diagnostics` | GET | startDate?, endDate? | Diagnostic report analytics |

---

## 🎨 Frontend Component

**Location:** `frontend/src/components/AnalyticsReports.jsx`

### Component Structure

**Main Component:** `AnalyticsReports`
- Manages date range state and API calls
- Provides tab-based navigation for different analytics views
- Handles data fetching and error states

**Sub-Components:**

1. **SummaryCard** - Displays key metrics (visits, patients, revenue, doctors)
2. **OverviewView** - Dashboard overview with top doctors, departments, and visit trends
3. **DepartmentsView** - Detailed department performance table
4. **DoctorsView** - Doctor workload and performance analysis table
5. **RevenueView** - Revenue breakdown by department and daily trends
6. **PatientsView** - Patient statistics and demographic analysis
7. **DiagnosticsView** - Diagnostic report analysis

### Data Filtering

- **Date Range Selection:** Customizable start and end dates
- **Default Period:** Last 30 days
- **Reset Function:** Quick reset to last 30 days
- **Validation:** Ensures start date < end date

### View Tabs

- 📈 **Overview** - High-level summary with key insights
- 🏢 **Departments** - Detailed department metrics table
- 👨‍⚕️ **Doctor Workload** - Individual doctor performance analysis
- 💵 **Revenue** - Financial analytics and trends
- 👥 **Patients** - Patient demographics and engagement
- 🔬 **Diagnostics** - Diagnostic report analysis

---

## 📊 Key Features

### 1. Summary Cards
Display critical metrics at a glance:
- Total Visits
- Total Patients
- Total Revenue
- Active Doctors

### 2. Date Range Filtering
```
Start Date: [YYYY-MM-DD input]
End Date:   [YYYY-MM-DD input]
[Search] [Reset to 30 Days]
```

### 3. Performance Visualizations

**Progress Bars:** Visual representation of relative metrics
- Department visit volume comparison
- Revenue distribution by department
- Patient gender distribution

**Bar Charts:** Daily/trend analysis
- Visit trends (daily visits)
- Revenue trends (daily revenue)
- Report type distribution

**Tables:** Detailed data with sorting capability
- Department performance metrics
- Doctor workload details
- Diagnostic report breakdowns

### 4. Color-Coded Metrics
- 🟢 **Green** - Revenue, positive metrics
- 🔵 **Blue** - Visit and patient data
- 🟣 **Purple** - Diagnostic data
- 🟠 **Orange** - Warnings and alerts
- 🔴 **Red** - Critical urgency levels

---

## 📈 Analytics Calculations

### Revenue Formula
```
Doctor Revenue = Doctor's Consultation Fee × Number of Completed Visits
Department Revenue = Sum of all doctor revenues in department
Total Revenue = Sum of all department revenues
```

### Performance Metrics
```
Department Performance = Total Visits / Active Doctors (workload indicator)
Doctor Utilization = Completed Visits / Available Time Slots
Patient Engagement = Patients with Visits / Total Patients × 100
Average Visit Rate = Total Visits / Unique Patients
```

### Report Classification
- **Report Types:** Blood Test, X-Ray, ECG, Ultrasound, etc.
- **Urgency Levels:** Normal, Abnormal, Critical
- **Critical Tracking:** Count of critical findings per report type

---

## 🔧 Database Queries

### Key Tables Used
- `medical_visits` - Visit records (visit_id, patient_id, doctor_id, visit_date, status)
- `doctors` - Doctor information (doctor_id, name, department, consultation_fee, is_available)
- `patients` - Patient records (patient_id, registration_date, gender)
- `diagnostic_reports` - diagnostic data (report_type, urgency_level)
- `prescriptions` - Prescription records (for visit completion tracking)
- `treatment_timeline` - Treatment tracking

### Sample Query Structure
```sql
-- Department Performance Query
SELECT 
  d.department,
  COUNT(DISTINCT d.doctor_id) as total_doctors,
  COUNT(DISTINCT mv.visit_id) as total_visits,
  AVG(d.consultation_fee) as avg_fee,
  SUM(d.consultation_fee) as department_revenue
FROM doctors d
LEFT JOIN medical_visits mv ON d.doctor_id = mv.doctor_id 
  AND mv.status = 'completed'
WHERE DATE(mv.visit_date) >= ? AND DATE(mv.visit_date) <= ?
GROUP BY d.department
ORDER BY total_visits DESC
```

---

## 🚀 Usage Guide

### For Administrators

1. **Navigate to Analytics Dashboard**
   - Click "📊 Analytics Dashboard" tab
   - Module loads with last 30 days of data by default

2. **View Summary Metrics**
   - See key performance indicators at the top
   - Understand overall hospital performance at a glance

3. **Analyze Specific Periods**
   - Select custom date range
   - Click "🔍 Search" to update all metrics
   - Use "↺ Reset (30 days)" to return to default

4. **Explore Different Views**
   - Click on view tabs (Overview, Departments, etc.)
   - Each view provides detailed analytics for that area
   - Scroll through trend data and tables

5. **Export Data (Future Enhancement)**
   - Data can be copied from tables
   - CSV export functionality coming soon
   - PDF report generation planned

### For Decision Making

**Department Planning:**
- Compare department performance metrics
- Identify high-performing and underperforming departments
- Plan resource allocation based on workload

**Doctor Management:**
- Track individual doctor productivity
- Identify top performers for recognition
- Identify overburdened doctors for support

**Financial Planning:**
- Monitor revenue trends
- Track revenue by department
- Identify revenue growth opportunities

**Patient Care:**
- Analyze patient engagement rates
- Track patient demographics
- Monitor patient retention

**Diagnostic Quality:**
- Track critical findings
- Monitor report type distribution
- Identify diagnostic trends

---

## 📦 Integration

### Backend Integration (server.js)
```javascript
// Already integrated:
const analyticsRoutes = require("./routes/analytics");
app.use("/api/analytics", analyticsRoutes);
```

### Frontend Integration (App.jsx)
```javascript
// Already integrated:
import AnalyticsReports from "./components/AnalyticsReports";
// Added "analytics" tab
// Renders AnalyticsReports when activeTab === "analytics"
```

---

## ⚙️ Configuration

### API Base URL
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:1355/api";
```

### Default Date Range
- Automatically set to last 30 days on component mount
- User can customize with date picker inputs

### Data Refresh
- Automatic on component mount
- Manual refresh on "Search" button click
- Validates dates before fetching

---

## 🐛 Error Handling

### Frontend Error Messages
- Shows error alerts if API calls fail
- Validates date range before submission
- Handles empty data states gracefully

### Backend Error Handling
- Try-catch blocks in all controller functions
- Returns consistent error response format
- Logs errors to console for debugging

### Response Format
```json
{
  "success": true,
  "dateRange": {
    "startDate": "2026-03-16",
    "endDate": "2026-04-15"
  },
  "summary": {
    "totalVisits": 42,
    "totalPatients": 28,
    "totalRevenue": 45000,
    "activeDoctors": 5
  },
  "visits": { /* ... */ },
  "departments": [ /* ... */ ],
  "doctors": [ /* ... */ ],
  "revenue": { /* ... */ },
  "patients": { /* ... */ }
}
```

---

## 📋 Sample Data Scenarios

### Scenario 1: Weekly Performance Analysis
- Select dates for a specific week
- Review daily visit trends
- Identify peak visit days
- Analyze doctor workload distribution

### Scenario 2: Department Comparison
- Use 90-day period
- Compare revenue by department
- Identify top-performing department
- Plan improvements for lower-performing ones

### Scenario 3: Doctor Performance Review
- Review individual doctor metrics
- Check visit count and patient load
- Verify revenue contribution
- Compare with department averages

### Scenario 4: Revenue Analysis
- Monthly revenue tracking
- Department-wise revenue breakdown
- Daily revenue trends
- Identify seasonal patterns

---

## 🔒 Security Considerations

### Current Implementation
- All endpoints are public (development mode)
- No authentication required (add for production)

### Recommended for Production
- Add role-based access control (admin only)
- Implement API authentication
- Add data sanitization
- Encrypt sensitive financial data
- Audit logging for analytics access

---

## 🔄 Future Enhancements

1. **Export Features**
   - CSV export for tables
   - PDF report generation
   - Excel-compatible exports

2. **Advanced Visualizations**
   - Interactive charts using Chart.js or Recharts
   - Pie charts for revenue distribution
   - Line graphs for trends
   - Heat maps for department performance

3. **Predictive Analytics**
   - Forecast future visits
   - Revenue projections
   - Staffing recommendations

4. **Comparison Metrics**
   - Compare current period with previous period
   - Year-over-year analysis
   - Target vs actual performance

5. **Custom Reports**
   - User-defined report parameters
   - Scheduled report generation
   - Email report delivery

6. **Real-time Dashboard**
   - Live metrics updates
   - WebSocket integration for real-time data
   - Alert system for anomalies

7. **Admin Settings**
   - Customize metrics and KPIs
   - Set performance targets
   - Configure alert thresholds

---

## 🧪 Testing the Module

### Manual Testing Steps

1. **Start Backend Server**
   ```bash
   cd backend
   node server.js
   ```

2. **Start Frontend Server**
   ```bash
   cd frontend
   node_modules\.bin\vite.cmd
   ```

3. **Open Browser**
   - Navigate to `http://localhost:3000`
   - Click "📊 Analytics Dashboard" tab

4. **Test Date Filtering**
   - Modify start and end dates
   - Click "🔍 Search"
   - Verify data updates correctly

5. **Test View Tabs**
   - Switch between different analytics views
   - Verify each view loads data properly
   - Check that metrics are calculated correctly

6. **Test API Endpoints**
   ```bash
   # Test comprehensive analytics
   curl "http://localhost:1355/api/analytics/comprehensive?startDate=2026-03-16&endDate=2026-04-15"
   
   # Test specific endpoints
   curl "http://localhost:1355/api/analytics/departments"
   curl "http://localhost:1355/api/analytics/revenue"
   ```

---

## 📞 Support & Contact

**Developer:** MD Shafiur Rahman Alvi  
**Student ID:** 23201355  
**Project:** MediAI SmartCare Hospital Management System

For questions or issues, refer to the main project documentation.

---

## 📄 Implementation Checklist

- ✅ Backend analytics controller created
- ✅ Analytics API routes implemented
- ✅ Server.js updated with analytics routes
- ✅ Frontend AnalyticsReports component created
- ✅ App.jsx updated with analytics tab
- ✅ Date range filtering implemented
- ✅ All six analytics views (Overview, Departments, Doctors, Revenue, Patients, Diagnostics)
- ✅ Summary cards display
- ✅ Error handling and validation
- ✅ Responsive design with Tailwind CSS
- ✅ Color-coded metrics and visualizations
- ✅ Performance optimized queries
- ✅ Database indexes for analytics queries

---

**Last Updated:** April 15, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
