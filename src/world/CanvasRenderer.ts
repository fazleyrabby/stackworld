/**
 * CanvasRenderer.ts
 * 
 * High-DPI Canvas 2D renderer for StackWorld.
 * Draws grid, connection cables, glowing nodes, live resource meters, and moving packets.
 */

import { Entity, Connection, Packet, SimulationSnapshot, HealthStatus } from '../shared/types';
import { Camera } from './Camera';

export interface RenderOptions {
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
}

export class CanvasRenderer {
  public static readonly NODE_WIDTH = 200;
  public static readonly NODE_HEIGHT = 105;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;

  // Animation pulse timer for wire flow effects
  private animTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context could not be created');
    }
    this.ctx = ctx;
    this.camera = camera;
  }

  public render(snapshot: SimulationSnapshot, options: RenderOptions, dt: number): void {
    this.animTimer += dt;
    const ctx = this.ctx;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // Handle high-DPI
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background with dark sci-fi / strategy game tone
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // Apply Camera Transform
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(this.camera.panX, this.camera.panY);

    // Calculate visible world bounds for culling
    const visibleLeft = -centerX / this.camera.zoom - this.panXOffset();
    const visibleRight = centerX / this.camera.zoom - this.panXOffset();
    const visibleTop = -centerY / this.camera.zoom - this.panYOffset();
    const visibleBottom = centerY / this.camera.zoom - this.panYOffset();

    // 1. Render World Grid
    this.drawWorldGrid(ctx, visibleLeft, visibleRight, visibleTop, visibleBottom);

    // Entity lookup map
    const entityMap = new Map<string, Entity>();
    for (const e of snapshot.entities) {
      entityMap.set(e.id, e);
    }

    // 2. Render Connections & Cables
    for (const conn of snapshot.connections) {
      const from = entityMap.get(conn.fromId);
      const to = entityMap.get(conn.toId);
      if (from && to) {
        this.drawConnection(ctx, conn, from, to);
      }
    }

    // 3. Render In-Flight Packets
    for (const packet of snapshot.packets) {
      const from = entityMap.get(packet.fromId);
      const to = entityMap.get(packet.toId);
      if (from && to) {
        this.drawPacket(ctx, packet, from, to);
      }
    }

    // 4. Render Nodes
    for (const entity of snapshot.entities) {
      const isSelected = entity.id === options.selectedEntityId;
      const isHovered = entity.id === options.hoveredEntityId;
      this.drawNode(ctx, entity, isSelected, isHovered);
    }

    ctx.restore();
  }

  private panXOffset(): number {
    return this.camera.panX;
  }

  private panYOffset(): number {
    return this.camera.panY;
  }

  private drawWorldGrid(
    ctx: CanvasRenderingContext2D,
    left: number,
    right: number,
    top: number,
    bottom: number
  ): void {
    const gridSize = 40;
    const startX = Math.floor(left / gridSize) * gridSize;
    const endX = Math.ceil(right / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;
    const endY = Math.ceil(bottom / gridSize) * gridSize;

    // Subtle grid dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // Main Axes
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, 0);
    ctx.lineTo(right, 0);
    ctx.moveTo(0, top);
    ctx.lineTo(0, bottom);
    ctx.stroke();
  }

  private getWireGeometry(from: Entity, to: Entity) {
    const w = CanvasRenderer.NODE_WIDTH;
    const h = CanvasRenderer.NODE_HEIGHT;

    const dx = to.position.x - from.position.x;
    const dy = to.position.y - from.position.y;

    // Primarily vertical if vertical separation is significantly larger than horizontal separation
    const isVertical = Math.abs(dx) < Math.abs(dy) * 0.7;

    let startX: number, startY: number, endX: number, endY: number;
    let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

    if (isVertical) {
      if (dy >= 0) {
        // 'to' is below 'from'
        startX = from.position.x;
        startY = from.position.y + h / 2;
        endX = to.position.x;
        endY = to.position.y - h / 2;
      } else {
        // 'to' is above 'from'
        startX = from.position.x;
        startY = from.position.y - h / 2;
        endX = to.position.x;
        endY = to.position.y + h / 2;
      }
      const midY = (startY + endY) / 2;
      cp1x = startX;
      cp1y = midY;
      cp2x = endX;
      cp2y = midY;
    } else {
      if (dx >= 0) {
        // 'to' is to the right of 'from'
        startX = from.position.x + w / 2;
        startY = from.position.y;
        endX = to.position.x - w / 2;
        endY = to.position.y;
      } else {
        // 'to' is to the left of 'from'
        startX = from.position.x - w / 2;
        startY = from.position.y;
        endX = to.position.x + w / 2;
        endY = to.position.y;
      }
      const midX = (startX + endX) / 2;
      cp1x = midX;
      cp1y = startY;
      cp2x = midX;
      cp2y = endY;
    }

    return { startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY };
  }

  private drawConnection(
    ctx: CanvasRenderingContext2D,
    conn: Connection,
    from: Entity,
    to: Entity
  ): void {
    const geo = this.getWireGeometry(from, to);

    ctx.save();

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(geo.startX, geo.startY);
    ctx.bezierCurveTo(geo.cp1x, geo.cp1y, geo.cp2x, geo.cp2y, geo.endX, geo.endY);
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Main wire line
    ctx.beginPath();
    ctx.moveTo(geo.startX, geo.startY);
    ctx.bezierCurveTo(geo.cp1x, geo.cp1y, geo.cp2x, geo.cp2y, geo.endX, geo.endY);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Animated signal dashes traveling along the wire
    ctx.beginPath();
    ctx.moveTo(geo.startX, geo.startY);
    ctx.bezierCurveTo(geo.cp1x, geo.cp1y, geo.cp2x, geo.cp2y, geo.endX, geo.endY);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 16]);
    ctx.lineDashOffset = -this.animTimer * 24;
    ctx.stroke();
    ctx.setLineDash([]);

    // Connection badge in center
    const midX = (geo.startX + geo.endX) / 2;
    const midY = (geo.startY + geo.endY) / 2;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, midX - 54, midY - 12, 108, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${conn.latencyMs}ms • ${conn.currentTrafficMbps}M`, midX, midY);

    ctx.restore();
  }

  private drawPacket(
    ctx: CanvasRenderingContext2D,
    packet: Packet,
    from: Entity,
    to: Entity
  ): void {
    const geo = this.getWireGeometry(from, to);

    // Cubic bezier evaluation at t = packet.progress
    const t = packet.progress;
    const inv = 1 - t;
    const px = inv * inv * inv * geo.startX + 3 * inv * inv * t * geo.cp1x + 3 * inv * t * t * geo.cp2x + t * t * t * geo.endX;
    const py = inv * inv * inv * geo.startY + 3 * inv * inv * t * geo.cp1y + 3 * inv * t * t * geo.cp2y + t * t * t * geo.endY;

    ctx.save();

    const isRequest = packet.type === 'request';
    let color = '#38bdf8'; // Request Cyan
    if (packet.type === 'cache_hit') {
      color = '#f43f5e'; // Ruby / Crimson In-Memory Redis Cache Hit
    } else if (packet.isCached) {
      color = '#c084fc'; // Purple / Violet Edge Cache Hit
    } else if (packet.type === 'sql_query') {
      color = '#f59e0b'; // Amber SQL Query
    } else if (packet.type === 'sql_result') {
      color = packet.status === 'dropped' ? '#f43f5e' : '#eab308'; // Amber/Gold SQL Result
    } else if (!isRequest) {
      color = packet.status === 'dropped' ? '#f43f5e' : '#10b981'; // Green success or Red dropped
    }

    // Outer Glow
    const isSql = packet.type === 'sql_query' || packet.type === 'sql_result';
    const isCache = packet.isCached || packet.type === 'cache_hit';
    const radius = isCache ? 13 : isSql ? 12 : 10;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.6, `${color}44`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, packet.isCached || isSql ? 4.2 : 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawNode(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const w = CanvasRenderer.NODE_WIDTH;
    const h = CanvasRenderer.NODE_HEIGHT;
    const x = entity.position.x - w / 2;
    const y = entity.position.y - h / 2;

    ctx.save();

    // 1. Status Colors
    const statusColor = this.getStatusColor(entity.status);

    // 2. Selection / Hover Glow Shadow
    if (isSelected) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
    } else if (isHovered) {
      ctx.shadowColor = statusColor;
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
    }

    // 3. Card Background (Glassmorphic dark card)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    this.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();

    // 4. Card Border
    ctx.shadowBlur = 0;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeStyle = isSelected ? '#38bdf8' : (isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255, 255, 255, 0.1)');
    ctx.stroke();

    // 5. Status Indicator Pill & Line
    ctx.fillStyle = statusColor;
    ctx.fillRect(x + 12, y + 14, 8, 8);

    // 6. Header Text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText(entity.name, x + 26, y + 11);

    // Type Badge
    ctx.font = '500 9px "Fira Code", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(entity.type.toUpperCase().replace('_', ' '), x + 26, y + 27);

    // Status label on top right
    ctx.textAlign = 'right';
    ctx.font = '600 9px "Fira Code", monospace';
    ctx.fillStyle = statusColor;
    ctx.fillText(entity.status, x + w - 12, y + 12);

    // 7. Node-specific visual bodies
    if (entity.type === 'static_host' || entity.type === 'server') {
      const cpuPct = Math.round(entity.resources.cpu.utilizationPct);
      const memPct = Math.round(entity.resources.memory.utilizationPct);

      this.drawMiniBar(ctx, x + 12, y + 46, w - 24, 'CPU', `${cpuPct}%`, cpuPct, this.getUtilizationColor(cpuPct));
      this.drawMiniBar(ctx, x + 12, y + 70, w - 24, 'RAM', `${memPct}%`, memPct, this.getUtilizationColor(memPct));
    } else if (entity.type === 'api') {
      const cpuPct = Math.round(entity.resources.cpu.utilizationPct);
      const connPct = Math.round((entity.resources.connections.current / entity.resources.connections.max) * 100);

      this.drawMiniBar(ctx, x + 12, y + 46, w - 24, 'CPU', `${cpuPct}%`, cpuPct, this.getUtilizationColor(cpuPct));
      this.drawMiniBar(ctx, x + 12, y + 70, w - 24, 'Workers', `${entity.resources.connections.current}/${entity.resources.connections.max}`, connPct, this.getUtilizationColor(connPct));
    } else if (entity.type === 'database') {
      const conn = entity.resources.connections;
      const connPct = Math.round((conn.current / conn.max) * 100);
      const hasIndex = Boolean(entity.configuration.hasIndex);

      this.drawMiniBar(ctx, x + 12, y + 46, w - 24, 'Pool', `${conn.current}/${conn.max}`, connPct, this.getUtilizationColor(connPct));

      ctx.textAlign = 'left';
      ctx.fillStyle = hasIndex ? '#10b981' : '#f59e0b';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(hasIndex ? '⚡ B-Tree Index: Active' : '⚠️ Seq Scan: 500k rows', x + 14, y + 78);

      ctx.textAlign = 'right';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = hasIndex ? '#10b981' : '#f43f5e';
      ctx.fillText(hasIndex ? '3ms' : '850ms', x + w - 14, y + 78);
    } else if (entity.type === 'redis') {
      const mem = entity.resources.memory;
      const memPct = Math.round((mem.usedMb / mem.capacityMb) * 100);
      const hitPct = Math.round(((entity.configuration.cacheHitRatio as number) || 0.9) * 100);

      this.drawMiniBar(ctx, x + 12, y + 46, w - 24, 'RAM', `${mem.usedMb}MB / ${mem.capacityMb}MB`, memPct, '#ef4444');

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ef4444';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(`⚡ Cache Hit: ${hitPct}%`, x + 14, y + 78);

      ctx.textAlign = 'right';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('1ms LATENCY', x + w - 14, y + 78);
    } else if (entity.type === 'pgbouncer') {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#10b981';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText('⚡ Transaction Pooler', x + 14, y + 48);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Mode: Transaction (8 DB sockets)', x + 14, y + 66);

      ctx.textAlign = 'right';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('500 MAX', x + w - 14, y + 48);
    } else if (entity.type === 'dns') {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Record: A Record (IPv4)', x + 14, y + 48);
      ctx.fillText('Resolve: 198.51.100.42', x + 14, y + 66);

      ctx.textAlign = 'right';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('TTL: 300s', x + w - 14, y + 48);
    } else if (entity.type === 'cdn') {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c084fc';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText('⚡ Edge Cache: 80%', x + 14, y + 48);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('280 Global Edge PoPs', x + 14, y + 66);

      ctx.textAlign = 'right';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('8ms FAST', x + w - 14, y + 48);
    } else if (entity.type === 'load_balancer') {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Algo: Round Robin', x + 14, y + 48);
      ctx.fillText('Target Hosts: 2 Active', x + 14, y + 66);

      ctx.textAlign = 'right';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('50/50 SPLIT', x + w - 14, y + 48);
    } else {
      // User / Client node
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Clients: 240 active', x + 14, y + 50);
      ctx.fillText('Region: Global DNS', x + 14, y + 68);

      ctx.textAlign = 'right';
      ctx.font = '10px "Fira Code", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('HTTP/2', x + w - 14, y + 50);
    }

    // 8. Selected Corner Brackets
    if (isSelected) {
      this.drawCornerBrackets(ctx, x - 3, y - 3, w + 6, h + 6, '#38bdf8');
    }

    ctx.restore();
  }

  private drawMiniBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    pct: number,
    barColor: string
  ): void {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(label, x, y);

    ctx.textAlign = 'right';
    ctx.font = '10px "Fira Code", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(value, x + width, y);

    // Track
    const trackY = y + 14;
    const trackH = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.roundRect(ctx, x, trackY, width, trackH, 2);
    ctx.fill();

    // Fill
    const fillW = Math.min(width, Math.max(0, (width * pct) / 100));
    ctx.fillStyle = barColor;
    this.roundRect(ctx, x, trackY, fillW, trackH, 2);
    ctx.fill();
  }

  private drawCornerBrackets(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    const len = 7;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // Top-left
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    // Top-right
    ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
    // Bottom-left
    ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
    // Bottom-right
    ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
    ctx.stroke();
  }

  private getStatusColor(status: HealthStatus): string {
    switch (status) {
      case 'HEALTHY':
        return '#10b981'; // Green
      case 'DEGRADED':
        return '#f59e0b'; // Amber
      case 'OVERLOADED':
        return '#f97316'; // Orange
      case 'FAILING':
      case 'DOWN':
        return '#ef4444'; // Red
      case 'RECOVERING':
        return '#06b6d4'; // Cyan
    }
  }

  private getUtilizationColor(pct: number): string {
    if (pct >= 85) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    return '#10b981';
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
