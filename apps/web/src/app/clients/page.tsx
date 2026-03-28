'use client';

import { useState, useEffect } from 'react';

export default function ClientsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/cases')
      .then(r => r.json())
      .then(setData);
  }, []);

  if (!data) return <div>Nacitam...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Klienti</h2>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Jmeno</th>
              <th>ID</th>
              <th>Pocet schuzek</th>
              <th>Profil</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((client: any) => {
              const clientCases = data.cases.filter((c: any) => c.clientId === client.id);
              const hasProfile = client.profile !== null;
              return (
                <tr key={client.id}>
                  <td><strong>{client.name}</strong></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{client.id}</td>
                  <td>{clientCases.length}</td>
                  <td>
                    {hasProfile ? (
                      <span className="badge badge-approved">Vyplnen</span>
                    ) : (
                      <span className="badge badge-pending">Chybi</span>
                    )}
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
