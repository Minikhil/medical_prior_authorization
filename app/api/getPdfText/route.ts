import { NextRequest, NextResponse } from 'next/server';
const pdfParse = require('pdf-parse/lib/pdf-parse');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extract text from PDF
    const data = await pdfParse(buffer);

    return NextResponse.json({
      message: 'File processed successfully',
      filename: file.name,
      size: file.size,
      type: file.type,
      text: data.text
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Error processing PDF file' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'PDF processing endpoint' },
    { status: 200 }
  );
} 