import React, { useState, useEffect } from 'react';
import { QrCode, Check, Copy, AlertCircle, Smartphone } from 'lucide-react';
import { generateQRMatrix, qrMatrixToSvgPath } from '../utils/qrCodeGenerator';
import { isReducedMotion } from '../utils/motionTokens';

/**
 * PacmanChomperSvg
 * Original vector drawing of chomping character with dynamic mouth angle.
 */
export const PacmanChomperSvg = ({
  size = 22,
  mouthAngle = 38,
  color = '#F59E0B',
  direction = 'right',
  isCelebrating = false,
  className = ''
}) => {
  const rad = (mouthAngle * Math.PI) / 360;
  const r = 10;
  const cx = 12;
  const cy = 12;

  const startX = cx + r * Math.cos(rad);
  const startY = cy - r * Math.sin(rad);
  const endX = cx + r * Math.cos(-rad);
  const endY = cy - r * Math.sin(-rad);

  const rotDeg = direction === 'left' ? 180 : direction === 'up' ? 270 : direction === 'down' ? 90 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`shrink-0 transition-transform ${isCelebrating ? 'animate-bounce' : ''} ${className}`}
      style={{ transform: `rotate(${rotDeg}deg)` }}
      aria-hidden="true"
    >
      <path
        d={`M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 1 0 ${endX} ${endY} Z`}
        fill={color}
      />
      <circle cx="12" cy="7" r="1.3" fill="#141312" />
    </svg>
  );
};

/**
 * PacmanPairingStation
 * Web Station Generator for Android Companion Setup:
 * Generates the authoritative 6-digit challenge code and QR code for the phone companion to scan or enter.
 */
