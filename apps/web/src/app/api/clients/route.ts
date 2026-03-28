import { NextRequest, NextResponse } from 'next/server';
import { getAllClients, getAllCases, createClient, addClientFile, processClientFile } from '@/lib/store';

export async function GET() {
  const clients = getAllClients();
  const cases = getAllCases();
  return NextResponse.json({ clients, cases });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // JSON body — manual creation
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Jméno klienta je povinné' }, { status: 400 });
      }
      const client = createClient({ name: body.name.trim() });

      // If profile data provided, merge it
      if (body.profile) {
        const c = client as any;
        c.profile = body.profile;
        c.updatedAt = new Date().toISOString();
      }

      return NextResponse.json({ client }, { status: 201 });
    }

    // FormData — creation with transcript upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const name = formData.get('name') as string;
      const file = formData.get('file') as File | null;

      if (!name?.trim()) {
        return NextResponse.json({ error: 'Jméno klienta je povinné' }, { status: 400 });
      }

      const client = createClient({ name: name.trim() });

      let extractedData = null;
      let profileUpdates = null;

      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploaded = addClientFile(client.id, {
          filename: file.name,
          mimeType: file.type,
          sizeBytes: buffer.length,
          purpose: 'meeting_recording',
        });

        if (uploaded) {
          const result = processClientFile(client.id, uploaded.id);
          extractedData = result?.extracted || null;
          profileUpdates = result?.profileUpdates || null;
        }
      }

      return NextResponse.json({
        client,
        extractedData,
        profileUpdates,
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
