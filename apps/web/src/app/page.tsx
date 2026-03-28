'use client';

import { useState, useEffect } from 'react';

interface DashboardData {
  cases: Array<{
    id: string;
    clientName: string;
    meetingDate: string;
    workflowState: Record<string, string>;
  }>;
  clients: Array<{ id: string; name: string }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(setData);
  }, []);

  if (!data) return <div>Nacitam...</div>;

  const pendingReviews = data.cases.filter(c =>
    Object.values(c.workflowState).some(s => s === 'awaiting_review')
  ).length;

  const activeCases = data.cases.length;
  const totalClients = data.clients.length;

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <a href="/cases">
          <button className="btn-primary">+ Nova schuzka</button>
        </a>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-value">{activeCases}</div>
          <div className="stat-label">Aktivni pripady</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{pendingReviews}</div>
          <div className="stat-label">Ceka na schvaleni</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{totalClients}</div>
          <div className="stat-label">Klientu</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Posledni pripady</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Klient</th>
              <th>Datum schuzky</th>
              <th>Stav workflow</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.cases.map(c => {
              const steps = Object.entries(c.workflowState);
              const currentStep = steps.find(([, s]) => s === 'awaiting_review' || s === 'processing');
              const allApproved = steps.every(([, s]) => s === 'approved');

              return (
                <tr key={c.id}>
                  <td><strong>{c.clientName}</strong></td>
                  <td>{c.meetingDate}</td>
                  <td>
                    {allApproved ? (
                      <span className="badge badge-approved">Dokonceno</span>
                    ) : currentStep ? (
                      <span className={`badge badge-${currentStep[1] === 'awaiting_review' ? 'awaiting' : 'processing'}`}>
                        {stepLabel(currentStep[0])}: {statusLabel(currentStep[1])}
                      </span>
                    ) : (
                      <span className="badge badge-pending">Rozpracovano</span>
                    )}
                  </td>
                  <td>
                    <a href={`/cases/${c.id}`}>
                      <button className="btn-outline">Detail</button>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function stepLabel(step: string): string {
  const labels: Record<string, string> = {
    intake: 'Prijem',
    transcription: 'Prepis',
    summary: 'Souhrn',
    profile_update: 'Profil',
    crm_entry: 'CRM',
  };
  return labels[step] || step;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Ceka',
    processing: 'Zpracovava se',
    awaiting_review: 'Ke schvaleni',
    approved: 'Schvaleno',
    failed: 'Chyba',
  };
  return labels[status] || status;
}