export default function PacmanPairingStation({
  pairingTokenRecord,
  pairUrl: directPairUrl,
  lifecycleState: propLifecycleState,
  isServerVerified = false,
  onManualCodeSubmit,
  onClose,
  errorMessage = '',
  isLoading = false
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [mouthAngle, setMouthAngle] = useState(38);
  const [perimeterStep, setPerimeterStep] = useState(0);
  const [internalState, setInternalState] = useState(isServerVerified ? 'paired' : (propLifecycleState || 'idle'));

  const lifecycleState = propLifecycleState || (isServerVerified ? 'paired' : internalState);

  // Extract issued 6-digit token and URL
  const rawToken = pairingTokenRecord?.token ||
    (typeof directPairUrl === 'string' && directPairUrl.includes('code=') ? directPairUrl.split('code=')[1].split('&')[0] : null) ||
    '489123';

  const issuedToken = /^\d{6}$/.test(String(rawToken))
    ? String(rawToken)
    : (String(rawToken).replace(/\D/g, '').slice(0, 6).padEnd(6, '0') || '489123');

  const pairUrl = pairingTokenRecord?.pairUrl || directPairUrl || `https://learningtracker001.netlify.app/pair?code=${issuedToken}`;

  // Update lifecycle when server verified changes
  useEffect(() => {
    if (isServerVerified) {
      setInternalState('paired');
    }
  }, [isServerVerified]);

  // Animated mouth chomping cycle (respects reduced motion)
  useEffect(() => {
    if (isReducedMotion()) return;
    const interval = setInterval(() => {
      setMouthAngle((prev) => (prev > 15 ? 4 : 42));
      setPerimeterStep((prev) => (prev + 1) % 20);
    }, 220);
    return () => clearInterval(interval);
  }, []);

  // Copy code to clipboard with checkmark feedback
  const handleCopyCode = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(issuedToken);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = issuedToken;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2200);
      } catch {}
    }
  };

  // Generate QR path
  const qrSvg = (() => {
    try {
      const matrix = generateQRMatrix(pairUrl);
      const { path, size } = qrMatrixToSvgPath(matrix);
      return { path, size };
    } catch {
      return null;
    }
  })();

  const tokenDigits = String(issuedToken).padStart(6, '0').slice(0, 6).split('');

  return (
    <div className="space-y-5" role="region" aria-label="Companion Pairing Station">
      {/* ── INSTRUCTIONS HEADER ── */}
      <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-sans font-bold text-xs text-stone-900 dark:text-warmwhite">
            Pair with Android Companion
          </h4>
          <p className="text-xs font-sans text-stone-600 dark:text-stone-300 leading-relaxed">
            Open the Learning Tracker companion app on your phone. Tap <span className="font-bold text-amber-700 dark:text-amber-300">"Pair Device"</span> to scan this QR code or enter the 6-digit PIN below.
          </p>
        </div>
      </div>

      {/* ── MAIN WORKBENCH SCANNING SURFACE ── */}
      <div
        className={`relative p-6 rounded-2xl border-2 transition-colors ${
          lifecycleState === 'paired'
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500'
            : 'bg-stone-50 dark:bg-[#181716] border-stone-200 dark:border-stone-700'
        }`}
      >
        <div className="space-y-5 text-center">
          {/* Viewport Frame: 2.5D Recessed Scanning Chamber with Precision Brackets & Perimeter Rail */}
          <div
            className="relative w-64 h-64 mx-auto p-5 rounded-3xl flex items-center justify-center transition-all duration-300"
            style={{
              background: 'radial-gradient(circle at 50% 50%, #1F1D1A 0%, #141211 75%, #0B0A09 100%)',
              boxShadow: `
                inset 0 4px 12px rgba(0, 0, 0, 0.8),
                inset 0 -2px 6px rgba(255, 255, 255, 0.06),
                0 12px 30px -8px rgba(0, 0, 0, 0.7)
              `,
              border: '2px solid #38332E'
            }}
          >
            {/* Four Layered Precision Scanning Brackets */}
            <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]" />
            <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]" />
            <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]" />
            <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]" />

            {/* Telemetry Radar Range Grid & Signal Sweep from pairing-radar.svg */}
            <div className="absolute inset-2 pointer-events-none opacity-25" aria-hidden="true">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="88" stroke="#10B981" strokeWidth="1" strokeDasharray="6 4" fill="none" />
                <circle cx="100" cy="100" r="66" stroke="#10B981" strokeWidth="0.8" fill="none" />
                <circle cx="100" cy="100" r="44" stroke="#10B981" strokeWidth="0.8" strokeDasharray="4 4" fill="none" />
                <line x1="100" y1="8" x2="100" y2="192" stroke="#10B981" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="8" y1="100" x2="192" y2="100" stroke="#10B981" strokeWidth="0.8" strokeDasharray="3 3" />
                {lifecycleState === 'paired' && (
                  <circle cx="138" cy="62" r="5" fill="#10B981" className="animate-ping" />
                )}
              </svg>
            </div>

            {/* Dimensional Scanning Beam with Controlled Light Spill */}
            <div
              className="absolute inset-x-3 h-1 pointer-events-none opacity-70"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.8) 50%, transparent 100%)',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.25)',
                animation: 'workbench-scan-sweep 2.4s ease-in-out infinite'
              }}
            />

            {/* The Generated QR Code */}
            <div className="relative z-10 w-44 h-44 bg-white p-2.5 rounded-xl shadow-lg border border-stone-200 flex items-center justify-center">
              {qrSvg ? (
                <svg
                  viewBox={`-2 -2 ${qrSvg.size + 4} ${qrSvg.size + 4}`}
                  className="w-full h-full text-stone-900"
                  shapeRendering="crispEdges"
                  role="img"
                  aria-label="Companion Pairing QR Code"
                >
                  <path d={qrSvg.path} fill="currentColor" />
                </svg>
              ) : (
                <QrCode className="w-24 h-24 text-stone-400 m-auto" />
              )}
            </div>

            {/* Perimeter Pac-Man Chomper & Dot Trail on Elevated Outer Track */}
            <div className="absolute -top-4 inset-x-3 flex items-center justify-between pointer-events-none" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    perimeterStep % 6 === i
                      ? 'opacity-0 scale-50'
                      : 'bg-amber-400 opacity-90 shadow-[0_0_4px_rgba(245,158,11,0.8)]'
                  }`}
                />
              ))}
            </div>
            <div className="absolute -bottom-4 inset-x-3 flex items-center justify-between pointer-events-none" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    (perimeterStep + 3) % 6 === i
                      ? 'opacity-0 scale-50'
                      : 'bg-amber-400 opacity-90 shadow-[0_0_4px_rgba(245,158,11,0.8)]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── GENERATED 6-DIGIT CODE DISPLAY CARD ── */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Generated 6-Digit Pairing PIN:
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-sans font-bold text-copper-600 dark:text-copper-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy PIN'}</span>
              </button>
            </div>

            {/* 6 Prominent Digit Blocks */}
            <div className="flex items-center justify-center gap-2">
              {tokenDigits.map((digit, idx) => (
                <div
                  key={idx}
                  className="w-10 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 flex items-center justify-center font-sans font-black text-xl text-stone-900 dark:text-warmwhite shadow-2xs"
                >
                  {digit}
                </div>
              ))}
            </div>

            <p className="text-[11px] font-serif italic text-stone-500 dark:text-stone-400">
              Enter these 6 digits directly in your companion app if preferred instead of scanning.
            </p>
          </div>

          {/* Paired Status or Single-Use Active Indicator */}
          {lifecycleState === 'paired' ? (
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-sans font-bold">
                <Check className="w-4 h-4" />
                <span>Companion Device Paired & Verified!</span>
              </div>
              <span className="text-[10px] font-serif italic text-emerald-500">
                Telemetry channel linked · Focus Integrity active
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="flex items-center justify-center gap-2 text-[11px] font-sans font-medium text-stone-500">
                <PacmanChomperSvg size={16} mouthAngle={mouthAngle} />
                <span>Single-use ticket active · Awaiting companion app scan or PIN entry</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between text-xs font-sans pt-1 border-t border-stone-200 dark:border-stone-800">
        <span className="text-stone-400">
          State: <strong className="text-stone-700 dark:text-stone-300 uppercase">{lifecycleState}</strong>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-sans font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
