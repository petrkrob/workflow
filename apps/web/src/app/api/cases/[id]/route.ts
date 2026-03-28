import { NextRequest, NextResponse } from 'next/server';
import { getCase } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const c = getCase(params.id);
  if (!c) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }
  return NextResponse.json(c);
}
