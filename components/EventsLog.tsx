import React from 'react';
import type { GameEvent } from '../types';

interface EventsLogProps {
  events: GameEvent[];
}

const TYPE_STYLES: Record<GameEvent['type'], string> = {
  info: 'border-l-amber-400 bg-amber-50/50',
  good: 'border-l-green-500 bg-green-50/40',
  warning: 'border-l-orange-400 bg-orange-50/40',
  bad: 'border-l-red-500 bg-red-50/40',
};

export const EventsLog: React.FC<EventsLogProps> = ({ events }) => {
  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="panel-title">Farm journal</h2>
      <ul className="space-y-2 max-h-[200px] overflow-y-auto">
        {events.slice(0, 12).map((event) => (
          <li
            key={event.id}
            className={`text-sm pl-3 py-2 border-l-4 rounded-r-lg ${TYPE_STYLES[event.type]}`}
          >
            <span className="text-xs text-amber-700/50 block">Day {event.day}</span>
            {event.message}
          </li>
        ))}
      </ul>
    </section>
  );
};
