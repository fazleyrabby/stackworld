/**
 * Camera.ts
 * 
 * 2D World-to-Screen and Screen-to-World camera transform manager.
 */

import { Vector2D, CameraState } from '../shared/types';

export class Camera {
  public panX: number = 0;
  public panY: number = 0;
  public zoom: number = 1.0;

  public readonly minZoom: number = 0.35;
  public readonly maxZoom: number = 2.5;

  constructor(initialPanX = 0, initialPanY = 0, initialZoom = 1.0) {
    this.panX = initialPanX;
    this.panY = initialPanY;
    this.zoom = initialZoom;
  }

  public getState(): CameraState {
    return {
      panX: this.panX,
      panY: this.panY,
      zoom: this.zoom,
    };
  }

  public panBy(deltaScreenX: number, deltaScreenY: number): void {
    this.panX += deltaScreenX / this.zoom;
    this.panY += deltaScreenY / this.zoom;
  }

  public zoomAt(zoomFactor: number, screenX: number, screenY: number, viewportWidth: number, viewportHeight: number): void {
    const prevZoom = this.zoom;
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, prevZoom * zoomFactor));
    if (newZoom === prevZoom) return;

    // Center zoom relative to screen coordinates
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    const mouseWorldX = (screenX - centerX) / prevZoom - this.panX;
    const mouseWorldY = (screenY - centerY) / prevZoom - this.panY;

    this.zoom = newZoom;
    this.panX = (screenX - centerX) / newZoom - mouseWorldX;
    this.panY = (screenY - centerY) / newZoom - mouseWorldY;
  }

  public screenToWorld(screenX: number, screenY: number, viewportWidth: number, viewportHeight: number): Vector2D {
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    return {
      x: (screenX - centerX) / this.zoom - this.panX,
      y: (screenY - centerY) / this.zoom - this.panY,
    };
  }

  public worldToScreen(worldX: number, worldY: number, viewportWidth: number, viewportHeight: number): Vector2D {
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    return {
      x: (worldX + this.panX) * this.zoom + centerX,
      y: (worldY + this.panY) * this.zoom + centerY,
    };
  }

  public reset(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
  }
}
