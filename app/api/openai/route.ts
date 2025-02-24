import { NextResponse } from 'next/server';

//https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/

export async function POST(request: Request) {
  try {
    const { pdfText } = await request.json();
    console.log("Next API/PDF TEXT: ", pdfText);

    if (!pdfText) {
      return NextResponse.json({ error: 'PDF text is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    /**
     *  In development, use the local environment variable; in production, use prod environment variable
        In Development: When running next dev, process.env.NODE_ENV is automatically set to "development".
        In Production: When you build and run your app using next build and next start, process.env.NODE_ENV is set to "production".
        If you don't have an .env file in production, process.env.NODE_ENV will still exist, and it will be set to "production". 
     */

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
    }

    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const prompt = `Act as an expert in Optical Character Recognition.
    I am providing a doctor visit note pdf, extract out the information carefully double check your work and format it as a JSON object like below example.  
    {
    "patient_name": "John Cena",
    "patient_dob": "04/28/1997",
    "medical_plan": "Order MRI of the Right Knee Without Contrast",
    "diagnostic_impressions": "Osteoarthritis of right knee (M17.11)",
    "icd_codes": ["M17.11"]
    };
    Only return the JSON object as response and nothing else

    Here is the text content: ${pdfText}`;
    


    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    try {
      const jsonResponse = JSON.parse(data.choices[0].message.content);
      return NextResponse.json(jsonResponse);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON response from OpenAI' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
