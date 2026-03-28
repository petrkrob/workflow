import { NextRequest, NextResponse } from 'next/server';
import { getClient, addClientFile, removeClientFile, processClientFile } from '@/lib/store';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

  // Save file to disk
  const uploadDir = path.join(process.cwd(), 'uploads', 'clients', params.id);
  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(path.join(uploadDir, file.name), buffer);

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
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { fileId } = await request.json();
  const removed = removeClientFile(params.id, fileId);
  if (!removed) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
