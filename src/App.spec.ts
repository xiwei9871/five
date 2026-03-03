import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { describe, expect, test } from 'vitest';

import App from './App.vue';

describe('App', () => {
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
});
