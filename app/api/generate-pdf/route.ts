export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createLocalPdfJob } from '@/lib/pdf';

export async function POST(request: Request) {
  try {
    const { html_content, pdf_options, css_stylesheet } = await request.json();

    if (!html_content) {
      return NextResponse.json({ success: false, error: 'No html_content provided' }, { status: 400 });
    }

    const request_id = await createLocalPdfJob(html_content, {
      ...pdf_options,
      css_stylesheet,
    });

    return NextResponse.json({ success: true, request_id });
  } catch (error) {
    console.error('Error creating PDF request:', error);
    return NextResponse.json({ success: false, error: 'Failed to create PDF request' }, { status: 500 });
  }
}
