import React, { useEffect, useMemo, useState } from "react";
import { adminAPI } from "../services/api";

const MEDICINE_CATEGORIES = [
  "Analgesic",
  "Antibiotic",
  "Antipyretic",
  "Antiseptic",
  "Cardiac",
  "Diabetes",
  "Gastrointestinal",
  "Respiratory",
  "Neurology",
  "Dermatology",
  "Vaccines",
  "Pediatric",
  "Other",
];

const initialForm = {
  name: "",
  genericName: "",
  category: "",
  batchNumber: "",
  supplierName: "",
  unitPrice: "",
  stockQuantity: "",
  expiryDate: "",
};

function InventoryManagement() {
  const [medicines, setMedicines] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState({
    lowStock: [],
    expiringSoon: [],
    expired: [],
  });
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, alertsRes, medicinesRes] = await Promise.all([
        adminAPI.getInventorySummary(),
        adminAPI.getInventoryAlerts(30),
        adminAPI.listMedicines(search),
      ]);

      setSummary(summaryRes.summary || null);
      setAlerts(
        alertsRes.alerts || { lowStock: [], expiringSoon: [], expired: [] },
      );
      setMedicines(medicinesRes.medicines || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMedicines = useMemo(() => {
    if (!search.trim()) return medicines;
    const q = search.toLowerCase();
    return medicines.filter((item) =>
      [
        item.name,
        item.generic_name,
        item.category,
        item.batch_number,
        item.supplier_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [medicines, search]);

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMedicine = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await adminAPI.createMedicine({
        ...form,
        unitPrice: Number(form.unitPrice || 0),
        stockQuantity: Number(form.stockQuantity || 0),
      });

      setForm(initialForm);
      setSuccess("Medicine added successfully");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add medicine");
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjust = async (medicineId, adjustment) => {
    try {
      setError("");
      setSuccess("");
      await adminAPI.adjustMedicineStock(medicineId, adjustment);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update stock");
    }
  };

  const handleDelete = async (medicineId) => {
    try {
      setError("");
      setSuccess("");
      await adminAPI.deleteMedicine(medicineId);
      setSuccess("Medicine deleted");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete medicine");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-6 shadow-sm">
        <h3 className="text-2xl font-semibold text-theme-primary mb-2">
          Inventory and Medicine Management
        </h3>
        <p className="text-gray-600">
          Track medicine stock, monitor expiry dates, and respond quickly to
          low-stock alerts.
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Medicines</p>
            <p className="text-2xl font-bold text-theme-primary">
              {summary.totalMedicines}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Total Box Count</p>
            <p className="text-2xl font-bold text-theme-primary">
              {summary.totalStockUnits}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Low Stock</p>
            <p className="text-2xl font-bold text-amber-600">
              {summary.lowStockCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Expiring Soon</p>
            <p className="text-2xl font-bold text-orange-600">
              {summary.expiringSoonCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Expired</p>
            <p className="text-2xl font-bold text-red-600">
              {summary.expiredCount}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/85 rounded-2xl border p-5">
          <h4 className="font-semibold text-amber-700 mb-3">
            Low Stock Alerts
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(alerts.lowStock || []).length === 0 && (
              <p className="text-sm text-gray-500">No low stock medicines</p>
            )}
            {(alerts.lowStock || []).map((item) => (
              <div
                key={item.medicine_id}
                className="p-2 border rounded-lg bg-amber-50"
              >
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-600">
                  Stock: {item.stock_quantity} boxes
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/85 rounded-2xl border p-5">
          <h4 className="font-semibold text-orange-700 mb-3">
            Expiring Soon (30 days)
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(alerts.expiringSoon || []).length === 0 && (
              <p className="text-sm text-gray-500">No near-expiry medicines</p>
            )}
            {(alerts.expiringSoon || []).map((item) => (
              <div
                key={item.medicine_id}
                className="p-2 border rounded-lg bg-orange-50"
              >
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-600">
                  Expiry: {item.expiry_date || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/85 rounded-2xl border p-5">
          <h4 className="font-semibold text-red-700 mb-3">Expired Medicines</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(alerts.expired || []).length === 0 && (
              <p className="text-sm text-gray-500">No expired medicines</p>
            )}
            {(alerts.expired || []).map((item) => (
              <div
                key={item.medicine_id}
                className="p-2 border rounded-lg bg-red-50"
              >
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-600">
                  Expiry: {item.expiry_date || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/85 rounded-2xl border p-6">
        <h4 className="font-semibold text-theme-primary mb-4">
          Add New Medicine
        </h4>
        <form
          onSubmit={handleAddMedicine}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <input
            className="input-field"
            name="name"
            value={form.name}
            onChange={onFormChange}
            placeholder="Medicine name"
            required
          />
          <input
            className="input-field"
            name="genericName"
            value={form.genericName}
            onChange={onFormChange}
            placeholder="Generic name"
          />
          <select
            className="input-field"
            name="category"
            value={form.category}
            onChange={onFormChange}
            required
          >
            <option value="" disabled>
              Select category
            </option>
            {MEDICINE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            name="batchNumber"
            value={form.batchNumber}
            onChange={onFormChange}
            placeholder="Batch number"
          />
          <input
            className="input-field"
            name="supplierName"
            value={form.supplierName}
            onChange={onFormChange}
            placeholder="Supplier"
          />
          <input
            className="input-field"
            type="number"
            min="0"
            step="0.01"
            name="unitPrice"
            value={form.unitPrice}
            onChange={onFormChange}
            placeholder="Unit price"
          />
          <input
            className="input-field"
            type="number"
            min="0"
            name="stockQuantity"
            value={form.stockQuantity}
            onChange={onFormChange}
            placeholder="Initial box count"
            required
          />
          <input
            className="input-field"
            type="date"
            name="expiryDate"
            value={form.expiryDate}
            onChange={onFormChange}
          />
          <button
            className="px-4 py-2 rounded-lg bg-theme-primary text-white font-semibold hover:bg-theme-primary-deep disabled:opacity-60"
            disabled={loading}
          >
            Add Medicine
          </button>
        </form>
      </div>

      <div className="bg-white/85 rounded-2xl border p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="font-semibold text-theme-primary">
            Medicine Inventory
          </h4>
          <div className="flex gap-2">
            <input
              className="input-field"
              placeholder="Search medicine"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-lg border border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading inventory...</p>
        ) : filteredMedicines.length === 0 ? (
          <p className="text-gray-500">No medicines found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Medicine</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Stock (Boxes)</th>
                  <th className="py-2 pr-3">Expiry</th>
                  <th className="py-2 pr-3">Edit Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((item) => (
                  <tr key={item.medicine_id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.generic_name || "-"}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{item.category || "-"}</td>
                    <td className="py-2 pr-3">{item.stock_quantity}</td>
                    <td className="py-2 pr-3">{item.expiry_date || "-"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-2 py-1 rounded border border-green-600 text-green-700"
                          onClick={() => handleStockAdjust(item.medicine_id, 1)}
                        >
                          +1
                        </button>
                        <button
                          className="px-2 py-1 rounded border border-amber-600 text-amber-700"
                          onClick={() => handleStockAdjust(item.medicine_id, -1)}
                        >
                          -1
                        </button>
                        <button
                          className="px-2 py-1 rounded border border-red-600 text-red-700"
                          onClick={() => handleDelete(item.medicine_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryManagement;
