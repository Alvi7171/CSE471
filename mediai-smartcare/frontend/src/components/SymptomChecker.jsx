import React, { useEffect, useMemo, useState } from "react";
import { symptomAPI } from "../services/api";

const buildProfileDefaults = (currentUser) => ({
  patientName: currentUser?.fullName || "",
  age:
    currentUser?.age === undefined || currentUser?.age === null
      ? ""
      : String(currentUser.age),
  gender: currentUser?.gender || "",
  symptoms: "",
});

const SymptomChecker = ({ currentUser }) => {
  const profileDefaults = useMemo(
    () => buildProfileDefaults(currentUser),
    [currentUser?.age, currentUser?.fullName, currentUser?.gender],
  );

  const [formData, setFormData] = useState(profileDefaults);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      patientName: profileDefaults.patientName,
      age: profileDefaults.age,
      gender: profileDefaults.gender,
    }));
  }, [profileDefaults]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await symptomAPI.checkSymptoms({
        patientName: formData.patientName || currentUser?.fullName || "Anonymous",
        age: formData.age ? parseInt(formData.age, 10) : currentUser?.age || null,
        gender: formData.gender || currentUser?.gender || null,
        symptoms: formData.symptoms,
        language: language,
      });
      setResult(response);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to analyze symptoms. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const historyOwner = currentUser?.fullName || formData.patientName || null;
      const response = await symptomAPI.getHistory(historyOwner);
      setHistory(response.data || []);
      setShowHistory(true);
    } catch (_err) {
      setError("Failed to load history");
    }
  };

  const getUrgencyBadgeClass = (level) => {
    switch (level) {
      case "Low":
        return "badge-low";
      case "Medium":
        return "badge-medium";
      case "High":
        return "badge-high";
      case "Emergency":
        return "badge-emergency";
      default:
        return "badge-medium";
    }
  };

  const resetForm = () => {
    setFormData({ ...profileDefaults, symptoms: "" });
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
            <h1 className="text-3xl font-bold text-primary mb-2">
              🤖 {language === 'bn' ? 'এআই লক্ষণ পরীক্ষক এবং ট্রায়াজ সিস্টেম' : 'AI Symptom Checker & Triage System'}
            </h1>
            <p className="text-gray-600">
              {language === 'bn' ? 'তাত্ক্ষণিক এআই-চালিত স্বাস্থ্য মূল্যায়ন এবং বিশেষজ্ঞের পরামর্শ পান' : 'Get instant AI-powered health assessment and specialist recommendations'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Your profile details are pre-filled to keep symptom records consistent.
            </p>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setLanguage(l => l === "en" ? "bn" : "en")}
              className="px-4 py-2 border rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 transition"
            >
              {language === "en" ? "Bangla" : "English"}
            </button>
            <button onClick={loadHistory} className="btn-secondary text-sm">
              {language === 'bn' ? 'ইতিহাস দেখুন' : 'View History'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Name
              </label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                placeholder="Enter name"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter age"
                min="1"
                max="120"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symptoms <span className="text-red-500">*</span>
            </label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleChange}
              placeholder="Describe your symptoms in detail"
              required
              rows="4"
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !formData.symptoms}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  {language === 'bn' ? 'লক্ষণ বিশ্লেষণ করা হচ্ছে...' : 'Analyzing Symptoms...'}
                </>
              ) : (
                language === 'bn' ? "🔍 লক্ষণ বিশ্লেষণ করুন" : "🔍 Analyze Symptoms"
              )}
            </button>
            {result && (
              <button type="button" onClick={resetForm} className="btn-secondary">
                New Check
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {result?.success && (
          <div className="mt-6 space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                📊 {language === 'bn' ? 'বিশ্লেষণের ফলাফল' : 'Analysis Results'}
                <span
                  className={`ml-auto ${getUrgencyBadgeClass(
                    result.analysis.urgencyLevel,
                  )}`}
                >
                  {result.analysis.urgencyLevel} {language === 'bn' ? 'অগ্রাধিকার' : 'Priority'}
                </span>
              </h2>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  🩺 {language === 'bn' ? 'সম্ভাব্য রোগসমূহ:' : 'Possible Conditions:'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.analysis.possibleDiseases.map((disease) => (
                    <span
                      key={disease}
                      className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200"
                    >
                      {disease}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  👨‍⚕️ {language === 'bn' ? 'প্রস্তাবিত বিশেষজ্ঞ:' : 'Recommended Specialist:'}
                </h3>
                <p className="bg-white px-4 py-2 rounded-lg border border-gray-200 inline-block">
                  {result.analysis.recommendedSpecialist}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  💡 {language === 'bn' ? 'চিকিৎসা পরামর্শ:' : 'Medical Advice:'}
                </h3>
                <p className="bg-white px-4 py-3 rounded-lg border border-gray-200">
                  {result.analysis.advice}
                </p>
              </div>

              {result.analysis.warning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    <strong>⚠️ {language === 'bn' ? 'সতর্কতা:' : 'Note:'}</strong> {result.analysis.warning}
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="mt-4 bg-white border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm p-4">
                <p className="text-xs text-gray-600">{language === 'bn' ? 'এটি একটি এআই-চালিত মূল্যায়ন এবং এটি পেশাদার চিকিৎসা পরামর্শের বিকল্প নয়।' : result.disclaimer}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Symptom Check History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  x
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-center text-gray-500">
                  No history available
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((check) => (
                    <div key={check.check_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{check.patient_name}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(check.check_date).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={getUrgencyBadgeClass(check.urgency_level)}
                        >
                          {check.urgency_level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Symptoms:</strong> {check.symptoms}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Specialist:</strong>{" "}
                        {check.recommended_specialist}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;
