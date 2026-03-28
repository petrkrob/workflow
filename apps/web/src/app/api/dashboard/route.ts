import { NextResponse } from 'next/server';
import { getAllClients, getAllCases } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clients = getAllClients();
  const cases = getAllCases();

  // Aggregate portfolio stats
  let totalMonthlyIncome = 0;
  let totalMonthlyExpenses = 0;
  let totalInsurancePremium = 0;
  let totalCreditPayments = 0;
  let totalPensionContribution = 0;
  let totalInvestmentValue = 0;
  let totalDebt = 0;

  const alerts: Array<{ type: 'danger' | 'warning' | 'info'; clientId: string; clientName: string; message: string }> = [];
  const upcomingEvents: Array<{ date: string; clientId: string; clientName: string; event: string; type: 'fixation' | 'meeting' | 'task' }> = [];

  for (const client of clients) {
    const p = client.profile as any;
    if (!p) {
      alerts.push({ type: 'warning', clientId: client.id, clientName: client.name, message: 'Nemá vyplněný profil — chybí základní údaje.' });
      continue;
    }

    const income = p.economic?.net_monthly_income?.amount || 0;
    const partnerIncome = p.economic?.partner_income?.amount || 0;
    totalMonthlyIncome += income + partnerIncome;
    totalMonthlyExpenses += p.economic?.monthly_expenses || 0;

    // Insurance analysis
    if (p.insurance) {
      totalInsurancePremium += p.insurance.monthly_premium || 0;
      const cov = p.insurance.coverage;
      if (cov) {
        if (!cov.permanent_disability || cov.permanent_disability === 0) {
          alerts.push({ type: 'danger', clientId: client.id, clientName: client.name, message: 'Chybí krytí trvalé invalidity v životním pojištění.' });
        }
        if (!cov.temporary_disability || cov.temporary_disability === 0) {
          alerts.push({ type: 'warning', clientId: client.id, clientName: client.name, message: 'Nemá krytí pracovní neschopnosti.' });
        }
        if (cov.death && cov.death < (income * 36)) {
          alerts.push({ type: 'warning', clientId: client.id, clientName: client.name, message: `Pojistná částka na smrt (${(cov.death/1000).toFixed(0)} tis.) je nízká vzhledem k příjmu.` });
        }
      }
    } else if (income > 0) {
      alerts.push({ type: 'danger', clientId: client.id, clientName: client.name, message: 'Nemá žádné životní pojištění.' });
    }

    // Credit analysis
    if (p.credit) {
      totalCreditPayments += p.credit.monthly_payment || 0;
      totalDebt += p.credit.remaining_balance || 0;
      if (p.credit.fixation_end) {
        const fixEnd = p.credit.fixation_end;
        const now = new Date();
        const fixDate = new Date(fixEnd.length === 7 ? fixEnd + '-01' : fixEnd);
        const monthsLeft = (fixDate.getFullYear() - now.getFullYear()) * 12 + (fixDate.getMonth() - now.getMonth());
        if (monthsLeft <= 12 && monthsLeft > 0) {
          alerts.push({ type: 'warning', clientId: client.id, clientName: client.name, message: `Fixace hypotéky končí za ${monthsLeft} měsíců (${fixEnd}). Připravit refinancování.` });
          upcomingEvents.push({ date: fixEnd, clientId: client.id, clientName: client.name, event: `Konec fixace hypotéky (${p.credit.interest_rate}%)`, type: 'fixation' });
        } else if (monthsLeft <= 0) {
          alerts.push({ type: 'danger', clientId: client.id, clientName: client.name, message: `Fixace hypotéky již skončila (${fixEnd})! Nutné řešit.` });
        }
      }
    }

    // Pension analysis
    if (p.pension) {
      totalPensionContribution += (p.pension.own_contribution || 0) + (p.pension.employer_contribution || 0);
      if (p.pension.own_contribution && p.pension.own_contribution < 1000) {
        alerts.push({ type: 'info', clientId: client.id, clientName: client.name, message: `Penzijní příspěvek ${p.pension.own_contribution} Kč — nedosahuje na max. státní příspěvek (1 700 Kč → 230 Kč).` });
      }
      if (p.pension.tax_benefit_used === false) {
        alerts.push({ type: 'info', clientId: client.id, clientName: client.name, message: 'Nevyužívá daňové zvýhodnění u penzijního spoření.' });
      }
    } else {
      alerts.push({ type: 'warning', clientId: client.id, clientName: client.name, message: 'Nemá penzijní spoření.' });
    }

    // Investment analysis
    if (p.investments) {
      totalInvestmentValue += p.investments.total_value || 0;
      if (!p.investments.monthly_investment || p.investments.monthly_investment === 0) {
        alerts.push({ type: 'info', clientId: client.id, clientName: client.name, message: 'Neinvestuje pravidelně.' });
      }
    }

    // Property insurance
    if (p.household?.housing_type === 'Vlastní byt' && !p.property_insurance) {
      alerts.push({ type: 'warning', clientId: client.id, clientName: client.name, message: 'Vlastní nemovitost, ale nemá pojištění majetku.' });
    }

    // Emergency fund
    if (p.economic?.emergency_fund_months !== undefined && p.economic.emergency_fund_months < 3) {
      alerts.push({ type: 'warning', clientId: client.id, clientName: client.name, message: `Nízká finanční rezerva — pouze ${p.economic.emergency_fund_months} měsíců výdajů.` });
    }
  }

  // Sort alerts: danger first, then warning, then info
  const alertOrder = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => alertOrder[a.type] - alertOrder[b.type]);

  // Client summary for the list
  const clientSummaries = clients.map(c => {
    const p = c.profile as any;
    const clientCases = cases.filter(cs => cs.clientId === c.id);
    const profileSections = p ? Object.keys(p).filter(k => p[k] !== null && p[k] !== undefined).length : 0;

    return {
      id: c.id,
      name: c.name,
      profession: p?.economic?.profession || null,
      income: p?.economic?.net_monthly_income?.amount || null,
      hasInsurance: !!p?.insurance,
      hasCredit: !!p?.credit,
      hasPension: !!p?.pension,
      hasInvestments: !!p?.investments,
      profileSections,
      filesCount: c.files.length,
      casesCount: clientCases.length,
      alertsCount: alerts.filter(a => a.clientId === c.id).length,
      dangerCount: alerts.filter(a => a.clientId === c.id && a.type === 'danger').length,
    };
  });

  return NextResponse.json({
    stats: {
      totalClients: clients.length,
      totalCases: cases.length,
      totalMonthlyIncome,
      totalMonthlyExpenses,
      totalInsurancePremium,
      totalCreditPayments,
      totalPensionContribution,
      totalInvestmentValue,
      totalDebt,
    },
    alerts,
    upcomingEvents,
    clientSummaries,
  });
}
