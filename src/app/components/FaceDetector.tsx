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
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthPlace, setBirthPlace] = useState('');
    const [currentDescriptor, setCurrentDescriptor] = useState<Float32Array | null>(null);

    // New biometric states
    const [brainSide, setBrainSide] = useState<{ side: string, score: number } | null>(null);
    const [facialLines, setFacialLines] = useState<string>('');
    const [identifiedMetadata, setIdentifiedMetadata] = useState<any>(null);
    const [showAdvice, setShowAdvice] = useState(false);
    const [adviceText, setAdviceText] = useState('');
    const emotionHistoryRef = useRef<faceapi.FaceExpressions[]>([]);

    // Expose trigger for main page
    useEffect(() => {
        const handleExternalTrigger = () => {
            if (identifiedMetadata) {
                generateAdvice();
            } else {
                alert("Identidad no detectada. Por favor, acércate a la cámara.");
            }
        };
        window.addEventListener('trigger-astral-advice', handleExternalTrigger);
        return () => window.removeEventListener('trigger-astral-advice', handleExternalTrigger);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identifiedMetadata]);

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
                console.log("Starting model loading...");
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                console.log("Models loaded successfully.");
                startVideo();
            } catch (err) {
                console.error("Error loading models:", err);
                setError(`Failed to load AI models: ${err instanceof Error ? err.message : String(err)}`);
                setInitializing(false);
                startVideo(); // Always try to start video even if models fail
            }
        };

        loadModels();
    }, []);

    const saveToLocalStorage = (descriptors: faceapi.LabeledFaceDescriptors[]) => {
        const serializable = descriptors.map(d => {
            // Check if we have extra data for this label in a separate storage or extend the descriptor?
            // Actually, face-api doesn't store metadata in LabeledFaceDescriptors easily.
            // We'll store metadata in a separate key 'knownFacesMetadata'
            return {
                label: d.label,
                descriptors: d.descriptors.map(arr => Array.from(arr))
            };
        });
        localStorage.setItem('knownFaces', JSON.stringify(serializable));
    };

    const handleRegisterFace = () => {
        if (!newFaceName.trim() || !currentDescriptor) return;

        const nameToRegister = newFaceName.trim();
        const metadata = {
            birthDate,
            birthTime,
            birthPlace,
            zodiac: getZodiacSign(birthDate),
        };

        // Save metadata separately to preserve it
        const savedMetadata = localStorage.getItem('knownFacesMetadata');
        const parsedMetadata = savedMetadata ? JSON.parse(savedMetadata) : {};
        parsedMetadata[nameToRegister] = metadata;
        localStorage.setItem('knownFacesMetadata', JSON.stringify(parsedMetadata));

        const existingIndex = labeledDescriptorsRef.current.findIndex(d => d.label === nameToRegister);
        let updated: faceapi.LabeledFaceDescriptors[];

        if (existingIndex !== -1) {
            const existing = labeledDescriptorsRef.current[existingIndex];
            const newDescriptors = [...existing.descriptors, currentDescriptor];
            const merged = new faceapi.LabeledFaceDescriptors(nameToRegister, newDescriptors);
            updated = [...labeledDescriptorsRef.current];
            updated[existingIndex] = merged;
        } else {
            const newDescriptor = new faceapi.LabeledFaceDescriptors(nameToRegister, [currentDescriptor]);
            updated = [...labeledDescriptorsRef.current, newDescriptor];
        }

        labeledDescriptorsRef.current = updated;
        setLabeledDescriptors(updated);
        saveToLocalStorage(updated);

        setIsRegistering(false);
        setNewFaceName('');
        setBirthDate('');
        setBirthTime('');
        setBirthPlace('');
        setCurrentDescriptor(null);
    };

    const getZodiacSign = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate() + 1; // Basic normalization
        const month = date.getMonth() + 1;

        if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Acuario";
        if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Piscis";
        if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
        if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Tauro";
        if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Géminis";
        if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cáncer";
        if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
        if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
        if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
        if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Escorpio";
        if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagitario";
        if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricornio";
        return "";
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

    const analyzeBrainSide = (landmarks: faceapi.FaceLandmarks68) => {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();
        const jaw = landmarks.getJawOutline();

        // Very simplified logic for "Aesthetic/Mystical" predominance
        // We look at subtle differences in eye size or jaw tilt
        const leftEyeWidth = leftEye[3].x - leftEye[0].x;
        const rightEyeWidth = rightEye[3].x - rightEye[0].x;

        const diff = (leftEyeWidth - rightEyeWidth) / ((leftEyeWidth + rightEyeWidth) / 2);

        if (Math.abs(diff) < 0.02) {
            return { side: 'EQUILIBRADO', score: 50 };
        }
        return diff > 0
            ? { side: 'DERECHO (CREATIVO)', score: Math.min(100, 50 + diff * 500) }
            : { side: 'IZQUIERDO (LÓGICO)', score: Math.min(100, 50 - diff * 500) };
    };

    const analyzeEmotionsToLines = (expressions: faceapi.FaceExpressions) => {
        // Add to history
        emotionHistoryRef.current.push(expressions);
        if (emotionHistoryRef.current.length > 50) emotionHistoryRef.current.shift();

        // Get dominant emotion
        const entries = Object.entries(expressions);
        const dominant = entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];

        const readings: Record<string, string> = {
            neutral: "Líneas de equilibrio ancestral. Refleja una paz interior profunda.",
            happy: "Surcos de luz solar. Irradia una energía vital contagiosa.",
            sad: "Senderos de sabiduría líquida. Capacidad de sentir el universo.",
            angry: "Trazos de fuego volcánico. Poder de transmutación y voluntad.",
            fearful: "Vibraciones de alerta cósmica. Intuición altamente desarrollada.",
            disgusted: "Filtros de discernimiento etéreo. Protege su esencia con rigor.",
            surprised: "Aperturas al asombro infinito. Siempre listo para lo nuevo."
        };

        return readings[dominant] || "Líneas en flujo constante. Aura en transformación.";
    };

    const generateAdvice = () => {
        if (!identifiedMetadata) return;

        const { zodiac } = identifiedMetadata;
        const expressions = emotionHistoryRef.current[emotionHistoryRef.current.length - 1];
        if (!expressions) return;

        const entries = Object.entries(expressions);
        const dominant = entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];

        const archetypes: Record<string, string> = {
            "Aries": "Guerrero de Fuego", "Tauro": "Guardián de la Tierra", "Géminis": "Mensajero del Aire",
            "Cáncer": "Protector del Agua", "Leo": "Rey del Sol", "Virgo": "Analista de la Pureza",
            "Libra": "Arquitecto de la Armonía", "Escorpio": "Transmutador de Sombras", "Sagitario": "Buscador de la Verdad",
            "Capricornio": "Constructor de Destinos", "Acuario": "Visionario Estelar", "Piscis": "Soñador del Infinito"
        };

        const archetype = archetypes[zodiac] || "Viajero Astral";
        const brainInfo = brainSide?.side.includes("DERECHO") ? "intuición creativa" :
            brainSide?.side.includes("IZQUIERDO") ? "razonamiento lógico" : "equilibrio mental";

        const advices: Record<string, string[]> = {
            neutral: [
                "Tu centro está firme. Es un buen momento para tomar decisiones importantes desde la calma.",
                "Esa serenidad es tu mayor poder hoy. Observa antes de actuar."
            ],
            happy: [
                "Tu vibración alta atraerá nuevas oportunidades. No dejes de sonreír al universo.",
                "Comparte esa alegría; es el combustible que tu arquetipo necesita hoy."
            ],
            sad: [
                "Las aguas profundas de tu ser están sanando. Permítete sentir para liberar.",
                "Usa este momento de introspección para reconectar con tu esencia más pura."
            ],
            angry: [
                "Usa ese fuego para construir, no para destruir. Canaliza la energía en acción productiva.",
                "Tu fuerza es inmensa hoy. Domínala y moverás montañas."
            ]
        };

        const moodAdvices = advices[dominant] || ["Tu energía está en fase de cambio. Fluye con lo que el día te traiga."];
        const randomAdvice = moodAdvices[Math.floor(Math.random() * moodAdvices.length)];

        setAdviceText(`Como ${archetype}, tu ${brainInfo} está hoy en sintonía con el cosmos. Tus ${facialLines.charAt(0).toLowerCase() + facialLines.slice(1)} Además: ${randomAdvice}`);
        setShowAdvice(true);
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

                        if (!label.includes("Unknown")) {
                            // Extract label name (name without score)
                            const nameOnly = label.split(" ")[0];
                            const savedMetadata = localStorage.getItem('knownFacesMetadata');
                            if (savedMetadata) {
                                const parsed = JSON.parse(savedMetadata);
                                setIdentifiedMetadata(parsed[nameOnly] || null);
                            }
                        } else {
                            setIdentifiedMetadata(null);
                        }
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
                    context.font = 'bold 24px monospace'; // Bolder and larger
                    context.shadowColor = 'black';
                    context.shadowBlur = 4;
                    context.fillText(label.toUpperCase(), x, y - 15);
                });
            }

            // Update UI state only if changed to avoid renders? Actually React handles that, 
            // but we need to signal the descriptors update
            setFacesDetectedDisplay(detections.length);

            // Update the "current" descriptor for registration purposes if exactly one face
            if (detections.length === 1) {
                setCurrentDescriptor(detections[0].descriptor);

                // Update biometrics
                const brainData = analyzeBrainSide(detections[0].landmarks);
                const lineReading = analyzeEmotionsToLines(detections[0].expressions);
                setBrainSide(brainData);
                setFacialLines(lineReading);
            } else {
                setCurrentDescriptor(null);
                setBrainSide(null);
                setFacialLines('');
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
                <div className="absolute top-4 right-4 z-50 p-3 bg-red-500/20 border border-red-500/50 backdrop-blur-md rounded text-red-500 text-[10px] font-mono animate-pulse">
                    <span className="font-bold">⚠ OFFLINE MODE / AI MODULES NOT LOADED</span>
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
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="space-y-1">
                                <label className="text-[8px] text-gray-400 font-mono uppercase">Fecha Nacimiento</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] text-gray-400 font-mono uppercase">Hora (Opcional)</label>
                                <input
                                    type="time"
                                    value={birthTime}
                                    onChange={(e) => setBirthTime(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent"
                                />
                            </div>
                        </div>
                        <div className="space-y-1 mb-4">
                            <label className="text-[8px] text-gray-400 font-mono uppercase">Lugar de Nacimiento</label>
                            <input
                                type="text"
                                placeholder="Ciudad, País"
                                value={birthPlace}
                                onChange={(e) => setBirthPlace(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent"
                            />
                        </div>
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
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                    <ScanFace className={`w-5 h-5 ${facesDetectedDisplay > 0 ? 'text-green-400' : 'text-gray-400'}`} />
                    <span className="font-mono text-sm text-white uppercase tracking-wider">
                        {facesDetectedDisplay > 0 ? `${facesDetectedDisplay} TARGET(S) LOCKED` : 'SEARCHING...'}
                    </span>
                </div>
            </div>

            {/* Biometric Sidebar */}
            {facesDetectedDisplay === 1 && brainSide && (
                <div className="absolute top-4 right-4 z-10 w-64 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="p-4 bg-black/60 backdrop-blur-xl border border-accent/30 rounded-lg shadow-2xl">
                        <h4 className="text-[10px] text-accent font-bold font-mono tracking-[0.2em] mb-3 uppercase">Análisis Biométrico</h4>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[9px] text-gray-400 font-mono mb-1">
                                    <span>PREDOMINIO CEREBRAL</span>
                                    <span>{Math.round(brainSide.score)}%</span>
                                </div>
                                <div className="text-sm text-white font-bold font-mono truncate">{brainSide.side}</div>
                                <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-1000"
                                        style={{ width: `${brainSide.score}%` }}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/10">
                                <div className="text-[9px] text-gray-400 font-mono mb-1 uppercase tracking-wider">Lectura de Líneas</div>
                                <div className="text-[11px] text-accent/90 italic leading-relaxed font-mono">
                                    "{facialLines}"
                                </div>
                            </div>

                            {identifiedMetadata ? (
                                <div className="pt-2 border-t border-white/10">
                                    <div className="text-[9px] text-gray-400 font-mono mb-1 uppercase tracking-wider">Perfil Astral</div>
                                    <div className="text-xs text-white font-mono">
                                        Signo: <span className="text-accent">{identifiedMetadata.zodiac}</span>
                                    </div>
                                    <button
                                        onClick={generateAdvice}
                                        className="mt-3 w-full py-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 rounded text-accent text-[10px] font-bold font-mono transition-colors uppercase tracking-widest"
                                    >
                                        Dar consejo del día
                                    </button>
                                </div>
                            ) : (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-[8px] text-gray-500 font-mono italic">
                                        Identidad no registrada. Registra tu rostro para recibir consejos astrales.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Advice Modal */}
            {showAdvice && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="max-w-md p-8 bg-black border border-accent rounded-xl shadow-[0_0_50px_rgba(0,240,255,0.2)] text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                        <h3 className="text-accent font-bold mb-6 font-mono tracking-[0.3em] uppercase">Mensaje del Cosmos</h3>
                        <p className="text-white text-lg font-mono leading-relaxed mb-8 italic">
                            "{adviceText}"
                        </p>
                        <button
                            onClick={() => setShowAdvice(false)}
                            className="px-8 py-3 bg-accent text-black font-bold font-mono rounded-full hover:scale-105 transition-transform uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                        >
                            Gracias, Universo
                        </button>
                    </div>
                </div>
            )}

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
