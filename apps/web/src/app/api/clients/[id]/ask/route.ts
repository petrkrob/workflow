import { NextRequest, NextResponse } from 'next/server';
import { getClient, getAllCases } from '@/lib/store';

/**
 * Mock Q&A about a client.
 * In production, this would send all client context to an LLM and return the answer.
 * For now, it searches through client data and returns relevant info.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = getClient(params.id);
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { question } = await request.json();
  if (!question) {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }

  const allCases = getAllCases().filter(c => c.clientId === params.id);

  // Build full context about client
  const context = buildClientContext(client, allCases);

  // Mock AI response — keyword-based search through context
  const answer = generateMockAnswer(question.toLowerCase(), context, client);

  return NextResponse.json({
    question,
    answer,
    sources: context.sources,
  });
}

interface ClientContext {
  profile: Record<string, unknown> | null;
  facts: string[];
  topics: string[];
  tasks: string[];
  missing: string[];
  transcript: string;
  sources: string[];
}

function buildClientContext(client: any, cases: any[]): ClientContext {
  const facts: string[] = [];
  const topics: string[] = [];
  const tasks: string[] = [];
  const missing: string[] = [];
  const sources: string[] = [];
  let transcript = '';

  for (const c of cases) {
    if (c.transcript) {
      transcript += c.transcript.cleanedText + '\n\n';
      sources.push(`Prepis schuzky ${c.meetingDate}`);
    }
    if (c.summary?.content) {
      const content = c.summary.content as any;
      for (const f of (content.financial_facts || [])) {
        facts.push(f.fact + (f.confidence === 'confirmed' ? ' (potvrzeno)' : ' (zmineno)'));
      }
      for (const t of (content.discussed_topics || [])) {
        topics.push(`${t.topic}: ${(t.key_points || []).join(', ')}`);
      }
      for (const t of (content.advisor_tasks || [])) {
        tasks.push(`Poradce: ${t.description} (${t.priority}, ${t.deadline || 'bez terminu'})`);
      }
      for (const t of (content.client_tasks || [])) {
        tasks.push(`Klient: ${t.description} (${t.priority}, ${t.deadline || 'bez terminu'})`);
      }
      for (const m of (content.missing_information || [])) {
        missing.push(`${m.description} — ${m.suggested_question}`);
      }
      sources.push(`Souhrn schuzky ${c.meetingDate}`);
    }
    if (c.crmEntry?.content) {
      sources.push(`CRM zapis ${c.meetingDate}`);
    }
  }

  return { profile: client.profile, facts, topics, tasks, missing, transcript, sources };
}

function generateMockAnswer(q: string, ctx: ClientContext, client: any): string {
  const profile = ctx.profile as any;

  // Income questions
  if (q.includes('prijem') || q.includes('příjem') || q.includes('vydelavat') || q.includes('vydělávat') || q.includes('plat')) {
    const income = profile?.economic?.net_monthly_income;
    const facts = ctx.facts.filter(f => f.toLowerCase().includes('příjem') || f.toLowerCase().includes('prijem'));
    if (income) {
      return `${client.name} má čistý měsíční příjem ${income.amount?.toLocaleString('cs-CZ')} ${income.currency}. ${facts.length > 0 ? 'Další zjištěné informace: ' + facts.join('; ') : ''}`;
    }
    return facts.length > 0 ? facts.join('\n') : 'Informace o příjmu nejsou k dispozici.';
  }

  // Insurance questions
  if (q.includes('pojist') || q.includes('pojišt')) {
    const topics = ctx.topics.filter(t => t.toLowerCase().includes('pojist') || t.toLowerCase().includes('pojišt'));
    const facts = ctx.facts.filter(f => f.toLowerCase().includes('pojist') || f.toLowerCase().includes('pojišt'));
    if (topics.length > 0 || facts.length > 0) {
      return [...topics, ...facts].join('\n');
    }
    return 'Informace o pojištění nejsou k dispozici.';
  }

  // Mortgage / hypoteka
  if (q.includes('hypot') || q.includes('nemovit')) {
    const topics = ctx.topics.filter(t => t.toLowerCase().includes('hypot'));
    const facts = ctx.facts.filter(f => f.toLowerCase().includes('hypot'));
    if (topics.length > 0 || facts.length > 0) {
      return [...topics, ...facts].join('\n');
    }
    return 'Informace o hypotéce nejsou k dispozici.';
  }

  // Investment questions
  if (q.includes('invest') || q.includes('spoř') || q.includes('spor')) {
    const topics = ctx.topics.filter(t => t.toLowerCase().includes('invest') || t.toLowerCase().includes('spoř'));
    const facts = ctx.facts.filter(f => f.toLowerCase().includes('invest') || f.toLowerCase().includes('spoř') || f.toLowerCase().includes('rezerv'));
    if (topics.length > 0 || facts.length > 0) {
      return [...topics, ...facts].join('\n');
    }
    return 'Informace o investicích nejsou k dispozici.';
  }

  // Tasks / ukoly
  if (q.includes('ukol') || q.includes('úkol') || q.includes('udelat') || q.includes('udělat') || q.includes('dodat')) {
    if (ctx.tasks.length > 0) {
      return 'Otevřené úkoly:\n' + ctx.tasks.map(t => `• ${t}`).join('\n');
    }
    return 'Žádné otevřené úkoly.';
  }

  // Missing info
  if (q.includes('chybi') || q.includes('chybí') || q.includes('doplnit') || q.includes('doplň') || q.includes('nevime') || q.includes('nevíme')) {
    if (ctx.missing.length > 0) {
      return 'Chybějící informace:\n' + ctx.missing.map(m => `• ${m}`).join('\n');
    }
    return 'Nemáme evidované chybějící informace.';
  }

  // Family / rodina
  if (q.includes('rodin') || q.includes('manzel') || q.includes('manžel') || q.includes('deti') || q.includes('děti') || q.includes('dítě')) {
    const household = profile?.household;
    const personal = profile?.personal;
    const parts: string[] = [];
    if (personal?.marital_status) parts.push(`Rodinný stav: ${personal.marital_status === 'married' ? 'ženatý/vdaná' : personal.marital_status === 'single' ? 'svobodný/á' : personal.marital_status}`);
    if (household?.dependents_count) parts.push(`Počet vyživovaných osob: ${household.dependents_count}`);
    if (household?.household_members) parts.push(`Členů domácnosti: ${household.household_members}`);
    const facts = ctx.facts.filter(f => f.toLowerCase().includes('manžel') || f.toLowerCase().includes('manzel'));
    return parts.length > 0 || facts.length > 0 ? [...parts, ...facts].join('\n') : 'Informace o rodině nejsou k dispozici.';
  }

  // Profession
  if (q.includes('praci') || q.includes('práci') || q.includes('zamestnan') || q.includes('zaměstnan') || q.includes('profes')) {
    if (profile?.economic) {
      const eco = profile.economic as any;
      return `Zaměstnání: ${eco.employment_status === 'employed' ? 'zaměstnanec' : eco.employment_status === 'self_employed' ? 'OSVČ' : eco.employment_status}, profese: ${eco.profession || 'neuvedeno'}`;
    }
    return 'Informace o zaměstnání nejsou k dispozici.';
  }

  // Souhrn / summary — general overview
  if (q.includes('souhrn') || q.includes('shrnout') || q.includes('vsechno') || q.includes('všechno') || q.includes('prehled') || q.includes('přehled') || q.includes('celkov')) {
    const parts: string[] = [];
    parts.push(`Klient: ${client.name}`);
    if (profile?.personal) {
      const p = profile.personal as any;
      parts.push(`Rok narození: ${p.birth_year || '?'}, stav: ${p.marital_status === 'married' ? 'ženatý' : p.marital_status === 'single' ? 'svobodný' : p.marital_status || '?'}`);
    }
    if (profile?.economic) {
      const e = profile.economic as any;
      parts.push(`Profese: ${e.profession || '?'}, příjem: ${e.net_monthly_income?.amount?.toLocaleString('cs-CZ') || '?'} Kč`);
    }
    if (ctx.facts.length > 0) {
      parts.push('\nFinanční fakta:');
      ctx.facts.forEach(f => parts.push(`• ${f}`));
    }
    if (ctx.tasks.length > 0) {
      parts.push('\nÚkoly:');
      ctx.tasks.forEach(t => parts.push(`• ${t}`));
    }
    if (ctx.missing.length > 0) {
      parts.push('\nChybějící informace:');
      ctx.missing.forEach(m => parts.push(`• ${m}`));
    }
    return parts.join('\n');
  }

  // Default — search through all context
  const allText = [...ctx.facts, ...ctx.topics, ...ctx.tasks, ...ctx.missing].join('\n');
  const words = q.split(/\s+/).filter(w => w.length > 2);
  const matches = allText.split('\n').filter(line =>
    words.some(w => line.toLowerCase().includes(w))
  );

  if (matches.length > 0) {
    return matches.join('\n');
  }

  return `Na základě dostupných dat o klientovi ${client.name} nemám přímou odpověď na tuto otázku. Zkuste se zeptat na: příjmy, pojištění, hypotéku, investice, úkoly, chybějící informace, nebo celkový přehled.`;
}
