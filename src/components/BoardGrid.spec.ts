import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';

import BoardGrid from './BoardGrid.vue';

describe('BoardGrid', () => {
  test('renders centered intersection lines inside each playable point', () => {
    const wrapper = mount(BoardGrid, {
      props: {
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        disabled: false,
        lastMove: null,
        winningLine: [],
      },
    });

    const cell = wrapper.find('[data-cell="7-7"]');

    expect(cell.find('.board-cell-line-horizontal').exists()).toBe(true);
    expect(cell.find('.board-cell-line-vertical').exists()).toBe(true);
  });

  test('shows a center marker on the empty tengen intersection', () => {
    const wrapper = mount(BoardGrid, {
      props: {
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        disabled: false,
        lastMove: null,
        winningLine: [],
      },
    });

    expect(wrapper.find('[data-cell="7-7"] .board-cell-star').exists()).toBe(true);
  });

  test('hides the center marker when the tengen intersection is occupied', () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(null));
    board[7][7] = 'black';

    const wrapper = mount(BoardGrid, {
      props: {
        board,
        disabled: false,
        lastMove: null,
        winningLine: [],
      },
    });

    expect(wrapper.find('[data-cell="7-7"] .board-cell-star').exists()).toBe(false);
  });

  test('renders a directional highlight across the winning five', () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(null));
    board[7][4] = 'black';
    board[7][5] = 'black';
    board[7][6] = 'black';
    board[7][7] = 'black';
    board[7][8] = 'black';

    const wrapper = mount(BoardGrid, {
      props: {
        board,
        disabled: true,
        lastMove: { x: 8, y: 7 },
        winningLine: [
          { x: 4, y: 7 },
          { x: 5, y: 7 },
          { x: 6, y: 7 },
          { x: 7, y: 7 },
          { x: 8, y: 7 },
        ],
      },
    });

    expect(wrapper.find('[data-cell="6-7"]').classes()).toContain('board-cell-win');
    expect(wrapper.find('[data-cell="6-7"] .board-cell-win-line-horizontal').exists()).toBe(true);
  });

  test('emits place-piece with board coordinates when an empty cell is clicked', async () => {
    const wrapper = mount(BoardGrid, {
      props: {
        board: Array.from({ length: 15 }, () => Array(15).fill(null)),
        disabled: false,
        lastMove: null,
        winningLine: [],
      },
    });

    await wrapper.find('[data-cell="7-7"]').trigger('click');

    expect(wrapper.emitted('place-piece')).toEqual([[7, 7]]);
  });

  test('does not emit place-piece when the clicked cell is occupied', async () => {
    const board = Array.from({ length: 15 }, () => Array(15).fill(null));
    board[7][7] = 'black';

    const wrapper = mount(BoardGrid, {
      props: {
        board,
        disabled: false,
        lastMove: null,
        winningLine: [],
      },
    });

    await wrapper.find('[data-cell="7-7"]').trigger('click');

    expect(wrapper.emitted('place-piece')).toBeUndefined();
  });
});
