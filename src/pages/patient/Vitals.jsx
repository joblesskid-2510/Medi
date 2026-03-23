import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { saveVital, getVitalsByPatient, generateId } from '../../utils/db';
import { Heart, Thermometer, Activity, Droplets, Plus, TrendingUp, X, CheckCircle } from 'lucide-react';

// ─── Normal Ranges ─────────────────────────────
const VITAL_CONFIG = {
    systolic: { label: 'Systolic BP', unit: 'mmHg', min: 90, max: 140, icon: Heart, color: '#ef4444', emoji: '🫀' },
    diastolic: { label: 'Diastolic BP', unit: 'mmHg', min: 60, max: 90, icon: Heart, color: '#f97316', emoji: '🫀' },
    temperature: { label: 'Temperature', unit: '°F', min: 97, max: 99.5, icon: Thermometer, color: '#eab308', emoji: '🌡️' },
    heartRate: { label: 'Heart Rate', unit: 'bpm', min: 60, max: 100, icon: Activity, color: '#22c55e', emoji: '💓' },
    bloodSugar: { label: 'Blood Sugar', unit: 'mg/dL', min: 70, max: 140, icon: Droplets, color: '#8b5cf6', emoji: '🩸' },
};

function getStatus(key, value) {
    const cfg = VITAL_CONFIG[key];
    if (!cfg || !value) return { label: 'N/A', color: 'var(--text-muted)' };
    const v = parseFloat(value);
    if (v < cfg.min) return { label: 'Low', color: '#3b82f6' };
    if (v > cfg.max) return { label: 'High', color: '#ef4444' };
    return { label: 'Normal', color: '#22c55e' };
}

// ─── Mini SVG Line Chart ───────────────────────
function MiniChart({ data, color, min, max }) {
    if (data.length < 2) return <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Need more data</div>;

    const w = 280, h = 60, padding = 4;
    const effectiveMin = Math.min(min * 0.9, ...data);
    const effectiveMax = Math.max(max * 1.1, ...data);
    const range = effectiveMax - effectiveMin || 1;

    const points = data.slice(0, 7).reverse().map((v, i, arr) => {
        const x = padding + (i / (arr.length - 1)) * (w - padding * 2);
        const y = h - padding - ((v - effectiveMin) / range) * (h - padding * 2);
        return `${x},${y}`;
    });

    // Normal range band
    const normY1 = h - padding - ((max - effectiveMin) / range) * (h - padding * 2);
    const normY2 = h - padding - ((min - effectiveMin) / range) * (h - padding * 2);

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
            {/* Normal range band */}
            <rect x={padding} y={normY1} width={w - padding * 2} height={normY2 - normY1}
                fill="rgba(34,197,94,0.08)" rx="4" />
            {/* Line */}
            <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {points.map((p, i) => {
                const [x, y] = p.split(',');
                return <circle key={i} cx={x} cy={y} r="3.5" fill={color} stroke="#0a0e1a" strokeWidth="1.5" />;
            })}
        </svg>
    );
}

