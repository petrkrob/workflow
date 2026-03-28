import { NextRequest, NextResponse } from 'next/server';
import { getAllCases, createCase, getAllClients, createClient } from '@/lib/store';

export async function GET() {
  const cases = getAllCases();
  const clients = getAllClients();
  return NextResponse.json({ cases, clients });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientName, meetingDate, meetingType, notes } = body;

  if (!clientName || !meetingDate) {
    return NextResponse.json({ error: 'clientName and meetingDate required' }, { status: 400 });
  }

  // Find or create client
  let clients = getAllClients();
  let client = clients.find(c => c.name === clientName);
  if (!client) {
    client = createClient({ name: clientName });
  }

  const newCase = createCase({
    clientId: client.id,
    clientName: client.name,
    meetingDate,
    meetingType: meetingType || 'initial',
    notes: notes || '',
  });

  return NextResponse.json(newCase, { status: 201 });
}
