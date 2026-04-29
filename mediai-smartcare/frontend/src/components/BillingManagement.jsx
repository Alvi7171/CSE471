import { useEffect, useState } from "react";
import { api } from "../services/api";

const BillingManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    appointmentId: "",
    amount: "",
    paymentMethod: "cash",
    notes: "",
  });

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, paymentsRes, analyticsRes] = await Promise.all([
        api.get("/billing/invoices"),
        api.get("/billing/payments"),
        api.get("/billing/analytics"),
      ]);

      setInvoices(invoicesRes.data.invoices || []);
      setPayments(paymentsRes.data.payments || []);
      setAnalytics(analyticsRes.data.analytics || {});
    } catch (error) {
      console.error("Error loading billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (appointmentId) => {
    try {
      setLoading(true);
      await api.post("/billing/generate-invoice", { appointmentId });
      await loadBillingData();
      alert("Invoice generated successfully!");
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async () => {
    try {
      setLoading(true);
      await api.post("/billing/payment", formData);
      setFormData({ appointmentId: "", amount: "", paymentMethod: "cash", notes: "" });
      await loadBillingData();
      alert("Payment recorded successfully!");
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/85 backdrop-blur-md border border-white/70 rounded-2xl p-6 shadow-sm">
        <h3 className="text-2xl font-semibold text-theme-primary mb-4">Billing & Payments Management</h3>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-theme-primary">${analytics.totalRevenue || 0}</div>
          </div>
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Pending Payments</div>
            <div className="text-2xl font-bold text-theme-primary">${analytics.pendingAmount || 0}</div>
          </div>
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Paid Invoices</div>
            <div className="text-2xl font-bold text-theme-primary">{analytics.paidInvoices || 0}</div>
          </div>
          <div className="bg-theme-soft rounded-xl p-4">
            <div className="text-sm text-gray-600">Unpaid Invoices</div>
            <div className="text-2xl font-bold text-theme-primary">{analytics.unpaidInvoices || 0}</div>
          </div>
        </div>

        {/* Record Payment Form */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h4 className="text-lg font-semibold mb-3">Record New Payment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="appointmentId"
              placeholder="Appointment ID"
              value={formData.appointmentId}
              onChange={handleInputChange}
              className="input-field"
            />
            <input
              type="number"
              name="amount"
              placeholder="Amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="input-field"
            />
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="insurance">Insurance</option>
            </select>
            <input
              type="text"
              name="notes"
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>
          <button
            onClick={recordPayment}
            disabled={loading || !formData.appointmentId || !formData.amount}
            className="mt-4 px-6 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-deep disabled:opacity-50"
          >
            {loading ? "Recording..." : "Record Payment"}
          </button>
        </div>

        {/* Invoices Table */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">Recent Invoices</h4>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Invoice ID</th>
                  <th className="px-4 py-2 text-left">Patient</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t">
                    <td className="px-4 py-2">{invoice.id}</td>
                    <td className="px-4 py-2">{invoice.patientName}</td>
                    <td className="px-4 py-2">${invoice.amount}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      {invoice.status !== 'paid' && (
                        <button
                          onClick={() => generateInvoice(invoice.appointmentId)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Generate Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments Table */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Recent Payments</h4>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Payment ID</th>
                  <th className="px-4 py-2 text-left">Invoice ID</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Method</th>
                  <th className="px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="px-4 py-2">{payment.id}</td>
                    <td className="px-4 py-2">{payment.invoiceId}</td>
                    <td className="px-4 py-2">${payment.amount}</td>
                    <td className="px-4 py-2">{payment.paymentMethod}</td>
                    <td className="px-4 py-2">{new Date(payment.createdAt).toLocaleDateString()}</td>
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

export default BillingManagement;
