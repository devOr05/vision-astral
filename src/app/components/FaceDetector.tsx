'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Loader2, ScanFace, Plus, Save, Trash2 } from 'lucide-react';

export default function FaceDetector() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Refs for loop access to avoid stale closures
    const labeledDescriptorsRef = useRef<faceapi.LabeledFaceDescriptors[]>([]);
    const isRegisteringRef = useRef(false);
    const facesDetectedRef = useRef(0); // Also ref for consistency in loop

    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string>('');

    // Only for UI rendering
    const [facesDetectedDisplay, setFacesDetectedDisplay] = useState(0);
    const [labeledDescriptors, setLabeledDescriptors] = useState<faceapi.LabeledFaceDescriptors[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [newFaceName, setNewFaceName] = useState('');
    const [currentDescriptor, setCurrentDescriptor] = useState<Float32Array | null>(null);

    // Sync state with refs
    useEffect(() => {
        isRegisteringRef.current = isRegistering;
    }, [isRegistering]);

    // Load saved faces from localStorage
    useEffect(() => {
        const savedFaces = localStorage.getItem('knownFaces');
        if (savedFaces) {
            try {
                const parsed = JSON.parse(savedFaces);
                const loadedDescriptors = parsed.map((item: any) => {
                    return new faceapi.LabeledFaceDescriptors(
                        item.label,
                        item.descriptors.map((d: any) => new Float32Array(d))
                    );
                });
                labeledDescriptorsRef.current = loadedDescriptors;
                setLabeledDescriptors(loadedDescriptors);
            } catch (e) {
                console.error("Failed to load faces from storage", e);
            }
        }
    }, []);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                startVideo();
            } catch (err) {
                console.error("Error loading models:", err);
                setError("Failed to load AI models");
                setInitializing(false);
            }
        };

        loadModels();
    }, []);

    const saveToLocalStorage = (descriptors: faceapi.LabeledFaceDescriptors[]) => {
        const serializable = descriptors.map(d => ({
            label: d.label,
            descriptors: d.descriptors.map(arr => Array.from(arr))
        }));
        localStorage.setItem('knownFaces', JSON.stringify(serializable));
    };

    const handleRegisterFace = () => {
        if (!newFaceName.trim() || !currentDescriptor) return;

        const nameToRegister = newFaceName.trim();
        const existingIndex = labeledDescriptorsRef.current.findIndex(d => d.label === nameToRegister);

        let updated: faceapi.LabeledFaceDescriptors[];

        if (existingIndex !== -1) {
            // Merge with existing identity to improve accuracy
            const existing = labeledDescriptorsRef.current[existingIndex];
            const newDescriptors = [...existing.descriptors, currentDescriptor];
            const merged = new faceapi.LabeledFaceDescriptors(nameToRegister, newDescriptors);

            updated = [...labeledDescriptorsRef.current];
            updated[existingIndex] = merged;
        } else {
            // Create new identity
            const newDescriptor = new faceapi.LabeledFaceDescriptors(
                nameToRegister,
                [currentDescriptor]
            );
            updated = [...labeledDescriptorsRef.current, newDescriptor];
        }

        labeledDescriptorsRef.current = updated;
        setLabeledDescriptors(updated); // Keep state in sync
        saveToLocalStorage(updated);

        setIsRegistering(false);
        setNewFaceName('');
        setCurrentDescriptor(null);
    };

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: {} })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((err) => {
                console.error("Error accessing webcam:", err);
                setError("Camera access denied");
                setInitializing(false);
            });
    };

    const handleVideoPlay = () => {
        setInitializing(false);
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
            // Use refs to check current state without closure staleness
            if (video.paused || video.ended || isRegisteringRef.current) return;

            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions()
                .withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);

                let faceMatcher: faceapi.FaceMatcher | null = null;
                if (labeledDescriptorsRef.current.length > 0) {
                    faceMatcher = new faceapi.FaceMatcher(labeledDescriptorsRef.current, 0.6);
                }

                resizedDetections.forEach(detection => {
                    const { x, y, width, height } = detection.detection.box;
                    let label = "Unknown";

                    // Identification
                    if (faceMatcher) {
                        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                        label = bestMatch.toString();
                    }

                    // Draw corners
                    context.strokeStyle = label.includes("Unknown") ? '#00f0ff' : '#00ff00'; // Green if known
                    context.lineWidth = 2;

                    // Helper to draw corners
                    const lineLen = 20;

                    // Custom drawing similar to previous
                    // Top-left
                    context.beginPath();
                    context.moveTo(x, y + lineLen);
                    context.lineTo(x, y);
                    context.lineTo(x + lineLen, y);
                    context.stroke();

                    // Top-right
                    context.beginPath();
                    context.moveTo(x + width - lineLen, y);
                    context.lineTo(x + width, y);
                    context.lineTo(x + width, y + lineLen);
                    context.stroke();

                    // Bottom-right
                    context.beginPath();
                    context.moveTo(x + width, y + height - lineLen);
                    context.lineTo(x + width, y + height);
                    context.lineTo(x + width - lineLen, y + height);
                    context.stroke();

                    // Bottom-left
                    context.beginPath();
                    context.moveTo(x + lineLen, y + height);
                    context.lineTo(x, y + height);
                    context.lineTo(x, y + height - lineLen);
                    context.stroke();

                    // Add label
                    context.fillStyle = label.includes("Unknown") ? '#00f0ff' : '#00ff00';
                    context.font = '16px monospace';
                    context.fillText(label, x, y - 10);
                });
            }

            // Update UI state only if changed to avoid renders? Actually React handles that, 
            // but we need to signal the descriptors update
            setFacesDetectedDisplay(detections.length);

            // Update the "current" descriptor for registration purposes if exactly one face
            if (detections.length === 1) {
                setCurrentDescriptor(detections[0].descriptor);
            } else {
                setCurrentDescriptor(null);
            }

        }, 100);
    };

    return (
        <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-glass-border bg-black group">
            {initializing && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-accent animate-spin" />
                        <p className="text-accent font-mono tracking-widest">INITIALIZING SYSTEMS...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80">
                    <p className="text-red-500 font-mono text-xl">{error}</p>
                </div>
            )}

            {/* Registration Modal Overlay */}
            {isRegistering && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="bg-black border border-accent p-6 rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] w-80">
                        <h3 className="text-accent font-bold mb-4 font-mono">NEW IDENTITY</h3>
                        <input
                            type="text"
                            placeholder="Enter Name"
                            value={newFaceName}
                            onChange={(e) => setNewFaceName(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white mb-2 focus:outline-none focus:border-accent"
                            autoFocus
                        />
                        {labeledDescriptors.some(d => d.label === newFaceName.trim()) && (
                            <p className="text-xs text-yellow-400 mb-4 font-mono">
                                ⚠ UPDATING EXISTING ID DATA
                            </p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setIsRegistering(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleRegisterFace}
                                disabled={!newFaceName.trim()}
                                className="px-4 py-2 bg-accent/20 text-accent border border-accent rounded hover:bg-accent/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> SAVE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                muted
                onPlay={handleVideoPlay}
                className="absolute inset-0 w-full h-full object-cover"
            />

            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                <ScanFace className={`w-5 h-5 ${facesDetectedDisplay > 0 ? 'text-green-400' : 'text-gray-400'}`} />
                <span className="font-mono text-sm text-white">
                    {facesDetectedDisplay > 0 ? `${facesDetectedDisplay} TARGET(S) LOCKED` : 'SEARCHING...'}
                </span>
            </div>

            <div className="scan-line pointer-events-none"></div>

            {/* Add Button */}
            {!isRegistering && !initializing && facesDetectedDisplay === 1 && (
                <button
                    onClick={() => setIsRegistering(true)}
                    className="absolute bottom-6 right-6 z-20 bg-accent text-black p-3 rounded-full hover:scale-110 transition-transform shadow-[0_0_15px_var(--accent)]"
                    title="Register Face"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
