import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { invoiceText, fields } = await req.json();
    if (!invoiceText || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }


        role: 'user',
        parts: [
          {
            text: `Extract the following fields from this invoice:\nFields: ${fields.join(', ')}\nInvoice:\n${invoiceText}\nRespond with JSON mapping each field to a value. Use empty string for missing fields.`,
          },
        ],
      },
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: prompt }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${text}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { error: 'Invalid JSON response', raw: content };
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
