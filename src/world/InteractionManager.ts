/**
 * InteractionManager.ts
 * 
 * Handles mouse and touch interactions on the simulation canvas:
 * - Canvas panning & zoom
 * - Node selection & hover detection
 * - Node dragging with live connection updates
 */

import { Vector2D, SimulationSnapshot } from '../shared/types';
import { Camera } from './Camera';
import { CanvasRenderer } from './CanvasRenderer';
import { SimulationEngine } from '../engine/SimulationEngine';

export interface InteractionCallbacks {
  onSelectEntity: (entityId: string | null) => void;
  onHoverEntity: (entityId: string | null) => void;
}

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private engine: SimulationEngine;
  private callbacks: InteractionCallbacks;

  private isPointerDown: boolean = false;
  private isDraggingNode: boolean = false;
  private draggedEntityId: string | null = null;
  private dragNodeOffset: Vector2D = { x: 0, y: 0 };

  private lastPointerScreen: Vector2D = { x: 0, y: 0 };
  private currentSnapshot: SimulationSnapshot | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    engine: SimulationEngine,
    callbacks: InteractionCallbacks
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.engine = engine;
    this.callbacks = callbacks;

    this.attachEventListeners();
  }

  public updateSnapshot(snapshot: SimulationSnapshot): void {
    this.currentSnapshot = snapshot;
  }

  public destroy(): void {
    this.removeEventListeners();
  }

  private attachEventListeners(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    this.isPointerDown = true;
    this.lastPointerScreen = { x: screenX, y: screenY };

    const worldPos = this.camera.screenToWorld(screenX, screenY, rect.width, rect.height);
    const hitEntity = this.findEntityAtWorldPos(worldPos);

    if (hitEntity) {
      this.isDraggingNode = true;
      this.draggedEntityId = hitEntity.id;
      this.dragNodeOffset = {
        x: worldPos.x - hitEntity.position.x,
        y: worldPos.y - hitEntity.position.y,
      };
      this.callbacks.onSelectEntity(hitEntity.id);
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.isDraggingNode = false;
      this.draggedEntityId = null;
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const deltaX = screenX - this.lastPointerScreen.x;
    const deltaY = screenY - this.lastPointerScreen.y;
    this.lastPointerScreen = { x: screenX, y: screenY };

    if (this.isPointerDown) {
      if (this.isDraggingNode && this.draggedEntityId) {
        // Dragging a node in world coordinates
        const worldPos = this.camera.screenToWorld(screenX, screenY, rect.width, rect.height);
        const newPos: Vector2D = {
          x: Math.round(worldPos.x - this.dragNodeOffset.x),
          y: Math.round(worldPos.y - this.dragNodeOffset.y),
        };
        this.engine.updateEntityPosition(this.draggedEntityId, newPos);
      } else {
        // Panning the canvas
        this.camera.panBy(deltaX, deltaY);
      }
    } else {
      // Hover detection
      if (screenX >= 0 && screenX <= rect.width && screenY >= 0 && screenY <= rect.height) {
        const worldPos = this.camera.screenToWorld(screenX, screenY, rect.width, rect.height);
        const hitEntity = this.findEntityAtWorldPos(worldPos);
        if (hitEntity) {
          this.callbacks.onHoverEntity(hitEntity.id);
          this.canvas.style.cursor = 'pointer';
        } else {
          this.callbacks.onHoverEntity(null);
          this.canvas.style.cursor = 'grab';
        }
      }
    }
  };

  private handlePointerUp = (): void => {
    this.isPointerDown = false;
    this.isDraggingNode = false;
    this.draggedEntityId = null;
    this.canvas.style.cursor = 'grab';
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    this.camera.zoomAt(zoomFactor, screenX, screenY, rect.width, rect.height);
  };

  private findEntityAtWorldPos(pos: Vector2D) {
    if (!this.currentSnapshot) return null;

    const halfW = CanvasRenderer.NODE_WIDTH / 2;
    const halfH = CanvasRenderer.NODE_HEIGHT / 2;

    // Check in reverse order so top-most nodes hit first
    for (let i = this.currentSnapshot.entities.length - 1; i >= 0; i--) {
      const entity = this.currentSnapshot.entities[i];
      const dx = Math.abs(pos.x - entity.position.x);
      const dy = Math.abs(pos.y - entity.position.y);

      if (dx <= halfW && dy <= halfH) {
        return entity;
      }
    }
    return null;
  }
}
