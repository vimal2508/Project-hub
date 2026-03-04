import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

export const generateSolution = async (topicTitle: string, topicDescription: string, instructions?: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    You are an expert academic advisor and project consultant. 
    Create a COMPREHENSIVE and DETAILED solution for the following student project topic:
    
    Topic: ${topicTitle}
    Description: ${topicDescription}
    
    ${instructions ? `CUSTOM USER INSTRUCTIONS FOR THIS RECREATION: ${instructions}` : ''}
    
    The solution MUST be a concise, single-page guide (approx 500-700 words) that is high-impact and easy to follow.
    It should include:
    1. Introduction and Objectives
    2. Key Implementation Steps
    3. Essential Resources
    4. Skills Developed
    5. A Sample Template or Script
    6. Quick Tips for Success
    
    Format the output in clear Markdown with headings, bullet points, and bold text for readability.
    Ensure the tone is encouraging and student-centric.
  `;

  try {
    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text;
  } catch (error) {
    console.error("Error generating solution:", error);
    throw error;
  }
};

export const generateTopicImage = async (topicTitle: string) => {
  const model = "gemini-2.5-flash-image";
  const prompt = `A professional, high-quality, academic-style conceptual image representing the topic: "${topicTitle}". The style should be clean, modern, and suitable for a student project presentation. No text in the image.`;

  try {
    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating topic image:", error);
    return null;
  }
};

export const chatWithAssistant = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  const model = "gemini-3-flash-preview";
  const chat = genAI.chats.create({
    model,
    config: {
      systemInstruction: "You are a helpful AI assistant for students working on their final projects. You provide guidance, answer questions about the topics, and help them refine their work. Be concise, encouraging, and professional.",
    },
  });

  try {
    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error in chat assistant:", error);
    throw error;
  }
};
