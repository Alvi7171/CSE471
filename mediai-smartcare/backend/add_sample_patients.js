const { db } = require('./config/database');

// Sample patients data
const samplePatients = [
  {
    smart_patient_id: 'SPC-00002',
    first_name: 'Sarah',
    last_name: 'Johnson',
    date_of_birth: '1985-06-15',
    gender: 'Female',
    blood_type: 'A+',
    phone_number: '+8801712345679',
    email: 'sarah.j@email.com',
    address: '123 Main St',
    city: 'Dhaka',
    assigned_doctor: 'Dr. Sarah Ahmed'
  },
  {
    smart_patient_id: 'SPC-00003',
    first_name: 'Michael',
    last_name: 'Chen',
    date_of_birth: '1990-03-22',
    gender: 'Male',
    blood_type: 'O+',
    phone_number: '+8801712345680',
    email: 'michael.c@email.com',
    address: '456 Oak Ave',
    city: 'Dhaka',
    assigned_doctor: 'Dr. Michael Smith'
  },
  {
    smart_patient_id: 'SPC-00004',
    first_name: 'Fatima',
    last_name: 'Rahman',
    date_of_birth: '1992-11-08',
    gender: 'Female',
    blood_type: 'B+',
    phone_number: '+8801712345681',
    email: 'fatima.r@email.com',
    address: '789 Pine Rd',
    city: 'Chittagong',
    assigned_doctor: null
  },
  {
    smart_patient_id: 'SPC-00005',
    first_name: 'Rahul',
    last_name: 'Kumar',
    date_of_birth: '1988-07-30',
    gender: 'Male',
    blood_type: 'AB+',
    phone_number: '+8801712345682',
    email: 'rahul.k@email.com',
    address: '321 Elm St',
    city: 'Dhaka',
    assigned_doctor: 'Dr. John Davis'
  },
  {
    smart_patient_id: 'SPC-00006',
    first_name: 'Aisha',
    last_name: 'Patel',
    date_of_birth: '1995-02-14',
    gender: 'Female',
    blood_type: 'O-',
    phone_number: '+8801712345683',
    email: 'aisha.p@email.com',
    address: '654 Maple Dr',
    city: 'Sylhet',
    assigned_doctor: null
  }
];

// Insert sample patients
const stmt = db.prepare(`
  INSERT OR IGNORE INTO patients (
    smart_patient_id, first_name, last_name, date_of_birth, gender, blood_type,
    phone_number, email, address, city, registration_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

samplePatients.forEach(patient => {
  try {
    stmt.run(
      patient.smart_patient_id,
      patient.first_name,
      patient.last_name,
      patient.date_of_birth,
      patient.gender,
      patient.blood_type,
      patient.phone_number,
      patient.email,
      patient.address,
      patient.city
    );
    console.log('Inserted:', patient.first_name, patient.last_name);
  } catch (error) {
    console.log('Skipped (already exists):', patient.smart_patient_id);
  }
});

const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients').get();
console.log('Total patients in database:', totalPatients.count);
