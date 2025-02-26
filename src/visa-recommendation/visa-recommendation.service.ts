import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAI } from 'openai';

export interface VisaRecommendationResult {
  bestVisaType: string;
  confidence: number;
  reasoning: string;
}
@Injectable()
export class VisaRecommendationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Missing OpenAI API Key! Set OPENAI_API_KEY in .env');
    }
  }

  async determineBestVisaType(userResponses: any) {
    console.log('📌 User Responses:', userResponses);

    const prompt = `
       You are an AI visa assistant. Based on the user's responses, determine the most suitable visa type **without any predefined options**.
    
    **User Responses:**
    ${JSON.stringify(userResponses, null, 2)}

    **Your Task:**
    - Analyze the user's purpose of travel, financial situation, employment status, and other relevant details.
    - Determine the **best possible visa category** based on standard immigration policies.
    - If no exact match exists, suggest the **most relevant alternative visa**.
    - Provide a confidence score (0-100) based on how well the user's responses match the selected visa type.
    
    **Respond in valid JSON format (without markdown formatting):**
    {
      "bestVisaType": "Visa Type",
      "confidence": 0-100,
      "reasoning": "Explain why this visa type is the best match."
    }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('No AI response received.');
      }

      let aiResponse = response.choices[0]?.message?.content?.trim();
      console.log('🔹 AI Response:', aiResponse);

      if (!aiResponse) {
        throw new Error('AI response is undefined.');
      }

      // Ensure valid JSON parsing
      aiResponse = aiResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const result: VisaRecommendationResult = JSON.parse(
        aiResponse,
      ) as VisaRecommendationResult;
      console.log('✅ Visa Type Determination:', result);
      return result;
    } catch (error) {
      console.error('❌ AI Visa Type Determination Error:', error);
      throw new BadRequestException('Failed to determine visa type.');
    }
  }
}
