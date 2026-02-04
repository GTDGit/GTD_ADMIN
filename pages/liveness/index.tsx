'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

// Types
interface LivenessSession {
  sessionId: string;
  nik: string;
  method: 'passive' | 'active';
  challenges?: string[];
  expiresAt: string;
}

interface LivenessResult {
  sessionId: string;
  nik: string;
  method: string;
  isLive: boolean;
  confidence: number;
  file?: {
    face: string;
  };
  failureReason?: string;
  errorCode?: string;
}

interface Frame {
  timestamp: number;
  action?: string;
  image: string;
  faceBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

// Challenge display names
const CHALLENGE_NAMES: Record<string, string> = {
  blink: 'Kedipkan mata Anda',
  smile: 'Tersenyumlah',
  nod: 'Anggukkan kepala Anda',
  turnRight: 'Putar kepala ke kanan',
  turnLeft: 'Putar kepala ke kiri',
};

export default function LivenessPage() {
  // State
  const [nik, setNik] = useState('');
  const [method, setMethod] = useState<'passive' | 'active'>('passive');
  const [session, setSession] = useState<LivenessSession | null>(null);
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [step, setStep] = useState<'input' | 'camera' | 'processing' | 'result'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<string | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [instruction, setInstruction] = useState('Posisikan wajah dalam bingkai oval');
  
  // Face detection state
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [faceDistance, setFaceDistance] = useState<'too-far' | 'good' | 'too-close' | null>(null);
  const [ovalSize, setOvalSize] = useState(60); // 60% to 85% of screen width
  const [borderColor, setBorderColor] = useState<'white' | 'green' | 'red'>('white');
  const [isCapturing, setIsCapturing] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // API configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || '';
  const CLIENT_SECRET = process.env.NEXT_PUBLIC_CLIENT_SECRET || '';

  // Load face detection model
  useEffect(() => {
    let mounted = true;
    
    const loadModel = async () => {
      try {
        await tf.ready();
        const model = await blazeface.load();
        if (mounted) {
          modelRef.current = model;
        }
      } catch (err) {
        console.error('Failed to load face detection model:', err);
      }
    };

    loadModel();

    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Face detection function
  const detectFace = useCallback(async (): Promise<FaceDetection | null> => {
    if (!videoRef.current || !modelRef.current || !detectionCanvasRef.current) {
      return null;
    }

    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const predictions = await modelRef.current.estimateFaces(
        canvas,
        false // returnTensors
      );

      if (predictions.length === 0) {
        setFaceDetected(false);
        setFaceCount(0);
        setFaceDistance(null);
        return null;
      }

      if (predictions.length > 1) {
        setFaceCount(predictions.length);
        setBorderColor('red');
        setInstruction('Pastikan hanya satu wajah dalam bingkai');
        return null;
      }

      const face = predictions[0];
      // BlazeFace returns coordinates as arrays [x, y]
      const start: [number, number] = face.topLeft as [number, number];
      const end: [number, number] = face.bottomRight as [number, number];
      const width = end[0] - start[0];
      const height = end[1] - start[1];

      // Calculate face size relative to video frame
      const faceArea = width * height;
      const videoArea = canvas.width * canvas.height;
      const faceRatio = faceArea / videoArea;

      // Determine distance based on face size
      let distance: 'too-far' | 'good' | 'too-close' = 'good';
      let newOvalSize = ovalSize;

      if (faceRatio < 0.15) {
        // Face too small (too far)
        distance = 'too-far';
        newOvalSize = 60;
        setInstruction('Terlalu jauh, dekatkan wajah Anda');
        setBorderColor('white');
      } else if (faceRatio > 0.35) {
        // Face too large (too close)
        distance = 'too-close';
        newOvalSize = 85;
        setInstruction('Terlalu dekat, mundur sedikit');
        setBorderColor('white');
      } else {
        // Good distance
        distance = 'good';
        // Animate oval size based on face size (60% to 85%)
        newOvalSize = 60 + (faceRatio - 0.15) / 0.2 * 25; // Map 0.15-0.35 to 60-85
        setInstruction('Wajah terdeteksi');
        setBorderColor('green');
      }

      setFaceDetected(true);
      setFaceCount(1);
      setFaceDistance(distance);
      setOvalSize(newOvalSize);

      return {
        x: start[0],
        y: start[1],
        width,
        height,
        confidence: (face as any).probability?.[0] || (face as any).confidence || 0,
      };
    } catch (err) {
      console.error('Face detection error:', err);
      return null;
    }
  }, [ovalSize]);

  // Start face detection loop
  useEffect(() => {
    if (step !== 'camera' || !cameraReady || isCapturing) {
      return;
    }

    const interval = setInterval(() => {
      detectFace();
    }, 100); // Detect every 100ms

    detectionIntervalRef.current = interval as unknown as number;

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [step, cameraReady, isCapturing, detectFace]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setInstruction('Posisikan wajah dalam bingkai oval');
        setBorderColor('white');
        setOvalSize(60);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setCameraReady(false);
    setFaceDetected(false);
  }, []);

  // Capture frame from video
  const captureFrame = useCallback((action?: string): Frame | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image for selfie view
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    return {
      timestamp: Date.now(),
      action,
      image: imageData,
    };
  }, []);

  // Create session
  const createSession = async () => {
    if (!nik || nik.length !== 16) {
      setError('NIK harus 16 digit');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/identity/liveness/session`, {
        method: 'POST',
        headers: {
          'X-Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${CLIENT_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nik, method }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create session');
      }

      setSession(data.data);
      setStep('camera');
      framesRef.current = [];

      // Start camera
      await startCamera();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // Start liveness verification
  const startVerification = async () => {
    if (!session) return;

    // Check if face is detected and in good position
    if (!faceDetected || faceDistance !== 'good' || faceCount !== 1) {
      setError('Pastikan wajah terdeteksi dengan baik dan posisi tepat di tengah');
      return;
    }

    setIsCapturing(true);
    setInstruction('Bersiap...');
    setCountdown(3);

    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(null);

    if (method === 'passive') {
      await runPassiveVerification();
    } else {
      await runActiveVerification();
    }

    setIsCapturing(false);
  };

  // Passive verification - capture multiple frames
  const runPassiveVerification = async () => {
    setInstruction('Tetap diam, sedang memverifikasi...');
    setBorderColor('green');
    framesRef.current = [];

    // Capture frames over 2-3 seconds
    for (let i = 0; i < 5; i++) {
      const frame = captureFrame();
      if (frame) {
        framesRef.current.push(frame);
      }
      await new Promise(r => setTimeout(r, 400));
    }

    await submitVerification();
  };

  // Active verification - guide through challenges
  const runActiveVerification = async () => {
    if (!session?.challenges) return;

    framesRef.current = [];

    for (let i = 0; i < session.challenges.length; i++) {
      const challenge = session.challenges[i];
      setChallengeIndex(i);
      setCurrentChallenge(challenge);
      setInstruction(CHALLENGE_NAMES[challenge] || challenge);
      setBorderColor('white');

      // Wait for user to perform action
      await new Promise(r => setTimeout(r, 2500));

      // Capture frame for this challenge
      const frame = captureFrame(challenge);
      if (frame) {
        framesRef.current.push(frame);
      }
    }

    setCurrentChallenge(null);
    await submitVerification();
  };

  // Submit verification
  const submitVerification = async () => {
    if (!session || framesRef.current.length === 0) {
      setError('Tidak ada frame yang di-capture');
      return;
    }

    setStep('processing');
    stopCamera();

    try {
      const response = await fetch(`${API_BASE_URL}/v1/identity/liveness/verify`, {
        method: 'POST',
        headers: {
          'X-Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${CLIENT_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          frames: framesRef.current,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setResult({
          sessionId: session.sessionId,
          nik: session.nik,
          method: session.method,
          isLive: false,
          confidence: 0,
          failureReason: data.message || 'Verification failed',
          errorCode: data.error?.code,
        });
      }
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat verifikasi');
      setStep('result');
    }
  };

  // Reset
  const handleReset = () => {
    stopCamera();
    setSession(null);
    setResult(null);
    setError(null);
    setStep('input');
    framesRef.current = [];
    setChallengeIndex(0);
    setCurrentChallenge(null);
    setFaceDetected(false);
    setFaceCount(0);
    setFaceDistance(null);
    setOvalSize(60);
    setBorderColor('white');
    setIsCapturing(false);
  };

  // Get border color class
  const getBorderColorClass = () => {
    switch (borderColor) {
      case 'green':
        return 'border-green-500';
      case 'red':
        return 'border-red-500';
      default:
        return 'border-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      {step === 'input' && (
        <header className="bg-white shadow">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Verifikasi Liveness - GTD API
            </h1>
            <p className="text-gray-600 mt-1">
              Verifikasi wajah untuk memastikan user adalah orang asli
            </p>
          </div>
        </header>
      )}

      <main className={step === 'camera' ? '' : 'max-w-4xl mx-auto px-4 py-8'}>
        {/* Step: Input NIK */}
        {step === 'input' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Masukkan NIK</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="nik" className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Induk Kependudukan (NIK)
                </label>
                <input
                  type="text"
                  id="nik"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="Masukkan 16 digit NIK"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  maxLength={16}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {nik.length}/16 digit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metode Verifikasi
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="method"
                      value="passive"
                      checked={method === 'passive'}
                      onChange={() => setMethod('passive')}
                      className="mr-2"
                    />
                    <span>Passive (Diam saja)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="method"
                      value="active"
                      checked={method === 'active'}
                      onChange={() => setMethod('active')}
                      className="mr-2"
                    />
                    <span>Active (Ikuti instruksi)</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                onClick={createSession}
                disabled={loading || nik.length !== 16}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Memproses...' : 'Mulai Verifikasi Liveness'}
              </button>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Petunjuk:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Pastikan pencahayaan cukup dan wajah terlihat jelas</li>
                <li>• Posisikan wajah di tengah layar dalam bingkai oval</li>
                <li>• <strong>Passive:</strong> Cukup diam dan lihat kamera</li>
                <li>• <strong>Active:</strong> Ikuti instruksi yang muncul (kedip, senyum, dll)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step: Camera - Fullscreen */}
        {step === 'camera' && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Top info bar */}
            <div className="absolute top-0 left-0 right-0 bg-black/80 text-white p-4 z-10">
              <div className="max-w-4xl mx-auto flex justify-between items-center">
                <div>
                  <p className="text-sm">NIK: {session?.nik}</p>
                  <p className="text-sm">Metode: {session?.method === 'passive' ? 'Passive' : 'Active'}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                >
                  Batal
                </button>
              </div>
            </div>

            {/* Video container */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Face guide overlay - OVAL shape */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`border-4 border-dashed ${getBorderColorClass()} transition-all duration-300`}
                  style={{
                    width: `${ovalSize}vw`,
                    height: `${ovalSize * 1.3}vw`, // Oval is taller than wide
                    borderRadius: '50%',
                    maxWidth: '85vw',
                    maxHeight: '110vw',
                  }}
                />
              </div>

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
                  <span className="text-9xl font-bold text-white">{countdown}</span>
                </div>
              )}

              {/* Instruction overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-6 z-10">
                <p className="text-white text-center text-xl font-medium mb-2">{instruction}</p>
                {currentChallenge && session?.challenges && (
                  <p className="text-white/70 text-center text-sm">
                    Challenge {challengeIndex + 1}/{session.challenges.length}
                  </p>
                )}
                {faceCount > 1 && (
                  <p className="text-red-400 text-center text-sm mt-2">
                    ⚠ Lebih dari satu wajah terdeteksi
                  </p>
                )}
              </div>
            </div>

            {/* Bottom button bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 z-10">
              <div className="max-w-4xl mx-auto">
                <button
                  onClick={startVerification}
                  disabled={!cameraReady || countdown !== null || !faceDetected || faceDistance !== 'good' || faceCount !== 1 || isCapturing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors"
                >
                  {!cameraReady
                    ? 'Menunggu kamera...'
                    : !faceDetected
                    ? 'Tunggu wajah terdeteksi...'
                    : faceDistance !== 'good'
                    ? 'Posisikan wajah dengan benar...'
                    : faceCount !== 1
                    ? 'Pastikan hanya satu wajah...'
                    : isCapturing
                    ? 'Memproses...'
                    : 'Mulai Capture'}
                </button>
              </div>
            </div>

            {/* Hidden canvases for processing */}
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={detectionCanvasRef} className="hidden" />
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
              <p className="mt-6 text-lg text-gray-600">Memverifikasi liveness...</p>
              <p className="mt-2 text-sm text-gray-500">Mohon tunggu sebentar</p>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Hasil Verifikasi</h2>

            {error && !result ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
                <p className="text-gray-600">{error}</p>
              </div>
            ) : result?.isLive ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-600 mb-2">Verifikasi Berhasil</h3>
                <p className="text-gray-600">Wajah terdeteksi sebagai orang asli</p>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">NIK</p>
                      <p className="font-medium">{result.nik}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Metode</p>
                      <p className="font-medium capitalize">{result.method}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium text-green-600">LIVE</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Confidence</p>
                      <p className="font-medium">{result.confidence.toFixed(2)}%</p>
                    </div>
                  </div>

                  {result.file?.face && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">Foto Wajah</p>
                      <img
                        src={result.file.face}
                        alt="Face"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-600 mb-2">Verifikasi Gagal</h3>
                <p className="text-gray-600">{result?.failureReason || 'Wajah tidak terdeteksi sebagai orang asli'}</p>

                {result?.errorCode && (
                  <p className="mt-2 text-sm text-gray-500">Error code: {result.errorCode}</p>
                )}

                {result?.confidence !== undefined && result.confidence > 0 && (
                  <p className="mt-2 text-sm text-gray-500">Confidence: {result.confidence.toFixed(2)}%</p>
                )}
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Verifikasi Ulang
            </button>
          </div>
        )}

        {/* API Info */}
        {step === 'input' && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">API Endpoints</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Create Session:</strong> POST /v1/identity/liveness/session</p>
              <p><strong>Verify Liveness:</strong> POST /v1/identity/liveness/verify</p>
              <p><strong>Get Session:</strong> GET /v1/identity/liveness/session/:sessionId</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
