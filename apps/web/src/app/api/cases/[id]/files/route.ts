import { NextRequest, NextResponse } from 'next/server';
import { getCase, addFileToCase, removeFileFromCase } from '@/lib/store';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const c = getCase(params.id);
  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  return NextResponse.json({ files: c.files });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const c = getCase(params.id);
  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const purpose = (formData.get('purpose') as string) || 'other';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Save file to disk
  const caseDir = join(UPLOAD_DIR, params.id);
  await mkdir(caseDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filepath = join(caseDir, `${Date.now()}_${safeName}`);
  await writeFile(filepath, buffer);

  // Register in store
  const uploaded = addFileToCase(params.id, {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: buffer.length,
    purpose: purpose as any,
  });

  if (!uploaded) {
    return NextResponse.json({ error: 'Failed to register file' }, { status: 500 });
  }

  return NextResponse.json(uploaded, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { fileId } = await request.json();
  if (!fileId) {
    return NextResponse.json({ error: 'fileId required' }, { status: 400 });
  }
  const removed = removeFileFromCase(params.id, fileId);
  if (!removed) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
