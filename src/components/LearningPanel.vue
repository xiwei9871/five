<script setup lang="ts">
import type { LearningStatus } from '../types/learning';

const props = defineProps<{
  status: LearningStatus;
  busy: boolean;
}>();

const emit = defineEmits<{
  export: [];
  import: [file: File | null];
  reset: [];
}>();

function handleImportChange(event: Event) {
  const input = event.target as HTMLInputElement;
  emit('import', input.files?.[0] ?? null);
  input.value = '';
}
</script>

<template>
  <section
    class="learning-panel"
    data-testid="learning-panel"
  >
    <div class="learning-panel-header">
      <h2>Hard 学习库</h2>
      <p>
        {{ props.status.available ? 'Rapfi 可用' : 'Rapfi 不可用' }}
        <span v-if="props.status.hasDatabase"> · 已积累经验库</span>
        <span v-else> · 尚未生成经验库</span>
      </p>
    </div>

    <p class="learning-panel-meta">
      最近更新：{{ props.status.updatedAt ?? '尚无记录' }}
    </p>

    <div class="learning-panel-actions">
      <button
        data-action="learning-export"
        type="button"
        :disabled="props.busy"
        @click="emit('export')"
      >
        导出学习库
      </button>
      <label class="learning-panel-import">
        <span>导入学习库</span>
        <input
          data-testid="learning-import"
          type="file"
          :disabled="props.busy"
          accept=".db,application/octet-stream"
          @change="handleImportChange"
        >
      </label>
      <button
        data-action="learning-reset"
        type="button"
        :disabled="props.busy"
        @click="emit('reset')"
      >
        重置学习库
      </button>
    </div>
  </section>
</template>
