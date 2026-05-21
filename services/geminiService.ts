import { GoogleGenAI } from "@google/genai";
import { TaxSummary, Trip, Expense } from "../types";

export const analyzeTaxEfficiency = async (
  summary: TaxSummary,
  trips: Trip[],
  expenses: Expense[]
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "API Key is missing. Please configure the environment to use AI features.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const dataContext = {
      businessPercentage: summary.businessPercentage.toFixed(2),
      totalClaimable: summary.totalClaimable,
      tripCount: trips.length,
      recentTrips: trips.slice(0, 5).map(t => `${t.date}: ${t.distance}km (${t.type})`),
      expenseCount: expenses.length,
      topExpenses: expenses.sort((a,b) => b.amount - a.amount).slice(0, 3)
    };

    const prompt = `
      You are a Sri Lankan Tax Advisor helper for a medical professional.
      Analyze the following vehicle usage data:
      ${JSON.stringify(dataContext, null, 2)}
      
      The user splits expenses based on business mileage %.
      Provide 3 short, actionable tips to optimize their tax claim or improve record keeping compliant with Sri Lanka IRD.
      Keep the tone professional yet encouraging. Limit to 150 words total.
      Do not use formatting like bolding or headers, just plain text paragraphs or bullet points.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights available at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time. Please try again later.";
  }
};