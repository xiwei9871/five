import type { Board, Player, Point } from '../types/game';

const RAPFI_SERVICE_URL = 'http://127.0.0.1:8787/api/ai/rapfi-move';
const RAPFI_HEALTH_URL = 'http://127.0.0.1:8787/api/ai/health';

type RemoteHardMoveRequest = {
  board: Board;
  currentPlayer: Player;
};

type RemoteHardMoveResponse = {
  move?: Partial<Point>;
  error?: string;
};

export async function requestRemoteHardMove({
  board,
  currentPlayer,
}: RemoteHardMoveRequest): Promise<Point> {
  const response = await fetch(RAPFI_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board,
      currentPlayer,
    }),
  });

  const payload = (await response.json()) as RemoteHardMoveResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? 'Rapfi service request failed');
  }

  if (typeof payload.move?.x !== 'number' || typeof payload.move?.y !== 'number') {
    throw new Error('Invalid Rapfi move payload');
  }

  return {
    x: payload.move.x,
    y: payload.move.y,
  };
}

export async function checkRemoteAiHealth(): Promise<boolean> {
  try {
    const response = await fetch(RAPFI_HEALTH_URL, {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { ok?: boolean };
    return payload.ok === true;
  } catch {
    return false;
  }
}
