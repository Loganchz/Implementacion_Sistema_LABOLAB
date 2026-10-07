export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPdfStatus } from '@/lib/pdf';

export async function POST(request: Request) {
  try {
    const { request_id } = await request.json();
    if (!request_id) {
      return NextResponse.json({ status: 'FAILED', error: 'No request_id provided' }, { status: 400 });
    }

    const job = getPdfStatus(request_id);
    if (!job) {
      return NextResponse.json({ status: 'FAILED', error: 'PDF request not found' }, { status: 404 });
    }

    if (job.status === 'SUCCESS') {
      return NextResponse.json({ status: 'SUCCESS', pdf_base64: job.pdf_base64 });
    }

    if (job.status === 'FAILED') {
      return NextResponse.json({ status: 'FAILED', error: job.error || 'PDF generation failed' });
    }

    return NextResponse.json({ status: job.status });
  } catch (error) {
    console.error('Error checking PDF status:', error);
    return NextResponse.json({ status: 'FAILED', error: 'Failed to check PDF status' }, { status: 500 });
  }
}
