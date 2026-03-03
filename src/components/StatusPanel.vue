<script setup lang="ts">
import type { Player } from '../types/game';

const props = defineProps<{
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  gameStatus: 'ready' | 'playing' | 'finished';
}>();

function getStatusText() {
  if (props.gameStatus === 'finished') {
    if (props.winner === 'black') {
      return '黑方获胜';
    }

    if (props.winner === 'white') {
      return '白方获胜';
    }

    return '平局';
  }

  return props.currentPlayer === 'black' ? '黑方回合' : '白方回合';
}
</script>

<template>
  <section
    class="status-panel"
    data-testid="status-panel"
  >
    <p>{{ getStatusText() }}</p>
  </section>
</template>
