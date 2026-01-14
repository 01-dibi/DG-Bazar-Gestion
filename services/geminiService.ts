
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeOrderText(text: string) {
  // Use direct process.env.API_KEY reference for initialization as per guidelines
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza el siguiente texto de un pedido y extrae la identificación completa del cliente (incluyendo nombre, empresa y número de cliente si están presentes) y la lista de artículos con sus cantidades. Texto: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING, description: "Identificación del cliente (Nombre y/o N° de Cliente)" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER }
                },
                required: ["name", "quantity"]
              }
            }
          },
          required: ["customerName", "items"]
        }
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Error detallado en Gemini Service:", e);
    return null;
  }
}
