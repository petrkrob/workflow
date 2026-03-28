'use client';

import { useState, useEffect } from 'react';

interface DashboardData {
  stats: {
    totalClients: number;
    totalCases: number;
    totalMonthlyIncome: number;
    totalMonthlyExpenses: number;
    totalInsurancePremium: number;
    totalCreditPayments: number;
    totalPensionContribution: number;
    totalInvestmentValue: number;
    totalDebt: number;
  };
  alerts: Array<{ type: 'danger' | 'warning' | 'info'; clientId: string; clientName: string; message: string }>;
  upcomingEvents: Array<{ date: string; clientId: string; clientName: string; event: string; type: string }>;
  clientSummaries: Array<{
    id: string; name: string; profession: string | null; income: number | null;
    hasInsurance: boolean; hasCredit: boolean; hasPension: boolean; hasInvestments: boolean;
    profileSections: number; filesCount: number; casesCount: number; alertsCount: number; dangerCount: number;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alertFilter, setAlertFilter] = useState<'all' | 'danger' | 'warning' | 'info'>('all');

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nacitam dashboard...</div>;

  const { stats, alerts, clientSummaries } = data;
  const filteredAlerts = alertFilter === 'all' ? alerts : alerts.filter(a => a.type === alertFilter);
  const dangerCount = alerts.filter(a => a.type === 'danger').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)} mil` : n >= 1000 ? `${Math.round(n / 1000)} tis` : String(n);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 2 }}>
            Prehled portfolia — {stats.totalClients} {stats.totalClients === 1 ? 'klient' : stats.totalClients < 5 ? 'klienti' : 'klientu'}
          </p>
        </div>
        <a href="/clients"><button className="btn-primary">+ Pridat klienta</button></a>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <MetricCard label="Klientu" value={String(stats.totalClients)} color="var(--primary)" />
        <MetricCard label="Celkovy mesicni prijem" value={`${fmtK(stats.totalMonthlyIncome)} Kc`} color="var(--success)" />
        <MetricCard label="Investicni majetek" value={`${fmtK(stats.totalInvestmentValue)} Kc`} color="var(--info)" />
        <MetricCard label="Celkovy dluh" value={stats.totalDebt > 0 ? `${fmtK(stats.totalDebt)} Kc` : '0 Kc'} color={stats.totalDebt > 0 ? 'var(--danger)' : 'var(--success)'} />
      </div>

      {/* Monthly cash flow breakdown */}
      <div className="card section">
        <h3>Mesicni prehled portfolia</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <MiniStat label="Prijmy" value={`${fmtK(stats.totalMonthlyIncome)} Kc`} icon="+" color="#16a34a" />
          <MiniStat label="Vydaje" value={`${fmtK(stats.totalMonthlyExpenses)} Kc`} icon="-" color="#dc2626" />
          <MiniStat label="Pojistne" value={`${fmtK(stats.totalInsurancePremium)} Kc`} icon="&#9741;" color="#2563eb" />
          <MiniStat label="Splatky uveru" value={`${fmtK(stats.totalCreditPayments)} Kc`} icon="&#9878;" color="#9333ea" />
          <MiniStat label="Penzijni sporeni" value={`${fmtK(stats.totalPensionContribution)} Kc`} icon="&#9734;" color="#f59e0b" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Alerts */}
        <div className="card section" style={{ gridColumn: alerts.length > 5 ? '1 / -1' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, border: 'none', padding: 0 }}>
              Upozorneni ({alerts.length})
              {dangerCount > 0 && <span style={{ marginLeft: 8, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{dangerCount} kriticke</span>}
              {warningCount > 0 && <span style={{ marginLeft: 4, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{warningCount} dulezite</span>}
            </h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'danger', 'warning', 'info'] as const).map(f => (
                <button key={f} onClick={() => setAlertFilter(f)}
                  style={{
                    padding: '4px 10px', fontSize: 12, borderRadius: 12, border: '1px solid var(--border)',
                    background: alertFilter === f ? (f === 'danger' ? '#fee2e2' : f === 'warning' ? '#fef3c7' : f === 'info' ? '#dbeafe' : 'var(--primary)') : 'white',
                    color: alertFilter === f ? (f === 'danger' ? '#991b1b' : f === 'warning' ? '#92400e' : f === 'info' ? '#1e40af' : 'white') : '#6b7280',
                    cursor: 'pointer',
                  }}>
                  {f === 'all' ? 'Vse' : f === 'danger' ? 'Kriticke' : f === 'warning' ? 'Dulezite' : 'Info'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filteredAlerts.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, padding: 12 }}>Zadna upozorneni.</p>
            ) : filteredAlerts.map((alert, i) => (
              <div key={i}
                onClick={() => window.location.href = `/clients/${alert.clientId}`}
                style={{
                  display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                  background: alert.type === 'danger' ? '#fef2f2' : alert.type === 'warning' ? '#fffbeb' : '#eff6ff',
                  borderLeft: `3px solid ${alert.type === 'danger' ? '#dc2626' : alert.type === 'warning' ? '#f59e0b' : '#2563eb'}`,
                }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: alert.type === 'danger' ? '#991b1b' : alert.type === 'warning' ? '#92400e' : '#1e40af' }}>
                    {alert.clientName}
                  </span>
                  <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client overview */}
        <div className="card section">
          <h3>Klienti — pokryti</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {clientSummaries.map(c => (
              <div key={c.id}
                onClick={() => window.location.href = `/clients/${c.id}`}
                style={{
                  padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8,
                  cursor: 'pointer', transition: 'border-color 0.2s',
                  borderLeftWidth: 3, borderLeftColor: c.dangerCount > 0 ? '#dc2626' : c.alertsCount > 0 ? '#f59e0b' : '#16a34a',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = c.dangerCount > 0 ? '#dc2626' : c.alertsCount > 0 ? '#f59e0b' : '#16a34a'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{c.name}</strong>
                    {c.profession && <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{c.profession}</span>}
                  </div>
                  {c.income && <span style={{ fontSize: 13, color: '#6b7280' }}>{(c.income / 1000).toFixed(0)} tis/mes</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <ProductBadge label="Pojisteni" active={c.hasInsurance} />
                  <ProductBadge label="Hypoteka" active={c.hasCredit} />
                  <ProductBadge label="Penzijko" active={c.hasPension} />
                  <ProductBadge label="Investice" active={c.hasInvestments} />
                  {c.alertsCount > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: c.dangerCount > 0 ? '#fee2e2' : '#fef3c7', color: c.dangerCount > 0 ? '#991b1b' : '#92400e' }}>
                      {c.alertsCount} upozorneni
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 8, background: '#f9fafb', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 20, marginBottom: 4, color }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function ProductBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
      background: active ? '#d1fae5' : '#f3f4f6',
      color: active ? '#065f46' : '#9ca3af',
    }}>
      {active ? '\u2713' : '\u2717'} {label}
    </span>
  );
}
