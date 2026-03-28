import { NextRequest, NextResponse } from 'next/server';
import { getClient, getAllCases } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = getClient(params.id);
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Get all cases for this client
  const allCases = getAllCases();
  const clientCases = allCases.filter(c => c.clientId === params.id);

  // Aggregate all financial facts, tasks, missing info from all cases
  const allFacts: Array<{ fact: string; confidence: string; source: string; meetingDate: string }> = [];
  const allAdvisorTasks: Array<{ description: string; priority: string; deadline?: string; meetingDate: string; status: string }> = [];
  const allClientTasks: Array<{ description: string; priority: string; deadline?: string; meetingDate: string; status: string }> = [];
  const allMissingInfo: Array<{ description: string; importance: string; suggestedQuestion: string }> = [];
  const allDocuments: Array<{ filename: string; purpose: string; sizeBytes: number; uploadedAt: string; caseId: string }> = [];

  for (const c of clientCases) {
    // Collect documents
    for (const f of c.files) {
      allDocuments.push({
        filename: f.filename,
        purpose: f.purpose,
        sizeBytes: f.sizeBytes,
        uploadedAt: f.uploadedAt,
        caseId: c.id,
      });
    }

    // Collect from summary
    if (c.summary?.content) {
      const content = c.summary.content as any;
      for (const fact of (content.financial_facts || [])) {
        allFacts.push({ ...fact, meetingDate: c.meetingDate });
      }
      for (const task of (content.advisor_tasks || [])) {
        allAdvisorTasks.push({ ...task, meetingDate: c.meetingDate, status: c.workflowState.crm_entry === 'approved' ? 'done' : 'active' });
      }
      for (const task of (content.client_tasks || [])) {
        allClientTasks.push({ ...task, meetingDate: c.meetingDate, status: c.workflowState.crm_entry === 'approved' ? 'done' : 'active' });
      }
      for (const m of (content.missing_information || [])) {
        allMissingInfo.push(m);
      }
    }
  }

  return NextResponse.json({
    client,
    cases: clientCases.map(c => ({
      id: c.id,
      meetingDate: c.meetingDate,
      meetingType: c.meetingType,
      notes: c.notes,
      workflowState: c.workflowState,
      hasTranscript: !!c.transcript,
      hasSummary: !!c.summary,
      hasProfile: !!c.profileUpdate,
      hasCRM: !!c.crmEntry,
    })),
    aggregated: {
      facts: allFacts,
      advisorTasks: allAdvisorTasks,
      clientTasks: allClientTasks,
      missingInfo: allMissingInfo,
      documents: allDocuments,
    },
  });
}
