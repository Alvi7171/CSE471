# Hospital Analytics Reports - Quick Reference
**Author:** MD Shafiur Rahman Alvi (ID: 23201355)

---

## 🎯 Quick Start

### Access Analytics Dashboard
1. Open http://localhost:3000
2. Click **"📊 Analytics Dashboard"** tab
3. View metrics for last 30 days by default
4. Customize date range and click **"🔍 Search"**

---

## 📡 API Endpoints Quick Guide

### Base URL
```
http://localhost:1355/api/analytics
```

### Quick Examples

#### Get All Analytics (Comprehensive)
```bash
curl "http://localhost:1355/api/analytics/comprehensive?startDate=2026-03-16&endDate=2026-04-15"
```
**Response:** Full dashboard data (visits, departments, doctors, revenue, patients)

#### Get Visit Statistics
```bash
curl "http://localhost:1355/api/analytics/visits?startDate=2026-03-16&endDate=2026-04-15"
```
**Returns:** Total visits + daily trend data

#### Get Revenue Data
```bash
curl "http://localhost:1355/api/analytics/revenue"
```
**Returns:** Total revenue, by department, daily trends

#### Get Top Doctors
```bash
curl "http://localhost:1355/api/analytics/top-doctors?limit=10&startDate=2026-03-16&endDate=2026-04-15"
```
**Returns:** Top performing doctors sorted by visits

#### Get Department Metrics
```bash
curl "http://localhost:1355/api/analytics/departments"
```
**Returns:** Performance metrics per department

#### Get Patient Statistics
```bash
curl "http://localhost:1355/api/analytics/patients?startDate=2026-03-16&endDate=2026-04-15"
```
**Returns:** Patient demographics and engagement metrics

#### Get Doctor Workload
```bash
curl "http://localhost:1355/api/analytics/doctors-workload"
```
**Returns:** Individual doctor workload metrics

#### Get Diagnostic Analytics
```bash
curl "http://localhost:1355/api/analytics/diagnostics"
```
**Returns:** Reports categorized by type and urgency

---

## 📊 Dashboard Views

| View | Tab | Key Metrics | Best For |
|------|-----|-------------|----------|
| **Overview** | 📈 | Top doctors, departments, visit trends | Quick hospital health check |
| **Departments** | 🏢 | Doctor count, visits, avg fee, revenue | Department comparison & planning |
| **Doctor Workload** | 👨‍⚕️ | Visits, patients, experience, revenue | Doctor performance review |
| **Revenue** | 💵 | Total, by department, daily trends | Financial analysis |
| **Patients** | 👥 | Demographics, engagement, retention | Patient analytics |
| **Diagnostics** | 🔬 | Report types, urgency levels | Diagnostic trend analysis |

---

## 🔢 Key Metrics Explained

### Summary Cards
- **👥 Total Visits:** Completed patient visits in selected period
- **🏥 Total Patients:** Unique patients in system (all-time)
- **💰 Total Revenue:** Total fee × visits in selected period
- **👨‍⚕️ Active Doctors:** Doctors with is_available = 1

### Department Metrics
- **Doctors:** Count of doctors in department
- **Visits:** Total completed visits in department
- **Avg Fee:** Average consultation fee per doctor
- **Revenue:** Total department revenue (fee × visits)

### Doctor Metrics
- **Visits:** Completed visits by doctor
- **Patients:** Unique patients seen by doctor
- **Experience:** Years of experience
- **Revenue:** Doctor's total revenue (fee × visits)

### Revenue Metrics
- **Daily Revenue:** Sum of consultation fees per day
- **Department Revenue:** Sum of fees by department
- **Total Revenue:** Sum of all consultation fees

### Diagnostic Metrics
- **Reports by Type:** Count of each report type
- **Critical Count:** Number of critical findings
- **Urgency Distribution:** Count by Normal/Abnormal/Critical

---

## 📅 Date Range Presets

**Frontend Controls:**
```
Start Date: [Select Date]
End Date:   [Select Date]
[🔍 Search] [↺ Reset (30 days)]
```

**Default:** Last 30 days  
**Validation:** Start date must be before end date  
**Format:** YYYY-MM-DD

---

## 💾 Database Context

### Queries Use These Tables
```sql
- medical_visits     -- Patient visit records
- doctors            -- Doctor master data  
- patients           -- Patient master data
- diagnostic_reports -- Test/scan results
- prescriptions      -- Medication records
- treatment_timeline -- Treatment history
```

### Key Filtering Criteria
```sql
WHERE status = 'completed'           -- Only completed visits
AND DATE(visit_date) >= startDate    -- Date range filtering
AND DATE(visit_date) <= endDate
```

---

## 🎨 Frontend Color Coding

| Color | Meaning | Examples |
|-------|---------|----------|
| 🔵 Blue | Primary data | Visits, doctor metrics |
| 💚 Green | Positive/Revenue | Revenue, available doctors |
| 🟣 Purple | Secondary data | Diagnostic data |
| 🔴 Red | Warnings/Critical | Critical urgency level |
| 🟠 Orange | Warnings | Abnormal findings |
| 🟡 Yellow | Neutral/Metrics | Trend data |

