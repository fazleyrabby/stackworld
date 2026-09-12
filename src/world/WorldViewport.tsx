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

    // Subscribe to engine state
    const unsubscribe = engine.subscribe((snapshot) => {
      latestSnapshot = snapshot;
      interaction.updateSnapshot(snapshot);
    });

    // 60-120 FPS Canvas Rendering loop
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
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Floating Canvas Controls (Bottom Left) */}
      <div className="absolute bottom-20 left-6 flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-slate-300">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <span className="text-xs font-mono px-1.5 min-w-[42px] text-center font-semibold text-slate-400">
          {zoomDisplay}%
        </span>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />
        <button
          onClick={handleResetCamera}
          title="Reset View"
          className="p-1.5 hover:bg-slate-800 rounded transition-colors"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Canvas Interaction Hint */}
      <div className="absolute bottom-20 left-44 hidden md:flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-900/60 px-3 py-1.5 rounded-md border border-slate-800/60 pointer-events-none">
        <Move size={13} className="text-sky-400" />
        <span>Drag canvas to pan • Drag nodes to relocate</span>
      </div>
    </div>
  );
};
