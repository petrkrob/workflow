'use client';

import { useState, useEffect, useRef } from 'react';

interface ClientItem {
  id: string;
  name: string;
  profile: any;
  files: any[];
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'choose' | 'transcript' | 'manual'>('choose');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [manualForm, setManualForm] = useState({
    birth_year: '',
    marital_status: '',
    employment_status: '',
    profession: '',
    net_monthly_income: '',
    household_members: '',
    dependents_count: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = () => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { setClients(d.clients); setCases(d.cases); });
  };

  useEffect(() => { fetchData(); }, []);

  const createWithTranscript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !newName.trim()) return;
    setCreating(true);

    const formData = new FormData();
    formData.append('name', newName.trim());
    formData.append('file', file);

    const res = await fetch('/api/clients', { method: 'POST', body: formData });
    const result = await res.json();
    setCreating(false);

    if (res.ok && result.client) {
      window.location.href = `/clients/${result.client.id}`;
    }
  };

  const createManual = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const profile: any = {};
    if (manualForm.birth_year || manualForm.marital_status) {
      profile.personal = {
        full_name: newName.trim(),
        ...(manualForm.birth_year ? { birth_year: Number(manualForm.birth_year) } : {}),
        ...(manualForm.marital_status ? { marital_status: manualForm.marital_status } : {}),
      };
    }
    if (manualForm.household_members || manualForm.dependents_count) {
      profile.household = {
        ...(manualForm.household_members ? { household_members: Number(manualForm.household_members) } : {}),
        ...(manualForm.dependents_count ? { dependents_count: Number(manualForm.dependents_count) } : {}),
      };
    }
    if (manualForm.employment_status || manualForm.profession || manualForm.net_monthly_income) {
      profile.economic = {
        ...(manualForm.employment_status ? { employment_status: manualForm.employment_status } : {}),
        ...(manualForm.profession ? { profession: manualForm.profession } : {}),
        ...(manualForm.net_monthly_income ? { net_monthly_income: { amount: Number(manualForm.net_monthly_income), currency: 'CZK' } } : {}),
      };
    }

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        profile: Object.keys(profile).length > 0 ? profile : undefined,
      }),
    });
    const result = await res.json();
    setCreating(false);

    if (res.ok && result.client) {
      window.location.href = `/clients/${result.client.id}`;
    }
  };

  const resetModal = () => {
    setShowAdd(false);
    setAddMode('choose');
    setNewName('');
    setManualForm({ birth_year: '', marital_status: '', employment_status: '', profession: '', net_monthly_income: '', household_members: '', dependents_count: '' });
  };

  return (
    <>
      <div className="page-header">
        <h2>Klienti</h2>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Pridat klienta</button>
      </div>

      {clients.length === 0 ? (
        <div className="card section" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 18, color: '#6b7280', marginBottom: 16 }}>Zatim zadni klienti</p>
          <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ fontSize: 16, padding: '12px 32px' }}>
            + Pridat prvniho klienta
          </button>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Jmeno</th>
                <th>Profese</th>
                <th>Schuzek</th>
                <th>Souboru</th>
                <th>Profil</th>
                <th>Vytvoreno</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const clientCases = cases.filter((c: any) => c.clientId === client.id);
                const hasProfile = client.profile !== null;
                const profession = client.profile?.economic?.profession;
                return (
                  <tr key={client.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/clients/${client.id}`}>
                    <td><strong style={{ color: 'var(--primary)' }}>{client.name}</strong></td>
                    <td style={{ color: '#6b7280', fontSize: 13 }}>{profession || '—'}</td>
                    <td>{clientCases.length}</td>
                    <td>{client.files?.length || 0}</td>
                    <td>
                      {hasProfile ? (
                        <span className="badge badge-approved">Vyplnen</span>
                      ) : (
                        <span className="badge badge-pending">Chybi</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(client.createdAt).toLocaleDateString('cs-CZ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add client modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={e => { if (e.target === e.currentTarget) resetModal(); }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 32, width: '100%', maxWidth: 520,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>

            {/* Step 1: Name */}
            {addMode === 'choose' && (
              <>
                <h3 style={{ margin: '0 0 20px', fontSize: 20 }}>Novy klient</h3>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>Jmeno klienta</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Jan Novak"
                    autoFocus
                    style={{
                      width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', fontSize: 15, outline: 'none',
                    }}
                  />
                </div>

                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                  Jak chcete zadat udaje o klientovi?
                </p>

                <div style={{ display: 'grid', gap: 12 }}>
                  <button
                    onClick={() => newName.trim() && setAddMode('transcript')}
                    disabled={!newName.trim()}
                    style={{
                      padding: 20, border: '2px solid var(--border)', borderRadius: 12,
                      background: 'white', cursor: newName.trim() ? 'pointer' : 'not-allowed',
                      textAlign: 'left', transition: 'border-color 0.2s',
                      opacity: newName.trim() ? 1 : 0.5,
                    }}
                    onMouseEnter={e => newName.trim() && (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nahrat prepis / nahravku</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Nahrajte prepis schuzky, zvukovou nahravku nebo dokument — AI automaticky rozpozna a vyplni udaje o klientovi.
                    </div>
                  </button>

                  <button
                    onClick={() => newName.trim() && setAddMode('manual')}
                    disabled={!newName.trim()}
                    style={{
                      padding: 20, border: '2px solid var(--border)', borderRadius: 12,
                      background: 'white', cursor: newName.trim() ? 'pointer' : 'not-allowed',
                      textAlign: 'left', transition: 'border-color 0.2s',
                      opacity: newName.trim() ? 1 : 0.5,
                    }}
                    onMouseEnter={e => newName.trim() && (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Vyplnit rucne</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Zadejte zakladni informace o klientovi rucne. Dalsi data muzete doplnit pozdeji.
                    </div>
                  </button>
                </div>

                <button onClick={resetModal} className="btn-outline" style={{ marginTop: 16, width: '100%' }}>
                  Zrusit
                </button>
              </>
            )}

            {/* Step 2a: Transcript upload */}
            {addMode === 'transcript' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>Nahrat prepis / nahravku</h3>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                  Klient: <strong>{newName}</strong>
                </p>

                <div style={{
                  border: '2px dashed var(--border)', borderRadius: 12, padding: 40,
                  textAlign: 'center', marginBottom: 20,
                  background: creating ? '#f0f9ff' : '#fafafa',
                }}>
                  {creating ? (
                    <div>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>Zpracovavam...</div>
                      <p style={{ fontSize: 14, color: '#6b7280' }}>AI analyzuje nahravku a vyplnuje profil klienta</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>&#128196;</div>
                      <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Pretahnete soubor sem nebo kliknete</p>
                      <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                        PDF, DOCX, TXT, MP3, WAV, M4A — max 50 MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.mp3,.wav,.m4a,.ogg"
                        onChange={createWithTranscript}
                        style={{ display: 'none' }}
                      />
                      <button
                        className="btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: 15, padding: '10px 24px' }}
                      >
                        Vybrat soubor
                      </button>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setAddMode('choose')} className="btn-outline" style={{ flex: 1 }}>
                    Zpet
                  </button>
                  <button onClick={() => setAddMode('manual')} className="btn-outline" style={{ flex: 1 }}>
                    Vyplnit rucne
                  </button>
                </div>
              </>
            )}

            {/* Step 2b: Manual form */}
            {addMode === 'manual' && (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>Zakladni udaje</h3>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                  Klient: <strong>{newName}</strong> — vyplnte co vite, zbytek doplnite pozdeji.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Rok narozeni" value={manualForm.birth_year}
                    onChange={v => setManualForm({ ...manualForm, birth_year: v })} type="number" placeholder="1985" />
                  <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Rodinny stav</label>
                    <select value={manualForm.marital_status}
                      onChange={e => setManualForm({ ...manualForm, marital_status: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                      <option value="">—</option>
                      <option value="single">Svobodny/a</option>
                      <option value="married">Zenaty/vdana</option>
                      <option value="divorced">Rozvedeny/a</option>
                      <option value="widowed">Vdovec/vdova</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Zamestnani</label>
                    <select value={manualForm.employment_status}
                      onChange={e => setManualForm({ ...manualForm, employment_status: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                      <option value="">—</option>
                      <option value="employed">Zamestnanec</option>
                      <option value="self_employed">OSVC</option>
                      <option value="unemployed">Nezamestnany/a</option>
                      <option value="retired">Duchodce</option>
                    </select>
                  </div>
                  <FormField label="Profese" value={manualForm.profession}
                    onChange={v => setManualForm({ ...manualForm, profession: v })} placeholder="IT manazer" />
                  <FormField label="Cisty mesicni prijem (CZK)" value={manualForm.net_monthly_income}
                    onChange={v => setManualForm({ ...manualForm, net_monthly_income: v })} type="number" placeholder="48000" />
                  <FormField label="Clenu domacnosti" value={manualForm.household_members}
                    onChange={v => setManualForm({ ...manualForm, household_members: v })} type="number" placeholder="4" />
                  <FormField label="Vyzivovanych osob" value={manualForm.dependents_count}
                    onChange={v => setManualForm({ ...manualForm, dependents_count: v })} type="number" placeholder="2" />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button onClick={() => setAddMode('choose')} className="btn-outline" style={{ flex: 1 }}>
                    Zpet
                  </button>
                  <button onClick={createManual} className="btn-primary" disabled={creating} style={{ flex: 2 }}>
                    {creating ? 'Vytvari se...' : 'Vytvorit klienta'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontSize: 14, outline: 'none',
        }}
      />
    </div>
  );
}
