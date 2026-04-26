import React, { useEffect, useMemo, useState } from "react";
import { adminAPI } from "../services/api";

const initialPatientForm = {
  patientName: "",
  patientAge: "",
  patientGender: "male",
  disease: "",
  admissionStartAt: "",
  freedomAt: "",
  notes: "",
};

function BedAllocationDashboard() {
  const [beds, setBeds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    floor: "",
    building: "",
    gender: "",
    status: "",
  });
  const [form, setForm] = useState(initialPatientForm);
  const [selectedBed, setSelectedBed] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, bedsRes] = await Promise.all([
        adminAPI.getBedSummary(),
        adminAPI.listBeds(filters),
      ]);

      setSummary(summaryRes.summary || null);
      setBeds(bedsRes.beds || []);

      if (selectedBed) {
        const updated = (bedsRes.beds || []).find(
          (item) => item.bed_id === selectedBed.bed_id,
        );
        setSelectedBed(updated || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load bed dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => clearInterval(timer);
  }, [filters, selectedBed]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 3500);
    return () => clearTimeout(timer);
  }, [success]);

  const floorOptions = useMemo(
    () => [...new Set(beds.map((item) => item.floor_label).filter(Boolean))],
    [beds],
  );

  const buildingOptions = useMemo(
    () => [...new Set(beds.map((item) => item.building).filter(Boolean))],
    [beds],
  );

  const categoryOptions = useMemo(
    () => [...new Set(beds.map((item) => item.category).filter(Boolean))],
    [beds],
  );

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    const next = { ...filters, [name]: value };
    setFilters(next);
  };

  const applyFilters = async () => {
    await loadDashboard();
  };

  const onFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSuggest = async () => {
    try {
      setError("");
      setSuccess("");
      const response = await adminAPI.suggestBed(form);
      setSuggestion(response.suggestion || null);

      if (response.candidates && response.candidates.length > 0) {
        const candidateId = response.candidates[0].bed_id;
        const bed = beds.find((item) => item.bed_id === candidateId);
        setSelectedBed(bed || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to get AI suggestion");
    }
  };

  const handleAllocate = async () => {
    try {
      setError("");
      setSuccess("");

      const payload = {
        ...form,
        patientAge: Number(form.patientAge || 0),
        bedId: selectedBed?.status === "available" ? selectedBed.bed_id : undefined,
      };

      const response = await adminAPI.allocateBed(payload);
      setSuccess(response.message || "Bed allocated successfully");
      setSuggestion(null);
      setForm(initialPatientForm);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to allocate bed");
    }
  };

  const handleRelease = async (allocationId) => {
    try {
      setError("");
      setSuccess("");
      const response = await adminAPI.releaseBed(allocationId);
      setSuccess(response.message || "Bed released");
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to release bed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-6 shadow-sm">
        <h3 className="text-2xl font-semibold text-theme-primary mb-2">
          AI-Based Bed Allocation System
        </h3>
        <p className="text-gray-600">
          Red beds are booked, green beds are available. Expired admissions auto-release and become available.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
          {success}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Total Beds</p>
            <p className="text-2xl font-bold text-theme-primary">{summary.totalBeds}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Available</p>
            <p className="text-2xl font-bold text-green-600">{summary.availableBeds}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Occupied</p>
            <p className="text-2xl font-bold text-red-600">{summary.occupiedBeds}</p>
          </div>
        </div>
      )}

      <div className="bg-white/85 rounded-2xl border p-5">
        <h4 className="font-semibold text-theme-primary mb-3">Filters</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select className="input-field" name="category" value={filters.category} onChange={onFilterChange}>
            <option value="">All categories</option>
            {categoryOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="input-field" name="floor" value={filters.floor} onChange={onFilterChange}>
            <option value="">All floors</option>
            {floorOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="input-field" name="building" value={filters.building} onChange={onFilterChange}>
            <option value="">All buildings</option>
            {buildingOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="input-field" name="gender" value={filters.gender} onChange={onFilterChange}>
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <select className="input-field" name="status" value={filters.status} onChange={onFilterChange}>
            <option value="">All status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>
        <button
          className="mt-3 px-4 py-2 rounded-lg border border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white"
          onClick={applyFilters}
        >
          Apply Filters
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white/85 rounded-2xl border p-5">
          <h4 className="font-semibold text-theme-primary mb-3">Bed Map</h4>
          {loading ? (
            <p className="text-gray-500">Loading beds...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {beds.map((bed) => (
                <button
                  key={bed.bed_id}
                  type="button"
                  onClick={() => setSelectedBed(bed)}
                  className={`text-left rounded-xl border p-3 transition hover:shadow-sm ${
                    bed.status === "occupied"
                      ? "bg-red-50 border-red-300"
                      : "bg-green-50 border-green-300"
                  } ${selectedBed?.bed_id === bed.bed_id ? "ring-2 ring-theme-primary" : ""}`}
                >
                  <p className="font-semibold text-sm">{bed.bed_code}</p>
                  <p className="text-xs text-gray-600">{bed.floor_label}</p>
                  <p className="text-xs text-gray-600">{bed.categoryLabel}</p>
                  <p className={`text-xs mt-1 font-semibold ${bed.status === "occupied" ? "text-red-700" : "text-green-700"}`}>
                    {bed.status.toUpperCase()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white/85 rounded-2xl border p-5">
            <h4 className="font-semibold text-theme-primary mb-3">Patient Admission Input</h4>
            <div className="grid grid-cols-1 gap-3">
              <input className="input-field" name="patientName" value={form.patientName} onChange={onFormChange} placeholder="Patient name" />
              <input className="input-field" type="number" min="1" name="patientAge" value={form.patientAge} onChange={onFormChange} placeholder="Age" />
              <select className="input-field" name="patientGender" value={form.patientGender} onChange={onFormChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input className="input-field" name="disease" value={form.disease} onChange={onFormChange} placeholder="Disease/Diagnosis" />
              <input className="input-field" type="datetime-local" name="admissionStartAt" value={form.admissionStartAt} onChange={onFormChange} />
              <input className="input-field" type="datetime-local" name="freedomAt" value={form.freedomAt} onChange={onFormChange} />
              <textarea className="input-field" name="notes" value={form.notes} onChange={onFormChange} placeholder="Notes" rows={3} />
            </div>

            <div className="flex gap-2 mt-3">
              <button className="px-4 py-2 rounded-lg border border-theme-primary text-theme-primary" onClick={handleSuggest}>
                AI Suggest Bed
              </button>
              <button className="px-4 py-2 rounded-lg bg-theme-primary text-white" onClick={handleAllocate}>
                Allocate Bed
              </button>
            </div>

            {suggestion && (
              <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
                <p className="font-semibold">Suggestion: {suggestion.preferredCategoryLabel}</p>
                <p>{suggestion.reason}</p>
                <p>Inferred Severity: {suggestion.inferredSeverity}</p>
                <p>Preferred: {suggestion.preferredBuilding}{suggestion.preferredFloor ? `, ${suggestion.preferredFloor}` : ""}</p>
              </div>
            )}
          </div>

          <div className="bg-white/85 rounded-2xl border p-5">
            <h4 className="font-semibold text-theme-primary mb-3">Selected Bed Details</h4>
            {!selectedBed ? (
              <p className="text-gray-500 text-sm">Click any bed to see details.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="font-semibold">Bed:</span> {selectedBed.bed_code}</p>
                <p><span className="font-semibold">Building:</span> {selectedBed.building}</p>
                <p><span className="font-semibold">Floor:</span> {selectedBed.floor_label}</p>
                <p><span className="font-semibold">Category:</span> {selectedBed.categoryLabel}</p>
                <p><span className="font-semibold">Status:</span> {selectedBed.status}</p>

                {selectedBed.status === "occupied" && selectedBed.allocation && (
                  <>
                    <p><span className="font-semibold">Patient:</span> {selectedBed.allocation.patient_name}</p>
                    <p><span className="font-semibold">Age/Gender:</span> {selectedBed.allocation.patient_age} / {selectedBed.allocation.patient_gender}</p>
                    <p><span className="font-semibold">Disease:</span> {selectedBed.allocation.disease || "-"}</p>
                    <p><span className="font-semibold">Severity:</span> {selectedBed.allocation.severity}</p>
                    <p><span className="font-semibold">Booked At:</span> {selectedBed.allocation.booked_at}</p>
                    <p><span className="font-semibold">Admission Start:</span> {selectedBed.allocation.admit_start_at}</p>
                    <p><span className="font-semibold">Admission End:</span> {selectedBed.allocation.admit_end_at}</p>
                    <button
                      className="mt-2 px-3 py-2 rounded-lg border border-red-600 text-red-700"
                      onClick={() => handleRelease(selectedBed.allocation.allocation_id)}
                    >
                      Release Bed Now
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BedAllocationDashboard;
