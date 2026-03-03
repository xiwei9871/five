<script setup lang="ts">
import type { Player } from '../types/game';

defineProps<{
  moves: Array<{
    x: number;
    y: number;
    player: Player;
    timestamp: string;
  }>;
}>();

function formatPlayer(player: Player) {
  return player === 'black' ? '黑棋' : '白棋';
}
</script>

<template>
  <section
    class="history-panel"
    data-testid="history-panel"
  >
    <h2>落子记录</h2>
    <ol>
      <li
        v-for="(move, index) in moves"
        :key="`${move.timestamp}-${index}`"
      >
        {{ index + 1 }}. {{ formatPlayer(move.player) }} ({{ move.x + 1 }}, {{ move.y + 1 }})
      </li>
    </ol>
  </section>
</template>
