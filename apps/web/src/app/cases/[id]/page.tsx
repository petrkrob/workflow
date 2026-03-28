'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

type StepStatus = 'pending' | 'processing' | 'awaiting_review' | 'approved' | 'failed';

interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  uploadedAt: string;
}

interface CaseData {
  id: string;
  clientName: string;
  clientId: string;
  meetingDate: string;
  meetingType: string;
  notes: string;
  files: UploadedFile[];
  workflowState: Record<string, StepStatus>;
  transcript: {
    cleanedText: string;
    qualityScore: number;
    durationMinutes: number;
    reviewStatus: string;
  } | null;
  summary: {
    content: any;
    confidence: number;
    reviewStatus: string;
  } | null;
  profileUpdate: {
    changes: Array<{ field: string; oldValue: string; newValue: string; changeType: string }>;
    completenessScore: number;
    missingFields: Array<{ field: string; importance: string; suggestedQuestion: string }>;
    reviewStatus: string;
  } | null;
  crmEntry: {
    content: any;
    reviewStatus: string;
  } | null;
}

const STEPS = [
  { key: 'intake', label: 'Prijem', icon: '1' },
  { key: 'transcription', label: 'Prepis', icon: '2' },
  { key: 'summary', label: 'Souhrn', icon: '3' },
  { key: 'profile_update', label: 'Profil', icon: '4' },
  { key: 'crm_entry', label: 'CRM', icon: '5' },
];

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // which step is being edited
  const [editBuffer, setEditBuffer] = useState<any>(null);

  const fetchCase = useCallback(() => {
    fetch(`/api/cases/${caseId}`)
      .then(r => r.json())
      .then(setCaseData);
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const runStep = async (step: string) => {
    setLoading(step);
    await fetch(`/api/cases/${caseId}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run', step }),
    });
    fetchCase();
    setLoading(null);
  };

  const approveStep = async (step: string) => {
    setLoading(step);
    await fetch(`/api/cases/${caseId}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', step }),
    });
    fetchCase();
    setLoading(null);
  };

  const startEditing = (step: string, data: any) => {
    setEditing(step);
    setEditBuffer(typeof data === 'string' ? data : JSON.parse(JSON.stringify(data)));
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditBuffer(null);
  };

  const saveAndApprove = async (step: string, edits: Record<string, unknown>) => {
    setLoading(step);
    await fetch(`/api/cases/${caseId}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit_and_approve', step, edits }),
    });
    setEditing(null);
    setEditBuffer(null);
    fetchCase();
    setLoading(null);
  };

  if (!caseData) return <div>Nacitam...</div>;

  const ws = caseData.workflowState;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{caseData.clientName}</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            {caseData.meetingDate} | {typeLabel(caseData.meetingType)} | {caseData.id}
          </p>
          {caseData.notes && (
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{caseData.notes}</p>
          )}
        </div>
        <a href="/cases"><button className="btn-outline">Zpet na seznam</button></a>
      </div>

      {/* Workflow progress */}
      <div className="workflow-steps">
        {STEPS.map(step => (
          <div key={step.key} className={`workflow-step ${ws[step.key]}`}>
            <span className="step-name">{step.icon}. {step.label}</span>
            <span className="step-status">{statusLabel(ws[step.key])}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Intake — file upload */}
      <div className="card section">
        <h3>1. Prijem dat</h3>
        <FileUploadSection caseId={caseData.id} files={caseData.files} onUpdate={fetchCase} />
      </div>

      {/* Step 2: Transcription */}
      <div className="card section">
        <h3>2. Prepis schuzky</h3>
        {ws.transcription === 'pending' && (
          <>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Audio je pripraveno k prepisu.</p>
            <div className="section-actions">
              <button
                className="btn-primary"
                onClick={() => runStep('transcription')}
                disabled={loading === 'transcription'}
              >
                {loading === 'transcription' ? 'Prepisuji...' : 'Spustit prepis'}
              </button>
            </div>
          </>
        )}
        {(ws.transcription === 'awaiting_review' || ws.transcription === 'approved') && caseData.transcript && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <ConfidenceBadge score={caseData.transcript.qualityScore} label="Kvalita prepisu" />
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Delka: {caseData.transcript.durationMinutes} min
              </span>
              <span className={`badge badge-${ws.transcription === 'approved' ? 'approved' : 'awaiting'}`}>
                {ws.transcription === 'approved' ? 'Schvaleno' : 'Ke schvaleni'}
              </span>
            </div>
            {editing === 'transcription' ? (
              <>
                <textarea
                  className="transcript-box"
                  style={{ width: '100%', minHeight: 300, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
                  value={editBuffer}
                  onChange={e => setEditBuffer(e.target.value)}
                />
                <div className="section-actions">
                  <button className="btn-success" onClick={() => saveAndApprove('transcription', { cleanedText: editBuffer })}>
                    Ulozit a schvalit
                  </button>
                  <button className="btn-outline" onClick={cancelEditing}>Zrusit</button>
                </div>
              </>
            ) : (
              <>
                <div className="transcript-box">
                  {caseData.transcript.cleanedText}
                </div>
                {ws.transcription === 'awaiting_review' && (
                  <div className="section-actions">
                    <button className="btn-success" onClick={() => approveStep('transcription')}>
                      Schvalit prepis
                    </button>
                    <button className="btn-outline" onClick={() => startEditing('transcription', caseData.transcript!.cleanedText)}>
                      Upravit
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Step 3: Summary */}
      <div className="card section">
        <h3>3. Souhrn schuzky</h3>
        {ws.summary === 'pending' && (
          <>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              {ws.transcription === 'approved'
                ? 'Prepis schvalen. Muzete vygenerovat souhrn.'
                : 'Nejprve schvalte prepis.'}
            </p>
            <div className="section-actions">
              <button
                className="btn-primary"
                onClick={() => runStep('summary')}
                disabled={ws.transcription !== 'approved' || loading === 'summary'}
              >
                {loading === 'summary' ? 'Generuji...' : 'Generovat souhrn'}
              </button>
            </div>
          </>
        )}
        {(ws.summary === 'awaiting_review' || ws.summary === 'approved') && caseData.summary && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <ConfidenceBadge score={caseData.summary.confidence / 100} label="Spolehlivost extrakce" />
              <span className={`badge badge-${ws.summary === 'approved' ? 'approved' : 'awaiting'}`}>
                {ws.summary === 'approved' ? 'Schvaleno' : 'Ke schvaleni'}
              </span>
            </div>
            {editing === 'summary' ? (
              <>
                <textarea
                  style={{ width: '100%', minHeight: 400, fontFamily: 'monospace', fontSize: 13, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', resize: 'vertical' }}
                  value={typeof editBuffer === 'string' ? editBuffer : JSON.stringify(editBuffer, null, 2)}
                  onChange={e => setEditBuffer(e.target.value)}
                />
                <div className="section-actions">
                  <button className="btn-success" onClick={() => {
                    try {
                      const parsed = JSON.parse(typeof editBuffer === 'string' ? editBuffer : JSON.stringify(editBuffer));
                      saveAndApprove('summary', { content: parsed });
                    } catch { alert('Neplatny JSON format'); }
                  }}>
                    Ulozit a schvalit
                  </button>
                  <button className="btn-outline" onClick={cancelEditing}>Zrusit</button>
                </div>
              </>
            ) : (
              <>
                <SummaryView content={caseData.summary.content} />
                {ws.summary === 'awaiting_review' && (
                  <div className="section-actions">
                    <button className="btn-success" onClick={() => approveStep('summary')}>
                      Schvalit souhrn
                    </button>
                    <button className="btn-outline" onClick={() => startEditing('summary', caseData.summary!.content)}>
                      Upravit a schvalit
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Step 4: Profile Update */}
      <div className="card section">
        <h3>4. Profil klienta</h3>
        {ws.profile_update === 'pending' && (
          <>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              {ws.summary === 'approved'
                ? 'Souhrn schvalen. Muzete aktualizovat profil klienta.'
                : 'Nejprve schvalte souhrn.'}
            </p>
            <div className="section-actions">
              <button
                className="btn-primary"
                onClick={() => runStep('profile_update')}
                disabled={ws.summary !== 'approved' || loading === 'profile_update'}
              >
                {loading === 'profile_update' ? 'Aktualizuji...' : 'Aktualizovat profil'}
              </button>
            </div>
          </>
        )}
        {(ws.profile_update === 'awaiting_review' || ws.profile_update === 'approved') && caseData.profileUpdate && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Uplnost profilu:
              </span>
              <div style={{ flex: 1, maxWidth: 200 }}>
                <div className="completeness-bar">
                  <div
                    className="fill"
                    style={{
                      width: `${caseData.profileUpdate.completenessScore}%`,
                      background: caseData.profileUpdate.completenessScore > 70 ? '#16a34a' :
                        caseData.profileUpdate.completenessScore > 40 ? '#f59e0b' : '#dc2626',
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {caseData.profileUpdate.completenessScore}%
              </span>
              <span className={`badge badge-${ws.profile_update === 'approved' ? 'approved' : 'awaiting'}`}>
                {ws.profile_update === 'approved' ? 'Schvaleno' : 'Ke schvaleni'}
              </span>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Zmeny v profilu</h4>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div className="change-item" style={{ background: '#f9fafb', fontWeight: 600, fontSize: 12 }}>
                <span>Pole</span>
                <span>Puvodni hodnota</span>
                <span>Nova hodnota</span>
                <span>Typ zmeny</span>
              </div>
              {caseData.profileUpdate.changes.map((change, i) => (
                <div key={i} className="change-item">
                  <span className="field">{change.field}</span>
                  <span className="old">{change.oldValue}</span>
                  <span className="new">{change.newValue}</span>
                  <span className="type">
                    <span className={`badge badge-${change.changeType === 'new' ? 'processing' : 'approved'}`}>
                      {change.changeType === 'new' ? 'Nove' : 'Aktualizovano'}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {caseData.profileUpdate.missingFields.length > 0 && (
              <>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>
                  Chybejici informace ({caseData.profileUpdate.missingFields.length})
                </h4>
                {caseData.profileUpdate.missingFields.map((field, i) => (
                  <div key={i} className={`missing-item ${field.importance}`}>
                    <div>
                      <strong>{field.field}</strong>
                      <div className="question">{field.suggestedQuestion}</div>
                    </div>
                    <span className={`badge badge-${field.importance === 'critical' ? 'failed' : 'pending'}`}>
                      {field.importance === 'critical' ? 'Kriticke' : 'Dulezite'}
                    </span>
                  </div>
                ))}
              </>
            )}

            {editing === 'profile_update' ? (
              <>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 8px' }}>Upravit zmeny profilu (JSON)</h4>
                <textarea
                  style={{ width: '100%', minHeight: 300, fontFamily: 'monospace', fontSize: 13, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', resize: 'vertical' }}
                  value={typeof editBuffer === 'string' ? editBuffer : JSON.stringify(editBuffer, null, 2)}
                  onChange={e => setEditBuffer(e.target.value)}
                />
                <div className="section-actions">
                  <button className="btn-success" onClick={() => {
                    try {
                      const parsed = JSON.parse(typeof editBuffer === 'string' ? editBuffer : JSON.stringify(editBuffer));
                      saveAndApprove('profile_update', { changes: parsed });
                    } catch { alert('Neplatny JSON format'); }
                  }}>
                    Ulozit a schvalit
                  </button>
                  <button className="btn-outline" onClick={cancelEditing}>Zrusit</button>
                </div>
              </>
            ) : ws.profile_update === 'awaiting_review' && (
              <div className="section-actions">
                <button className="btn-success" onClick={() => approveStep('profile_update')}>
                  Schvalit zmeny profilu
                </button>
                <button className="btn-outline" onClick={() => startEditing('profile_update', caseData.profileUpdate!.changes)}>
                  Upravit
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 5: CRM Entry */}
      <div className="card section">
        <h3>5. CRM zapis</h3>
        {ws.crm_entry === 'pending' && (
          <>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              {ws.profile_update === 'approved'
                ? 'Profil schvalen. Muzete vygenerovat CRM zapis.'
                : 'Nejprve schvalte profil.'}
            </p>
            <div className="section-actions">
              <button
                className="btn-primary"
                onClick={() => runStep('crm_entry')}
                disabled={ws.profile_update !== 'approved' || loading === 'crm_entry'}
              >
                {loading === 'crm_entry' ? 'Generuji...' : 'Generovat CRM zapis'}
              </button>
            </div>
          </>
        )}
        {(ws.crm_entry === 'awaiting_review' || ws.crm_entry === 'approved') && caseData.crmEntry && (
          <>
            <span className={`badge badge-${ws.crm_entry === 'approved' ? 'approved' : 'awaiting'}`}
              style={{ marginBottom: 12, display: 'inline-block' }}>
              {ws.crm_entry === 'approved' ? 'Schvaleno' : 'Ke schvaleni'}
            </span>
            {editing === 'crm_entry' ? (
              <>
                <textarea
                  style={{ width: '100%', minHeight: 400, fontFamily: 'monospace', fontSize: 13, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', resize: 'vertical' }}
                  value={typeof editBuffer === 'string' ? editBuffer : JSON.stringify(editBuffer, null, 2)}
                  onChange={e => setEditBuffer(e.target.value)}
                />
                <div className="section-actions">
                  <button className="btn-success" onClick={() => {
                    try {
                      const parsed = JSON.parse(typeof editBuffer === 'string' ? editBuffer : JSON.stringify(editBuffer));
                      saveAndApprove('crm_entry', { content: parsed });
                    } catch { alert('Neplatny JSON format'); }
                  }}>
                    Ulozit a schvalit
                  </button>
                  <button className="btn-outline" onClick={cancelEditing}>Zrusit</button>
                </div>
              </>
            ) : (
              <>
                <CRMView content={caseData.crmEntry.content} />
                {ws.crm_entry === 'awaiting_review' && (
                  <div className="section-actions">
                    <button className="btn-success" onClick={() => approveStep('crm_entry')}>
                      Schvalit CRM zapis
                    </button>
                    <button className="btn-outline" onClick={() => startEditing('crm_entry', caseData.crmEntry!.content)}>
                      Upravit
                    </button>
                    <button className="btn-outline" onClick={() => {
                      const text = formatCRMForCopy(caseData.crmEntry!.content);
                      navigator.clipboard.writeText(text);
                      alert('CRM zapis zkopirovan do schranky!');
                    }}>
                      Kopirovat do schranky
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ---------- Components ----------

function FileUploadSection({ caseId, files, onUpdate }: { caseId: string; files: UploadedFile[]; onUpdate: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [purpose, setPurpose] = useState<string>('meeting_recording');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);
    await fetch(`/api/cases/${caseId}/files`, { method: 'POST', body: formData });
    setUploading(false);
    onUpdate();
    e.target.value = '';
  };

  const handleDelete = async (fileId: string) => {
    await fetch(`/api/cases/${caseId}/files`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
    onUpdate();
  };

  const purposeLabels: Record<string, string> = {
    meeting_recording: 'Nahravka schuzky',
    existing_contract: 'Stavajici smlouva',
    new_model: 'Nova modelace',
    product_info: 'Produktovy podklad',
    advisor_notes: 'Poznamky poradce',
    other: 'Ostatni',
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const mimeIcon = (mime: string) => {
    if (mime.startsWith('audio/')) return '🎙';
    if (mime.startsWith('image/')) return '🖼';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div>
      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {files.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
              borderBottom: '1px solid var(--border)', fontSize: 14
            }}>
              <span style={{ fontSize: 20 }}>{mimeIcon(f.mimeType)}</span>
              <div style={{ flex: 1 }}>
                <strong>{f.filename}</strong>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {purposeLabels[f.purpose] || f.purpose} · {formatSize(f.sizeBytes)}
                </div>
              </div>
              <button className="btn-outline" style={{ padding: '4px 8px', fontSize: 12, color: '#dc2626' }}
                onClick={() => handleDelete(f.id)}>
                Smazat
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={purpose} onChange={e => setPurpose(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}>
          {Object.entries(purposeLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)',
          cursor: uploading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 500,
          opacity: uploading ? 0.6 : 1,
        }}>
          {uploading ? 'Nahravam...' : '+ Nahrat soubor'}
          <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading}
            accept="audio/*,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" />
        </label>
      </div>
      {files.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>
          Zatim zadne soubory. Nahrajte audio ze schuzky nebo dokumenty.
        </p>
      )}
    </div>
  );
}

function ConfidenceBadge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const level = pct >= 80 ? 'high' : pct >= 60 ? 'medium' : 'low';
  return (
    <span className={`confidence-indicator confidence-${level}`}>
      {label}: {pct}%
    </span>
  );
}

function SummaryView({ content }: { content: any }) {
  const topics = content.discussed_topics || [];
  const facts = content.financial_facts || [];
  const advisorTasks = content.advisor_tasks || [];
  const clientTasks = content.client_tasks || [];
  const missing = content.missing_information || [];
  const nextStep = content.next_step || '';

  return (
    <div>
      <div className="summary-grid">
        <div className="summary-item">
          <h4>Probirana temata</h4>
          {topics.map((t: any, i: number) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <strong style={{ fontSize: 14 }}>{t.topic}</strong>
              <span className={`badge badge-${t.category === 'insurance' ? 'processing' : 'pending'}`}
                style={{ marginLeft: 8, fontSize: 10 }}>
                {t.category}
              </span>
              <ul>
                {(t.key_points || []).map((p: string, j: number) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="summary-item">
          <h4>Financni fakta</h4>
          <ul>
            {facts.map((f: any, i: number) => (
              <li key={i}>
                {f.fact}
                <span className={`badge badge-${f.confidence === 'confirmed' ? 'approved' : 'pending'}`}
                  style={{ marginLeft: 8, fontSize: 10 }}>
                  {f.confidence}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="summary-grid" style={{ marginTop: 16 }}>
        <div className="summary-item">
          <h4>Ukoly poradce</h4>
          <ul>
            {advisorTasks.map((t: any, i: number) => (
              <li key={i}>
                {t.description}
                {t.deadline && <span style={{ color: '#6b7280', fontSize: 12 }}> (do {t.deadline})</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="summary-item">
          <h4>Ukoly klienta</h4>
          <ul>
            {clientTasks.map((t: any, i: number) => (
              <li key={i}>
                {t.description}
                {t.deadline && <span style={{ color: '#6b7280', fontSize: 12 }}> (do {t.deadline})</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {missing.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Chybejici informace
          </h4>
          {missing.map((m: any, i: number) => (
            <div key={i} className={`missing-item ${m.importance}`}>
              <div>
                <strong>{m.description}</strong>
                {m.suggested_question && <div className="question">{m.suggested_question}</div>}
              </div>
              <span className={`badge badge-${m.importance === 'critical' ? 'failed' : 'pending'}`}>
                {m.importance === 'critical' ? 'Kriticke' : 'Dulezite'}
              </span>
            </div>
          ))}
        </div>
      )}

      {nextStep && (
        <div style={{ marginTop: 16, padding: 12, background: '#eff6ff', borderRadius: 8, fontSize: 14 }}>
          <strong>Dalsi krok:</strong> {nextStep}
        </div>
      )}
    </div>
  );
}

function CRMView({ content }: { content: any }) {
  return (
    <div className="crm-content">
      <h4>Priority klienta</h4>
      <ul>
        {(content.top_priorities || []).map((p: string, i: number) => (
          <li key={i}><strong>{p}</strong></li>
        ))}
      </ul>

      <h4>Domluvene kroky</h4>
      <ul>
        {(content.agreed_actions || []).map((a: string, i: number) => (
          <li key={i}>{a}</li>
        ))}
      </ul>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
        <div>
          <h4>Ukoly poradce</h4>
          <ul>
            {(content.advisor_tasks || []).map((t: any, i: number) => (
              <li key={i}>
                {t.description}
                {t.deadline && <span style={{ color: '#6b7280', fontSize: 12 }}> (do {t.deadline})</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Ukoly klienta</h4>
          <ul>
            {(content.client_tasks || []).map((t: any, i: number) => (
              <li key={i}>
                {t.description}
                {t.deadline && <span style={{ color: '#6b7280', fontSize: 12 }}> (do {t.deadline})</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {content.next_contact && (
        <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 8, fontSize: 14 }}>
          <strong>Pristi kontakt:</strong> {content.next_contact.type} — {content.next_contact.date || content.next_contact.condition}
          {content.next_contact.condition && content.next_contact.date && (
            <span> ({content.next_contact.condition})</span>
          )}
        </div>
      )}

      {content.open_questions && content.open_questions.length > 0 && (
        <>
          <h4>Otevrene otazky</h4>
          <ul>
            {content.open_questions.map((q: string, i: number) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </>
      )}

      {content.notes_for_followup && (
        <div style={{ marginTop: 12, padding: 12, background: '#fffbeb', borderRadius: 8, fontSize: 13, fontStyle: 'italic' }}>
          {content.notes_for_followup}
        </div>
      )}
    </div>
  );
}

function formatCRMForCopy(content: any): string {
  let text = '';
  text += 'PRIORITY KLIENTA\n';
  (content.top_priorities || []).forEach((p: string) => { text += `- ${p}\n`; });
  text += '\nDOMLUVENE KROKY\n';
  (content.agreed_actions || []).forEach((a: string) => { text += `- ${a}\n`; });
  text += '\nUKOLY PORADCE\n';
  (content.advisor_tasks || []).forEach((t: any) => { text += `- ${t.description} (${t.priority}, ${t.deadline || 'bez terminu'})\n`; });
  text += '\nUKOLY KLIENTA\n';
  (content.client_tasks || []).forEach((t: any) => { text += `- ${t.description} (${t.priority}, ${t.deadline || 'bez terminu'})\n`; });
  if (content.next_contact) {
    text += `\nPRISTI KONTAKT: ${content.next_contact.type} — ${content.next_contact.date || ''} ${content.next_contact.condition || ''}\n`;
  }
  if (content.open_questions) {
    text += '\nOTEVRENE OTAZKY\n';
    content.open_questions.forEach((q: string) => { text += `- ${q}\n`; });
  }
  if (content.notes_for_followup) {
    text += `\nPOZNAMKA: ${content.notes_for_followup}\n`;
  }
  return text;
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    initial: 'Uvodni schuzka',
    follow_up: 'Navazujici',
    review: 'Revize',
    closing: 'Uzavreni',
  };
  return labels[type] || type;
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
