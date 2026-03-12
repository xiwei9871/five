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

function isCenterMarker(x: number, y: number) {
  return x === 7 && y === 7 && props.board[y][x] === null;
}

function getWinningDirectionClass(x: number, y: number) {
  const hasHorizontal = isWinningCell(x - 1, y) || isWinningCell(x + 1, y);
  const hasVertical = isWinningCell(x, y - 1) || isWinningCell(x, y + 1);
  const hasDiagonalDown = isWinningCell(x - 1, y - 1) || isWinningCell(x + 1, y + 1);
  const hasDiagonalUp = isWinningCell(x - 1, y + 1) || isWinningCell(x + 1, y - 1);

  if (hasHorizontal) {
    return 'board-cell-win-line-horizontal';
  }

  if (hasVertical) {
    return 'board-cell-win-line-vertical';
  }

  if (hasDiagonalDown) {
    return 'board-cell-win-line-diagonal-down';
  }

  if (hasDiagonalUp) {
    return 'board-cell-win-line-diagonal-up';
  }

  return '';
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
      <span
        aria-hidden="true"
        class="board-cell-line board-cell-line-horizontal"
      />
      <span
        aria-hidden="true"
        class="board-cell-line board-cell-line-vertical"
      />
      <span
        v-if="isCenterMarker(index % 15, Math.floor(index / 15))"
        aria-hidden="true"
        class="board-cell-star"
      />
      <span
        v-if="isWinningCell(index % 15, Math.floor(index / 15))"
        aria-hidden="true"
        class="board-cell-win-line"
        :class="getWinningDirectionClass(index % 15, Math.floor(index / 15))"
      />
      <span
        v-if="cell === 'black'"
        class="board-piece"
      >●</span>
      <span
        v-else-if="cell === 'white'"
        class="board-piece"
      >○</span>
    </button>
  </div>
</template>
