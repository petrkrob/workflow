import { NextRequest, NextResponse } from 'next/server';
import { getClient, addClientFile, removeClientFile, processClientFile } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = getClient(params.id);
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  return NextResponse.json({ files: client.files });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = getClient(params.id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const purpose = (formData.get('purpose') as string) || 'other';
    const autoProcess = formData.get('autoProcess') !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file bytes (no disk save needed — in-memory store)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Add to store
    const uploaded = addClientFile(params.id, {
      filename: file.name,
      mimeType: file.type,
      sizeBytes: buffer.length,
      purpose,
    });

    if (!uploaded) {
      return NextResponse.json({ error: 'Failed to add file' }, { status: 500 });
    }

    // Auto-process with AI
    let processResult = null;
    if (autoProcess) {
      processResult = processClientFile(params.id, uploaded.id);
    }

    return NextResponse.json({
      file: uploaded,
      processed: autoProcess,
      extractedData: processResult?.extracted || null,
      profileUpdates: processResult?.profileUpdates || null,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { fileId } = await request.json();
  const removed = removeClientFile(params.id, fileId);
  if (!removed) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
