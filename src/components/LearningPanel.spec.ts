import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';

import LearningPanel from './LearningPanel.vue';

describe('LearningPanel', () => {
  test('emits export reset and import actions', async () => {
    const wrapper = mount(LearningPanel, {
      props: {
        status: {
          available: true,
          hasDatabase: true,
          updatedAt: '2026-03-12T00:00:00.000Z',
        },
        busy: false,
      },
    });

    await wrapper.find('[data-action="learning-export"]').trigger('click');
    await wrapper.find('[data-action="learning-reset"]').trigger('click');

    const file = new File(['abc'], 'rapfi.db', { type: 'application/octet-stream' });
    const input = wrapper.find('[data-testid="learning-import"]');
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    });
    await input.trigger('change');

    expect(wrapper.emitted('export')).toHaveLength(1);
    expect(wrapper.emitted('reset')).toHaveLength(1);
    expect(wrapper.emitted('import')?.[0]).toEqual([file]);
  });

  test('disables actions while busy', () => {
    const wrapper = mount(LearningPanel, {
      props: {
        status: {
          available: true,
          hasDatabase: false,
          updatedAt: null,
        },
        busy: true,
      },
    });

    expect(wrapper.find('[data-action="learning-export"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-action="learning-reset"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="learning-import"]').attributes('disabled')).toBeDefined();
  });
});
