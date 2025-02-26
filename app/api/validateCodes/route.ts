import { NextResponse } from 'next/server';

const apiKey = process.env.OPENAI_API_KEY;
const apiUrl = 'https://api.openai.com/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const { icdCodes, cptCodes, cptCodesExplanation, medicalGuideLines } = await req.json();

    const prompt = `
      As a medical coding expert, validate if the provided CPT codes are appropriate for the given ICD codes and medical guidelines.
      
      ICD Codes: ${icdCodes.join(', ')}
      CPT Codes: ${cptCodes.join(', ')}
      Current CPT Codes Explanation: ${cptCodesExplanation}
      Medical Guidelines: ${medicalGuideLines.join('\n')}

      Please analyze if the CPT codes are appropriate for the diagnosis (ICD codes) according to the medical guidelines.
      If they are appropriate, explain why. If they are not appropriate, explain what codes would be more suitable.

      Respond in the following JSON format:
      {
        "isValid": boolean,
        "explanation": "detailed explanation of the validation result",
        "suggestedChanges": "if not valid, suggest alternative codes or changes",
        "confidence": "high/medium/low"
      }
      Only return the JSON object as response and nothing else
    `;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a medical coding expert specializing in ICD and CPT code validation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Validate Codes Response: ", data);

    try {
        let content = data.choices[0].message.content;
        console.log("Validate Codes Msg Content: ", data);
        // Extract content between first { and last }
        const match = content.match(/\{[\s\S]*\}/);
        const jsonString = match ? match[0] : content;
        const jsonResponse = JSON.parse(jsonString);
        return NextResponse.json(jsonResponse);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        return NextResponse.json({ error: 'Invalid JSON response from OpenAI' }, { status: 500 });
      }

  } catch (error) {
    console.error('Error in validateCodes:', error);
    return NextResponse.json(
      { error: 'Failed to validate codes' },
      { status: 500 }
    );
  }
} 