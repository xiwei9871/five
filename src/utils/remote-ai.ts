import type { Board, Player, Point } from '../types/game';
import type { LearningStatus } from '../types/learning';

const RAPFI_SERVICE_URL = 'http://127.0.0.1:8787/api/ai/rapfi-move';
const RAPFI_HEALTH_URL = 'http://127.0.0.1:8787/api/ai/health';
const RAPFI_LEARNING_STATUS_URL = 'http://127.0.0.1:8787/api/ai/learning/status';
const RAPFI_LEARNING_EXPORT_URL = 'http://127.0.0.1:8787/api/ai/learning/export';
const RAPFI_LEARNING_IMPORT_URL = 'http://127.0.0.1:8787/api/ai/learning/import';
const RAPFI_LEARNING_RESET_URL = 'http://127.0.0.1:8787/api/ai/learning/reset';

type RemoteHardMoveRequest = {
  board: Board;
  currentPlayer: Player;
};

type RemoteHardMoveResponse = {
  move?: Partial<Point>;
  error?: string;
};

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

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

export async function fetchRemoteLearningStatus(): Promise<LearningStatus> {
  const response = await fetch(RAPFI_LEARNING_STATUS_URL, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Rapfi learning status request failed'));
  }

  const payload = (await response.json()) as Partial<LearningStatus>;

  if (
    typeof payload.available !== 'boolean' ||
    typeof payload.hasDatabase !== 'boolean' ||
    (payload.updatedAt !== null && typeof payload.updatedAt !== 'string')
  ) {
    throw new Error('Invalid Rapfi learning status payload');
  }

  return {
    available: payload.available,
    hasDatabase: payload.hasDatabase,
    updatedAt: payload.updatedAt,
  };
}

export async function exportRemoteLearningData(): Promise<Uint8Array> {
  const response = await fetch(RAPFI_LEARNING_EXPORT_URL, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Rapfi learning export failed'));
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function importRemoteLearningData(data: Uint8Array): Promise<void> {
  const response = await fetch(RAPFI_LEARNING_IMPORT_URL, {
    method: 'POST',
    body: data,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Rapfi learning import failed'));
  }
}

export async function resetRemoteLearningData(): Promise<void> {
  const response = await fetch(RAPFI_LEARNING_RESET_URL, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Rapfi learning reset failed'));
  }
}
