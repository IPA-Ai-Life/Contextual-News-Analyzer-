import React from 'react';
import type { Breed } from '../types';

interface ChickenSpriteProps {
  breed: Breed;
  x: number;
  y: number;
  scale?: number;
  facing?: 'left' | 'right';
  bob?: number;
  label?: string;
}

export const ChickenSprite: React.FC<ChickenSpriteProps> = ({
  breed,
  x,
  y,
  scale = 1,
  facing = 'right',
  bob = 0,
  label,
}) => {
  const flip = facing === 'left' ? -1 : 1;
  const combColor = breed.comb === 'walnut' ? '#6B4423' : '#C0392B';

  return (
    <g transform={`translate(${x}, ${y + bob}) scale(${scale * flip}, ${scale})`}>
      {/* shadow */}
      <ellipse cx={0} cy={28} rx={18} ry={5} fill="rgba(0,0,0,0.12)" />
      {/* tail feathers */}
      <path
        d="M -22 -2 Q -30 -12 -18 -18 Q -12 -8 -16 0 Z"
        fill={breed.accent}
        opacity={0.9}
      />
      {/* body */}
      <ellipse cx={0} cy={8} rx={20} ry={16} fill={breed.plumage} />
      {/* wing */}
      <ellipse cx={-4} cy={10} rx={10} ry={8} fill={breed.accent} opacity={0.55} />
      {/* neck fluff for silkie */}
      {breed.comb === 'walnut' && (
        <circle cx={12} cy={-2} r={14} fill={breed.plumage} opacity={0.85} />
      )}
      {/* head */}
      <circle cx={14} cy={-4} r={9} fill={breed.plumage} />
      {/* comb */}
      {breed.comb === 'single' && (
        <path d="M 10 -14 L 12 -20 L 14 -13 L 16 -21 L 18 -14" fill={combColor} />
      )}
      {breed.comb === 'rose' && (
        <ellipse cx={13} cy={-12} rx={5} ry={3} fill={combColor} />
      )}
      {breed.comb === 'pea' && (
        <ellipse cx={14} cy={-12} rx={4} ry={2.5} fill={combColor} />
      )}
      {breed.comb === 'walnut' && (
        <ellipse cx={14} cy={-10} rx={5} ry={4} fill={combColor} />
      )}
      {/* beak */}
      <polygon points="22,-3 28,0 22,3" fill="#E8A317" />
      {/* eye */}
      <circle cx={17} cy={-5} r={1.8} fill="#1a1a1a" />
      <circle cx={17.6} cy={-5.6} r={0.6} fill="#fff" />
      {/* legs */}
      <line x1={-4} y1={22} x2={-4} y2={30} stroke="#E8A317" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={8} y1={22} x2={8} y2={30} stroke="#E8A317" strokeWidth={2.5} strokeLinecap="round" />
      {label && (
        <text
          x={0}
          y={42}
          textAnchor="middle"
          fontSize={9}
          fill="#5C4A3A"
          fontFamily="Georgia, serif"
          transform={`scale(${1 / flip}, 1)`}
        >
          {label}
        </text>
      )}
    </g>
  );
};
