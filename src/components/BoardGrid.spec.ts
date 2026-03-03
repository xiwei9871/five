import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';

import BoardGrid from './BoardGrid.vue';

describe('BoardGrid', () => {
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
