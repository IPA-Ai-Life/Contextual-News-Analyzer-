import React from 'react';
import { BREED_MAP } from '../data/breeds';
import { HOUSING_TYPE_MAP } from '../data/housing';
import type { GameState } from '../types';
import { ChickenSprite } from './ChickenSprite';

interface HomesteadSceneProps {
  state: GameState;
}

export const HomesteadScene: React.FC<HomesteadSceneProps> = ({ state }) => {
  const hasDuckPond = state.housings.some((h) => HOUSING_TYPE_MAP[h.typeId]?.hasPond);
  const hasGoatShed = state.housings.some((h) => h.typeId === 'goat-shed' || h.typeId === 'pole-barn');
  const chickens = state.animals.filter((a) => a.species === 'chicken').slice(0, 6);
  const ducks = state.animals.filter((a) => a.species === 'duck').slice(0, 3);
  const goats = state.animals.filter((a) => a.species === 'goat').slice(0, 2);
  const avgClean =
    state.housings.reduce((s, h) => s + h.cleanliness, 0) / Math.max(1, state.housings.length);

  return (
    <div className="coop-scene rounded-2xl overflow-hidden shadow-inner border border-amber-900/20">
      <svg viewBox="0 0 700 300" className="w-full h-auto block" role="img" aria-label="Homestead scene">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={seasonSkyTop(state.season)} />
            <stop offset="100%" stopColor={seasonSkyBottom(state.season)} />
          </linearGradient>
        </defs>
        <rect width={700} height={300} fill="url(#sky)" />
        <path d="M0 130 Q175 90 350 120 T700 110 L700 300 L0 300 Z" fill="#8BAF72" opacity={0.45} />
        <rect y={210} width={700} height={90} fill="#7A9E5E" />

        <g transform="translate(200, 100)">
          <rect x={0} y={40} width={200} height={85} rx={4} fill="#8B5E3C" />
          <polygon points="0,40 100,0 200,40" fill="#5C3D2E" />
          <rect x={80} y={75} width={40} height={50} rx={2} fill="#4A3020" />
        </g>

        {hasDuckPond && <ellipse cx={560} cy={250} rx={55} ry={22} fill="#5B9BD5" opacity={0.75} />}

        {hasGoatShed && (
          <g transform="translate(480, 130)">
            <rect x={0} y={30} width={90} height={60} fill="#7A5238" />
            <polygon points="0,30 45,5 90,30" fill="#5C3D2E" />
          </g>
        )}

        <text x={20} y={25} fontSize={11} fill="#5C4A3A" fontFamily="Georgia, serif">
          {state.housings.length} structures · {state.animals.length} animals
        </text>

        {chickens.map((a, i) => {
          const breed = BREED_MAP[a.breedId];
          if (!breed) return null;
          return (
            <ChickenSprite
              key={a.id}
              breed={breed}
              x={220 + (i % 4) * 45}
              y={200 + Math.floor(i / 4) * 20}
              facing={i % 2 === 0 ? 'right' : 'left'}
              label={a.name}
              species="chicken"
            />
          );
        })}

        {ducks.map((a, i) => {
          const breed = BREED_MAP[a.breedId];
          if (!breed) return null;
          return (
            <ChickenSprite
              key={a.id}
              breed={breed}
              x={520 + i * 35}
              y={225}
              facing="right"
              label={a.name}
              species="duck"
            />
          );
        })}

        {goats.map((a, i) => {
          const breed = BREED_MAP[a.breedId];
          if (!breed) return null;
          return (
            <ChickenSprite
              key={a.id}
              breed={breed}
              x={500 + i * 40}
              y={175}
              facing="left"
              label={a.name}
              species="goat"
            />
          );
        })}

        {state.animals.length === 0 && (
          <text x={350} y={250} textAnchor="middle" fill="#5C4A3A" fontSize={14} fontFamily="Georgia, serif">
            Your homestead awaits its first residents…
          </text>
        )}

        {avgClean < 50 && <rect width={700} height={300} fill="rgba(101,67,33,0.1)" />}
      </svg>
    </div>
  );
};

function seasonSkyTop(season: GameState['season']): string {
  return { spring: '#B8D4E8', summer: '#87CEEB', fall: '#D4B896', winter: '#C8D8E8' }[season];
}

function seasonSkyBottom(season: GameState['season']): string {
  return { spring: '#E8F0D8', summer: '#C5E3F6', fall: '#E8DCC8', winter: '#E0E8F0' }[season];
}
