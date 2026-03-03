<script setup lang="ts">
const props = defineProps<{
  canUndo: boolean;
  gameMode: 'pvp' | 'pve';
  aiDifficulty: 'easy' | 'medium' | 'hard';
}>();

defineEmits<{
  undo: [];
  restart: [];
  'update:gameMode': [value: 'pvp' | 'pve'];
  'update:aiDifficulty': [value: 'easy' | 'medium' | 'hard'];
}>();
</script>

<template>
  <section class="control-panel">
    <label class="control-field">
      <span>模式</span>
      <select
        :value="props.gameMode"
        @change="$emit('update:gameMode', ($event.target as HTMLSelectElement).value as 'pvp' | 'pve')"
      >
        <option value="pvp">双人对战</option>
        <option value="pve">人机对战</option>
      </select>
    </label>

    <label class="control-field">
      <span>难度</span>
      <select
        :value="props.aiDifficulty"
        @change="$emit('update:aiDifficulty', ($event.target as HTMLSelectElement).value as 'easy' | 'medium' | 'hard')"
      >
        <option value="easy">简单</option>
        <option value="medium">中等</option>
        <option value="hard">困难</option>
      </select>
    </label>

    <div class="control-actions">
      <button
        data-action="undo"
        type="button"
        :disabled="!props.canUndo"
        @click="$emit('undo')"
      >
        悔棋
      </button>
      <button
        data-action="restart"
        type="button"
        @click="$emit('restart')"
      >
        重新开始
      </button>
    </div>
  </section>
</template>
