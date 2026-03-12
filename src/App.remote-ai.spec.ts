import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function createLearningStatus(hasDatabase = true) {
  return {
    available: true,
    hasDatabase,
    updatedAt: hasDatabase ? '2026-03-12T00:00:00.000Z' : null,
  };
}

describe('App remote hard ai integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.doUnmock('./utils/remote-ai');
    vi.doUnmock('./utils/ai');
  });

  test('shows a thinking state and locks the board while the remote hard ai request is pending', async () => {
    const deferred = createDeferred<{ x: number; y: number }>();

    vi.doMock('./utils/remote-ai', () => ({
      requestRemoteHardMove: vi.fn(() => deferred.promise),
      checkRemoteAiHealth: vi.fn(async () => true),
      fetchRemoteLearningStatus: vi.fn(async () => createLearningStatus()),
      resetRemoteLearningData: vi.fn(async () => undefined),
      exportRemoteLearningData: vi.fn(async () => new Uint8Array([1, 2, 3])),
      importRemoteLearningData: vi.fn(async () => undefined),
    }));

    vi.doMock('./utils/ai', async () => {
      const actual = await vi.importActual<typeof import('./utils/ai')>('./utils/ai');
      return {
        ...actual,
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { default: App } = await import('./App.vue');
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.find('[data-testid="game-mode"]').setValue('pve');
    await wrapper.find('[data-testid="ai-difficulty"]').setValue('hard');
    await wrapper.find('[data-cell="7-7"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('AI 思考中');

    await wrapper.find('[data-cell="7-8"]').trigger('click');
    expect(wrapper.find('[data-cell="7-8"]').text()).not.toContain('●');

    deferred.resolve({ x: 8, y: 8 });
    await flushPromises();

    expect(wrapper.find('[data-cell="8-8"]').text()).toContain('○');
    expect(wrapper.text()).toContain('外部引擎：已连接');
  });

  test('shows a fallback notice when the remote hard ai request fails', async () => {
    vi.doMock('./utils/remote-ai', () => ({
      requestRemoteHardMove: vi.fn(async () => {
        throw new Error('rapfi offline');
      }),
      checkRemoteAiHealth: vi.fn(async () => false),
      fetchRemoteLearningStatus: vi.fn(async () => createLearningStatus()),
      resetRemoteLearningData: vi.fn(async () => undefined),
      exportRemoteLearningData: vi.fn(async () => new Uint8Array([1, 2, 3])),
      importRemoteLearningData: vi.fn(async () => undefined),
    }));

    vi.doMock('./utils/ai', async () => {
      const actual = await vi.importActual<typeof import('./utils/ai')>('./utils/ai');
      return {
        ...actual,
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { default: App } = await import('./App.vue');
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.find('[data-testid="game-mode"]').setValue('pve');
    await wrapper.find('[data-testid="ai-difficulty"]').setValue('hard');
    await wrapper.find('[data-cell="7-7"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('已回退到本地 AI');
    expect(wrapper.text()).toContain('外部引擎：未连接');
    expect(wrapper.find('[data-cell="2-2"]').text()).toContain('○');
  });

  test('automatically reconnects the external engine status after health checks recover', async () => {
    vi.useFakeTimers();

    let healthChecks = 0;

    vi.doMock('./utils/remote-ai', () => ({
      requestRemoteHardMove: vi.fn(async () => {
        throw new Error('rapfi offline');
      }),
      checkRemoteAiHealth: vi.fn(async () => {
        healthChecks += 1;
        return healthChecks >= 2;
      }),
      fetchRemoteLearningStatus: vi.fn(async () => createLearningStatus()),
      resetRemoteLearningData: vi.fn(async () => undefined),
      exportRemoteLearningData: vi.fn(async () => new Uint8Array([1, 2, 3])),
      importRemoteLearningData: vi.fn(async () => undefined),
    }));

    vi.doMock('./utils/ai', async () => {
      const actual = await vi.importActual<typeof import('./utils/ai')>('./utils/ai');
      return {
        ...actual,
        chooseHardMove: vi.fn(() => ({ x: 2, y: 2 })),
      };
    });

    const { default: App } = await import('./App.vue');
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.find('[data-testid="game-mode"]').setValue('pve');
    await wrapper.find('[data-testid="ai-difficulty"]').setValue('hard');
    await wrapper.find('[data-cell="7-7"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('外部引擎：未连接');

    await vi.advanceTimersByTimeAsync(15_000);
    await flushPromises();

    expect(wrapper.text()).toContain('外部引擎：已连接');
  });

  test('shows hard-learning controls and triggers a reset action in hard mode', async () => {
    vi.doMock('./utils/remote-ai', () => ({
      requestRemoteHardMove: vi.fn(async () => ({ x: 8, y: 8 })),
      checkRemoteAiHealth: vi.fn(async () => true),
      fetchRemoteLearningStatus: vi
        .fn()
        .mockResolvedValueOnce(createLearningStatus(true))
        .mockResolvedValueOnce(createLearningStatus(false)),
      resetRemoteLearningData: vi.fn(async () => undefined),
      exportRemoteLearningData: vi.fn(async () => new Uint8Array([1, 2, 3])),
      importRemoteLearningData: vi.fn(async () => undefined),
    }));

    const remoteAi = await import('./utils/remote-ai');
    const { default: App } = await import('./App.vue');
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.find('[data-testid="ai-difficulty"]').setValue('hard');
    await flushPromises();

    expect(wrapper.text()).toContain('Hard 学习库');

    await wrapper.find('[data-action="learning-reset"]').trigger('click');
    await flushPromises();

    expect(remoteAi.resetRemoteLearningData).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('尚未生成经验库');
  });
});
