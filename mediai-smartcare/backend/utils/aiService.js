const axios = require("axios");
require("dotenv").config();

const { TRIAGE_KNOWLEDGE, BASE_GUARDRAILS } = require("../knowledge/triageKnowledge");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_CANDIDATES = (
  process.env.GROQ_MODELS || "llama-3.3-70b-versatile,llama-3.1-8b-instant"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const normalizeText = (value) => String(value || "").toLowerCase();

const buildKnowledgeContext = (symptoms, age, gender) => {
  const text = normalizeText(symptoms);

  const matched = TRIAGE_KNOWLEDGE.filter((entry) =>
    entry.triggers.some((trigger) => text.includes(trigger.toLowerCase())),
  );

  const selected = matched.length > 0 ? matched.slice(0, 4) : TRIAGE_KNOWLEDGE.slice(0, 2);

  return {
    patientProfile: {
      age: age || "Not provided",
      gender: gender || "Not provided",
    },
    guardrails: BASE_GUARDRAILS,
    matchedKnowledge: selected,
  };
};

const applyDeterministicOverrides = (symptoms, analysis) => {
  const text = normalizeText(symptoms);
  const next = {
    ...analysis,
    possibleDiseases: Array.isArray(analysis.possibleDiseases)
      ? analysis.possibleDiseases
      : ["General symptom pattern"],
  };

  const hasAny = (arr) => arr.some((item) => text.includes(item));

  const emergencyCardiac =
    hasAny(["chest pain", "chest pressure"]) &&
    hasAny(["shortness of breath", "sweating", "left arm", "jaw pain"]);

  const emergencyNeuro = hasAny([
    "slurred speech",
    "one-sided weakness",
    "seizure",
    "loss of consciousness",
  ]);

  const breathingRedFlag = hasAny(["cannot breathe", "breathing difficulty", "blue lips"]);

  if (emergencyCardiac || emergencyNeuro || breathingRedFlag) {
    next.urgencyLevel = "Emergency";
    if (!next.warning) {
      next.warning = "Red-flag symptoms detected. Seek emergency medical care immediately.";
    }
  }

  if (!next.recommendedSpecialist || next.recommendedSpecialist === "specialist name") {
    if (hasAny(["chest pain", "palpitations"])) {
      next.recommendedSpecialist = "Cardiologist";
    } else if (hasAny(["headache", "seizure", "weakness"])) {
      next.recommendedSpecialist = "Neurologist";
    } else if (hasAny(["rash", "itching"])) {
      next.recommendedSpecialist = "Dermatologist";
    } else {
      next.recommendedSpecialist = "General Physician";
    }
  }

  if (!next.advice) {
    next.advice =
      "Please consult a licensed healthcare professional for examination and confirmation.";
  }

  const allowedUrgency = ["Low", "Medium", "High", "Emergency"];
  if (!allowedUrgency.includes(next.urgencyLevel)) {
    next.urgencyLevel = "Medium";
  }

  return next;
};

const requestGroqWithFallback = async (apiKey, messages) => {
  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await axios.post(
        GROQ_API_URL,
        {
          model,
          messages,
          temperature: 0.2,
          max_tokens: 900,
          top_p: 0.9,
          response_format: { type: "json_object" },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 25000,
        },
      );

      return {
        model,
        data: response.data,
      };
    } catch (error) {
      lastError = error;
      const isModelIssue =
        String(error.response?.data?.error?.code || "").includes("model") ||
        String(error.response?.data?.error?.message || "").toLowerCase().includes("model");

      if (!isModelIssue) {
        break;
      }
    }
  }

  throw lastError;
};

async function analyzeSymptoms(symptoms, age = null, gender = null) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("GROQ_API_KEY is missing in .env");
    }

    const knowledgeContext = buildKnowledgeContext(symptoms, age, gender);

    const systemPrompt = `You are a medical triage assistant.
Follow these rules:
- Output must be strict JSON object.
- Do not provide definitive diagnosis.
- Use urgency values only: Low, Medium, High, Emergency.
- Recommend one specialist.
- If red flags exist, urgency must be Emergency.`;

    const userPrompt = {
      task: "Analyze patient symptoms with injected knowledge context",
      patient: {
        age: age || null,
        gender: gender || null,
        symptoms,
      },
      injectedKnowledge: knowledgeContext,
      outputSchema: {
        possibleDiseases: ["disease1", "disease2", "disease3"],
        urgencyLevel: "Low|Medium|High|Emergency",
        recommendedSpecialist: "specialist name",
        advice: "brief medical advice and next steps",
        warning: "red flags or immediate concerns",
      },
    };

    const groqResult = await requestGroqWithFallback(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(userPrompt) },
    ]);

    const aiResponse = groqResult.data.choices[0].message.content;

    let analysis;
    try {
      const parsed = JSON.parse(aiResponse);
      analysis = applyDeterministicOverrides(symptoms, parsed);
    } catch (parseError) {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = applyDeterministicOverrides(symptoms, JSON.parse(jsonMatch[0]));
      } else {
        throw parseError;
      }
    }

    return {
      success: true,
      model: groqResult.model,
      analysis,
      rawResponse: aiResponse,
      injectedKnowledge: knowledgeContext,
    };
  } catch (error) {
    console.error("AI Service Error:", error.response?.data || error.message);

    return {
      success: false,
      error: error.message,
      analysis: applyDeterministicOverrides(symptoms, {
        possibleDiseases: ["Unable to analyze at this time"],
        urgencyLevel: "Medium",
        recommendedSpecialist: "General Physician",
        advice:
          "We recommend consulting with a healthcare professional for proper diagnosis.",
        warning:
          "AI service temporarily unavailable. Please seek professional medical advice.",
      }),
    };
  }
}

module.exports = {
  analyzeSymptoms,
};
