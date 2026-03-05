import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

export const generateSolution = async (topicTitle: string, topicDescription: string, instructions?: string, targetPages: number = 1, depth: 'minimal' | 'detailed' = 'detailed') => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    You are an expert academic advisor and project consultant. 
    Create a ${depth === 'minimal' ? 'MINIMAL and CONCISE' : 'COMPREHENSIVE and DETAILED'} solution for the following student project topic:
    
    Topic: ${topicTitle}
    Description: ${topicDescription}
    
    ${instructions ? `CUSTOM USER INSTRUCTIONS FOR THIS RECREATION: ${instructions}` : ''}
    
    The solution MUST be exactly ${targetPages} page(s) long.
    
    CRITICAL WORD COUNT LIMITS:
    - If 1 page: Strictly between 400-450 words.
    - If 2 pages: Strictly between 850-950 words.
    - If 3 pages: Strictly between 1300-1400 words.
    - If 4+ pages: Approx 450 words per page.
    
    CONTENT DEPTH (${depth.toUpperCase()}):
    ${depth === 'minimal' 
      ? '- Focus ONLY on the most critical, bare-essential steps and conclusions. Use short, punchy sentences.' 
      : '- Provide deep technical insights, extensive explanations, and thorough implementation details. Use professional, elaborate language.'}
    
    CONTENT GUIDELINES:
    - Focus ONLY on essential, high-impact "important content".
    - ELIMINATE all filler, fluff, and repetitive introductions.
    - Use concise bullet points and direct language to maximize information density.
    - Ensure the total content fits perfectly within ${targetPages} pages of a standard PDF without being cut off.
    - Prioritize actionable value over wordy explanations.
    
    Whenever you feel a highly relevant and specific image would be critical to illustrate a point or make the guide more engaging, insert a placeholder in this exact format:
    :::image [Detailed description of a highly specific image that directly relates to the current section's content] :::
    Only suggest images that add real value and are directly related to the topic.
    
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

export const generateTopicImage = async (topicTitle: string, context?: string) => {
  const model = "gemini-2.5-flash-image";
  const prompt = topicTitle 
    ? `A professional, high-quality, academic-style conceptual image representing the topic: "${topicTitle}". ${context ? `Context: ${context}.` : ''} The style should be clean, modern, and suitable for a student project presentation. No text in the image.`
    : `A professional, high-quality, academic-style conceptual image: ${context}. The style should be clean, modern, and suitable for a student project presentation. No text in the image.`;

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