---

## ⚙️ Configuration

### Backend (server.js)
```javascript
app.use("/api/analytics", analyticsRoutes);
```

### Frontend (App.jsx)
```javascript
import AnalyticsReports from "./components/AnalyticsReports";
// Tab: {activeTab === "analytics" && <AnalyticsReports />}
```

### API Base URL
```javascript
// Automatically uses:
http://localhost:1355/api  // during development
// Can be overridden with VITE_API_URL environment variable
```

---

## 🔄 Common Workflows

### Workflow 1: Monitor Weekly Performance
1. Set date range to current week
2. Click Search
3. Review Overview tab for summary
4. Check Department tab for performance comparison
5. Look at Revenue tab for financial metrics

### Workflow 2: Analyze Doctor Performance
1. Select date range to review (90 days recommended)
2. Go to Doctor Workload tab
3. Sort by visits or revenue
4. Identify top and bottom performers
5. Compare with department averages

### Workflow 3: Financial Planning
1. Select 1-year date range
2. Go to Revenue tab
3. Review monthly trends
4. Compare departments
5. Identify seasonal patterns

### Workflow 4: Patient Management Review
1. Use all-time period (no filter)
2. Go to Patients tab
3. Check total patients and new patients this month
4. Review engagement rate
5. Analyze gender distribution

### Workflow 5: Diagnostic Monitoring
1. Select recent period (30 days)
2. Go to Diagnostics tab
3. Review report types
4. Check critical findings count
5. Identify urgent cases

---

## 🐛 Troubleshooting

### Empty Data
**Cause:** No medical visits in selected date range  
**Solution:** 
- Register test patients
- Create test medical visits/appointments
- Extend date range in filter

### API Returns Error
**Cause:** Server not running  
**Solution:**
```bash
cd backend
node server.js
```

### Frontend Not Loading
**Cause:** Frontend server not running  
**Solution:**
```bash
cd frontend
node_modules\.bin\vite.cmd
```

### Dates Not Filtering Correctly
**Cause:** Date format issue  
**Solution:** Ensure dates are YYYY-MM-DD format

### No Doctors/Departments Showing
**Cause:** No doctor records in database  
**Solution:** The sample doctors from schema.sql should be pre-loaded

---

## 📈 Performance Optimization

### Query Optimization
- ✅ Database indexes created on key fields
- ✅ Join operations optimized
- ✅ Date range filtering applied at query level
- ✅ Aggregations done in database, not frontend

### Frontend Optimization
- ✅ React hooks for efficient state management
- ✅ Pagination for large datasets (future)
- ✅ Lazy loading of view components (current)
- ✅ Efficient rendering with Tailwind CSS

### Network Optimization
- ✅ Single API call returns all data (comprehensive endpoint)
- ✅ Date range validation before API call
- ✅ No redundant requests for same data

---

## 🔒 Security Notes

⚠️ **Current Status:** Public endpoints (development mode)

**For Production, Add:**
- [ ] Role-based access control (admin only)
- [ ] JWT authentication
- [ ] Request validation & sanitization
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Data encryption for sensitive metrics

---

## 📱 Responsive Design

**Layouts:**
- ✅ Mobile: Single column, stackable cards
- ✅ Tablet: 2-column grid
- ✅ Desktop: Multi-column grid with full tables

**Experience:**
- ✅ All visualizations responsive
- ✅ Tables horizontal scroll on small screens
- ✅ Date picker works on all devices
- ✅ Touch-friendly button sizes

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `backend/controllers/analyticsController.js` | Core analytics logic |
| `backend/routes/analytics.js` | API endpoints |
| `frontend/src/components/AnalyticsReports.jsx` | Dashboard UI |
| `frontend/src/App.jsx` | Main app with tab navigation |
| `server.js` | Server configuration with routes |

---

## 🎓 Learning Resources

**Understanding the Dashboards:**
1. Start with Overview tab for big picture
2. Drill down into specific department/doctor
3. Review Revenue tab for financial insights
4. Check Diagnostics for clinical insights
5. Analyze Patients for engagement metrics

**API Integration:**
1. Use `/api/analytics/comprehensive` for full data
2. Use specific endpoints for targeted metrics
3. Always validate date parameters
4. Handle empty result sets gracefully

**Customization Ideas:**
1. Add email alerts for low revenue days
2. Create alert for doctors exceeding threshold
3. Add comparison with previous period
4. Generate PDF reports
5. Create custom KPI dashboards

---

## 📞 Quick Support

**Issue:** Module not showing  
**Solution:** Clear browser cache, restart servers

**Issue:** Data not updating  
**Solution:** Click Search button after changing dates

**Issue:** Calculations seem wrong  
**Solution:** Verify database has sample data from schema.sql

**Issue:** Need more metrics  
**Solution:** Check ANALYTICS_MODULE_DOCUMENTATION.md for API endpoints

---

**Version:** 1.0.0  
**Last Updated:** April 15, 2026  
**Status:** ✅ Ready for Use
