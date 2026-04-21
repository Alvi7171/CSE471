# Hospital Analytics API Reference
**Author:** MD Shafiur Rahman Alvi (ID: 23201355)  
**Base URL:** `http://localhost:1355/api/analytics`

---

## 📡 API Endpoints

### 1. GET /comprehensive - Comprehensive Analytics Dashboard
**Purpose:** Get all analytics data in a single API call  
**Best Used For:** Dashboard initialization, full overview

#### Request
```bash
curl "http://localhost:1355/api/analytics/comprehensive?startDate=2026-03-16&endDate=2026-04-15"
```

#### Query Parameters
| Parameter | Type | Required | Example | Description |
|-----------|------|----------|---------|-------------|
| startDate | Date | No | 2026-03-16 | Start of date range (YYYY-MM-DD) |
| endDate | Date | No | 2026-04-15 | End of date range (YYYY-MM-DD) |

#### Response
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
    "activeDoctors": 5,
    "activeDepartments": 4
  },
  "visits": {
    "totalVisits": 42,
    "trend": [
      { "visit_day": "2026-03-16", "visits": 3 },
      { "visit_day": "2026-03-17", "visits": 5 },
      // ... more days
    ]
  },
  "departments": [
    {
      "department": "Cardiology",
      "total_doctors": 2,
      "total_visits": 12,
      "avg_consultation_fee": 1200,
      "department_revenue": 14400,
      "available_doctors": 2
    }
    // ... more departments
  ],
  "doctors": [
    {
      "doctor_id": 1,
      "name": "Dr. Sarah Ahmed",
      "department": "Cardiology",
      "specialization": "Cardiologist",
      "total_visits": 8,
      "unique_patients": 6,
      "avg_fee": 1200,
      "doctor_revenue": 9600,
      "is_available": 1,
      "experience_years": 12
    }
    // ... more doctors
  ],
  "revenue": {
    "totalRevenue": 45000,
    "totalPaidVisits": 42,
    "byDepartment": [
      {
        "department": "Cardiology",
        "department_revenue": 14400,
        "visit_count": 12
      }
      // ... more departments
    ],
    "trend": [
      {
        "revenue_date": "2026-03-16",
        "daily_revenue": 3600,
        "visits": 3
      }
      // ... daily trend
    ]
  },
  "patients": {
    "totalPatients": 28,
    "newPatients": 4,
    "patientsWithVisits": 26,
    "avgVisitsPerPatient": 1.62,
    "genderDistribution": [
      { "gender": "Male", "count": 15 },
      { "gender": "Female", "count": 13 }
    ]
  }
}
```

---

### 2. GET /visits - Patient Visits Analytics
**Purpose:** Get visit statistics and daily trends  
**Best Used For:** Visit tracking and trend analysis

#### Request
```bash
curl "http://localhost:1355/api/analytics/visits?startDate=2026-03-16&endDate=2026-04-15"
```

#### Response
```json
{
  "success": true,
  "data": {
    "totalVisits": 42,
    "trend": [
      { "visit_day": "2026-03-16", "visits": 3 },
      { "visit_day": "2026-03-17", "visits": 5 },
      { "visit_day": "2026-03-18", "visits": 4 },
      { "visit_day": "2026-03-19", "visits": 6 },
      { "visit_day": "2026-03-20", "visits": 7 }
    ]
  }
}
```

---

### 3. GET /departments - Department Performance
**Purpose:** Get metrics for each hospital department  
**Best Used For:** Department comparison and performance analysis

#### Request
```bash
curl "http://localhost:1355/api/analytics/departments?startDate=2026-03-16&endDate=2026-04-15"
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "department": "Cardiology",
      "total_doctors": 2,
      "total_visits": 12,
      "avg_consultation_fee": 1200,
      "department_revenue": 14400,
      "available_doctors": 2
    },
    {
      "department": "Neurology",
      "total_doctors": 1,
      "total_visits": 8,
      "avg_consultation_fee": 1500,
      "department_revenue": 12000,
      "available_doctors": 1
    },
    {
      "department": "Pediatrics",
      "total_doctors": 1,
      "total_visits": 15,
      "avg_consultation_fee": 800,
      "department_revenue": 12000,
      "available_doctors": 1
    },
    {
      "department": "General Medicine",
      "total_doctors": 1,
      "total_visits": 7,
      "avg_consultation_fee": 500,
      "department_revenue": 3500,
      "available_doctors": 1
    }
  ]
}
```

---

### 4. GET /doctors-workload - Doctor Workload Metrics
**Purpose:** Get individual doctor performance and workload  
**Best Used For:** Doctor performance review and workload balancing

#### Request
```bash
curl "http://localhost:1355/api/analytics/doctors-workload?startDate=2026-03-16&endDate=2026-04-15"
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "doctor_id": 3,
      "name": "Dr. Nadia Islam",
      "department": "Pediatrics",
      "specialization": "Pediatrician",
      "total_visits": 15,
      "unique_patients": 12,
      "avg_fee": 800,
      "doctor_revenue": 12000,
      "is_available": 1,
      "experience_years": 8
    },
    {
      "doctor_id": 1,
      "name": "Dr. Sarah Ahmed",
      "department": "Cardiology",
      "specialization": "Cardiologist",
      "total_visits": 8,
      "unique_patients": 6,
      "avg_fee": 1200,
      "doctor_revenue": 9600,
      "is_available": 1,
      "experience_years": 12
    },
    // ... more doctors sorted by total_visits DESC
  ]
}
```

---

### 5. GET /revenue - Revenue Statistics
**Purpose:** Get comprehensive revenue analysis  
**Best Used For:** Financial planning and revenue monitoring

#### Request
```bash
curl "http://localhost:1355/api/analytics/revenue?startDate=2026-03-16&endDate=2026-04-15"
```

#### Response
```json
{
  "success": true,
  "data": {
    "totalRevenue": 45000,
    "totalPaidVisits": 42,
    "byDepartment": [
      {
        "department": "Cardiology",
        "department_revenue": 14400,
        "visit_count": 12
      },
      {
        "department": "Pediatrics",
        "department_revenue": 12000,
        "visit_count": 15
      },
      {
        "department": "Neurology",
        "department_revenue": 12000,
        "visit_count": 8
      },
      {
        "department": "General Medicine",
        "department_revenue": 3500,
        "visit_count": 7
      },
      {
        "department": "Dermatology",
        "department_revenue": 5100,
        "visit_count": 0
      }
    ],
    "trend": [
      {
        "revenue_date": "2026-03-16",
        "daily_revenue": 3600,
        "visits": 3
      },
      {
        "revenue_date": "2026-03-17",
        "daily_revenue": 6000,
        "visits": 5
      },
      {
        "revenue_date": "2026-03-18",
        "daily_revenue": 4800,
        "visits": 4
      },
      // ... daily trend
    ]
  }
}
```

---

### 6. GET /patients - Patient Statistics
**Purpose:** Get patient demographics and engagement metrics  
**Best Used For:** Patient base analysis

#### Request
```bash
curl "http://localhost:1355/api/analytics/patients?startDate=2026-03-16&endDate=2026-04-15"
```

#### Response
```json
{
  "success": true,
  "data": {
    "totalPatients": 28,
    "newPatients": 4,
    "patientsWithVisits": 26,
    "avgVisitsPerPatient": 1.62,
    "genderDistribution": [
      {
        "gender": "Male",
        "count": 15
      },
      {
        "gender": "Female",
        "count": 13
      }
    ]
  }
}
```

---

### 7. GET /top-doctors - Top Performing Doctors
**Purpose:** Identify high-performing doctors  
**Best Used For:** Recognition and performance benchmarking

#### Request
```bash
curl "http://localhost:1355/api/analytics/top-doctors?limit=5&startDate=2026-03-16&endDate=2026-04-15"
```

#### Query Parameters
| Parameter | Type | Required | Default | Example | Description |
|-----------|------|----------|---------|---------|-------------|
| limit | Number | No | 5 | 10 | Maximum number of doctors to return |
| startDate | Date | No | - | 2026-03-16 | Start of date range (YYYY-MM-DD) |
| endDate | Date | No | - | 2026-04-15 | End of date range (YYYY-MM-DD) |

#### Response
```json
{
  "success": true,
  "data": [
    {
      "doctor_id": 3,
      "name": "Dr. Nadia Islam",
      "specialization": "Pediatrician",
      "department": "Pediatrics",
      "total_visits": 15,
      "unique_patients": 12,
      "revenue": 12000
    },
    {
      "doctor_id": 1,
      "name": "Dr. Sarah Ahmed",
      "specialization": "Cardiologist",
      "department": "Cardiology",
      "total_visits": 8,
      "unique_patients": 6,
      "revenue": 9600
    },
    {
      "doctor_id": 2,
      "name": "Dr. Kamal Hassan",
      "specialization": "Neurologist",
      "department": "Neurology",
      "total_visits": 8,
      "unique_patients": 7,
      "revenue": 12000
    },
    // ... up to limit
  ]
}
```

---

### 8. GET /diagnostics - Diagnostic Report Analytics
**Purpose:** Get diagnostic report statistics and trends  
**Best Used For:** Diagnostic quality monitoring

#### Request
```bash
curl "http://localhost:1355/api/analytics/diagnostics?startDate=2026-03-16&endDate=2026-04-15"
```

#### Response
```json
{
  "success": true,
  "data": {
    "byType": [
      {
        "report_type": "Blood Test",
        "count": 12,
        "critical_count": 2
      },
      {
        "report_type": "ECG",
        "count": 8,
        "critical_count": 1
      },
      {
        "report_type": "X-Ray",
        "count": 5,
        "critical_count": 0
      },
      {
        "report_type": "Ultrasound",
        "count": 3,
        "critical_count": 0
      }
    ],
    "byUrgency": [
      {
        "urgency_level": "Normal",
        "count": 20
      },
      {
        "urgency_level": "Abnormal",
        "count": 6
      },
      {
        "urgency_level": "Critical",
        "count": 2
      }
    ],
    "totalReports": 28
  }
}
```

---

## 🔄 Error Response Format

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Failed to fetch analytics data"
}
```

