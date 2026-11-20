import React from 'react';

export default function NutriLensLogo({ size = 26, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="nutriLensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <filter id="nutriGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Outer Aperture / Lens Ring */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="url(#nutriLensGrad)"
        strokeWidth="2.2"
        strokeDasharray="75 15"
        strokeLinecap="round"
        filter="url(#nutriGlow)"
      />

      {/* Inner Organic Nutrient Leaf & Vision Aperture */}
      <path
        d="M16 5C16 11.5 11 16 5 16C11 16 16 20.5 16 27C16 20.5 21 16 27 16C21 16 16 11.5 16 5Z"
        fill="url(#nutriLensGrad)"
      />

      {/* Center Vision Optical Iris */}
      <circle cx="16" cy="16" r="3.2" fill="#ffffff" />
    </svg>
  );
}
