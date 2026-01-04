
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

// Standard GoogleGenAI initialization using the direct process.env.API_KEY string
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGrievance = async (text: string, images: string[] = []) => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";
  
  // Prompt engineered to align with CPGRAMS (India) and GovernanceBERT principles
  const contents: any[] = [{ text: `
    Role: You are an expert Government Grievance Officer and AI Triage System aligned with CPGRAMS standards.
    
    Task: Analyze the citizen grievance below.
    
    1. Taxonomy & Routing: Classify the grievance into one of these Official CPGRAMS Categories:
       - Public Health & Family Welfare (Sanitation, Hospitals, Disease)
       - Road Transport & Highways (Potholes, Traffic, Road Safety)
       - Housing & Urban Affairs (Water Supply, Encroachment, Lighting)
       - Law & Order (Civil safety, Crime reporting)
       - Power & Energy (Electricity grid, Outages)
       - School Education & Literacy (Infrastructure, Staffing)
    
    2. Urgency Scoring (0-100):
       - Calculate a "Public Safety Risk Score".
       - 90-100: Immediate threat to life or major infrastructure failure (CRITICAL).
       - 70-89: High health risk or severe disruption (HIGH).
       - 40-69: Quality of life issue or inconvenience (MEDIUM).
       - 0-39: Information request or minor suggestion (LOW).

    3. Image Analysis (Safe & Assistive):
       - If images are provided, check if they appear VISUALLY CONSISTENT with the text complaint (e.g., if text says "pothole", is there a road/pothole?).
       - Check for quality issues (Blurry, Too Dark, Unclear).
       - IMPORTANT: Do NOT claim to verify authenticity or detect AI-generated images. Focus only on relevance and clarity.

    4. Language Detection:
       - Detect the language of the grievance text (e.g., English, Hindi, Tamil, Marathi).
    
    5. Output: JSON format.
    
    Grievance text: ${text}
  ` }];

  // Add multiple images if present
  if (images && images.length > 0) {
    images.forEach(imgData => {
        // Handle potentially different base64 formats, strictly assume jpeg for this demo or extract
        const base64Data = imgData.includes(',') ? imgData.split(',')[1] : imgData;
        contents.push({
            inlineData: {
                mimeType: "image/jpeg", 
                data: base64Data
            }
        });
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts: contents },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          priority: { type: Type.STRING },
          department: { type: Type.STRING },
          summary: { type: Type.STRING },
          urgencyReason: { type: Type.STRING },
          suggestedResolution: { type: Type.STRING },
          language: { type: Type.STRING, description: "The detected language (e.g., English, Hindi, Tamil)" },
          urgencyScore: { type: Type.INTEGER, description: "Calculated risk score from 0-100" },
          imageAnalysis: {
            type: Type.OBJECT,
            properties: {
                status: { type: Type.STRING, description: "Relevant, Unclear, Review Needed, or No Image" },
                quality: { type: Type.STRING, description: "Good, Blurry, Dark, Low Resolution, or N/A" },
                description: { type: Type.STRING, description: "Brief note on image content vs complaint context." }
            },
            // Make imageAnalysis optional in schema validation but encouraged
          }
        },
        required: ["category", "priority", "department", "summary", "urgencyReason", "suggestedResolution", "language", "urgencyScore"]
      },
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = 'audio/webm') => {
  const ai = getAI();
  // Using the native audio model for best speech recognition performance
  const model = "gemini-2.5-flash-native-audio-preview-09-2025";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio
          }
        },
        { text: "Transcribe this audio exactly as spoken. If there are multiple languages, transcribe them as they are." }
      ]
    }
  });

  return response.text;
};

export const getPolicyInfo = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find official government policy information (Acts, Schemes, Rules) related to: ${query}. Focus on Indian Government policies if applicable.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return {
    text: response.text,
    sources
  };
};

export const getNearbyFacilities = async (lat: number, lng: number, facilityType: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find nearest ${facilityType} at coordinates ${lat}, ${lng}`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      }
    }
  });
  return response.text;
};

export const speakText = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;

  return base64Audio;
};
