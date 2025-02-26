import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAI } from 'openai';
import { DocumentRequirementResponse } from './document.requirements.types';

@Injectable()
export class DocumentRequirementService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Missing OpenAI API Key! Set OPENAI_API_KEY in .env');
    }
  }

  async getRequiredDocuments(
    visaType: string,
  ): Promise<DocumentRequirementResponse> {
    console.log('📌 Determining required documents for:', visaType);

    const prompt = `
      You are an AI immigration expert. Based on the provided visa type, list the required documents.
      
      **Visa Type:** ${visaType}
      
      **Response Format (JSON only, without markdown formatting):**
      {
        "visaType": "${visaType}",
        "requiredDocuments": [
          "List of necessary documents"
        ]
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

      // Remove markdown formatting if present
      aiResponse = aiResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const result: DocumentRequirementResponse = JSON.parse(
        aiResponse,
      ) as DocumentRequirementResponse;
      console.log('✅ Required Documents:', result);
      return result;
    } catch (error) {
      console.error('❌ AI Document Determination Error:', error);
      throw new BadRequestException('Failed to determine required documents.');
    }
  }
}