### Common Error Scenarios

**Invalid Date Format:**
```json
{
  "success": false,
  "error": "Invalid date format. Use YYYY-MM-DD"
}
```

**Server Error:**
```json
{
  "success": false,
  "error": "Internal Server Error"
}
```

---

## 📝 Request/Response Examples

### Example 1: Monthly Revenue Analysis
```bash
# Request
curl "http://localhost:1355/api/analytics/revenue?startDate=2026-04-01&endDate=2026-04-30"

# Focus on the trend data to see daily revenue patterns
```

### Example 2: Compare Two Departments
```bash
# Request comprehensive data
curl "http://localhost:1355/api/analytics/comprehensive?startDate=2026-03-01&endDate=2026-03-31"

# Then filter departments array in your application
```

### Example 3: Get Top 10 Doctors
```bash
# Request
curl "http://localhost:1355/api/analytics/top-doctors?limit=10&startDate=2026-01-01&endDate=2026-12-31"

# Compare with year-to-date performance
```

### Example 4: Patient Engagement Report
```bash
# Request
curl "http://localhost:1355/api/analytics/patients?startDate=2026-03-01&endDate=2026-03-31"

# Calculate engagement: patientsWithVisits / totalPatients * 100
# March engagement = 26/28 * 100 = 92.86%
```

