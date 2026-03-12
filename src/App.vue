<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';

import { useGameStore } from './stores/game';
import BoardGrid from './components/BoardGrid.vue';
import ControlPanel from './components/ControlPanel.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import StatusPanel from './components/StatusPanel.vue';

const gameStore = useGameStore();
let externalEnginePollId: number | null = null;

onMounted(() => {
  gameStore.hydrate();
  void gameStore.refreshExternalEngineStatus();
  externalEnginePollId = window.setInterval(() => {
    void gameStore.refreshExternalEngineStatus();
  }, 15000);
});

onUnmounted(() => {
  if (externalEnginePollId !== null) {
    window.clearInterval(externalEnginePollId);
  }
});

watch(
  () => gameStore.aiDifficulty,
  () => {
    void gameStore.refreshExternalEngineStatus();
  },
);

async function handlePlacePiece(x: number, y: number) {
  await gameStore.playMove(x, y);
}

function handleRestart() {
  gameStore.startGame(gameStore.gameMode);
}

function handleUndo() {
  gameStore.undoMove();
}
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <h1>五子棋</h1>
      <button
        type="button"
        @click="handleRestart"
      >
        开始游戏
      </button>
    </header>

    <StatusPanel
      :current-player="gameStore.currentPlayer"
      :winner="gameStore.winner"
      :game-status="gameStore.gameStatus"
      :is-ai-thinking="gameStore.isAiThinking"
      :ai-notice="gameStore.aiNotice"
      :external-engine-status="gameStore.externalEngineStatus"
    />

    <ControlPanel
      :can-undo="gameStore.moveHistory.length > 0"
      :game-mode="gameStore.gameMode"
      :ai-difficulty="gameStore.aiDifficulty"
      @undo="handleUndo"
      @restart="handleRestart"
      @update:game-mode="gameStore.setGameMode"
      @update:ai-difficulty="gameStore.setAiDifficulty"
    />

    <section class="play-area">
      <BoardGrid
        :board="gameStore.board"
        :disabled="gameStore.gameStatus === 'finished' || gameStore.isAiThinking"
        :last-move="gameStore.lastMove"
        :winning-line="gameStore.winningLine"
        @place-piece="handlePlacePiece"
      />

      <HistoryPanel :moves="gameStore.moveHistory" />
    </section>
  </main>
</template>
