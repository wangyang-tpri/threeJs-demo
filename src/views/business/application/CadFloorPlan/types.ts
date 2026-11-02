import type { Point } from './dxf';

export type ViewMode = '2d' | '3d';
export type ViewPreset = 'perspective' | 'top' | 'front';
export interface ModelSettings {
  height: number;
  thickness: number;
  opacity: number;
  wallColor: string;
  colorByLayer: boolean;
  showFloor: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  showEdges: boolean;
}
export interface Measurement {
  id: number;
  a: Point;
  b: Point;
  distance: number;
}
