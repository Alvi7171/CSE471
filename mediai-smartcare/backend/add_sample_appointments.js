const { db } = require('./config/database');

// Get all patients and doctors to create realistic appointments
const patients = db.prepare('SELECT * FROM patients').all();
const doctors = db.prepare('SELECT * FROM doctors').all();

if (patients.length === 0 || doctors.length === 0) {
  console.log('No patients or doctors found in database');
  process.exit(0);
}

// Sample appointments for some patients
const sampleAppointments = [
  {
    patient_smart_id: 'SPC-00002', // Sarah Johnson
    doctor_name: 'Dr. Sarah Ahmed',
    appointment_date: '2024-01-15',
    appointment_time: '10:00:00',
    status: 'completed'
  },
  {
    patient_smart_id: 'SPC-00003', // Michael Chen
    doctor_name: 'Dr. Michael Smith',
    appointment_date: '2024-01-20',
    appointment_time: '14:30:00',
    status: 'completed'
  },
  {
    patient_smart_id: 'SPC-00005', // Rahul Kumar
    doctor_name: 'Dr. John Davis',
    appointment_date: '2024-02-05',
    appointment_time: '11:00:00',
    status: 'completed'
  }
];

// Insert sample appointments
const appointmentStmt = db.prepare(`
  INSERT OR IGNORE INTO appointments (
    doctor_id, patient_name, patient_age, patient_gender, patient_phone, 
    patient_email, appointment_date, appointment_time, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

sampleAppointments.forEach(apt => {
  const patient = patients.find(p => p.smart_patient_id === apt.patient_smart_id);
  const doctor = doctors.find(d => d.name === apt.doctor_name);
  
  if (patient && doctor) {
    try {
      appointmentStmt.run(
        doctor.doctor_id,
        `${patient.first_name} ${patient.last_name}`,
        new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear(),
        patient.gender,
        patient.phone_number,
        patient.email,
        apt.appointment_date,
        apt.appointment_time,
        apt.status
      );
      console.log('Added appointment for:', patient.first_name, 'with', apt.doctor_name);
    } catch (error) {
      console.log('Appointment already exists or failed:', error.message);
    }
  }
});

console.log('Sample appointments added successfully');
