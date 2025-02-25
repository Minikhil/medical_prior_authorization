import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { medicalGuideLines, medicalPlan } = await request.json();
    console.log("Next API/Medical Guide Lines for CPT Codes: ", medicalGuideLines);

    if (!medicalGuideLines) {
      return NextResponse.json({ error: 'Medical Guide Lines is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
    }

    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const prompt = `Act as an expert medical coder specializing in procedure CPT codes.
    Review the medical plan from the doctor provided, then for each procedure requested by the doctor review the provided medical guide lines and give the code that most closely matches the each requested procedure. 
    Note if doctor is requesting single type of scan for multiple body parts, then you should return the code for the scan that covers all the body parts.
    Double check your work and format it as a JSON object like below example.
    {
    "cptCode": ["99213"],
    "description": "Office or other outpatient visit for evaluation and management",
    "cptCodesExplanation": "The code 99213 is the most appropriate code for the requested procedure because it is a comprehensive evaluation and management code that includes a detailed history and physical examination."
    }

    Here is the medical guide lines: ${medicalGuideLines}
    Here is the medical plan from doctor: ${medicalPlan};
    
    Please make sure to ONLY return the JSON as response and nothing else.`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Get CPT Codes Response: ", data);
    
    try {
      let content = data.choices[0].message.content;
      console.log("Get CPT Codes Msg Content: ", data);
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
    console.error('OpenAI Request Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 