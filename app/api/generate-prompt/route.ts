import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import * as cheerio from 'cheerio';

//const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export async function POST(req: NextRequest) {
  // ✅ Initialize INSIDE the function instead:
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const { websiteUrl } = await req.json();

    // 1. SCRAPE WEBSITE
    const response = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000)
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, svg').remove();
    
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    const allText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Extract contacts
    const emails = [...new Set(allText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [])].filter(e => e.length < 50);
    const phones = [...new Set(allText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])].filter(p => p.length >= 10);

    // 2. ASK GEMINI TO CREATE THE KNOWLEDGE BASE PROMPT
    const analysisPrompt = `You are creating a knowledge base document for an AI assistant that will represent a business.

WEBSITE URL: ${websiteUrl}
BUSINESS NAME: ${title}
META DESCRIPTION: ${description}

FULL WEBSITE CONTENT:
${allText.substring(0, 7000)}

EXTRACTED CONTACT INFO:
Emails: ${emails.join(', ') || 'Not found'}
Phones: ${phones.join(', ') || 'Not found'}

YOUR TASK:
Create a comprehensive knowledge base document that includes:

1. **Business Overview** - What they do, their purpose
2. **Services/Products** - Complete list with details
3. **Contact Information** - Use the extracted emails/phones above, state them explicitly
4. **Business Hours** - Extract from content if mentioned
5. **Location/Address** - If mentioned in content
6. **Pricing** - If mentioned in content
7. **Booking/Appointments** - How to book if mentioned
8. **About/History** - Company background if mentioned
9. **Unique Features** - What makes them special

Format this as a natural business information document (NOT as instructions to an AI). Write it as if you're documenting facts about the business.

CRITICAL RULES:
- Include the ACTUAL email addresses and phone numbers from the extracted data
- Write as factual statements, not instructions
- If information isn't in the content, don't mention it at all
- Keep it comprehensive but concise

Return ONLY a JSON object:
{
  "businessName": "exact business name",
  "knowledgeBase": "The complete knowledge base document as described above",
  "greeting": "A warm, personalized greeting",
  "suggestedQuestions": ["4 relevant questions"],
  "brandColor": "hex color"
}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: analysisPrompt,
    });

    const responseText = result.text || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

 // 3. BUILD THE FINAL SYSTEM PROMPT (wraps the knowledge base)
    const systemPrompt = `${parsed.knowledgeBase}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a warm, professional receptionist for this business. Use ONLY the information above to answer questions.

RESPONSE RULES:
- Maximum 1-2 short sentences per response
- ALWAYS respond in the SAME language the customer is using (English, German, Spanish, etc.)
- Be conversational and human, use "Wonderful!", "Perfect!", "Absolutely!"
- Never mention AI, knowledge base, or that you can't actually book
- Ask only ONE thing at a time

BOOKING - collect these 5 things in order, ONE per message:
1. SERVICE → what treatment/service do they want
2. DAY → what day works for them  
3. TIME → what time works
4. NAME → ask for name, then immediately ask them to spell it
5. EMAIL → email for confirmation

CRITICAL TRACKING RULES:
- NEVER ask for something already provided in this conversation
- After getting the name spelled out, move DIRECTLY to asking for email
- After getting email, go DIRECTLY to the confirmation message
- Read the full conversation history before responding

CONFIRMATION - when you have ALL 5 pieces, respond with ONLY this:
"You're all set, [NAME]! I have you booked for [SERVICE] on [DAY] at [TIME] — a confirmation will be sent to [EMAIL]. We look forward to seeing you!"
Then stop. Do not ask anything else.

EDGE CASES:
- Manager/specific person request: "I'll pass that along! You can also reach us at [PHONE] if it's urgent."
- Off-topic question mid-booking: answer in one sentence, then "Now, back to your booking —" and continue
- If they only want info, not booking: answer helpfully, gently offer to book at the end`;

    return NextResponse.json({
      businessName: parsed.businessName || title,
      systemPrompt: systemPrompt,
      greeting: parsed.greeting || `Welcome to ${title}! How can I help you?`,
      suggestedQuestions: parsed.suggestedQuestions || [
        'What services do you offer?',
        'How can I contact you?',
        'What are your hours?',
        'Tell me more'
      ],
      brandColor: parsed.brandColor || '#ec4899'
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    
    // Fallback if Gemini fails
    return NextResponse.json({
      businessName: 'Business',
      systemPrompt: `You are a helpful assistant. Answer questions professionally and keep responses to 2 sentences. If you don't have specific information, offer to connect the person with the team.`,
      greeting: 'Hello! How can I help you today?',
      suggestedQuestions: [
        'What can you help me with?',
        'Tell me more',
        'How can I contact you?',
        'What are your hours?'
      ],
      brandColor: '#ec4899'
    });
  }
}