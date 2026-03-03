import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, test } from 'vitest';
import { nextTick } from 'vue';

import App from './App.vue';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('shows black turn on first render', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    });

    expect(wrapper.text()).toContain('黑方回合');
  });

  test('plays a move when an empty board cell is clicked', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.find('[data-cell="7-7"]').trigger('click');

    expect(wrapper.find('[data-cell="7-7"]').text()).toContain('●');
  });

  test('shows a victory message when the game is finished', async () => {
    localStorage.setItem(
      'gobang-game-snapshot',
      JSON.stringify({
        board: Array.from({ length: 15 }, (_, rowIndex) =>
          Array.from({ length: 15 }, (_, colIndex) =>
            rowIndex === 7 && colIndex >= 3 && colIndex <= 7 ? 'black' : null,
          ),
        ),
        currentPlayer: 'black',
        gameMode: 'pvp',
        aiDifficulty: 'easy',
        gameStatus: 'finished',
        winner: 'black',
        moveHistory: [],
        lastMove: { x: 7, y: 7 },
        winningLine: [
          { x: 3, y: 7 },
          { x: 4, y: 7 },
          { x: 5, y: 7 },
          { x: 6, y: 7 },
          { x: 7, y: 7 },
        ],
      }),
    );

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    });

    await nextTick();

    expect(wrapper.text()).toContain('黑方获胜');
  });
});
