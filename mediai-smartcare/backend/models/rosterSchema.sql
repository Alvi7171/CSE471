-- =====================================================
-- BILLING & PAYMENT TRACKING MODULE
-- =====================================================

-- Invoices table: Consolidated bills for patients
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_user_id INTEGER NOT NULL,
  appointment_id INTEGER,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'issued', 'sent', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_user_id) REFERENCES users(user_id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)
);

-- Invoice line items: Individual charges on an invoice
CREATE TABLE IF NOT EXISTS invoice_items (
  line_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK(item_type IN ('consultation', 'diagnostic', 'lab_test', 'procedure', 'medication', 'other')),
  quantity INTEGER DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
);

-- Payments table: Payment transactions
CREATE TABLE IF NOT EXISTS payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  patient_user_id INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_time TEXT,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'insurance', 'mobile_payment')),
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  FOREIGN KEY (patient_user_id) REFERENCES users(user_id)
);

-- =====================================================
-- STAFF & DUTY ROSTER MANAGEMENT MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_members (
  staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('doctor', 'nurse', 'technician', 'administrator', 'receptionist', 'other')),
  designation TEXT,
  employment_status TEXT DEFAULT 'active' CHECK(employment_status IN ('active', 'inactive', 'on_leave', 'terminated')),
  hire_date TEXT,
  is_on_duty INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS shifts (
  shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  department TEXT NOT NULL,
  shift_date TEXT NOT NULL,
  shift_start_time TEXT NOT NULL,
  shift_end_time TEXT NOT NULL,
  shift_type TEXT DEFAULT 'regular' CHECK(shift_type IN ('morning', 'afternoon', 'night', 'overnight', 'emergency', 'regular')),
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  shift_id INTEGER,
  check_in_time TEXT,
  check_out_time TEXT,
  attendance_date TEXT NOT NULL,
  status TEXT DEFAULT 'present' CHECK(status IN ('present', 'absent', 'late', 'early_leave', 'on_leave', 'half_day')),
  hours_worked REAL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id),
  FOREIGN KEY (shift_id) REFERENCES shifts(shift_id)
);

CREATE TABLE IF NOT EXISTS staff_availability (
  availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL UNIQUE,
  availability_status TEXT DEFAULT 'on_duty' CHECK(availability_status IN ('on_duty', 'on_break', 'in_meeting', 'on_call', 'off_duty', 'on_leave')),
  current_location TEXT,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id),
  FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  sync_id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER,
  shift_id INTEGER,
  appointment_id INTEGER,
  calendar_event_id TEXT,
  sync_type TEXT NOT NULL CHECK(sync_type IN ('shift', 'appointment', 'unavailability')),
  status TEXT DEFAULT 'synced' CHECK(status IN ('pending', 'synced', 'failed', 'removed')),
  error_message TEXT,
  last_sync_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff_members(staff_id),
  FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_shifts_staff_date ON shifts(staff_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_department_date ON shifts(department, shift_date);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance_logs(staff_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_members_department ON staff_members(department);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_shift ON calendar_sync_logs(shift_id);
