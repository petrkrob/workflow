import { NextRequest, NextResponse } from 'next/server';
import { runWorkflowStep, approveStep, editAndApproveStep, getCase } from '@/lib/store';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { action, step, edits } = body;

  if (!action || !step) {
    return NextResponse.json({ error: 'action and step required' }, { status: 400 });
  }

  const existing = getCase(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  let result;
  if (action === 'run') {
    result = runWorkflowStep(params.id, step);
  } else if (action === 'approve') {
    result = approveStep(params.id, step);
  } else if (action === 'edit_and_approve') {
    if (!edits) {
      return NextResponse.json({ error: 'edits required for edit_and_approve' }, { status: 400 });
    }
    result = editAndApproveStep(params.id, step, edits);
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  if (!result) {
    return NextResponse.json({ error: 'Failed to process step' }, { status: 500 });
  }

  return NextResponse.json(result);
}
