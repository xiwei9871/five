import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';

import ControlPanel from './ControlPanel.vue';

describe('ControlPanel', () => {
  test('emits restart and undo actions', async () => {
    const wrapper = mount(ControlPanel, {
      props: {
        canUndo: true,
        gameMode: 'pvp',
        aiDifficulty: 'easy',
      },
    });

    await wrapper.find('[data-action="undo"]').trigger('click');
    await wrapper.find('[data-action="restart"]').trigger('click');

    expect(wrapper.emitted('undo')).toHaveLength(1);
    expect(wrapper.emitted('restart')).toHaveLength(1);
  });

  test('disables undo when there is no move history', () => {
    const wrapper = mount(ControlPanel, {
      props: {
        canUndo: false,
        gameMode: 'pvp',
        aiDifficulty: 'easy',
      },
    });

    expect(wrapper.find('[data-action="undo"]').attributes('disabled')).toBeDefined();
  });
});
