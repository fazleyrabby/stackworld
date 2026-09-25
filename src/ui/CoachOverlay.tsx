import React from 'react';
import { useUiStore } from '../state/useUiStore';
import { X, Compass, Eye, Wrench, Radio } from 'lucide-react';

/**
 * CoachOverlay — first-run onboarding + re-openable guide (TopBar "Guide" button).
 * Explains the one thing the HUD can't: how to READ the world (packet colors,
 * node health states) and the loop you play (watch → diagnose → fix → verify).
 */
export const CoachOverlay: React.FC = () => {
  const isCoachOpen = useUiStore((state) => state.isCoachOpen);
  const dismissCoach = useUiStore((state) => state.dismissCoach);

  if (!isCoachOpen) return null;

  return (
    <div className="modal-backdrop coach-backdrop">
      <div className="coach-modal">
        <div className="coach-header">
          <div className="coach-header-icon">
            <Compass size={18} color="var(--cyan)" />
          </div>
          <div>
            <h2 className="coach-title">How to Read This World</h2>
            <p className="coach-subtitle">
              Every infrastructure concept is a node in this diagram. You learn by watching it break,
              then choosing how to fix it.
            </p>
          </div>
          <button onClick={dismissCoach} className="inspector-close-btn" title="Start simulating">
            <X size={18} />
          </button>
        </div>

        <div className="coach-grid">
          {/* Step 1 */}
          <div className="coach-step">
            <div className="coach-step-num">1</div>
            <div className="coach-step-body">
              <div className="coach-step-title">
                <Eye size={14} color="var(--cyan)" />
                <span>Watch the dots (requests)</span>
              </div>
              <div className="coach-legend">
                <span className="legend-chip"><i style={{ background: '#38bdf8' }} /> User request traveling to a server</span>
                <span className="legend-chip"><i style={{ background: '#10b981' }} /> Successful response returning</span>
                <span className="legend-chip"><i style={{ background: '#f59e0b' }} /> SQL query hitting the database</span>
                <span className="legend-chip"><i style={{ background: '#ff2a6d' }} /> Cache hit served instantly from Redis</span>
                <span className="legend-chip"><i style={{ background: '#c084fc' }} /> Served from edge cache (CDN) or 202 job accepted</span>
                <span className="legend-chip"><i style={{ background: '#f97316' }} /> Background job being drained by a worker</span>
                <span className="legend-chip"><i style={{ background: '#f43f5e' }} /> Dropped request — this is an outage</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="coach-step">
            <div className="coach-step-num">2</div>
            <div className="coach-step-body">
              <div className="coach-step-title">
                <Radio size={14} color="var(--emerald)" />
                <span>Read the node cards</span>
              </div>
              <ul className="coach-list">
                <li><b style={{ color: '#10b981' }}>HEALTHY</b> — plenty of capacity left</li>
                <li><b style={{ color: '#f59e0b' }}>DEGRADED / OVERLOADED</b> — running hot, slowing down</li>
                <li><b style={{ color: '#ef4444' }}>FAILING</b> — saturated; requests are being dropped</li>
              </ul>
              <p className="coach-note">Click any node to open the Inspector and see its live CPU, RAM, and connection gauges.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="coach-step">
            <div className="coach-step-num">3</div>
            <div className="coach-step-body">
              <div className="coach-step-title">
                <Wrench size={14} color="var(--amber)" />
                <span>Play the incident loop</span>
              </div>
              <ul className="coach-list">
                <li>Traffic rises automatically — watch what breaks first</li>
                <li>When the system goes red, an <b>Incident Diagnosis</b> opens</li>
                <li>Pick an architecture fix — each trades <b>cost vs reliability vs simplicity</b> differently</li>
                <li>Sustain load for a few seconds to earn your architecture grade (S → C)</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="coach-step">
            <div className="coach-step-num">4</div>
            <div className="coach-step-body">
              <div className="coach-step-title">
                <Compass size={14} color="var(--purple)" />
                <span>Controls that help you learn</span>
              </div>
              <ul className="coach-list">
                <li><b>Pause + Step</b> — freeze time and advance one 50ms tick to follow a single request</li>
                <li><b>Inject Spike</b> — stress the system on demand and watch the failure cascade</li>
                <li><b>Drag nodes / scroll</b> — rearrange the diagram, pan and zoom the world</li>
                <li><b>Lessons 1 → 4</b> — progress in order: static site → database → caching → job queues</li>
              </ul>
            </div>
          </div>
        </div>

        <button onClick={dismissCoach} className="btn-coach-start">
          Got it — run the simulation
        </button>
      </div>
    </div>
  );
};
