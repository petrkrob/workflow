/**
 * In-memory data store for the prototype.
 * Replaces PostgreSQL + Prisma for zero-dependency local development.
 * All data resets on server restart.
 */

export type StepStatus = 'pending' | 'processing' | 'awaiting_review' | 'approved' | 'failed' | 'skipped';

export interface ClientFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  uploadedAt: string;
  processed: boolean;
  extractedData: Record<string, unknown> | null;
}

export interface Client {
  id: string;
  name: string;
  profile: Record<string, unknown> | null;
  files: ClientFile[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: 'meeting_recording' | 'existing_contract' | 'new_model' | 'product_info' | 'advisor_notes' | 'other';
  uploadedAt: string;
}

export interface MeetingCase {
  id: string;
  clientId: string;
  clientName: string;
  advisorId: string;
  meetingDate: string;
  meetingType: string;
  notes: string;
  files: UploadedFile[];
  workflowState: {
    intake: StepStatus;
    transcription: StepStatus;
    summary: StepStatus;
    profile_update: StepStatus;
    crm_entry: StepStatus;
  };
  transcript: TranscriptData | null;
  summary: SummaryData | null;
  profileUpdate: ProfileUpdateData | null;
  crmEntry: CRMEntryData | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptData {
  cleanedText: string;
  qualityScore: number;
  durationMinutes: number;
  reviewStatus: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
}

export interface SummaryData {
  content: Record<string, unknown>;
  confidence: number;
  reviewStatus: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
}

export interface ProfileUpdateData {
  changes: Array<{ field: string; oldValue: string; newValue: string; changeType: string }>;
  completenessScore: number;
  missingFields: Array<{ field: string; importance: string; suggestedQuestion: string }>;
  reviewStatus: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
}

export interface CRMEntryData {
  content: Record<string, unknown>;
  reviewStatus: 'pending' | 'approved' | 'edited_and_approved' | 'rejected';
}

// ---------- In-memory storage ----------

const clients: Map<string, Client> = new Map();
const cases: Map<string, MeetingCase> = new Map();

// Seed demo data
function seedDemoData() {
  if (clients.size > 0) return;

  const client1: Client = {
    id: 'client_001',
    name: 'Petr Svoboda',
    files: [],
    profile: {
      personal: { full_name: 'Petr Svoboda', birth_year: 1988, marital_status: 'married' },
      household: { dependents_count: 2, household_members: 4 },
      economic: {
        employment_status: 'employed',
        profession: 'IT projektový manažer',
        net_monthly_income: { amount: 48000, currency: 'CZK' },
      },
    },
    createdAt: '2026-03-25T10:00:00Z',
    updatedAt: '2026-03-25T10:00:00Z',
  };

  const client2: Client = {
    id: 'client_002',
    name: 'Jana Králová',
    files: [],
    profile: {
      personal: { full_name: 'Jana Králová', birth_year: 1992, marital_status: 'single' },
      economic: {
        employment_status: 'self_employed',
        profession: 'Grafická designérka',
        net_monthly_income: { amount: 55000, currency: 'CZK' },
      },
    },
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-20T10:00:00Z',
  };

  clients.set(client1.id, client1);
  clients.set(client2.id, client2);

  const case1: MeetingCase = {
    id: 'case_001',
    clientId: 'client_001',
    clientName: 'Petr Svoboda',
    advisorId: 'advisor_001',
    meetingDate: '2026-03-25',
    meetingType: 'initial',
    notes: 'Úvodní schůzka — mapování finanční situace',
    files: [
      { id: 'file_001', filename: 'schuzka_2026-03-25.mp3', mimeType: 'audio/mpeg', sizeBytes: 45_000_000, purpose: 'meeting_recording', uploadedAt: '2026-03-25T11:00:00Z' },
    ],
    workflowState: {
      intake: 'approved',
      transcription: 'approved',
      summary: 'awaiting_review',
      profile_update: 'pending',
      crm_entry: 'pending',
    },
    transcript: {
      cleanedText: `Poradce: Dobrý den, pane Svobodo, děkuji za čas. Dnes bych se rád podíval na vaši celkovou finanční situaci.

Klient: Dobrý den. Ano, mám pocit, že bych měl mít věci lépe uspořádané, hlavně co se týká pojištění.

Poradce: Jasně. Řekněte mi nejdřív o vašich příjmech — jaký máte čistý měsíční příjem?

Klient: Já mám 48 tisíc čistého, manželka asi 32 tisíc.

Poradce: A jaké máte měsíční výdaje?

Klient: Celkově na domácnost tak 45 tisíc, plus splátka hypotéky 12 500.

Poradce: A co se týká pojištění — máte nějaké životní pojištění?

Klient: Mám životko u České pojišťovny, ale je to staré, z roku 2018. Pojistka na smrt je jenom 500 tisíc. Nemám tam invaliditu ani pracovní neschopnost. Přijde mi to málo.

Poradce: To je skutečně nedostatečné pro vaši situaci s hypotékou a dvěma dětmi. Co investice?

Klient: Mám 150 tisíc na spořáku, ale jinak neinvestuju. Rád bych začal, ale bojím se rizika.

Poradce: Rozumím. A penzijko?

Klient: Doplňkové penzijní spoření u ČSOB, dávám 500 měsíčně, zaměstnavatel přidává 300.

Poradce: A co hypotéka?

Klient: Komerční banka, zůstatek asi 2,2 milionu, sazba 3,89 %, fixace končí v březnu 2027.

Poradce: Dobře. Navrhuji, že připravím modelaci nového životního pojištění s lepším krytím a taky varianty investování. Vy mi mezitím pošlete tu smlouvu z České pojišťovny a výpis z penzijka.

Klient: Jasně, to zvládnu do konce týdne.`,
      qualityScore: 0.92,
      durationMinutes: 75,
      reviewStatus: 'approved',
    },
    summary: {
      content: {
        meeting_context: {
          participants: [
            { name: 'Jan Novák', role: 'advisor' },
            { name: 'Petr Svoboda', role: 'client' },
          ],
          meeting_type: 'initial',
          meeting_date: '2026-03-25',
          duration_minutes: 75,
        },
        discussed_topics: [
          {
            topic: 'Životní pojištění a ochrana příjmu',
            category: 'insurance',
            key_points: [
              'Stávající ŽP u České pojišťovny z 2018, smrt 500 000 Kč',
              'Bez krytí invalidity a PN',
              'Klient vnímá jako nedostatečné',
            ],
          },
          {
            topic: 'Investice a spoření',
            category: 'investment',
            key_points: [
              '150 000 Kč na spořicím účtu',
              'Žádné investiční produkty',
              'Zájem o pravidelné investování, obavy z rizika',
            ],
          },
          {
            topic: 'Hypotéka',
            category: 'mortgage',
            key_points: [
              'KB, zůstatek 2,2 mil Kč, sazba 3,89 %',
              'Fixace končí 03/2027',
            ],
          },
        ],
        financial_facts: [
          { fact: 'Čistý příjem 48 000 Kč', confidence: 'confirmed', source: 'client_statement' },
          { fact: 'Příjem manželky 32 000 Kč', confidence: 'mentioned', source: 'client_statement' },
          { fact: 'Výdaje domácnosti 45 000 Kč', confidence: 'mentioned', source: 'client_statement' },
          { fact: 'Hypotéka 2 200 000 Kč, splátka 12 500 Kč', confidence: 'confirmed', source: 'client_statement' },
          { fact: 'Likvidní rezerva 150 000 Kč', confidence: 'confirmed', source: 'client_statement' },
        ],
        advisor_tasks: [
          { description: 'Modelace nového ŽP', priority: 'high', deadline: '2026-04-05' },
          { description: '3 varianty investování', priority: 'medium', deadline: '2026-04-05' },
        ],
        client_tasks: [
          { description: 'Dodat smlouvu z ČP', priority: 'high', deadline: '2026-04-01' },
          { description: 'Dodat výpis z PS ČSOB', priority: 'medium', deadline: '2026-04-01' },
        ],
        missing_information: [
          { description: 'Výše pojistného na ŽP', importance: 'critical', suggested_question: 'Kolik platíte za životní pojištění?' },
          { description: 'Zdravotní stav', importance: 'critical', suggested_question: 'Máte zdravotní omezení?' },
          { description: 'Majetkové pojištění', importance: 'important', suggested_question: 'Máte pojištěný byt?' },
        ],
        next_step: 'Klient dodá dokumenty do 1.4., schůzka na prezentaci návrhů kolem 10.4.',
      },
      confidence: 87,
      reviewStatus: 'pending',
    },
    profileUpdate: null,
    crmEntry: null,
    createdAt: '2026-03-25T11:00:00Z',
    updatedAt: '2026-03-27T14:00:00Z',
  };

  cases.set(case1.id, case1);
}

// Initialize on import
seedDemoData();

// ---------- Public API ----------

export function getAllClients(): Client[] {
  return Array.from(clients.values());
}

export function getClient(id: string): Client | undefined {
  return clients.get(id);
}

export function createClient(data: { name: string }): Client {
  const id = `client_${String(Date.now()).slice(-6)}`;
  const client: Client = {
    id,
    name: data.name,
    profile: null,
    files: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  clients.set(id, client);
  return client;
}

export function updateClientProfile(id: string, profile: Record<string, unknown>): Client | undefined {
  const client = clients.get(id);
  if (!client) return undefined;
  client.profile = profile;
  client.updatedAt = new Date().toISOString();
  return client;
}

export function getAllCases(): MeetingCase[] {
  return Array.from(cases.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCase(id: string): MeetingCase | undefined {
  return cases.get(id);
}

export function createCase(data: {
  clientId: string;
  clientName: string;
  meetingDate: string;
  meetingType: string;
  notes: string;
}): MeetingCase {
  const id = `case_${String(Date.now()).slice(-6)}`;
  const newCase: MeetingCase = {
    id,
    clientId: data.clientId,
    clientName: data.clientName,
    advisorId: 'advisor_001',
    meetingDate: data.meetingDate,
    meetingType: data.meetingType,
    notes: data.notes,
    files: [],
    workflowState: {
      intake: 'approved',
      transcription: 'pending',
      summary: 'pending',
      profile_update: 'pending',
      crm_entry: 'pending',
    },
    transcript: null,
    summary: null,
    profileUpdate: null,
    crmEntry: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cases.set(id, newCase);
  return newCase;
}

export function updateCase(id: string, updates: Partial<MeetingCase>): MeetingCase | undefined {
  const existing = cases.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  cases.set(id, updated);
  return updated;
}

export function addFileToCase(caseId: string, file: { filename: string; mimeType: string; sizeBytes: number; purpose: UploadedFile['purpose'] }): UploadedFile | undefined {
  const c = cases.get(caseId);
  if (!c) return undefined;
  const uploaded: UploadedFile = {
    id: `file_${String(Date.now()).slice(-6)}`,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    purpose: file.purpose,
    uploadedAt: new Date().toISOString(),
  };
  c.files.push(uploaded);
  c.updatedAt = new Date().toISOString();
  return uploaded;
}

export function removeFileFromCase(caseId: string, fileId: string): boolean {
  const c = cases.get(caseId);
  if (!c) return false;
  const idx = c.files.findIndex(f => f.id === fileId);
  if (idx === -1) return false;
  c.files.splice(idx, 1);
  c.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Simulate AI workflow step execution with mock data.
 */
export function runWorkflowStep(caseId: string, step: string): MeetingCase | undefined {
  const c = cases.get(caseId);
  if (!c) return undefined;

  switch (step) {
    case 'transcription': {
      c.workflowState.transcription = 'awaiting_review';
      c.transcript = {
        cleanedText: generateMockTranscript(c.clientName),
        qualityScore: 0.88,
        durationMinutes: 60,
        reviewStatus: 'pending',
      };
      break;
    }
    case 'summary': {
      c.workflowState.summary = 'awaiting_review';
      c.summary = {
        content: generateMockSummary(c.clientName),
        confidence: 85,
        reviewStatus: 'pending',
      };
      break;
    }
    case 'profile_update': {
      c.workflowState.profile_update = 'awaiting_review';
      c.profileUpdate = {
        changes: [
          { field: 'economic.net_monthly_income', oldValue: '-', newValue: '48 000 Kč', changeType: 'new' },
          { field: 'assets.life_insurance', oldValue: '-', newValue: 'ČP, smrt 500 000 Kč', changeType: 'new' },
          { field: 'assets.credit_products', oldValue: '-', newValue: 'Hypotéka KB 2,2 mil Kč', changeType: 'new' },
        ],
        completenessScore: 68,
        missingFields: [
          { field: 'Zdravotní stav', importance: 'critical', suggestedQuestion: 'Máte zdravotní omezení?' },
          { field: 'Majetkové pojištění', importance: 'important', suggestedQuestion: 'Máte pojištěný byt/dům?' },
          { field: 'Přesné pojistné ŽP', importance: 'important', suggestedQuestion: 'Kolik platíte za životní pojištění?' },
        ],
        reviewStatus: 'pending',
      };
      break;
    }
    case 'crm_entry': {
      c.workflowState.crm_entry = 'awaiting_review';
      c.crmEntry = {
        content: {
          top_priorities: [
            'Ochrana rodiny — navýšení ŽP + invalidita',
            'Refinancování hypotéky (fixace 03/2027)',
            'Pravidelné investování',
          ],
          agreed_actions: [
            'Modelace nového ŽP do 5.4.',
            '3 investiční varianty do 5.4.',
            'Klient dodá smlouvu z ČP do 1.4.',
          ],
          advisor_tasks: [
            { description: 'Modelace ŽP (smrt + invalidita + PN)', priority: 'high', deadline: '2026-04-05' },
            { description: '3 varianty investování', priority: 'medium', deadline: '2026-04-05' },
          ],
          client_tasks: [
            { description: 'Dodat pojistnou smlouvu ČP', priority: 'high', deadline: '2026-04-01' },
            { description: 'Dodat výpis z PS ČSOB', priority: 'medium', deadline: '2026-04-01' },
          ],
          next_contact: { type: 'meeting', date: '2026-04-10', condition: 'Po dodání dokumentů' },
          open_questions: ['Zdravotní stav', 'Majetkové pojištění', 'Přesné pojistné ŽP'],
          notes_for_followup: 'Analytický typ — připravit porovnání variant v tabulce.',
        },
        reviewStatus: 'pending',
      };
      break;
    }
  }

  c.updatedAt = new Date().toISOString();
  cases.set(caseId, c);
  return c;
}

export function approveStep(caseId: string, step: string): MeetingCase | undefined {
  const c = cases.get(caseId);
  if (!c) return undefined;

  const wsKey = step as keyof typeof c.workflowState;
  if (c.workflowState[wsKey]) {
    c.workflowState[wsKey] = 'approved';
  }

  if (step === 'transcription' && c.transcript) c.transcript.reviewStatus = 'approved';
  if (step === 'summary' && c.summary) c.summary.reviewStatus = 'approved';
  if (step === 'profile_update' && c.profileUpdate) c.profileUpdate.reviewStatus = 'approved';
  if (step === 'crm_entry' && c.crmEntry) c.crmEntry.reviewStatus = 'approved';

  c.updatedAt = new Date().toISOString();
  cases.set(caseId, c);
  return c;
}

export function editAndApproveStep(caseId: string, step: string, edits: Record<string, unknown>): MeetingCase | undefined {
  const c = cases.get(caseId);
  if (!c) return undefined;

  const wsKey = step as keyof typeof c.workflowState;
  if (c.workflowState[wsKey]) {
    c.workflowState[wsKey] = 'approved';
  }

  if (step === 'transcription' && c.transcript) {
    if (edits.cleanedText) c.transcript.cleanedText = edits.cleanedText as string;
    c.transcript.reviewStatus = 'edited_and_approved';
  }
  if (step === 'summary' && c.summary) {
    if (edits.content) c.summary.content = edits.content as Record<string, unknown>;
    c.summary.reviewStatus = 'edited_and_approved';
  }
  if (step === 'profile_update' && c.profileUpdate) {
    if (edits.changes) c.profileUpdate.changes = edits.changes as ProfileUpdateData['changes'];
    c.profileUpdate.reviewStatus = 'edited_and_approved';
  }
  if (step === 'crm_entry' && c.crmEntry) {
    if (edits.content) c.crmEntry.content = edits.content as Record<string, unknown>;
    c.crmEntry.reviewStatus = 'edited_and_approved';
  }

  c.updatedAt = new Date().toISOString();
  cases.set(caseId, c);
  return c;
}

// ---------- Client file management ----------

export function addClientFile(clientId: string, file: { filename: string; mimeType: string; sizeBytes: number; purpose: string }): ClientFile | undefined {
  const client = clients.get(clientId);
  if (!client) return undefined;
  const cf: ClientFile = {
    id: `cfile_${String(Date.now()).slice(-6)}_${Math.random().toString(36).slice(2, 5)}`,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    purpose: file.purpose,
    uploadedAt: new Date().toISOString(),
    processed: false,
    extractedData: null,
  };
  client.files.push(cf);
  client.updatedAt = new Date().toISOString();
  return cf;
}

export function removeClientFile(clientId: string, fileId: string): boolean {
  const client = clients.get(clientId);
  if (!client) return false;
  const idx = client.files.findIndex(f => f.id === fileId);
  if (idx === -1) return false;
  client.files.splice(idx, 1);
  client.updatedAt = new Date().toISOString();
  return true;
}

export function processClientFile(clientId: string, fileId: string): { extracted: Record<string, unknown>; profileUpdates: Record<string, unknown> } | undefined {
  const client = clients.get(clientId);
  if (!client) return undefined;
  const file = client.files.find(f => f.id === fileId);
  if (!file) return undefined;

  // Mock AI extraction based on file type
  const extracted = generateMockExtraction(file.filename, file.mimeType, file.purpose, client.name);
  file.processed = true;
  file.extractedData = extracted;

  // Merge extracted data into client profile
  const profile = (client.profile || {}) as any;
  const updates: Record<string, unknown> = {};

  if (extracted.personal) {
    profile.personal = { ...(profile.personal || {}), ...(extracted.personal as any) };
    updates.personal = extracted.personal;
  }
  if (extracted.household) {
    profile.household = { ...(profile.household || {}), ...(extracted.household as any) };
    updates.household = extracted.household;
  }
  if (extracted.economic) {
    profile.economic = { ...(profile.economic || {}), ...(extracted.economic as any) };
    updates.economic = extracted.economic;
  }
  if (extracted.insurance) {
    profile.insurance = { ...(profile.insurance || {}), ...(extracted.insurance as any) };
    updates.insurance = extracted.insurance;
  }
  if (extracted.investments) {
    profile.investments = { ...(profile.investments || {}), ...(extracted.investments as any) };
    updates.investments = extracted.investments;
  }
  if (extracted.credit) {
    profile.credit = { ...(profile.credit || {}), ...(extracted.credit as any) };
    updates.credit = extracted.credit;
  }
  if (extracted.pension) {
    profile.pension = { ...(profile.pension || {}), ...(extracted.pension as any) };
    updates.pension = extracted.pension;
  }
  if (extracted.property_insurance) {
    profile.property_insurance = { ...(profile.property_insurance || {}), ...(extracted.property_insurance as any) };
    updates.property_insurance = extracted.property_insurance;
  }
  if (extracted.health) {
    profile.health = { ...(profile.health || {}), ...(extracted.health as any) };
    updates.health = extracted.health;
  }
  if (extracted.notes) {
    profile.advisor_notes = [...(profile.advisor_notes || []), ...(extracted.notes as string[])];
    updates.notes = extracted.notes;
  }

  client.profile = profile;
  client.updatedAt = new Date().toISOString();

  return { extracted, profileUpdates: updates };
}

function generateMockExtraction(filename: string, mimeType: string, purpose: string, clientName: string): Record<string, unknown> {
  const fn = filename.toLowerCase();

  // Insurance contract
  if (fn.includes('pojist') || fn.includes('smlouva') || purpose === 'existing_contract') {
    return {
      _source: filename,
      _type: 'insurance_contract',
      insurance: {
        provider: 'Česká pojišťovna',
        product_name: 'Životní pojištění FLEXI',
        contract_number: 'ZP-2018-' + Math.floor(Math.random() * 900000 + 100000),
        start_date: '2018-06-01',
        monthly_premium: 1250,
        coverage: {
          death: 500000,
          permanent_disability: 0,
          temporary_disability: 0,
          hospitalization: 0,
          serious_illness: 0,
        },
        beneficiary: 'Zákonní dědici',
        notes: 'Starší smlouva bez krytí invalidity. Doporučena revize.',
      },
    };
  }

  // Pension statement
  if (fn.includes('penzij') || fn.includes('dps') || fn.includes('ps_') || fn.includes('penz')) {
    return {
      _source: filename,
      _type: 'pension_statement',
      pension: {
        provider: 'ČSOB Penzijní společnost',
        product_type: 'Doplňkové penzijní spoření',
        contract_number: 'DPS-' + Math.floor(Math.random() * 900000 + 100000),
        own_contribution: 500,
        employer_contribution: 300,
        total_saved: 85000,
        strategy: 'Vyvážená',
        state_contribution: 130,
        tax_benefit_used: false,
        notes: 'Nízký vlastní příspěvek — nedosahuje na max. státní příspěvek (1000 Kč = 230 Kč).',
      },
    };
  }

  // Mortgage / bank statement
  if (fn.includes('hypot') || fn.includes('uver') || fn.includes('banka') || fn.includes('kb_') || fn.includes('splatk')) {
    return {
      _source: filename,
      _type: 'mortgage_statement',
      credit: {
        type: 'Hypotéka',
        provider: 'Komerční banka',
        original_amount: 3200000,
        remaining_balance: 2200000,
        interest_rate: 3.89,
        monthly_payment: 12500,
        fixation_end: '2027-03',
        maturity: '2043-06',
        property_type: 'Byt 3+kk',
        ltv_ratio: 68.75,
      },
    };
  }

  // Investment statement
  if (fn.includes('invest') || fn.includes('fond') || fn.includes('portf')) {
    return {
      _source: filename,
      _type: 'investment_portfolio',
      investments: {
        total_value: 150000,
        products: [
          { name: 'Spořicí účet', provider: 'Air Bank', value: 150000, type: 'savings', interest_rate: 3.5 },
        ],
        monthly_investment: 0,
        risk_profile: 'Konzervativní',
        notes: 'Žádné investiční fondy. Pouze likvidní rezerva na spořicím účtu.',
      },
    };
  }

  // Transcript / audio recording — primary onboarding, extract rich initial data
  if (fn.includes('transcript') || fn.includes('prepis') || fn.includes('zaznam') || fn.includes('schuzka') ||
      mimeType.startsWith('audio/') || fn.includes('.mp3') || fn.includes('.wav') || fn.includes('.m4a') || purpose === 'meeting_recording') {
    return {
      _source: filename,
      _type: 'meeting_transcript',
      personal: {
        full_name: clientName,
        birth_year: 1985,
        marital_status: 'married',
        health_status: 'Bez omezení',
        smoker: false,
      },
      household: {
        household_members: 4,
        dependents_count: 2,
        housing_type: 'Vlastní byt',
        monthly_housing_costs: 4500,
        children: [
          { age: 8, name: 'Syn' },
          { age: 5, name: 'Dcera' },
        ],
      },
      economic: {
        employment_status: 'employed',
        profession: 'IT manažer',
        net_monthly_income: { amount: 48000, currency: 'CZK' },
        partner_income: { amount: 32000, currency: 'CZK' },
        monthly_expenses: 45000,
        emergency_fund_months: 3.1,
      },
      insurance: {
        provider: 'Česká pojišťovna',
        product_name: 'Životní pojištění FLEXI',
        monthly_premium: 1250,
        coverage: {
          death: 500000,
          permanent_disability: 0,
          temporary_disability: 0,
          hospitalization: 0,
          serious_illness: 0,
        },
        notes: 'Klient zmínil, že má životko jen na smrt 500 tis. Bez invalidity — nedostatečné krytí.',
      },
      credit: {
        type: 'Hypotéka',
        provider: 'Komerční banka',
        remaining_balance: 2200000,
        interest_rate: 3.89,
        monthly_payment: 12500,
        fixation_end: '2027-03',
        property_type: 'Byt 3+kk',
      },
      notes: [
        `Klient ${clientName} zmínil zájem o pravidelné investování, ale má obavy z rizika.`,
        'Manželka zvažuje přechod na OSVČ — možný dopad na příjem domácnosti.',
        'Klient chce mít pojištěnou rodinu do doby splacení hypotéky.',
        'Nemá žádné investice kromě spořicího účtu (cca 150 tis. Kč).',
        'Penzijní spoření — pouze 500 Kč vlastní příspěvek, nedosahuje na max. státní příspěvek.',
      ],
    };
  }

  // Property insurance
  if (fn.includes('majetek') || fn.includes('domacnost') || fn.includes('nemovit') || purpose === 'property_insurance') {
    return {
      _source: filename,
      _type: 'property_insurance',
      property_insurance: {
        provider: 'Kooperativa',
        property_value: 4500000,
        insurance_amount: 4000000,
        monthly_premium: 380,
        coverage: ['požár', 'záplava', 'krádež', 'vandalismus'],
        deductible: 5000,
        liability_included: true,
        liability_amount: 2000000,
      },
    };
  }

  // Advisor notes / generic document
  if (purpose === 'advisor_notes' || fn.includes('poznamk') || fn.includes('.txt') || fn.includes('.docx')) {
    return {
      _source: filename,
      _type: 'advisor_notes',
      health: {
        status: 'Dobrý',
        chronic_conditions: [],
        medications: [],
        last_checkup: '2025-11',
      },
      notes: [
        `Z dokumentu "${filename}": Klient preferuje konzervativní přístup k investicím.`,
        'Důležité: Fixace hypotéky končí za rok — připravit nabídky refinancování.',
        'Klient má zájem o pojištění majetku — aktuálně nepojištěn.',
      ],
    };
  }

  // Fallback
  return {
    _source: filename,
    _type: 'unknown',
    notes: [`Soubor "${filename}" byl nahrán, ale typ dokumentu nebyl automaticky rozpoznán. Vyžaduje manuální kontrolu.`],
  };
}

// ---------- Mock generators ----------

function generateMockTranscript(clientName: string): string {
  return `Poradce: Dobrý den, ${clientName}, děkuji za schůzku. Pojďme se podívat na vaši finanční situaci.

Klient: Dobrý den, rád bych si udělal pořádek v pojištění a začal investovat.

Poradce: Výborně. Jaký máte měsíční příjem?

Klient: Čistého mám kolem 48 tisíc.

Poradce: A jaké máte výdaje?

Klient: Na domácnost jde asi 45 tisíc, k tomu splácím hypotéku 12 500.

Poradce: Máte životní pojištění?

Klient: Mám u České pojišťovny, ale jen na smrt 500 tisíc. Nemám tam invaliditu.

Poradce: To je pro vaši situaci nedostatečné. Připravím vám návrh lepšího krytí.`;
}

function generateMockSummary(clientName: string): Record<string, unknown> {
  return {
    meeting_context: {
      participants: [
        { name: 'Poradce', role: 'advisor' },
        { name: clientName, role: 'client' },
      ],
      meeting_type: 'initial',
    },
    discussed_topics: [
      { topic: 'Životní pojištění', category: 'insurance', key_points: ['Stávající ŽP nedostatečné', 'Chybí krytí invalidity'] },
      { topic: 'Investice', category: 'investment', key_points: ['Zájem o pravidelné investování', 'Obavy z rizika'] },
    ],
    financial_facts: [
      { fact: `Čistý příjem ${clientName}: 48 000 Kč`, confidence: 'confirmed', source: 'client_statement' },
    ],
    next_step: 'Poradce připraví modelace, další schůzka za 2 týdny.',
  };
}
