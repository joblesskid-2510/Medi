import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

// Detection tuning constants
/** Minimum face-detector confidence score (0–1). Lower = more sensitive, more false positives. */
const FACE_SCORE_THRESHOLD = 0.4;
/** Mouth vertical/horizontal ratio above which the mouth is considered open (~0.05 closed, >0.25 open). */
const MOUTH_OPEN_THRESHOLD = 0.25;
/** How often (ms) the detection loop runs while recording. */
const DETECTION_INTERVAL_MS = 600;
/** Fallback video dimensions used before the video stream reports its real size. */
const DEFAULT_VIDEO_WIDTH = 640;
const DEFAULT_VIDEO_HEIGHT = 480;

// Shared flag — models are loaded once across the app
let modelsLoaded = false;

async function loadModels() {
    if (modelsLoaded) return;
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
}

/**
 * Calculates a mouth-open ratio using the 68-point landmark model.
 *
 * Inner-mouth indices (0-based):
 *   60 — left corner, 62 — upper centre, 64 — right corner, 66 — lower centre
 *
 * ratio = vertical gap / horizontal width
 * Typical values: ~0.05 (closed) → >0.25 (open)
 */
function getMouthOpenRatio(landmarks) {
    const pts = landmarks.positions;
    const upperLip = pts[62];
    const lowerLip = pts[66];
    const leftCorner = pts[60];
    const rightCorner = pts[64];

    const vertical = Math.abs(lowerLip.y - upperLip.y);
    const horizontal = Math.sqrt(
        Math.pow(rightCorner.x - leftCorner.x, 2) +
        Math.pow(rightCorner.y - leftCorner.y, 2)
    );
    return horizontal > 0 ? vertical / horizontal : 0;
}

/**
 * MedicineDetection — overlays real-time face detection on a live <video> element
 * and infers medicine-taking events from mouth-open/close sequences.
 *
 * Props:
 *   videoRef          — React ref pointing to the <video> element to analyse
 *   active            — boolean; start/stop the detection loop
 *   onDetectionUpdate — callback({ faceDetected, mouthOpen, medicineTaken })
 */
export default function MedicineDetection({ videoRef, active, onDetectionUpdate }) {
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);

    // Mutable state tracked without re-renders to avoid stale-closure issues
    const detStateRef = useRef({ wasOpen: false, openEvents: 0, medicineTaken: false });

    const [status, setStatus] = useState({
        faceDetected: false,
        mouthOpen: false,
        medicineTaken: false,
    });

    const runDetection = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        if (video.paused || video.ended || video.readyState < 2) return;

        try {
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: FACE_SCORE_THRESHOLD }))
                .withFaceLandmarks();

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!detection) {
                const update = {
                    faceDetected: false,
                    mouthOpen: false,
                    medicineTaken: detStateRef.current.medicineTaken,
                };
                setStatus(update);
                onDetectionUpdate?.(update);
                return;
            }

            // Resize landmarks/box to match the displayed canvas size
            const dims = faceapi.matchDimensions(canvas, video, true);
            const resized = faceapi.resizeResults(detection, dims);

            faceapi.draw.drawDetections(canvas, resized);
            faceapi.draw.drawFaceLandmarks(canvas, resized);

            const ratio = getMouthOpenRatio(resized.landmarks);
            const mouthOpen = ratio > MOUTH_OPEN_THRESHOLD;

            // Track mouth open → close cycle as one intake event
            const st = detStateRef.current;
            if (mouthOpen && !st.wasOpen) {
                st.openEvents++;
                st.wasOpen = true;
            } else if (!mouthOpen && st.wasOpen) {
                st.wasOpen = false;
                if (st.openEvents >= 1) {
                    st.medicineTaken = true;
                }
            }

            const update = {
                faceDetected: true,
                mouthOpen,
                medicineTaken: st.medicineTaken,
            };
            setStatus(update);
            onDetectionUpdate?.(update);
        } catch {
            // Detection errors are non-fatal; silently skip this frame
        }
    }, [videoRef, onDetectionUpdate]);

    // Start / stop detection loop based on `active` prop
    useEffect(() => {
        if (!active) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Reset per-recording state
        detStateRef.current = { wasOpen: false, openEvents: 0, medicineTaken: false };

        let cancelled = false;
        async function start() {
            await loadModels();
            if (cancelled) return;
            intervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
        }
        start();

        return () => {
            cancelled = true;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [active, runDetection]);

    // Keep canvas dimensions in sync with the video element
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !canvasRef.current) return;

        const sync = () => {
            if (canvasRef.current) {
                canvasRef.current.width = video.videoWidth || DEFAULT_VIDEO_WIDTH;
                canvasRef.current.height = video.videoHeight || DEFAULT_VIDEO_HEIGHT;
            }
        };
        video.addEventListener('loadedmetadata', sync);
        sync();
        return () => video.removeEventListener('loadedmetadata', sync);
    }, [videoRef]);

    return (
        <>
            {/* Detection canvas rendered on top of the video */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />

            {/* Status badges */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                zIndex: 10,
            }}>
                <div style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: status.faceDetected
                        ? 'rgba(16,185,129,0.85)'
                        : 'rgba(239,68,68,0.85)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    {status.faceDetected
                        ? <Eye size={12} />
                        : <EyeOff size={12} />}
                    {status.faceDetected ? 'Face Detected' : 'No Face'}
                </div>

                {status.medicineTaken && (
                    <div style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(16,185,129,0.85)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <CheckCircle2 size={12} /> Intake Detected
                    </div>
                )}
            </div>
        </>
    );
}
