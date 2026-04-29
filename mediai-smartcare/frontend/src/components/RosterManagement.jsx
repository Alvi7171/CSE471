import { useEffect, useState } from "react";
import { api } from "../services/api";

const RosterManagement = () => {
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "nurse",
    department: "General Medicine",
    phone: "",
    email: "",
  });
  const [shiftForm, setShiftForm] = useState({
    staffId: "",
    date: "",
    startTime: "",
    endTime: "",
    shiftType: "morning",
  });

  useEffect(() => {
    loadRosterData();
  }, []);

  const loadRosterData = async () => {
    try {
      setLoading(true);
      const [staffRes, shiftsRes, attendanceRes] = await Promise.all([
        api.get("/roster/staff"),
        api.get("/roster/shifts"),
        api.get("/roster/attendance"),
      ]);

      setStaff(staffRes.data.staff || []);
      setShifts(shiftsRes.data.shifts || []);
      setAttendance(attendanceRes.data.attendance || []);
    } catch (error) {
      console.error("Error loading roster data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createStaffMember = async () => {
    try {
      setLoading(true);
      await api.post("/roster/staff", staffForm);
      setStaffForm({ name: "", role: "nurse", department: "General Medicine", phone: "", email: "" });
      await loadRosterData();
      alert("Staff member created successfully!");
    } catch (error) {
      console.error("Error creating staff member:", error);
      alert("Failed to create staff member");
    } finally {
      setLoading(false);
    }
  };

  const createShift = async () => {
    try {
      setLoading(true);
      await api.post("/roster/shift", shiftForm);
      setShiftForm({ staffId: "", date: "", startTime: "", endTime: "", shiftType: "morning" });
      await loadRosterData();
      alert("Shift created successfully!");
    } catch (error) {
      console.error("Error creating shift:", error);
      alert("Failed to create shift");
    } finally {
      setLoading(false);
    }
  };

  const checkInStaff = async (shiftId) => {
    try {
      setLoading(true);
      await api.post("/roster/checkin", { shiftId });
      await loadRosterData();
      alert("Check-in recorded successfully!");
    } catch (error) {
      console.error("Error checking in staff:", error);
      alert("Failed to check in staff");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffInputChange = (e) => {
    const { name, value } = e.target;
    setStaffForm(prev => ({ ...prev, [name]: value }));
  };

  const handleShiftInputChange = (e) => {
    const { name, value } = e.target;
    setShiftForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-6 shadow-sm">
        <h3 className="text-2xl font-semibold text-theme-primary mb-4">Staff Roster Management</h3>

        {/* Staff Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Total Staff</div>
            <div className="text-2xl font-bold text-theme-primary">{staff.length}</div>
          </div>
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Active Shifts Today</div>
            <div className="text-2xl font-bold text-theme-primary">
              {shifts.filter(s => s.date === new Date().toISOString().split('T')[0]).length}
            </div>
          </div>
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Present Today</div>
            <div className="text-2xl font-bold text-theme-primary">
              {attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'present').length}
            </div>
          </div>
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Absent Today</div>
            <div className="text-2xl font-bold text-theme-primary">
              {attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'absent').length}
            </div>
          </div>
        </div>

        {/* Add Staff Form */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h4 className="text-lg font-semibold mb-3">Add New Staff Member</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              placeholder="Staff Name"
              value={staffForm.name}
              onChange={handleStaffInputChange}
              className="input-field"
            />
            <select
              name="role"
              value={staffForm.role}
              onChange={handleStaffInputChange}
              className="input-field"
            >
              <option value="nurse">Nurse</option>
              <option value="technician">Technician</option>
              <option value="administrator">Administrator</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="receptionist">Receptionist</option>
            </select>
            <select
              name="department"
              value={staffForm.department}
              onChange={handleStaffInputChange}
              className="input-field"
            >
              <option value="General Medicine">General Medicine</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Emergency">Emergency</option>
            </select>
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={staffForm.phone}
              onChange={handleStaffInputChange}
              className="input-field"
            />
            <input
              type="email"
              name="email"
              placeholder="Email (optional)"
              value={staffForm.email}
              onChange={handleStaffInputChange}
              className="input-field"
            />
          </div>
          <button
            onClick={createStaffMember}
            disabled={loading || !staffForm.name || !staffForm.phone}
            className="mt-4 px-6 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-deep disabled:opacity-50"
          >
            {loading ? "Creating..." : "Add Staff Member"}
          </button>
        </div>

        {/* Create Shift Form */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h4 className="text-lg font-semibold mb-3">Schedule New Shift</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="staffId"
              value={shiftForm.staffId}
              onChange={handleShiftInputChange}
              className="input-field"
            >
              <option value="">Select Staff Member</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.role}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="date"
              value={shiftForm.date}
              onChange={handleShiftInputChange}
              className="input-field"
            />
            <input
              type="time"
              name="startTime"
              value={shiftForm.startTime}
              onChange={handleShiftInputChange}
              className="input-field"
            />
            <input
              type="time"
              name="endTime"
              value={shiftForm.endTime}
              onChange={handleShiftInputChange}
              className="input-field"
            />
            <select
              name="shiftType"
              value={shiftForm.shiftType}
              onChange={handleShiftInputChange}
              className="input-field"
            >
              <option value="morning">Morning (8AM-4PM)</option>
              <option value="afternoon">Afternoon (4PM-12AM)</option>
              <option value="night">Night (12AM-8AM)</option>
            </select>
          </div>
          <button
            onClick={createShift}
            disabled={loading || !shiftForm.staffId || !shiftForm.date || !shiftForm.startTime || !shiftForm.endTime}
            className="mt-4 px-6 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-deep disabled:opacity-50"
          >
            {loading ? "Scheduling..." : "Schedule Shift"}
          </button>
        </div>

        {/* Staff List */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">Staff Members</h4>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Department</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-t">
                    <td className="px-4 py-2">{member.name}</td>
                    <td className="px-4 py-2">{member.role}</td>
                    <td className="px-4 py-2">{member.department}</td>
                    <td className="px-4 py-2">{member.phone}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shifts Table */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">Today's Shifts</h4>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Staff Name</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.filter(s => s.date === new Date().toISOString().split('T')[0]).map((shift) => (
                  <tr key={shift.id} className="border-t">
                    <td className="px-4 py-2">{shift.staffName}</td>
                    <td className="px-4 py-2">{shift.date}</td>
                    <td className="px-4 py-2">{shift.startTime} - {shift.endTime}</td>
                    <td className="px-4 py-2">{shift.shiftType}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        shift.status === 'checked_in' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {shift.status === 'checked_in' ? 'Checked In' : 'Scheduled'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {shift.status !== 'checked_in' && (
                        <button
                          onClick={() => checkInStaff(shift.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Check In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Table */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Recent Attendance</h4>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Staff Name</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Check-in Time</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="px-4 py-2">{record.staffName}</td>
                    <td className="px-4 py-2">{record.date}</td>
                    <td className="px-4 py-2">{record.checkInTime || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RosterManagement;
