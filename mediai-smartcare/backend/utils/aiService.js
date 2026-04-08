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
 * Alternative: Hugging Face Inference API (if you prefer)
 * Uncomment and use this function instead if using Hugging Face
 */
/*
async function analyzeSymptoms_HuggingFace(symptoms, age, gender) {
  const HF_API_URL = 'https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf';
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

  try {
    const response = await axios.post(
      HF_API_URL,
      {
        inputs: `Analyze these symptoms: ${symptoms}. Age: ${age}, Gender: ${gender}. Provide disease prediction, urgency level, and recommended specialist.`,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.3
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Hugging Face API Error:', error);
    throw error;
  }
}
*/

module.exports = {
  analyzeSymptoms,
};
