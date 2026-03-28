'use client';

import { useState, useEffect } from 'react';

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    meetingDate: new Date().toISOString().split('T')[0],
    meetingType: 'initial',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(data => {
        setCases(data.cases);
        setClients(data.clients);
      });
  }, []);

  const createCase = async () => {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newCase = await res.json();
      window.location.href = `/cases/${newCase.id}`;
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Schuzky</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nova schuzka
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Klient</th>
              <th>Datum</th>
              <th>Typ</th>
              <th>Workflow</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cases.map(c => {
              const steps = Object.values(c.workflowState) as string[];
              const approved = steps.filter(s => s === 'approved').length;
              return (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.id}</td>
                  <td><strong>{c.clientName}</strong></td>
                  <td>{c.meetingDate}</td>
                  <td>{c.meetingType}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {steps.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            width: 24,
                            height: 8,
                            borderRadius: 4,
                            background: s === 'approved' ? '#16a34a' :
                              s === 'awaiting_review' ? '#f59e0b' :
                              s === 'processing' ? '#2563eb' :
                              s === 'failed' ? '#dc2626' : '#e5e7eb',
                          }}
                          title={`${Object.keys(c.workflowState)[i]}: ${s}`}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {approved}/{steps.length} schvaleno
                    </span>
                  </td>
                  <td>
                    <a href={`/cases/${c.id}`}>
                      <button className="btn-outline">Otevrit</button>
                    </a>
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>
                  Zadne pripady. Vytvorte novy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nova schuzka</h3>
            <div className="form-group">
              <label>Jmeno klienta</label>
              <input
                type="text"
                value={form.clientName}
                onChange={e => setForm({ ...form, clientName: e.target.value })}
                placeholder="Jan Novak"
                list="clients-list"
              />
              <datalist id="clients-list">
                {clients.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Datum schuzky</label>
              <input
                type="date"
                value={form.meetingDate}
                onChange={e => setForm({ ...form, meetingDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Typ schuzky</label>
              <select value={form.meetingType} onChange={e => setForm({ ...form, meetingType: e.target.value })}>
                <option value="initial">Uvodni</option>
                <option value="follow_up">Navazujici</option>
                <option value="review">Revize</option>
                <option value="closing">Uzavreni</option>
              </select>
            </div>
            <div className="form-group">
              <label>Poznamky</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Kratky popis ucelu schuzky..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setShowModal(false)}>Zrusit</button>
              <button className="btn-primary" onClick={createCase} disabled={!form.clientName}>
                Vytvorit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