---

## 🎯 Integration Guide

### JavaScript/Fetch Example
```javascript
const fetchAnalytics = async (startDate, endDate) => {
  try {
    const response = await fetch(
      `http://localhost:1355/api/analytics/comprehensive?startDate=${startDate}&endDate=${endDate}`
    );
    const data = await response.json();
    
    if (data.success) {
      console.log('Total Visits:', data.summary.totalVisits);
      console.log('Total Revenue:', data.summary.totalRevenue);
      return data;
    } else {
      console.error('API Error:', data.error);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
};

// Usage
fetchAnalytics('2026-03-16', '2026-04-15');
```

### Python/Requests Example
```python
import requests
from datetime import datetime, timedelta

def fetch_analytics(start_date, end_date):
    base_url = "http://localhost:1355/api/analytics"
    params = {
        'startDate': start_date,
        'endDate': end_date
    }
    
    try:
        response = requests.get(
            f"{base_url}/comprehensive",
            params=params
        )
        data = response.json()
        
        if data.get('success'):
            print(f"Total Visits: {data['summary']['totalVisits']}")
            print(f"Total Revenue: ₹{data['summary']['totalRevenue']}")
            return data
        else:
            print(f"API Error: {data.get('error')}")
    except Exception as e:
        print(f"Request Error: {e}")

