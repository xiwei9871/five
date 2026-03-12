<script setup lang="ts">
import type { Player } from '../types/game';

const props = defineProps<{
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  gameStatus: 'ready' | 'playing' | 'finished';
  isAiThinking?: boolean;
  aiNotice?: string | null;
  externalEngineStatus?: 'connected' | 'disconnected' | null;
}>();

function getStatusText() {
  if (props.isAiThinking) {
    return 'AI 思考中';
  }

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
    <p v-if="props.externalEngineStatus === 'connected'">外部引擎：已连接</p>
    <p v-else-if="props.externalEngineStatus === 'disconnected'">外部引擎：未连接</p>
    <p v-if="props.aiNotice">{{ props.aiNotice }}</p>
  </section>
</template>
