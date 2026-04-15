const TRIAGE_KNOWLEDGE = [
  {
    id: "respiratory-infection",
    triggers: ["cough", "sore throat", "runny nose", "cold", "fever"],
    specialist: "General Physician",
    notes: [
      "Hydration, rest, and temperature monitoring are important.",
      "Escalate if fever persists beyond 3 days or breathing worsens.",
    ],
  },
  {
    id: "cardiac-redflags",
    triggers: [
      "chest pain",
      "chest pressure",
      "left arm pain",
      "shortness of breath",
    ],
    specialist: "Cardiologist",
    notes: [
      "Chest pain with breathlessness, sweating, or arm/jaw pain is a red flag.",
      "Potential emergency cardiac event requires immediate care.",
    ],
  },
  {
    id: "neuro-redflags",
    triggers: [
      "severe headache",
      "slurred speech",
      "weakness",
      "seizure",
      "fainting",
    ],
    specialist: "Neurologist",
    notes: [
      "Sudden neurological deficits can indicate stroke or seizure-related conditions.",
      "Immediate emergency evaluation is needed for acute neuro deficits.",
    ],
  },
  {
    id: "gastro",
    triggers: ["abdominal pain", "vomiting", "diarrhea", "nausea"],
    specialist: "General Physician",
    notes: [
      "Watch for dehydration signs and persistent vomiting.",
      "Escalate urgency for blood in stool/vomit or severe persistent pain.",
    ],
  },
  {
    id: "dermatology",
    triggers: ["rash", "itching", "skin redness", "hives"],
    specialist: "Dermatologist",
    notes: [
      "Assess allergy exposure and new medications.",
      "Emergency only if rash is associated with facial swelling or breathing difficulty.",
    ],
  },
  {
    id: "pediatric-fever",
    triggers: ["infant", "child", "baby", "high fever"],
    specialist: "Pediatrician",
    notes: [
      "High fever in very young children requires low threshold for urgent review.",
      "Poor feeding, lethargy, or dehydration signs increase urgency.",
    ],
  },
];

const BASE_GUARDRAILS = [
  "Never provide a definitive diagnosis; provide likely conditions only.",
  "Always include practical next-step advice and urgency recommendation.",
  "If red-flag symptoms appear, set urgency to Emergency.",
  "Recommend the most relevant specialist based on symptom cluster.",
];

module.exports = {
  TRIAGE_KNOWLEDGE,
  BASE_GUARDRAILS,
};
