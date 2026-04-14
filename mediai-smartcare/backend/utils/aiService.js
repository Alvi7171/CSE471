const axios = require("axios");
require("dotenv").config();

/**
 * AI Service for Symptom Analysis using Groq API (FREE)
 * Groq provides fast inference with Llama models
 * Get API Key: https://console.groq.com/keys
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-70b-versatile"; // Fast and accurate

/**
 * Analyze symptoms using AI and provide medical recommendations
 * @param {string} symptoms - Patient symptoms
 * @param {number} age - Patient age
 * @param {string} gender - Patient gender
 * @returns {Promise<Object>} Analysis result with disease prediction, urgency, and specialist recommendation
 */
async function analyzeSymptoms(symptoms, age = null, gender = null) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("GROQ_API_KEY not configured in .env file");
    }

    // Construct prompt for AI
    const prompt = `You are a medical triage AI assistant. Analyze the following patient information and symptoms, then provide a structured medical assessment.

Patient Information:
- Age: ${age || "Not provided"}
- Gender: ${gender || "Not provided"}
- Symptoms: ${symptoms}

Please provide your analysis in the following JSON format (respond ONLY with valid JSON, no additional text):
{
  "possibleDiseases": ["disease1", "disease2", "disease3"],
  "urgencyLevel": "Low|Medium|High|Emergency",
  "recommendedSpecialist": "specialist name",
  "advice": "brief medical advice and next steps",
  "warning": "any red flags or immediate concerns"
}

Consider:
1. Symptom severity and combinations
2. Age and gender factors
3. Potential serious conditions
4. Appropriate medical specialist
5. Urgency level based on symptoms

Urgency Levels:
- Low: Minor issues, can wait for regular appointment
- Medium: Should see doctor within 1-2 days
- High: Should see doctor same day
- Emergency: Immediate medical attention required`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an expert medical triage assistant. Provide accurate, helpful medical assessments while emphasizing the importance of professional medical consultation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent medical advice
        max_tokens: 1000,
        top_p: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Parse AI response
    const aiResponse = response.data.choices[0].message.content;

    // Try to extract JSON from response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback response if parsing fails
      analysis = {
        possibleDiseases: ["Unable to analyze - please consult a doctor"],
        urgencyLevel: "Medium",
        recommendedSpecialist: "General Physician",
        advice: aiResponse,
        warning:
          "AI analysis unavailable. Please consult a healthcare professional.",
      };
    }

    return {
      success: true,
      analysis: analysis,
      rawResponse: aiResponse,
    };
  } catch (error) {
    console.error("AI Service Error:", error.response?.data || error.message);

    // Return fallback response on error
    return {
      success: false,
      error: error.message,
      analysis: {
        possibleDiseases: ["Unable to analyze at this time"],
        urgencyLevel: "Medium",
        recommendedSpecialist: "General Physician",
        advice:
          "We recommend consulting with a healthcare professional for proper diagnosis.",
        warning:
          "AI service temporarily unavailable. Please seek professional medical advice.",
      },
    };
  }
}

/**
 * Generate a comprehensive summary of a patient's medical history timeline
 * @param {Object} patientInfo - Basic patient details (name, age, gender)
 * @param {Array} timelineData - Array of chronologically sorted medical events
 * @returns {Promise<Object>} Summarized JSON response
 */
async function generatePatientSummary(patientInfo, timelineData) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("GROQ_API_KEY not configured in .env file");
    }

    if (!timelineData || timelineData.length === 0) {
      return {
        success: true,
        summary: {
          overview: "No robust medical history found for this patient.",
          chronicConditions: [],
          recentMedications: [],
          alerts: ["Insufficient data to generate meaningful alerts."]
        }
      };
    }

    // Convert timeline data to a readable string for the AI
    const stringifiedTimeline = timelineData.map(item => {
      if (item.type === 'appointment') {
        return `Date: ${item.date}, Type: Doctor Appointment, Reason: ${item.reason || 'N/A'}, Doctor Notes/Prescription: ${item.notes || 'None'}, Status: ${item.status}`;
      } else {
        return `Date: ${item.date}, Type: AI Symptom Check, Logged Symptoms: ${item.symptoms}, AI Prediction: ${item.predictedDiseases || 'None'}, Urgency: ${item.urgency}`;
      }
    }).join("\\n--- ");

    const prompt = `You are an expert Chief Medical Officer. Review the following patient's entire medical timeline and provide a clinical executive summary.

Patient Information:
- Name: ${patientInfo.name || "Unknown"}
- Age: ${patientInfo.age || "Not provided"}
- Gender: ${patientInfo.gender || "Not provided"}

Medical History Timeline (Chronological):
--- ${stringifiedTimeline}

Please provide your analysis strictly in the following JSON format (respond ONLY with valid JSON, no markdown, no conversational text):
{
  "overview": "A concise 2-sentence clinical summary of the patient's overall health and primary reasons for visits.",
  "chronicConditions": ["Condition 1", "Condition 2"], 
  "recentMedications": ["Medication 1 (dosage if available)", "Medication 2"],
  "alerts": ["Clinical alert 1 (e.g. consistently high BP)", "Follow up recommendation"]
}

Important:
- Base your analysis ONLY on the provided timeline data.
- "chronicConditions" should include ailments mentioned multiple times or known chronic issues. If none, return an empty array.
- "recentMedications" should extract explicitly mentioned drugs from the Doctor Notes. If none, return an empty array.
- "alerts" should be actionable insights for the doctor seeing them today.`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a clinical AI agent that summarizes medical logs into strict JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2, // Very low temp for analytical accuracy
        max_tokens: 1500,
        top_p: 0.9
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;

    let summaryJSON;
    try {
      const jsonMatch = aiResponse.match(/\\{[\s\S]*\\}/);
      if (jsonMatch) {
        summaryJSON = JSON.parse(jsonMatch[0]);
      } else {
        summaryJSON = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error("Error parsing AI Summary response:", parseError, "\\nRaw:", aiResponse);
      summaryJSON = {
        overview: "Error parsing AI response. Please read timeline manually.",
        chronicConditions: [],
        recentMedications: [],
        alerts: ["Summary generation failed."]
      };
    }

    return {
      success: true,
      summary: summaryJSON
    };

  } catch (error) {
    console.error("AI Summary Service Error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
      summary: {
        overview: "AI service temporarily unavailable.",
        chronicConditions: [],
        recentMedications: [],
        alerts: ["Could not generate summary due to API error."]
      }
    };
  }
}

module.exports = {
  analyzeSymptoms,
  generatePatientSummary
};
