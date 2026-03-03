import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';

import HistoryPanel from './HistoryPanel.vue';

describe('HistoryPanel', () => {
  test('renders move entries with player and coordinates', () => {
    const wrapper = mount(HistoryPanel, {
      props: {
        moves: [
          { x: 7, y: 7, player: 'black', timestamp: '2026-03-03T00:00:00.000Z' },
          { x: 8, y: 7, player: 'white', timestamp: '2026-03-03T00:00:01.000Z' },
        ],
      },
    });

    expect(wrapper.text()).toContain('1. 黑棋 (8, 8)');
    expect(wrapper.text()).toContain('2. 白棋 (9, 8)');
  });
});
