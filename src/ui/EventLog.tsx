import React from 'react';
import { SimulationSnapshot, SimulationEvent } from '../shared/types';
import { useUiStore } from '../state/useUiStore';
import { X, AlertCircle, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EventLogProps {
  snapshot: SimulationSnapshot;
}

export const EventLog: React.FC<EventLogProps> = ({ snapshot }) => {
  const isEventLogOpen = useUiStore((state) => state.isEventLogOpen);
  const setEventLogOpen = useUiStore((state) => state.setEventLogOpen);

  if (!isEventLogOpen) return null;

  const getEventIcon = (level: SimulationEvent['level']) => {
    switch (level) {
      case 'info':
        return <Info size={12} color="var(--cyan)" />;
      case 'warn':
        return <AlertTriangle size={12} color="var(--amber)" />;
      case 'error':
        return <AlertCircle size={12} color="var(--rose)" />;
      case 'success':
        return <CheckCircle2 size={12} color="var(--emerald)" />;
    }
  };

  const getEventClass = (level: SimulationEvent['level']) => {
    switch (level) {
      case 'info':
        return 'event-info';
      case 'warn':
        return 'event-warn';
      case 'error':
        return 'event-error';
      case 'success':
        return 'event-success';
    }
  };

  return (
    <aside className="event-drawer">
      {/* Header */}
      <div className="event-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            INFRASTRUCTURE EVENT LOG
          </span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            ({snapshot.events.length} entries)
          </span>
        </div>
        <button
          onClick={() => setEventLogOpen(false)}
          className="canvas-btn"
          title="Close Log"
        >
          <X size={15} />
        </button>
      </div>

      {/* Log Stream */}
      <div className="event-stream">
        {snapshot.events.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
            No events recorded yet.
          </p>
        ) : (
          [...snapshot.events].reverse().map((e) => (
            <div key={e.id} className="event-row">
              <span className="event-time">{e.simTimeFormatted}</span>
              <span className={`event-tag ${getEventClass(e.level)}`}>
                {getEventIcon(e.level)}
                {e.level.toUpperCase()}
              </span>
              <span className="event-msg">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
