import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { saveMedicineLog, saveClip, getFaceDescriptor, generateId } from '../../utils/db';
import FaceVerify from '../../components/FaceVerify';
import { Camera, StopCircle, CheckCircle, Video, Pill, ArrowRight, Loader } from 'lucide-react';

export default function TakeMedicine() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const mediaRecorder = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);

    const [phase, setPhase] = useState('verify'); // verify → record → done
    const [recording, setRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [saving, setSaving] = useState(false);
    const [medicineName, setMedicineName] = useState('');
    const [faceLoading, setFaceLoading] = useState(true);
    const [hasFace, setHasFace] = useState(false);

    // Check if face is enrolled
    useEffect(() => {
        if (!currentUser) return;
        async function checkFace() {
            const descriptor = await getFaceDescriptor(currentUser.id);
            setHasFace(!!descriptor);
            setFaceLoading(false);
        }
        checkFace();
    }, [currentUser]);

    // Timer
    useEffect(() => {
        if (!recording) return;
        const iv = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(iv);
    }, [recording]);

    const onVerified = useCallback(() => {
        setPhase('record');
        startRecording();
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
                audio: true,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(err => console.error('Video play error:', err));
            }

            const mr = new MediaRecorder(stream, { mimeType: 'video/webm' });
            chunksRef.current = [];
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.start();
            mediaRecorder.current = mr;
            setRecording(true);
        } catch (err) {
            console.error('Camera error:', err);
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorder.current) return;
        setSaving(true);

        mediaRecorder.current.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());

        await new Promise(r => setTimeout(r, 500));

        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const clipId = generateId();

        try {
            // Upload clip to Cloudinary
            const clipUrl = await saveClip(clipId, blob);

            // Save medicine log to Firestore
            await saveMedicineLog({
                id: generateId(),
                clipId,
                clipUrl,
                patientId: currentUser.id,
                patientName: currentUser.name,
                medicineName: medicineName || 'Medicine Dose',
                timestamp: Date.now(),
                duration: elapsed,
                status: 'pending',
            });

            setPhase('done');
        } catch (err) {
            console.error('Error saving:', err);
            alert('Failed to save. Please try again.');
        }
        setRecording(false);
        setSaving(false);
    };

    if (faceLoading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header animate-in">
                <h1>💊 Take Medicine</h1>
                <p>Record yourself taking medicine for verification</p>
            </div>

            {/* Progress Steps */}
            <div className="glass animate-in" style={{
                padding: '20px 32px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
            }}>
                {[
                    { step: 1, label: 'Verify Face', phase: 'verify' },
                    { step: 2, label: 'Record Intake', phase: 'record' },
                    { step: 3, label: 'Submitted', phase: 'done' },
                ].map((s, i) => {
                    const active = s.phase === phase;
                    const done = (['verify', 'record', 'done'].indexOf(phase)) > i;
                    return (
                        <React.Fragment key={s.step}>
                            {i > 0 && <ArrowRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                color: active ? 'var(--primary)' : done ? 'var(--success)' : 'var(--text-muted)',
                                fontWeight: active ? 700 : 500,
                            }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', fontWeight: 700,
                                    background: active ? 'var(--primary)' : done ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                                    color: active || done ? '#000' : 'var(--text-muted)',
                                }}>
                                    {done ? '✓' : s.step}
                                </div>
                                {s.label}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Phase 1: Verify */}
            {phase === 'verify' && (
                <div className="glass animate-in" style={{ padding: '32px' }}>
                    <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                        <Camera size={20} style={{ color: 'var(--primary)' }} /> Face Verification
                    </h2>
                    {hasFace ? (
                        <FaceVerify onVerified={onVerified} />
                    ) : (
                        <div className="empty-state">
                            <h3>Face not enrolled</h3>
                            <p>Please re-register your account with face enrollment to use this feature.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Phase 2: Record */}
            {phase === 'record' && (
                <div className="glass animate-in" style={{ padding: '32px' }}>
                    <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                        <Video size={20} style={{ color: 'var(--danger)' }} /> Recording Medicine Intake
                    </h2>

                    <div className="input-group" style={{ marginBottom: '16px' }}>
                        <label>Medicine Name (optional)</label>
                        <input
                            className="input"
                            value={medicineName}
                            onChange={e => setMedicineName(e.target.value)}
                            placeholder="e.g., Aspirin 500mg"
                        />
                    </div>

                    <div className="video-player" style={{ position: 'relative', marginBottom: '20px' }}>
                        <video ref={videoRef} muted style={{ width: '100%' }} />
                        {recording && (
                            <div className="recording-indicator">
                                <div className="recording-dot" />
                                REC {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={stopRecording}
                        disabled={saving || elapsed < 3}
                        className="btn btn-danger btn-lg"
                        style={{ width: '100%' }}
                    >
                        {saving ? (
                            <><Loader size={18} className="spin" /> Saving to cloud...</>
                        ) : (
                            <><StopCircle size={18} /> Stop Recording & Submit</>
                        )}
                    </button>
                    {elapsed < 3 && (
                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Record at least 3 seconds
                        </p>
                    )}
                </div>
            )}

            {/* Phase 3: Done */}
            {phase === 'done' && (
                <div className="glass animate-in" style={{ padding: '48px 32px', textAlign: 'center' }}>
                    <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '20px' }} />
                    <h2 style={{ marginBottom: '8px' }}>Clip Submitted! 🎉</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Your medicine intake has been recorded and sent to your doctor/caretaker for review.
                    </p>
                    <button onClick={() => navigate('/patient')} className="btn btn-primary btn-lg">
                        Back to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
}
