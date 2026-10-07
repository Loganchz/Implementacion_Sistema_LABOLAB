export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { html_content, pdf_options, css_stylesheet } = await request.json();

    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content,
        pdf_options: pdf_options || { format: 'A4' },
        css_stylesheet,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({ error: 'Failed to create PDF request' }));
      return NextResponse.json({ success: false, error: error?.error ?? 'Error' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ success: false, error: 'No request ID returned' }, { status: 500 });
    }

    return NextResponse.json({ success: true, request_id });
  } catch (error) {
    console.error('Error creating PDF request:', error);
    return NextResponse.json({ success: false, error: 'Failed to create PDF request' }, { status: 500 });
  }
}
