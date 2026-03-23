import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getLogsByPatient } from '../../utils/db';
import { Clock, CheckCircle, XCircle, Pill, Calendar } from 'lucide-react';

export default function History() {
    const { currentUser } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        async function fetchLogs() {
            try {
                const data = await getLogsByPatient(currentUser.id);
                setLogs(data);
            } catch (err) {
                console.error('Error loading history:', err);
            }
            setLoading(false);
        }
        fetchLogs();
    }, [currentUser]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Loading history...</p>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header animate-in">
                <h1>Medicine History</h1>
                <p>Track all your past medicine intake records</p>
            </div>

            {logs.length === 0 ? (
                <div className="glass empty-state animate-in">
                    <Calendar size={64} />
                    <h3>No history yet</h3>
                    <p>Your medicine intake records will appear here after you take your first dose.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {logs.map((log, i) => (
                        <div key={log.id} className="glass glass-hover animate-slide-up" style={{
                            padding: '20px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            animationDelay: `${i * 0.05}s`,
                            opacity: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                                    background: log.status === 'verified' ? 'rgba(16,185,129,0.1)' : log.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Pill size={22} style={{
                                        color: log.status === 'verified' ? 'var(--success)' : log.status === 'rejected' ? 'var(--danger)' : 'var(--warning)',
                                    }} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                        {log.medicineName || 'Medicine Dose'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={12} /> {new Date(log.timestamp).toLocaleString()}
                                        {log.duration && <span>• {log.duration}s clip</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {log.reviewedBy && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Reviewed by {log.reviewedBy}
                                    </span>
                                )}
                                <span className={`badge badge-${log.status === 'rejected' ? 'missed' : log.status}`}>
                                    {log.status === 'verified' && <CheckCircle size={12} />}
                                    {log.status === 'pending' && <Clock size={12} />}
                                    {log.status === 'rejected' && <XCircle size={12} />}
                                    {log.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