# Usage
today = datetime.now().strftime('%Y-%m-%d')
last_month = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
fetch_analytics(last_month, today)
```

### cURL Examples
```bash
# Get comprehensive analytics for last 30 days
curl "http://localhost:1355/api/analytics/comprehensive?startDate=2026-03-16&endDate=2026-04-15"

# Get revenue only
curl "http://localhost:1355/api/analytics/revenue"

# Get top 5 doctors
curl "http://localhost:1355/api/analytics/top-doctors?limit=5"

# Get department metrics
curl "http://localhost:1355/api/analytics/departments"

# Format JSON for readability (with jq)
curl "http://localhost:1355/api/analytics/comprehensive" | jq '.'
```

---

## ⚡ Performance Tips

1. **Use Comprehensive Endpoint for Dashboard**
   - Single API call returns all data
   - More efficient than multiple individual calls

2. **Cache Results When Possible**
   - Store API responses temporarily
   - Refresh on user action rather than on every render

3. **Filter by Date Range**
   - Always specify startDate and endDate
   - Reduces data processing on server

4. **Limit Large Datasets**
   - Use limit parameter for top-doctors
   - Pagination coming in future versions

### Example: Caching in React
```javascript
const [analyticsCache, setAnalyticsCache] = useState(null);
const [cacheDate, setCacheDate] = useState(null);

const fetchAnalytics = async (startDate, endDate) => {
  // Check cache (5 minutes)
  if (analyticsCache && Date.now() - cacheDate < 5 * 60 * 1000) {
    return analyticsCache;
  }
  
  // Fetch new data
  const response = await fetch(/*...*/);
  setAnalyticsCache(response);
  setCacheDate(Date.now());
  return response;
};
```

---

## 📊 Data Mapping

**How calculations are done:**

```javascript
// Doctor Revenue
Doctor Revenue = Doctor.consultation_fee × Count(MedicalVisit WHERE doctor_id = Doctor.id AND status = 'completed')

// Department Revenue
Department Revenue = SUM(Doctor.consultation_fee × Count(Doctor's completed visits))

// Patient Engagement Rate
Engagement = Count(Patients with visits) / Total Patients × 100

// Average Visits per Patient
Average = Total Visits / Unique Patients

// Doctor Workload
Workload = Total Visits / Available Time Slots (for scheduling optimization)
```

---

## 🔐 Security Considerations

**Current Status:** Open API (development)

**For Production:**
- Add authentication headers
- Implement rate limiting
- Validate all date parameters
- Encrypt sensitive financial data
- Add CORS restrictions
- Enable HTTPS

**Example with Auth Header:**
```javascript
const response = await fetch(
  'http://localhost:1355/api/analytics/comprehensive',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    params: {...}
  }
);
```

---

## 📞 Troubleshooting

**Q: API returns empty data**  
A: Check date range and ensure medical_visits exist with status='completed'

**Q: Connection refused error**  
A: Ensure backend server is running on port 1355

**Q: CORS error**  
A: Backend allows all origins in development mode (production: configure whitelist)

**Q: Very slow response**  
A: Use smaller date range or add database indexes

---

**API Version:** 1.0.0  
**Last Updated:** April 15, 2026  
**Status:** ✅ Production Ready
