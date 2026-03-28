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

  const allCases = getAllCases().filter(c => c.clientId === params.id);
  const profile = client.profile as any;

  // Aggregate all data
  const facts: Array<{ fact: string; confidence: string }> = [];
  const topics: Array<{ topic: string; category: string; keyPoints: string[] }> = [];
  const advisorTasks: Array<{ description: string; priority: string; deadline?: string }> = [];
  const clientTasks: Array<{ description: string; priority: string; deadline?: string }> = [];
  const missingInfo: Array<{ description: string; importance: string; suggestedQuestion: string }> = [];
  let nextStep = '';

  for (const c of allCases) {
    if (c.summary?.content) {
      const content = c.summary.content as any;
      for (const f of (content.financial_facts || [])) facts.push(f);
      for (const t of (content.discussed_topics || [])) {
        topics.push({ topic: t.topic, category: t.category, keyPoints: t.key_points || [] });
      }
      for (const t of (content.advisor_tasks || [])) advisorTasks.push(t);
      for (const t of (content.client_tasks || [])) clientTasks.push(t);
      for (const m of (content.missing_information || [])) missingInfo.push(m);
      if (content.next_step) nextStep = content.next_step;
    }
  }

  // Build financial analysis from facts
  const income = facts.find(f => f.fact.toLowerCase().includes('příjem') && !f.fact.toLowerCase().includes('manžel'));
  const partnerIncome = facts.find(f => f.fact.toLowerCase().includes('manžel') && f.fact.toLowerCase().includes('příjem'));
  const expenses = facts.find(f => f.fact.toLowerCase().includes('výdaj'));
  const mortgage = facts.find(f => f.fact.toLowerCase().includes('hypot'));
  const savings = facts.find(f => f.fact.toLowerCase().includes('rezerv') || f.fact.toLowerCase().includes('spoř'));

  // Categorize topics
  const insuranceTopics = topics.filter(t => t.category === 'insurance');
  const investmentTopics = topics.filter(t => t.category === 'investment');
  const mortgageTopics = topics.filter(t => t.category === 'mortgage');
  const otherTopics = topics.filter(t => !['insurance', 'investment', 'mortgage'].includes(t.category));

  // Generate recommendations based on data
  const recommendations: Array<{ title: string; priority: string; description: string; category: string }> = [];

  // Insurance recommendations
  for (const t of insuranceTopics) {
    const hasInsufficient = t.keyPoints.some(p => p.toLowerCase().includes('nedostat') || p.toLowerCase().includes('bez krytí') || p.toLowerCase().includes('chybí'));
    if (hasInsufficient) {
      recommendations.push({
        title: 'Revize životního pojištění',
        priority: 'high',
        description: t.keyPoints.join('. ') + '. Doporučujeme navýšení krytí a doplnění o invaliditu a pracovní neschopnost.',
        category: 'insurance',
      });
    }
  }

  // Investment recommendations
  for (const t of investmentTopics) {
    recommendations.push({
      title: 'Zahájení pravidelného investování',
      priority: 'medium',
      description: t.keyPoints.join('. ') + '. Doporučujeme konzervativní start s postupným navyšováním.',
      category: 'investment',
    });
  }

  // Mortgage recommendations
  for (const t of mortgageTopics) {
    const fixaceEnding = t.keyPoints.some(p => p.toLowerCase().includes('fixace'));
    if (fixaceEnding) {
      recommendations.push({
        title: 'Refinancování hypotéky',
        priority: 'medium',
        description: t.keyPoints.join('. ') + '. Doporučujeme porovnat nabídky před koncem fixace.',
        category: 'mortgage',
      });
    }
  }

  // Emergency fund recommendation
  if (savings) {
    const incomeAmount = profile?.economic?.net_monthly_income?.amount || 48000;
    const savingsMatch = savings.fact.match(/[\d\s]+/);
    if (savingsMatch) {
      const savingsAmount = parseInt(savingsMatch[0].replace(/\s/g, ''));
      const monthsCovered = savingsAmount / incomeAmount;
      if (monthsCovered < 6) {
        recommendations.push({
          title: 'Doplnění nouzové rezervy',
          priority: monthsCovered < 3 ? 'high' : 'medium',
          description: `Aktuální rezerva ${savings.fact} pokrývá přibližně ${monthsCovered.toFixed(1)} měsíců výdajů. Doporučujeme navýšit na 6měsíční rezervu.`,
          category: 'savings',
        });
      }
    }
  }

  // If no recommendations were generated, add defaults
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Komplexní finanční analýza',
      priority: 'medium',
      description: 'Na základě dostupných dat doporučujeme provést kompletní finanční analýzu zahrnující pojištění, investice a plánování.',
      category: 'general',
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const lastMeeting = allCases.length > 0 ? allCases[0].meetingDate : today;

  const html = generatePlanHTML({
    clientName: client.name,
    profile,
    date: today,
    lastMeeting,
    income,
    partnerIncome,
    expenses,
    mortgage,
    savings,
    facts,
    insuranceTopics,
    investmentTopics,
    mortgageTopics,
    otherTopics,
    recommendations,
    advisorTasks,
    clientTasks,
    missingInfo,
    nextStep,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function generatePlanHTML(data: any): string {
  const {
    clientName, profile, date, lastMeeting,
    income, partnerIncome, expenses, mortgage, savings,
    facts, insuranceTopics, investmentTopics, mortgageTopics, otherTopics,
    recommendations, advisorTasks, clientTasks, missingInfo, nextStep,
  } = data;

  const personal = profile?.personal || {};
  const household = profile?.household || {};
  const economic = profile?.economic || {};

  const recHTML = recommendations.map((r: any) => `
    <div class="rec-card rec-${r.priority}">
      <div class="rec-header">
        <span class="rec-title">${r.title}</span>
        <span class="badge badge-${r.priority}">${r.priority === 'high' ? 'Vysoka priorita' : r.priority === 'medium' ? 'Stredni priorita' : 'Nizka priorita'}</span>
      </div>
      <p>${r.description}</p>
    </div>
  `).join('');

  const topicsHTML = (topics: any[], title: string, icon: string) => {
    if (topics.length === 0) return '';
    return `
      <div class="topic-section">
        <h3>${icon} ${title}</h3>
        ${topics.map((t: any) => `
          <div class="topic-card">
            <h4>${t.topic}</h4>
            <ul>${t.keyPoints.map((p: string) => `<li>${p}</li>`).join('')}</ul>
          </div>
        `).join('')}
      </div>
    `;
  };

  const factsHTML = facts.map((f: any) => `
    <tr>
      <td>${f.fact}</td>
      <td><span class="badge badge-${f.confidence === 'confirmed' ? 'confirmed' : 'mentioned'}">${f.confidence === 'confirmed' ? 'Potvrzeno' : 'Zmineno'}</span></td>
    </tr>
  `).join('');

  const tasksHTML = (tasks: any[], title: string) => {
    if (tasks.length === 0) return '';
    return `
      <h3>${title}</h3>
      <table>
        <thead><tr><th>Ukol</th><th>Priorita</th><th>Termin</th></tr></thead>
        <tbody>
          ${tasks.map((t: any) => `
            <tr>
              <td>${t.description}</td>
              <td><span class="badge badge-${t.priority === 'high' ? 'high' : 'medium'}">${t.priority}</span></td>
              <td>${t.deadline || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const missingHTML = missingInfo.length > 0 ? `
    <div class="missing-section">
      <h3>Chybejici informace</h3>
      ${missingInfo.map((m: any) => `
        <div class="missing-item missing-${m.importance}">
          <strong>${m.description}</strong>
          <p class="suggested-q">${m.suggestedQuestion}</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Financni plan — ${clientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1f2937; line-height: 1.6; background: #f9fafb; }

    .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }

    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 48px 40px; border-radius: 16px; margin-bottom: 32px; }
    .header h1 { font-size: 28px; margin-bottom: 4px; }
    .header .subtitle { font-size: 16px; opacity: 0.85; }
    .header .meta { margin-top: 20px; display: flex; gap: 32px; font-size: 14px; opacity: 0.9; }

    .section { background: white; border-radius: 12px; padding: 28px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .section h2 { font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    .section h3 { font-size: 16px; margin: 16px 0 10px; color: #374151; }

    .profile-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
    .profile-col h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; }
    .profile-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .profile-row .label { color: #6b7280; }
    .profile-row .value { font-weight: 600; }

    .cashflow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .cashflow-item { padding: 16px; border-radius: 10px; text-align: center; }
    .cashflow-item.income { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .cashflow-item.expense { background: #fef2f2; border: 1px solid #fecaca; }
    .cashflow-item .amount { font-size: 24px; font-weight: 700; margin: 4px 0; }
    .cashflow-item .desc { font-size: 13px; color: #6b7280; }

    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; }

    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-confirmed { background: #d1fae5; color: #065f46; }
    .badge-mentioned { background: #fef3c7; color: #92400e; }
    .badge-high { background: #fee2e2; color: #991b1b; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #dbeafe; color: #1e40af; }

    .topic-section { margin-bottom: 16px; }
    .topic-card { background: #f9fafb; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border-left: 3px solid #3b82f6; }
    .topic-card h4 { font-size: 15px; margin-bottom: 6px; }
    .topic-card ul { padding-left: 20px; font-size: 14px; }
    .topic-card li { margin-bottom: 3px; }

    .rec-card { padding: 16px; border-radius: 10px; margin-bottom: 12px; }
    .rec-high { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; }
    .rec-medium { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; }
    .rec-low { background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; }
    .rec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .rec-title { font-weight: 700; font-size: 15px; }
    .rec-card p { font-size: 14px; color: #4b5563; }

    .missing-item { padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; }
    .missing-critical { background: #fef2f2; border-left: 3px solid #dc2626; }
    .missing-important { background: #fffbeb; border-left: 3px solid #f59e0b; }
    .missing-item strong { font-size: 14px; }
    .suggested-q { font-size: 13px; color: #6b7280; font-style: italic; margin-top: 2px; }

    .next-step { background: #eff6ff; border-radius: 10px; padding: 16px 20px; font-size: 15px; margin-top: 12px; }
    .next-step strong { color: #1e40af; }

    .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }

    @media print {
      body { background: white; }
      .container { padding: 0; }
      .header { border-radius: 0; }
      .section { box-shadow: none; border: 1px solid #e5e7eb; }
      .no-print { display: none; }
    }

    .print-btn { position: fixed; top: 16px; right: 16px; padding: 10px 20px; background: #1e40af; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; z-index: 100; }
    .print-btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Vytisknout / PDF</button>

  <div class="container">
    <div class="header">
      <h1>Financni plan</h1>
      <div class="subtitle">${clientName}</div>
      <div class="meta">
        <span>Datum: ${date}</span>
        <span>Posledni schuzka: ${lastMeeting}</span>
        ${personal.birth_year ? `<span>Rok narozeni: ${personal.birth_year}</span>` : ''}
        ${household.household_members ? `<span>Domacnost: ${household.household_members} osob</span>` : ''}
      </div>
    </div>

    <!-- 1. Osobni profil -->
    <div class="section">
      <h2>1. Osobni profil</h2>
      <div class="profile-grid">
        <div class="profile-col">
          <h4>Osobni udaje</h4>
          <div class="profile-row"><span class="label">Jmeno</span><span class="value">${personal.full_name || clientName}</span></div>
          <div class="profile-row"><span class="label">Rok narozeni</span><span class="value">${personal.birth_year || '—'}</span></div>
          <div class="profile-row"><span class="label">Rodinny stav</span><span class="value">${personal.marital_status === 'married' ? 'Zenaty/vdana' : personal.marital_status === 'single' ? 'Svobodny/a' : personal.marital_status || '—'}</span></div>
        </div>
        <div class="profile-col">
          <h4>Domacnost</h4>
          <div class="profile-row"><span class="label">Clenu</span><span class="value">${household.household_members || '—'}</span></div>
          <div class="profile-row"><span class="label">Vyzivovanych</span><span class="value">${household.dependents_count || '—'}</span></div>
        </div>
        <div class="profile-col">
          <h4>Ekonomika</h4>
          <div class="profile-row"><span class="label">Status</span><span class="value">${economic.employment_status === 'employed' ? 'Zamestnanec' : economic.employment_status === 'self_employed' ? 'OSVC' : economic.employment_status || '—'}</span></div>
          <div class="profile-row"><span class="label">Profese</span><span class="value">${economic.profession || '—'}</span></div>
          <div class="profile-row"><span class="label">Prijem</span><span class="value">${economic.net_monthly_income ? economic.net_monthly_income.amount?.toLocaleString('cs-CZ') + ' CZK' : '—'}</span></div>
        </div>
      </div>
    </div>

    <!-- 2. Cashflow -->
    <div class="section">
      <h2>2. Prehled cashflow</h2>
      <div class="cashflow">
        <div class="cashflow-item income">
          <div class="desc">Mesicni prijmy</div>
          <div class="amount" style="color:#16a34a">${income ? income.fact : (economic.net_monthly_income ? economic.net_monthly_income.amount?.toLocaleString('cs-CZ') + ' Kc' : '—')}</div>
          ${partnerIncome ? `<div class="desc">Partner: ${partnerIncome.fact}</div>` : ''}
        </div>
        <div class="cashflow-item expense">
          <div class="desc">Mesicni vydaje</div>
          <div class="amount" style="color:#dc2626">${expenses ? expenses.fact : '—'}</div>
          ${mortgage ? `<div class="desc">Hypoteka: ${mortgage.fact}</div>` : ''}
        </div>
      </div>
      ${savings ? `<div style="background:#f0fdf4;padding:12px 16px;border-radius:8px;font-size:14px;margin-top:8px"><strong>Likvidni rezerva:</strong> ${savings.fact}</div>` : ''}
    </div>

    <!-- 3. Financni fakta -->
    ${facts.length > 0 ? `
    <div class="section">
      <h2>3. Zjistene financni udaje</h2>
      <table>
        <thead><tr><th>Udaj</th><th>Overeni</th></tr></thead>
        <tbody>${factsHTML}</tbody>
      </table>
    </div>
    ` : ''}

    <!-- 4. Analyzovane oblasti -->
    <div class="section">
      <h2>4. Analyzovane oblasti</h2>
      ${topicsHTML(insuranceTopics, 'Pojisteni', '🛡')}
      ${topicsHTML(investmentTopics, 'Investice a sporeni', '📈')}
      ${topicsHTML(mortgageTopics, 'Hypoteka a uvery', '🏠')}
      ${topicsHTML(otherTopics, 'Dalsi oblasti', '📋')}
    </div>

    <!-- 5. Doporuceni -->
    <div class="section">
      <h2>5. Doporuceni</h2>
      ${recHTML}
    </div>

    <!-- 6. Akcni plan -->
    <div class="section">
      <h2>6. Akcni plan</h2>
      ${tasksHTML(advisorTasks, 'Ukoly poradce')}
      ${tasksHTML(clientTasks, 'Ukoly klienta')}
      ${nextStep ? `<div class="next-step"><strong>Dalsi krok:</strong> ${nextStep}</div>` : ''}
    </div>

    <!-- 7. Chybejici informace -->
    ${missingHTML}

    <div class="footer">
      <p>Dokument vygenerovan: ${date} | FAW Platform | Tento dokument je pouze informativni a nepredstavuje financni poradenstvi.</p>
    </div>
  </div>
</body>
</html>`;
}
