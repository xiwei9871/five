<script setup lang="ts">
import type { Board, Point } from '../types/game';

const props = defineProps<{
  board: Board;
  disabled: boolean;
  lastMove: Point | null;
  winningLine: Point[];
}>();

const emit = defineEmits<{
  'place-piece': [x: number, y: number];
}>();

function isWinningCell(x: number, y: number) {
  return props.winningLine.some((point) => point.x === x && point.y === y);
}

function handleClick(x: number, y: number) {
  if (props.disabled || props.board[y][x] !== null) {
    return;
  }

  emit('place-piece', x, y);
}
</script>

<template>
  <div
    class="board-grid"
    data-testid="board-grid"
  >
    <button
      v-for="(cell, index) in board.flat()"
      :key="index"
      :data-cell="`${index % 15}-${Math.floor(index / 15)}`"
      class="board-cell"
      :class="{
        'board-cell-last': lastMove?.x === index % 15 && lastMove?.y === Math.floor(index / 15),
        'board-cell-win': isWinningCell(index % 15, Math.floor(index / 15)),
      }"
      type="button"
      @click="handleClick(index % 15, Math.floor(index / 15))"
    >
      <span v-if="cell === 'black'">●</span>
      <span v-else-if="cell === 'white'">○</span>
    </button>
  </div>
</template>
