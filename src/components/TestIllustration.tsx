import React from 'react';

interface TestIllustrationProps {
  stationId: number;
}

export const TestIllustration: React.FC<TestIllustrationProps> = ({ stationId }) => {
  switch (stationId) {
    case 4: // Flexibilidad (sit and reach)
      return (
        <div className="w-full max-w-[280px] h-[160px] mx-auto bg-oro-light/10 rounded-2xl border border-oro/15 flex items-center justify-center p-4">
          <svg viewBox="0 0 200 120" className="w-full h-full text-guinda">
            {/* Floor/Bench */}
            <line x1="20" y1="95" x2="180" y2="95" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
            <rect x="130" y="70" width="15" height="25" fill="#7a1c31" opacity="0.3" rx="2" />
            <line x1="130" y1="65" x2="130" y2="95" stroke="#7a1c31" strokeWidth="3" />
            
            {/* Person sitting and reaching */}
            <g className="animate-pulse">
              {/* Legs */}
              <line x1="50" y1="90" x2="130" y2="90" stroke="#7a1c31" strokeWidth="6" strokeLinecap="round" />
              {/* Torso reaching forward */}
              <line x1="50" y1="90" x2="85" y2="55" stroke="#7a1c31" strokeWidth="6" strokeLinecap="round" />
              {/* Head */}
              <circle cx="85" cy="40" r="8" fill="#7a1c31" />
              {/* Arms reaching */}
              <line x1="85" y1="58" x2="135" y2="58" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
              {/* Action indicator */}
              <path d="M125 45 L140 50 L125 55" fill="none" stroke="#cca86a" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      );
    case 5: // Velocidad (carrera de velocidad)
      return (
        <div className="w-full max-w-[280px] h-[160px] mx-auto bg-oro-light/10 rounded-2xl border border-oro/15 flex items-center justify-center p-4">
          <svg viewBox="0 0 200 120" className="w-full h-full text-guinda">
            {/* Track/Ground */}
            <line x1="20" y1="100" x2="180" y2="100" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
            
            {/* Sprinter in running pose */}
            <g className="animate-bounce" style={{ animationDuration: '0.8s' }}>
              {/* Head */}
              <circle cx="115" cy="30" r="7" fill="#7a1c31" />
              {/* Torso tilted forward */}
              <line x1="95" y1="65" x2="110" y2="40" stroke="#7a1c31" strokeWidth="7" strokeLinecap="round" />
              {/* Back arm */}
              <line x1="100" y1="45" x2="80" y2="35" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
              {/* Front arm */}
              <line x1="102" y1="45" x2="120" y2="60" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
              {/* Back leg (bent backward) */}
              <path d="M95 65 L80 85 L90 95" fill="none" stroke="#7a1c31" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Front leg (high knee) */}
              <path d="M102 65 L115 75 L110 98" fill="none" stroke="#7a1c31" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            
            {/* Motion lines */}
            <line x1="45" y1="45" x2="65" y2="45" stroke="#cca86a" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="40" y1="60" x2="70" y2="60" stroke="#cca86a" strokeWidth="3" strokeDasharray="4 4" />
            <line x1="48" y1="75" x2="68" y2="75" stroke="#cca86a" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        </div>
      );
    case 6: // Fuerza superior (lagartijas)
      return (
        <div className="w-full max-w-[280px] h-[160px] mx-auto bg-oro-light/10 rounded-2xl border border-oro/15 flex items-center justify-center p-4">
          <svg viewBox="0 0 200 120" className="w-full h-full text-guinda">
            {/* Floor */}
            <line x1="20" y1="95" x2="180" y2="95" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
            
            {/* Plank/Pushup person (animated up and down) */}
            <g className="animate-pulse" style={{ animationDuration: '1.5s' }}>
              {/* Head */}
              <circle cx="150" cy="45" r="7" fill="#7a1c31" />
              {/* Straight body from foot to neck */}
              <line x1="45" y1="85" x2="145" y2="55" stroke="#7a1c31" strokeWidth="6" strokeLinecap="round" />
              {/* Back arm representing push-up support */}
              <path d="M135 60 L135 95" fill="none" stroke="#cca86a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Front arm */}
              <path d="M140 58 L145 95" fill="none" stroke="#7a1c31" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Support indicator arrows */}
              <path d="M165 70 L165 85 M165 85 L160 80 M165 85 L170 80" fill="none" stroke="#cca86a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      );
    case 7: // Fuerza abdomen (abdominales)
      return (
        <div className="w-full max-w-[280px] h-[160px] mx-auto bg-oro-light/10 rounded-2xl border border-oro/15 flex items-center justify-center p-4">
          <svg viewBox="0 0 200 120" className="w-full h-full text-guinda">
            {/* Floor */}
            <line x1="20" y1="95" x2="180" y2="95" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
            
            {/* Legs bent on the floor */}
            <path d="M75 90 L115 65 L135 90" fill="none" stroke="#7a1c31" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Animated torso rising */}
            <g className="animate-pulse" style={{ animationDuration: '1.8s' }}>
              {/* Torso rising or lowering */}
              <line x1="75" y1="90" x2="52" y2="60" stroke="#7a1c31" strokeWidth="6" strokeLinecap="round" />
              {/* Head */}
              <circle cx="45" cy="48" r="7" fill="#7a1c31" />
              {/* Arms cradling head */}
              <path d="M52 64 L38 56 L46 48" fill="none" stroke="#cca86a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            
            {/* Core activation waves */}
            <path d="M65 52 Q75 56 65 60" fill="none" stroke="#cca86a" strokeWidth="2" strokeLinecap="round" />
            <path d="M70 48 Q82 56 70 64" fill="none" stroke="#cca86a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
      );
    case 8: // Fuerza inferior (salto de longitud)
      return (
        <div className="w-full max-w-[280px] h-[160px] mx-auto bg-oro-light/10 rounded-2xl border border-oro/15 flex items-center justify-center p-4">
          <svg viewBox="0 0 200 120" className="w-full h-full text-guinda">
            {/* Jump strip & ruler ticks */}
            <line x1="20" y1="95" x2="180" y2="95" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
            {[40, 60, 80, 100, 120, 140, 160].map(tick => (
              <line key={tick} x1={tick} y1="95" x2={tick} y2="102" stroke="#cca86a" strokeWidth="2" />
            ))}
            
            {/* Jumper animation */}
            <g className="animate-bounce" style={{ animationDuration: '1.2s' }}>
              {/* Arm swing */}
              <line x1="110" y1="50" x2="85" y2="55" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
              {/* Torso coiled/jumping */}
              <line x1="110" y1="75" x2="115" y2="45" stroke="#7a1c31" strokeWidth="6" strokeLinecap="round" />
              {/* Head */}
              <circle cx="120" cy="32" r="7" fill="#7a1c31" />
              {/* Bent knees jump position */}
              <path d="M110 75 L130 85 L140 70" fill="none" stroke="#7a1c31" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            
            {/* Launch arc */}
            <path d="M50 90 Q100 35 130 75" fill="none" stroke="#cca86a" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        </div>
      );
    case 9: // Resistencia (carrera de resistencia)
      return (
        <div className="w-full max-w-[280px] h-[160px] mx-auto bg-oro-light/10 rounded-2xl border border-oro/15 flex items-center justify-center p-4">
          <svg viewBox="0 0 200 120" className="w-full h-full text-guinda">
            {/* Running Loop/Track */}
            <ellipse cx="100" cy="85" rx="75" ry="25" fill="none" stroke="#cca86a" strokeWidth="3" strokeDasharray="2 4" />
            
            {/* Running athlete */}
            <g className="animate-pulse" style={{ animationDuration: '0.9s' }}>
              {/* Torso */}
              <line x1="100" y1="65" x2="103" y2="40" stroke="#7a1c31" strokeWidth="6" strokeLinecap="round" />
              {/* Head */}
              <circle cx="105" cy="28" r="7" fill="#7a1c31" />
              {/* Arm runner */}
              <line x1="102" y1="46" x2="115" y2="58" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
              <line x1="102" y1="46" x2="92" y2="52" stroke="#cca86a" strokeWidth="4" strokeLinecap="round" />
              {/* Leg runners */}
              <path d="M100 65 L90 82" stroke="#7a1c31" strokeWidth="5" strokeLinecap="round" />
              <path d="M100 65 L112 80 L108 92" fill="none" stroke="#7a1c31" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            
            {/* Stopwatch symbol */}
            <circle cx="160" cy="35" r="14" fill="#7a1c31" opacity="0.1" />
            <circle cx="160" cy="35" r="12" fill="none" stroke="#7a1c31" strokeWidth="2" />
            <line x1="160" y1="35" x2="160" y2="28" stroke="#7a1c31" strokeWidth="2" strokeLinecap="round" />
            <line x1="160" y1="35" x2="166" y2="35" stroke="#7a1c31" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="158" y="20" width="4" height="2" fill="#7a1c31" />
          </svg>
        </div>
      );
    default:
      return null;
  }
};
