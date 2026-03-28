'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

interface ClientData {
  client: {
    id: string;
    name: string;
    profile: any;
    createdAt: string;
    updatedAt: string;
  };
  cases: Array<{
    id: string;
    meetingDate: string;
    meetingType: string;
    notes: string;
    workflowState: Record<string, string>;
    hasTranscript: boolean;
    hasSummary: boolean;
    hasProfile: boolean;
    hasCRM: boolean;
  }>;
  aggregated: {
    facts: Array<{ fact: string; confidence: string; source: string; meetingDate: string }>;
    advisorTasks: Array<{ description: string; priority: string; deadline?: string; meetingDate: string; status: string }>;
    clientTasks: Array<{ description: string; priority: string; deadline?: string; meetingDate: string; status: string }>;
    missingInfo: Array<{ description: string; importance: string; suggestedQuestion: string }>;
    documents: Array<{ filename: string; purpose: string; sizeBytes: number; uploadedAt: string; caseId: string }>;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [data, setData] = useState<ClientData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'meetings' | 'documents' | 'ask'>('overview');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchClient = useCallback(() => {
    fetch(`/api/clients/${clientId}`)
      .then(r => r.json())
      .then(setData);
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const askQuestion = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setAsking(true);

    const res = await fetch(`/api/clients/${clientId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });
    const result = await res.json();
    setMessages(prev => [...prev, { role: 'assistant', content: result.answer, sources: result.sources }]);
    setAsking(false);
  };

  const startEditingProfile = () => {
    const p = data?.client.profile || {};
    setEditForm({
      name: data?.client.name || '',
      full_name: p.personal?.full_name || '',
      birth_year: p.personal?.birth_year || '',
      marital_status: p.personal?.marital_status || '',
      household_members: p.household?.household_members || '',
      dependents_count: p.household?.dependents_count || '',
      employment_status: p.economic?.employment_status || '',
      profession: p.economic?.profession || '',
      net_monthly_income: p.economic?.net_monthly_income?.amount || '',
    });
    setEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setEditingProfile(false);
    setEditForm(null);
  };

  const saveProfile = async () => {
    if (!editForm) return;
    setSaving(true);
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        profile: {
          personal: {
            full_name: editForm.full_name || editForm.name,
            birth_year: editForm.birth_year ? Number(editForm.birth_year) : undefined,
            marital_status: editForm.marital_status || undefined,
          },
          household: {
            household_members: editForm.household_members ? Number(editForm.household_members) : undefined,
            dependents_count: editForm.dependents_count ? Number(editForm.dependents_count) : undefined,
          },
          economic: {
            employment_status: editForm.employment_status || undefined,
            profession: editForm.profession || undefined,
            net_monthly_income: editForm.net_monthly_income ? { amount: Number(editForm.net_monthly_income), currency: 'CZK' } : undefined,
          },
        },
      }),
    });
    setEditingProfile(false);
    setEditForm(null);
    setSaving(false);
    fetchClient();
  };

  if (!data) return <div>Nacitam...</div>;

  const { client, cases, aggregated } = data;
  const profile = client.profile as any;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{client.name}</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            {profile?.economic?.profession || 'Profese neuvedena'} | {cases.length} {cases.length === 1 ? 'schuzka' : 'schuzek'} | {client.id}
          </p>
        </div>
        <a href="/clients"><button className="btn-outline">Zpet na klienty</button></a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
        {([
          ['overview', 'Prehled'],
          ['meetings', 'Schuzky'],
          ['documents', 'Dokumenty'],
          ['ask', 'Zeptej se'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === key ? 'var(--primary)' : 'transparent',
              color: activeTab === key ? 'white' : '#6b7280',
              fontWeight: activeTab === key ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Profile card */}
          <div className="card section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Osobni udaje</h3>
              {!editingProfile && (
                <button className="btn-outline" onClick={startEditingProfile}>Upravit</button>
              )}
            </div>
            {editingProfile && editForm ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Osobni</h4>
                    <EditField label="Jmeno" value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} />
                    <EditField label="Cele jmeno" value={editForm.full_name} onChange={v => setEditForm({ ...editForm, full_name: v })} />
                    <EditField label="Rok narozeni" value={editForm.birth_year} onChange={v => setEditForm({ ...editForm, birth_year: v })} type="number" />
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 2 }}>Rodinny stav</label>
                      <select
                        value={editForm.marital_status}
                        onChange={e => setEditForm({ ...editForm, marital_status: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14 }}
                      >
                        <option value="">—</option>
                        <option value="single">Svobodny/a</option>
                        <option value="married">Zenaty/vdana</option>
                        <option value="divorced">Rozvedeny/a</option>
                        <option value="widowed">Vdovec/vdova</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Domacnost</h4>
                    <EditField label="Clenu domacnosti" value={editForm.household_members} onChange={v => setEditForm({ ...editForm, household_members: v })} type="number" />
                    <EditField label="Vyzivovanych osob" value={editForm.dependents_count} onChange={v => setEditForm({ ...editForm, dependents_count: v })} type="number" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ekonomika</h4>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 2 }}>Status</label>
                      <select
                        value={editForm.employment_status}
                        onChange={e => setEditForm({ ...editForm, employment_status: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14 }}
                      >
                        <option value="">—</option>
                        <option value="employed">Zamestnanec</option>
                        <option value="self_employed">OSVC</option>
                        <option value="unemployed">Nezamestnany/a</option>
                        <option value="retired">Duchodce</option>
                      </select>
                    </div>
                    <EditField label="Profese" value={editForm.profession} onChange={v => setEditForm({ ...editForm, profession: v })} />
                    <EditField label="Cisty prijem (CZK)" value={editForm.net_monthly_income} onChange={v => setEditForm({ ...editForm, net_monthly_income: v })} type="number" />
                  </div>
                </div>
                <div className="section-actions" style={{ marginTop: 16 }}>
                  <button className="btn-success" onClick={saveProfile} disabled={saving}>
                    {saving ? 'Ukladam...' : 'Ulozit zmeny'}
                  </button>
                  <button className="btn-outline" onClick={cancelEditingProfile}>Zrusit</button>
                </div>
              </div>
            ) : profile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <ProfileSection title="Osobni" data={{
                  'Jmeno': profile.personal?.full_name,
                  'Rok narozeni': profile.personal?.birth_year,
                  'Rodinny stav': translateMarital(profile.personal?.marital_status),
                }} />
                <ProfileSection title="Domacnost" data={{
                  'Clenu domacnosti': profile.household?.household_members,
                  'Vyzivovanych osob': profile.household?.dependents_count,
                }} />
                <ProfileSection title="Ekonomika" data={{
                  'Status': translateEmployment(profile.economic?.employment_status),
                  'Profese': profile.economic?.profession,
                  'Cisty prijem': profile.economic?.net_monthly_income ? `${profile.economic.net_monthly_income.amount?.toLocaleString('cs-CZ')} ${profile.economic.net_monthly_income.currency}` : undefined,
                }} />
              </div>
            ) : (
              <div>
                <p style={{ color: '#9ca3af', fontSize: 14 }}>Profil zatim nevyplnen.</p>
                <button className="btn-primary" onClick={startEditingProfile} style={{ marginTop: 8 }}>Vyplnit profil</button>
              </div>
            )}
          </div>

          {/* Financial facts */}
          {aggregated.facts.length > 0 && (
            <div className="card section">
              <h3>Financni fakta</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {aggregated.facts.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 14 }}>{f.fact}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge badge-${f.confidence === 'confirmed' ? 'approved' : 'pending'}`}>
                        {f.confidence === 'confirmed' ? 'Potvrzeno' : 'Zmineno'}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{f.meetingDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {(aggregated.advisorTasks.length > 0 || aggregated.clientTasks.length > 0) && (
            <div className="card section">
              <h3>Ukoly</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Ukoly poradce</h4>
                  {aggregated.advisorTasks.map((t, i) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                      {t.description}
                      {t.deadline && <span style={{ color: '#6b7280', fontSize: 12 }}> (do {t.deadline})</span>}
                      <span className={`badge badge-${t.priority === 'high' ? 'failed' : 'pending'}`} style={{ marginLeft: 8, fontSize: 10 }}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Ukoly klienta</h4>
                  {aggregated.clientTasks.map((t, i) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                      {t.description}
                      {t.deadline && <span style={{ color: '#6b7280', fontSize: 12 }}> (do {t.deadline})</span>}
                      <span className={`badge badge-${t.priority === 'high' ? 'failed' : 'pending'}`} style={{ marginLeft: 8, fontSize: 10 }}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Missing info */}
          {aggregated.missingInfo.length > 0 && (
            <div className="card section">
              <h3>Chybejici informace</h3>
              {aggregated.missingInfo.map((m, i) => (
                <div key={i} className={`missing-item ${m.importance}`}>
                  <div>
                    <strong>{m.description}</strong>
                    <div className="question">{m.suggestedQuestion}</div>
                  </div>
                  <span className={`badge badge-${m.importance === 'critical' ? 'failed' : 'pending'}`}>
                    {m.importance === 'critical' ? 'Kriticke' : 'Dulezite'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'meetings' && (
        <div className="card section">
          <h3>Historie schuzek</h3>
          {cases.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Zatim zadne schuzky.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {cases.map(c => {
                const steps = Object.values(c.workflowState);
                const approved = steps.filter(s => s === 'approved').length;
                return (
                  <a key={c.id} href={`/cases/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div>
                        <strong style={{ fontSize: 15 }}>{c.meetingDate}</strong>
                        <span style={{ marginLeft: 12, color: '#6b7280', fontSize: 13 }}>
                          {typeLabel(c.meetingType)}
                        </span>
                        {c.notes && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{c.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>{approved}/{steps.length} kroku</div>
                        <div style={{
                          width: 60, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${(approved / steps.length) * 100}%`,
                            height: '100%',
                            background: approved === steps.length ? '#16a34a' : 'var(--primary)',
                            borderRadius: 3,
                          }} />
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card section">
          <h3>Dokumenty</h3>
          {aggregated.documents.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14 }}>Zatim zadne dokumenty.</p>
          ) : (
            <div>
              {aggregated.documents.map((d, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderBottom: '1px solid var(--border)', fontSize: 14,
                }}>
                  <span style={{ fontSize: 20 }}>{purposeIcon(d.purpose)}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{d.filename}</strong>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {purposeLabel(d.purpose)} | {formatSize(d.sizeBytes)} | {d.uploadedAt.slice(0, 10)}
                    </div>
                  </div>
                  <a href={`/cases/${d.caseId}`} style={{ fontSize: 12, color: 'var(--primary)' }}>
                    Zobrazit schuzku
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ask' && (
        <div className="card section" style={{ display: 'flex', flexDirection: 'column', minHeight: 500 }}>
          <h3>Zeptej se na cokoliv o klientovi</h3>

          {/* Chat messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 12,
            minHeight: 300, maxHeight: 500,
          }}>
            {messages.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
                <p>Zeptejte se na cokoliv o klientovi {client.name}.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                  {[
                    'Jaky ma prijem?',
                    'Co vime o jeho pojisteni?',
                    'Jake ma ukoly?',
                    'Co nam chybi?',
                    'Celkovy prehled',
                    'Ma hypoteku?',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => { setQuestion(suggestion); }}
                      style={{
                        padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 16,
                        background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--primary)',
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: 12,
                background: msg.role === 'user' ? 'var(--primary)' : '#f3f4f6',
                color: msg.role === 'user' ? 'white' : '#1f2937',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ fontSize: 11, color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#9ca3af', marginTop: 6 }}>
                    Zdroje: {msg.sources.join(', ')}
                  </div>
                )}
              </div>
            ))}
            {asking && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12, background: '#f3f4f6', fontSize: 14, color: '#6b7280' }}>
                Hledam odpoved...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askQuestion()}
              placeholder="Zeptejte se na cokoliv o klientovi..."
              style={{
                flex: 1, padding: '10px 14px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 14, outline: 'none',
              }}
              disabled={asking}
            />
            <button
              className="btn-primary"
              onClick={askQuestion}
              disabled={asking || !question.trim()}
            >
              Odeslat
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileSection({ title, data }: { title: string; data: Record<string, any> }) {
  return (
    <div>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
      {Object.entries(data).map(([key, val]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
          <span style={{ color: '#6b7280' }}>{key}</span>
          <span style={{ fontWeight: 500 }}>{val ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

function translateMarital(status: string | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = { married: 'Zenaty/vdana', single: 'Svobodny/a', divorced: 'Rozvedeny/a', widowed: 'Vdovec/vdova' };
  return map[status] || status;
}

function translateEmployment(status: string | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = { employed: 'Zamestnanec', self_employed: 'OSVC', unemployed: 'Nezamestnany/a', retired: 'Duchodce' };
  return map[status] || status;
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = { initial: 'Uvodni', follow_up: 'Navazujici', review: 'Revize', closing: 'Uzavreni' };
  return labels[type] || type;
}

function purposeIcon(purpose: string): string {
  const map: Record<string, string> = { meeting_recording: '🎙', existing_contract: '📄', new_model: '📊', product_info: '📋', advisor_notes: '📝', other: '📎' };
  return map[purpose] || '📎';
}

function purposeLabel(purpose: string): string {
  const map: Record<string, string> = { meeting_recording: 'Nahravka', existing_contract: 'Smlouva', new_model: 'Modelace', product_info: 'Podklad', advisor_notes: 'Poznamky', other: 'Ostatni' };
  return map[purpose] || purpose;
}

function EditField({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 2 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14 }}
      />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