export default function Vitals() {
    const { currentUser } = useAuth();
    const [vitals, setVitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        systolic: '', diastolic: '', temperature: '', heartRate: '', bloodSugar: '', notes: '',
    });

    useEffect(() => {
        if (!currentUser) return;
        fetchVitals();
    }, [currentUser]);

    async function fetchVitals() {
        if (!currentUser) return;
        try {
            const v = await getVitalsByPatient(currentUser.id);
            setVitals(v);
        } catch (err) { console.error(err); }
        setLoading(false);
    }

    const handleSave = async () => {
        const hasValue = Object.keys(VITAL_CONFIG).some(k => form[k] && form[k].trim());
        if (!hasValue) return;
        setSaving(true);
        try {
            const vital = {
                id: generateId(),
                patientId: currentUser.id,
                patientName: currentUser.name,
                ...Object.fromEntries(Object.keys(VITAL_CONFIG).map(k => [k, form[k] ? parseFloat(form[k]) : null])),
                notes: form.notes,
                timestamp: Date.now(),
            };
            await saveVital(vital);
            setVitals(prev => [vital, ...prev]);
            setForm({ systolic: '', diastolic: '', temperature: '', heartRate: '', bloodSugar: '', notes: '' });
            setShowAdd(false);
            setSuccess('✅ Vitals recorded!');
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    // Build 7-day chart data per vital
    const chartData = {};
    for (const key of Object.keys(VITAL_CONFIG)) {
        chartData[key] = vitals.filter(v => v[key] != null).slice(0, 7).map(v => v[key]);
    }

    // Latest values
    const latest = vitals[0] || {};

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading vitals...</p></div>;

    return (
        <div className="page">
            <style>{`
                .vital-card { transition: all 0.3s ease; }
                .vital-card:hover { transform: translateY(-3px); }
                .success-toast { animation: toast-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
                @keyframes toast-in { 0% { transform: translateY(-20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
            `}</style>

            {/* Header */}
            <div className="page-header animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1>📊 Health Vitals</h1>
                    <p>Track your daily health measurements</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                    <Plus size={18} /> Log Vitals
                </button>
            </div>

            {success && (
                <div className="success-toast" style={{
                    padding: '14px 20px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '24px',
                }}>{success}</div>
            )}

            {/* Current Vitals Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {Object.entries(VITAL_CONFIG).map(([key, cfg], i) => {
                    const value = latest[key];
                    const status = getStatus(key, value);
                    return (
                        <div key={key} className="glass vital-card animate-slide-up" style={{
                            padding: '20px', animationDelay: `${i * 0.08}s`, opacity: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1.3rem' }}>{cfg.emoji}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{cfg.label}</span>
                                </div>
                                {value != null && (
                                    <span style={{
                                        fontSize: '0.65rem', padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                        background: `${status.color}15`, border: `1px solid ${status.color}30`,
                                        color: status.color, fontWeight: 700, textTransform: 'uppercase',
                                    }}>{status.label}</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px' }}>
                                <span style={{
                                    fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)',
                                    background: `linear-gradient(135deg, ${cfg.color}, var(--text-primary))`,
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                                }}>
                                    {value != null ? value : '—'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cfg.unit}</span>
                            </div>
                            {/* Mini chart */}
                            <MiniChart data={chartData[key]} color={cfg.color} min={cfg.min} max={cfg.max} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                <span>Normal: {cfg.min}–{cfg.max} {cfg.unit}</span>
                                <span>{chartData[key].length} readings</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* History */}
            <div className="glass animate-in" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '1rem', fontWeight: 700 }}>
                    <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Recent Readings
                    <span style={{
                        marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px',
                        borderRadius: 'var(--radius-full)', background: 'rgba(0,212,255,0.08)', color: 'var(--primary)',
                    }}>{vitals.length} total</span>
                </h3>

                {vitals.length === 0 ? (
                    <div className="empty-state">
                        <Activity size={48} /><h3>No vitals recorded</h3>
                        <p>Tap "Log Vitals" to start tracking your health.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {vitals.slice(0, 10).map((v, i) => (
                            <div key={v.id} className="glass-light animate-slide-up" style={{
                                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px',
                                animationDelay: `${0.1 + i * 0.04}s`, opacity: 0,
                            }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '100px', fontFamily: 'var(--font-mono)' }}>
                                    {new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div style={{ display: 'flex', gap: '14px', flex: 1, flexWrap: 'wrap' }}>
                                    {Object.entries(VITAL_CONFIG).map(([key, cfg]) => {
                                        if (v[key] == null) return null;
                                        const st = getStatus(key, v[key]);
                                        return (
                                            <span key={key} style={{
                                                fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px',
                                            }}>
                                                <span style={{ fontSize: '0.85rem' }}>{cfg.emoji}</span>
                                                <strong style={{ color: st.color }}>{v[key]}</strong>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{cfg.unit}</span>
                                            </span>
                                        );
                                    })}
                                </div>
                                {v.notes && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>📝 {v.notes}</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAdd && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(8px)', padding: '24px',
                }} onClick={() => setShowAdd(false)}>
                    <div className="glass animate-in" style={{ width: '100%', maxWidth: '500px', padding: '32px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={20} style={{ color: 'var(--primary)' }} /> Log Vitals
                            </h2>
                            <button onClick={() => setShowAdd(false)} className="btn btn-icon btn-ghost"><X size={18} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            {Object.entries(VITAL_CONFIG).map(([key, cfg]) => (
                                <div key={key}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                        {cfg.emoji} {cfg.label} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>({cfg.unit})</span>
                                    </label>
                                    <input type="number" step="0.1" className="input" placeholder={`${cfg.min}–${cfg.max}`}
                                        value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '14px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>📝 Notes (optional)</label>
                            <input type="text" className="input" placeholder="e.g. After breakfast"
                                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                        </div>

                        <button onClick={handleSave} className="btn btn-primary" disabled={saving}
                            style={{ width: '100%', marginTop: '20px', padding: '14px' }}>
                            {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : <><CheckCircle size={16} /> Save Vitals</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
