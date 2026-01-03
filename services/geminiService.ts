
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

// Standard GoogleGenAI initialization using the direct process.env.API_KEY string
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGrievance = async (text: string, imageData?: string) => {
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
    
    3. Output: JSON format.
    
    Grievance text: ${text}
  ` }];

  if (imageData) {
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.split(',')[1]
      }
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
          urgencyScore: { type: Type.INTEGER, description: "Calculated risk score from 0-100" }
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
