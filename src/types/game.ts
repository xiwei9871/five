export type Player = 'black' | 'white';

export type Cell = Player | null;

export type Board = Cell[][];

export type Point = {
  x: number;
  y: number;
};
