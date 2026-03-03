import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import App from '../../src/App.vue';

test('renders the gobang app shell', () => {
  const wrapper = mount(App, {
    global: {
      plugins: [createPinia()],
    },
  });

  expect(wrapper.text()).toContain('五子棋');
  expect(wrapper.text()).toContain('开始游戏');
});
