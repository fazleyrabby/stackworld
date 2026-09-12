import React, { useEffect, useRef, useState } from 'react';
import { Camera } from './Camera';
import { CanvasRenderer } from './CanvasRenderer';
import { InteractionManager } from './InteractionManager';
import { SimulationEngine } from '../engine/SimulationEngine';
import { SimulationSnapshot } from '../shared/types';
import { useUiStore } from '../state/useUiStore';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

interface WorldViewportProps {
  engine: SimulationEngine;
}

export const WorldViewport: React.FC<WorldViewportProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera>(new Camera(0, 0, 1.0));
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const interactionRef = useRef<InteractionManager | null>(null);

  const [zoomDisplay, setZoomDisplay] = useState<number>(100);

  const selectedEntityId = useUiStore((state) => state.selectedEntityId);
  const hoveredEntityId = useUiStore((state) => state.hoveredEntityId);
  const setSelectedEntityId = useUiStore((state) => state.setSelectedEntityId);
  const setHoveredEntityId = useUiStore((state) => state.setHoveredEntityId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const camera = cameraRef.current;
    const renderer = new CanvasRenderer(canvas, camera);
    rendererRef.current = renderer;

    const interaction = new InteractionManager(canvas, camera, engine, {
      onSelectEntity: (id) => setSelectedEntityId(id),
      onHoverEntity: (id) => setHoveredEntityId(id),
    });
    interactionRef.current = interaction;

    let animFrameId: number;
    let lastTime = performance.now();
    let latestSnapshot: SimulationSnapshot = engine.getSnapshot();

    const unsubscribe = engine.subscribe((snapshot) => {
      latestSnapshot = snapshot;
      interaction.updateSnapshot(snapshot);
    });

    const renderLoop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      renderer.render(
        latestSnapshot,
        {
          selectedEntityId,
          hoveredEntityId,
        },
        dt
      );

      setZoomDisplay(Math.round(camera.zoom * 100));
      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameId);
      unsubscribe();
      interaction.destroy();
    };
  }, [engine, selectedEntityId, hoveredEntityId, setSelectedEntityId, setHoveredEntityId]);

  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cameraRef.current.zoomAt(1.2, canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth, canvas.clientHeight);
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cameraRef.current.zoomAt(0.83, canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth, canvas.clientHeight);
  };

  const handleResetCamera = () => {
    cameraRef.current.reset();
  };

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} className="sim-canvas" />

      {/* Floating Canvas Controls (Bottom Left) */}
      <div className="canvas-controls">
        <button onClick={handleZoomIn} title="Zoom In" className="canvas-btn">
          <ZoomIn size={15} />
        </button>
        <span className="zoom-label">{zoomDisplay}%</span>
        <button onClick={handleZoomOut} title="Zoom Out" className="canvas-btn">
          <ZoomOut size={15} />
        </button>
        <div className="canvas-controls-divider" />
        <button onClick={handleResetCamera} title="Reset View" className="canvas-btn">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Canvas Interaction Hint */}
      <div className="canvas-hint">
        <Move size={13} color="var(--cyan)" />
        <span>Drag canvas to pan • Drag nodes to relocate</span>
      </div>
    </div>
  );
};
