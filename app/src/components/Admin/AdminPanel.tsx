import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { ANSATTE, findAnsatt, type EmployeeId } from '../../constants';
import { inputStyle } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const { permissions, setKanGodkjenne, meldinger, sendMelding, deleteMelding } = useAppData();
  const { user } = useAuth();
  const [tekst, setTekst] = useState('');
  const [til, setTil] = useState<'alle' | EmployeeId>('alle');

  const delegerbare = ANSATTE.filter((a) => a.id !== 'sander');

  const send = async () => {
    if (!tekst.trim() || !user) return;
    await sendMelding(user.id, til === 'alle' ? null : til, tekst.trim());
    setTekst('');
  };

  return (
    <div
      onClick={onClose}
      className="no-print"
      style={{ position: 'fixed', inset: 0, background: 'var(--modal-overlay)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 380, maxWidth: '92vw', height: '100%', background: 'var(--surface)', boxShadow: '-12px 0 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ fontFamily: "'Barlow Semi Condensed'", fontWeight: 700, fontSize: 18 }}>Administrasjon</div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, border: 'none', background: 'var(--bg)', borderRadius: 7, cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Delegering</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Gi ansatte lov til å godkjenne timar og vaktbytte på eigne vegner.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {delegerbare.map((a) => {
                const kan = permissions.find((p) => p.ansatt === a.id)?.kan_godkjenne || false;
                return (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <Avatar init={a.init} farge={a.farge} size={30} fontSize={11.5} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{a.navn}</span>
                    <input
                      type="checkbox"
                      checked={kan}
                      onChange={(e) => setKanGodkjenne(a.id, e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Send melding</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select value={til} onChange={(e) => setTil(e.target.value as 'alle' | EmployeeId)} style={inputStyle}>
                <option value="alle">Alle ansatte</option>
                {delegerbare.map((a) => <option key={a.id} value={a.id}>{a.navn}</option>)}
              </select>
              <textarea
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                placeholder="Skriv ei melding…"
                style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
              />
              <button
                onClick={send}
                disabled={!tekst.trim()}
                style={{ padding: '9px 14px', background: '#1597a8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: tekst.trim() ? 1 : 0.5 }}
              >
                Send
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Sendte meldingar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {meldinger.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Ingen meldingar sendt.</div>}
              {meldinger.map((m) => (
                <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Til: {m.til ? findAnsatt(m.til).navn : 'Alle'}</span>
                    <button
                      onClick={() => deleteMelding(m.id)}
                      style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11 }}
                    >
                      Slett
                    </button>
                  </div>
                  <div style={{ fontSize: 13 }}>{m.tekst}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
