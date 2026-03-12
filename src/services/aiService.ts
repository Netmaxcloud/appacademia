import { ai, SYSTEM_INSTRUCTION } from '../lib/gemini';
import { UserProfile, Workout, Diet } from '../types';

export const generateWorkoutWithAI = async (apiKey: string, client: UserProfile, prompt: string = "") => {
  const genAI = ai(apiKey);
  
  const fullPrompt = `
    ${SYSTEM_INSTRUCTION}
    Generate a personalized workout routine for the following client:
    Name: ${client.full_name || 'Client'}
    Age: ${client.age || 'Not specified'}
    Weight: ${client.weight ? client.weight + 'kg' : 'Not specified'}
    Height: ${client.height ? client.height + 'cm' : 'Not specified'}
    Objective: ${client.objective || 'Not specified'}
    Level: ${client.level || 'Not specified'}
    
    Additional request: ${prompt}
    
    Return the response in JSON format with the following structure:
    {
      "name": "Workout Name",
      "description": "Short description",
      "exercises": [
        { "name": "Exercise Name", "sets": 3, "reps": "12", "weight": "optional", "rest_time": "60s" }
      ],
      "day_of_week": "Monday"
    }
  `;

  const result = await genAI.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: fullPrompt }] }]
  });
  
  const text = result.text;
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Partial<Workout>;
    }
    return JSON.parse(text) as Partial<Workout>;
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    throw new Error("Falha ao processar resposta da IA");
  }
};

export const generateDietWithAI = async (apiKey: string, client: UserProfile, prompt: string = "") => {
  const genAI = ai(apiKey);
  
  const fullPrompt = `
    ${SYSTEM_INSTRUCTION}
    Generate a basic personalized diet for the following client:
    Name: ${client.full_name || 'Client'}
    Objective: ${client.objective || 'Not specified'}
    Weight: ${client.weight ? client.weight + 'kg' : 'Not specified'}
    
    Additional request: ${prompt}
    
    Return the response in JSON format with the following structure:
    {
      "name": "Diet Name",
      "meals": [
        { "time": "08:00", "name": "Breakfast", "foods": ["Food 1", "Food 2"] }
      ]
    }
  `;

  const result = await genAI.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: fullPrompt }] }]
  });
  
  const text = result.text;
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Partial<Diet>;
    }
    return JSON.parse(text) as Partial<Diet>;
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    throw new Error("Falha ao processar resposta da IA");
  }
};
