
import { GoogleGenAI, Type } from "@google/genai";
import { VibeAnalysis, Track, LyricsResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTrackVibe = async (track: Track): Promise<VibeAnalysis> => {
  const prompt = `Analyze the vibe of this musical track: "${track.title}" by "${track.artist}". 
  Provide a detailed sensory description of the "Luz Roja" (Red Light) atmosphere it evokes. 
  The response should be in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            colorPalette: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            description: { type: Type.STRING },
            energyLevel: { type: Type.NUMBER },
          },
          required: ["mood", "colorPalette", "description", "energyLevel"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data as VibeAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      mood: "Intense & Mysterious",
      colorPalette: ["#991B1B", "#000000", "#DC2626"],
      description: "A deep crimson sonic landscape that thrives in the shadows.",
      energyLevel: 8
    };
  }
};

export const getLyricsForTrack = async (track: Track): Promise<string> => {
  const prompt = `Generate atmospheric, poetic lyrics for the song "${track.title}" by "${track.artist}". 
  The theme is "Luz Roja" (Red Light) - mysterious, neon-noir, and intense. 
  Keep it short (approx 12-16 lines). Return ONLY the lyrics as text with line breaks. No titles or intro.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Scanning frequencies... No signal detected.";
  } catch (error) {
    console.error("Gemini Lyrics Error:", error);
    return "Voices lost in the crimson static...";
  }
};
