import React, { useMemo } from 'react';
import { BREED_MAP } from '../data/breeds';
import type { GameState } from '../types';
import { ChickenSprite } from './ChickenSprite';

interface CoopSceneProps {
  state: GameState;
}

export const CoopScene: React.FC<CoopSceneProps> = ({ state }) => {
  const positions = useMemo(() => {
    const count = state.chickens.length;
    if (count === 0) return [];
    const cols = Math.min(count, 6);
    const spacing = 56;
    const startX = 300 - ((cols - 1) * spacing) / 2;
    return state.chickens.map((chicken, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        chicken,
        x: startX + col * spacing,
        y: 175 + row * 28,
        facing: (i % 2 === 0 ? 'right' : 'left') as 'left' | 'right',
        bob: Math.sin(i * 1.7) * 2,
      };
    });
  }, [state.chickens]);

  const cleanlinessTint =
    state.coopCleanliness > 70 ? 0 : state.coopCleanliness > 40 ? 0.08 : 0.15;

  return (
    <div className="coop-scene rounded-2xl overflow-hidden shadow-inner border border-amber-900/20">
      <svg viewBox="0 0 600 280" className="w-full h-auto block" role="img" aria-label="Backyard coop scene">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={seasonSkyTop(state.season)} />
            <stop offset="100%" stopColor={seasonSkyBottom(state.season)} />
          </linearGradient>
          <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A9E5E" />
            <stop offset="100%" stopColor="#5C7A45" />
          </linearGradient>
        </defs>

        {/* sky */}
        <rect width={600} height={280} fill="url(#sky)" />

        {/* distant hills */}
        <path d="M0 120 Q150 80 300 110 T600 100 L600 280 L0 280 Z" fill="#8BAF72" opacity={0.5} />
        <path d="M0 150 Q200 120 400 140 T600 130 L600 280 L0 280 Z" fill="#6E9458" opacity={0.45} />

        {/* grass ground */}
        <rect y={200} width={600} height={80} fill="url(#grass)" />
        {/* dirt patch in run */}
        <ellipse cx={300} cy={230} rx={220} ry={35} fill="#A08060" opacity={0.45} />

        {/* coop structure */}
        <g transform="translate(180, 95)">
          {/* main coop body */}
          <rect x={0} y={40} width={240} height={90} rx={4} fill="#8B5E3C" />
          <rect x={8} y={48} width={224} height={74} rx={2} fill="#A0714F" />
          {/* roof */}
          <polygon points="0,40 120,0 240,40" fill="#5C3D2E" />
          <polygon points="10,38 120,6 230,38" fill="#6B4A38" />
          {/* nesting box bump-out */}
          <rect x={-28} y={70} width={36} height={40} rx={3} fill="#7A5238" />
          {/* door */}
          <rect x={100} y={78} width={40} height={52} rx={2} fill="#4A3020" />
          <circle cx={132} cy={104} r={3} fill="#C9A227" />
          {/* windows */}
          <rect x={30} y={60} width={28} height={22} rx={2} fill="#D4E8F0" opacity={0.85} />
          <rect x={182} y={60} width={28} height={22} rx={2} fill="#D4E8F0" opacity={0.85} />
          {/* roost hint */}
          <line x1={40} y1={95} x2={200} y2={95} stroke="#4A3020" strokeWidth={3} />
        </g>

        {/* fence / run */}
        {state.coop.runSize !== 'none' && (
          <g opacity={0.7}>
            {[...Array(14)].map((_, i) => (
              <line
                key={i}
                x1={80 + i * 32}
                y1={195}
                x2={80 + i * 32}
                y2={248}
                stroke="#C4A882"
                strokeWidth={2}
              />
            ))}
            <line x1={76} y1={198} x2={524} y2={198} stroke="#C4A882" strokeWidth={3} />
            <line x1={76} y1={246} x2={524} y2={246} stroke="#C4A882" strokeWidth={3} />
          </g>
        )}

        {/* dust bath */}
        {state.coop.dustBath && (
          <ellipse cx={480} cy={235} rx={28} ry={12} fill="#C9B896" opacity={0.8} />
        )}

        {/* feed bin */}
        <rect x={120} y={218} width={22} height={18} rx={2} fill="#B85C38" />
        <rect x={124} y={212} width={14} height={8} rx={1} fill="#D4764A" />

        {/* waterer */}
        <ellipse cx={155} cy={232} rx={10} ry={6} fill="#7EB8DA" opacity={0.8} />

        {/* season decorations */}
        {state.season === 'fall' && (
          <>
            <circle cx={90} cy={210} r={4} fill="#C45C2A" />
            <circle cx={520} cy={205} r={3.5} fill="#B87333" />
          </>
        )}
        {state.season === 'winter' && (
          <>
            <circle cx={100} cy={60} r={2} fill="#fff" opacity={0.8} />
            <circle cx={300} cy={40} r={2} fill="#fff" opacity={0.7} />
            <circle cx={500} cy={70} r={2} fill="#fff" opacity={0.8} />
          </>
        )}

        {/* chickens */}
        {positions.map(({ chicken, x, y, facing, bob }) => {
          const breed = BREED_MAP[chicken.breedId];
          if (!breed) return null;
          return (
            <ChickenSprite
              key={chicken.id}
              breed={breed}
              x={x}
              y={y}
              facing={facing}
              bob={bob}
              scale={breed.id === 'silkie' ? 0.85 : 1}
              label={chicken.name}
            />
          );
        })}

        {state.chickens.length === 0 && (
          <text x={300} y={240} textAnchor="middle" fill="#5C4A3A" fontSize={14} fontFamily="Georgia, serif">
            An empty coop awaits its first hens…
          </text>
        )}

        {/* cleanliness overlay */}
        {cleanlinessTint > 0 && (
          <rect width={600} height={280} fill={`rgba(101, 67, 33, ${cleanlinessTint})`} />
        )}
      </svg>
    </div>
  );
};

function seasonSkyTop(season: GameState['season']): string {
  const map = { spring: '#B8D4E8', summer: '#87CEEB', fall: '#D4B896', winter: '#C8D8E8' };
  return map[season];
}

function seasonSkyBottom(season: GameState['season']): string {
  const map = { spring: '#E8F0D8', summer: '#C5E3F6', fall: '#E8DCC8', winter: '#E0E8F0' };
  return map[season];
}
