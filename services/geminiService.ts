
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeOrderText(text: string) {
  // Inicializamos dentro de la función para asegurar que process.env esté disponible
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY no configurada. La función de IA no estará disponible.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza el siguiente texto de un pedido y extrae el nombre del cliente y la lista de artículos con sus cantidades. Texto: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
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

    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Error en el servicio Gemini IA:", e);
    return null;
  }
}
