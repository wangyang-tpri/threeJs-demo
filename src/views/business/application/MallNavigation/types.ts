import type { FloorKey, RouteNode } from './mall';

export type NavigationStatus = 'idle' | 'playing' | 'paused' | 'arrived';
export interface MallRoute {
  nodes: RouteNode[];
  distance: number;
}
export interface RouteStep {
  floor: FloorKey;
  text: string;
}
