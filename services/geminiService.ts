import { GoogleGenAI } from "@google/genai";
import { Transaction, Staff } from "../types";

export const generateBusinessInsights = async (transactions: Transaction[], staff: Staff[]) => {
  // Fix: Exclusively use the API key from environment variables
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "API Key is missing. Please configure your Gemini API Key.";
  }

  // Fix: Create instance right before use to ensure it always uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey });

  // Summarize data for the prompt to save tokens
  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalTx = transactions.length;
  
  // Basic staff performance summary
  const staffPerformance = staff.map(s => {
    const revenue = transactions
      .flatMap(t => t.items)
      .filter(i => (i.staffIds && i.staffIds.includes(s.id)) || (i.barberId === s.id))
      .reduce((acc, i) => acc + (i.price * i.quantity), 0);
    return `${s.name}: $${revenue}`;
  }).join(', ');

  const prompt = `
    You are a business consultant for a high-end Barber Shop.
    Here is the current snapshot of the business:
    - Total Revenue: $${totalRevenue}
    - Total Transactions: ${totalTx}
    - Staff Performance breakdown: ${staffPerformance}
    
    Please provide 3 concise, actionable bullet points to improve business performance, marketing, or staff efficiency.
    Do not use markdown formatting like bolding, just plain text with bullet points.
  `;

  try {
    // Fix: Updated model name and direct use of ai.models.generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: access .text property directly (not a method) from GenerateContentResponse
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Unable to generate insights at this time.";
  }
};