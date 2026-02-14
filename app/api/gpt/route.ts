import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

//const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
export async function POST(req: NextRequest) {
  // ✅ ADD inside:
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const { message, conversationHistory, systemPrompt } = await req.json();

    // Build conversation with strict adherence to knowledge base
    const recentHistory = (conversationHistory || []).slice(-12);

    const allMessages = [
      { 
        role: 'user', 
        parts: [{ text: `${systemPrompt}\n\nRemember: Keep responses brief (1-2 sentences max). Never mention you're an AI, never mention training, never mention knowledge bases. Speak naturally as the business representative.` }] 
      },
      { 
        role: 'model', 
        parts: [{ text: 'Understood. I will respond naturally as the business, using only the information provided, keeping responses to 1-2 sentences maximum.' }] 
      },
      ...recentHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: allMessages
    });

    let text = response.text || "I'm sorry, I'm having trouble right now.";
    
    // Force 2 sentence max for both voice and chat
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 2) {
      text = sentences.slice(0, 2).join(' ');
    }

    // Remove any mentions of being an AI (safety net)
    text = text
      .replace(/as an ai|i'm an ai|i am an ai|trained by|knowledge base|i don't have access/gi, '')
      .replace(/according to (the|my) (website|knowledge|information)/gi, '')
      .trim();

    return NextResponse.json({ response: text });

  } catch (err: any) {
    console.error('Gemini API Error:', err);
    return NextResponse.json(
      { error: "Internal Error" },
      { status: 500 }
    );
  }
}