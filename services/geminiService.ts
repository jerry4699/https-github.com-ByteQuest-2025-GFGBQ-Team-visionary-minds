
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

// Standard GoogleGenAI initialization using the direct process.env.API_KEY string
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGrievance = async (text: string, imageData?: string) => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";
  
  const contents: any[] = [{ text: `Analyze the following citizen grievance and categorize it. Provide a priority level (CRITICAL, HIGH, MEDIUM, LOW), a target department, and a summary.
  Grievance text: ${text}` }];

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
          suggestedResolution: { type: Type.STRING }
        },
        required: ["category", "priority", "department", "summary", "urgencyReason", "suggestedResolution"]
      },
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const getPolicyInfo = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find official government policy information related to: ${query}`,
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
