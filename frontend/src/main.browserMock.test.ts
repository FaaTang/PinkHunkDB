import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./App', () => ({
  default: () => React.createElement('div', { 'data-testid': 'mock-app' }),
}));

let renderRootImpl: ((node: React.ReactNode) => void) | null = null;

const createRootMock = vi.fn(() => ({
  render: vi.fn((node: React.ReactNode) => {
    renderRootImpl?.(node);
  }),
}));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: createRootMock,
  },
  createRoot: createRootMock,
}));

const dayjsLocaleMock = vi.fn();

vi.mock('dayjs', () => ({
  default: Object.assign(() => null, {
    locale: dayjsLocaleMock,
  }),
}));

vi.mock('dayjs/locale/zh-cn', () => ({}));
vi.mock('dayjs/locale/zh-tw', () => ({}));
vi.mock('dayjs/locale/ja', () => ({}));
vi.mock('dayjs/locale/de', () => ({}));
vi.mock('dayjs/locale/ru', () => ({}));

const loaderConfigMock = vi.fn();

vi.mock('@monaco-editor/react', () => ({
  loader: {
    config: loaderConfigMock,
  },
}));

const defineThemeMock = vi.fn();

vi.mock('monaco-editor', () => ({
  editor: {
    defineTheme: defineThemeMock,
  },
}));

vi.mock('monaco-editor/esm/nls.messages.zh-cn', () => ({}));

const syncLanguageRuntimeMock = vi.fn(async (_language: string) => undefined);

vi.mock('./i18n/runtime', async () => {
  const actual = await vi.importActual<typeof import('./i18n/runtime')>('./i18n/runtime');
  return {
    ...actual,
    syncLanguageRuntime: (language: string) => syncLanguageRuntimeMock(language),
  };
});

const importMain = async () => {
  await import('./main');
  return (globalThis as typeof globalThis & {
    window: {
      go?: {
        app?: {
          App?: {
            ImportConfigFile: () => Promise<{ success: boolean; message?: string }>;
            ImportConnectionsPayload: (raw: string, password?: string) => Promise<unknown>;
            ExportConnectionsPackage: (options?: { includeSecrets?: boolean; filePassword?: string }) => Promise<{ success: boolean; message?: string }>;
            ApplyDataRootDirectory: (path: string) => Promise<{ success: boolean; message?: string; data?: { path?: string } }>;
            SaveQuery: (input: { id?: string; name?: string; sql?: string }) => Promise<{ name: string; sql: string }>;
          };
        };
      };
    };
  }).window.go?.app?.App;
};

describe('main browser mock', () => {
  beforeEach(() => {
    vi.resetModules();
    renderRootImpl = null;
    syncLanguageRuntimeMock.mockClear();
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => ({})),
    });
    vi.stubGlobal('navigator', {
      languages: ['zh-CN'],
      language: 'zh-CN',
    });
  });

  afterEach(() => {
    vi.doUnmock('./store');
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns localized browser-mode messages for import picker and unsupported browser mock exports', async () => {
    const app = await importMain();
    const { t } = await import('./i18n');

    expect(app).toBeDefined();
    await expect(app!.ImportConfigFile()).resolves.toEqual({
      success: false,
      message: '已取消',
    });
    await expect(app!.ExportSQLFile('demo.sql', 'select 1')).resolves.toEqual({
      success: false,
      message: t('app.browser_mock.export_sql_unsupported'),
    });
    await expect(app!.ExportConnectionsPackage({ includeSecrets: true, filePassword: '' })).resolves.toEqual({
      success: false,
      message: t('app.browser_mock.export_connection_package_unsupported'),
    });
  }, 10000);

  it('rejects non-array payloads with the localized browser mock import limitation', async () => {
    const app = await importMain();
    const { t } = await import('./i18n');

    await expect(app!.ImportConnectionsPayload('{"version":1}')).rejects.toThrow(
      t('app.browser_mock.import_connection_package_unsupported'),
    );
  });

  it('localizes generated browser mock saved query names', async () => {
    vi.stubGlobal('navigator', {
      languages: ['en-US'],
      language: 'en-US',
    });

    const app = await importMain();

    await expect(app!.SaveQuery({
      id: 'browser-mock-generated-query',
      sql: 'select 1',
    })).resolves.toEqual(expect.objectContaining({
      name: 'Query 1',
      sql: 'select 1',
    }));
  });

  it('does not hardcode Chinese browser mock saved query names', () => {
    const source = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain("'未命名查询'");
  });

      it('localizes browser mock data root update messages', async () => {
    vi.stubGlobal('navigator', {
      languages: ['en-US'],
      language: 'en-US',
    });

    const app = await importMain();
    const { t } = await import('./i18n');

    await expect(app!.ApplyDataRootDirectory('C:/mock/custom-root')).resolves.toEqual(expect.objectContaining({
      success: true,
      message: t('app.data_root.message.updated'),
      data: expect.objectContaining({
        path: 'C:/mock/custom-root',
      }),
    }));
  });

  it('does not hardcode Chinese browser mock data root update messages', () => {
    const source = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain("'数据目录已更新'");
  });

                  it('waits for store hydration before syncing an explicit persisted language over a different system language', async () => {
    let languagePreference = 'system';
    let hydrated = false;
    const storeListeners = new Set<VoidFunction>();
    const hydrationListeners = new Set<VoidFunction>();
    const setLanguagePreference = vi.fn((nextPreference: string) => {
      languagePreference = nextPreference;
      storeListeners.forEach((listener) => listener());
    });
    const finishHydration = (nextPreference: string) => {
      hydrated = true;
      languagePreference = nextPreference;
      storeListeners.forEach((listener) => listener());
      hydrationListeners.forEach((listener) => listener());
    };

    vi.doMock('./store', () => ({
      useStore: Object.assign(
        <T,>(selector: (state: { languagePreference: string; setLanguagePreference: (nextPreference: string) => void }) => T): T =>
          React.useSyncExternalStore(
            (listener) => {
              storeListeners.add(listener);
              return () => storeListeners.delete(listener);
            },
            () => selector({ languagePreference, setLanguagePreference }),
            () => selector({ languagePreference, setLanguagePreference }),
          ),
        {
          persist: {
            hasHydrated: () => hydrated,
            onFinishHydration: (listener: VoidFunction) => {
              hydrationListeners.add(listener);
              return () => hydrationListeners.delete(listener);
            },
          },
        },
      ),
    }));

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    renderRootImpl = (node) => {
      act(() => {
        renderer = TestRenderer.create(node as React.ReactElement);
      });
    };

    await importMain();
    const { getCurrentLanguage } = await import('./i18n');

    expect(renderer).not.toBeNull();
    expect(getCurrentLanguage()).toBe('en-US');
    expect(syncLanguageRuntimeMock).not.toHaveBeenCalled();

    act(() => {
      finishHydration('en-US');
    });

    expect(getCurrentLanguage()).toBe('en-US');
    expect(syncLanguageRuntimeMock.mock.calls.map(([language]) => language)).toEqual(['en-US']);
  });

  it('applies the resolved runtime locale on the first visible frame after hydration', async () => {
    let languagePreference = 'system';
    let hydrated = false;
    const storeListeners = new Set<VoidFunction>();
    const hydrationListeners = new Set<VoidFunction>();
    const setLanguagePreference = vi.fn((nextPreference: string) => {
      languagePreference = nextPreference;
      storeListeners.forEach((listener) => listener());
    });
    const finishHydration = (nextPreference: string) => {
      hydrated = true;
      languagePreference = nextPreference;
      storeListeners.forEach((listener) => listener());
      hydrationListeners.forEach((listener) => listener());
    };

    vi.doMock('./store', () => ({
      useStore: Object.assign(
        <T,>(selector: (state: { languagePreference: string; setLanguagePreference: (nextPreference: string) => void }) => T): T =>
          React.useSyncExternalStore(
            (listener) => {
              storeListeners.add(listener);
              return () => storeListeners.delete(listener);
            },
            () => selector({ languagePreference, setLanguagePreference }),
            () => selector({ languagePreference, setLanguagePreference }),
          ),
        {
          persist: {
            hasHydrated: () => hydrated,
            onFinishHydration: (listener: VoidFunction) => {
              hydrationListeners.add(listener);
              return () => hydrationListeners.delete(listener);
            },
          },
        },
      ),
    }));

    renderRootImpl = (node) => {
      act(() => {
        TestRenderer.create(node as React.ReactElement);
      });
    };

    await importMain();
    const { getCurrentLanguage } = await import('./i18n');

    dayjsLocaleMock.mockClear();

    act(() => {
      finishHydration('en-US');
    });

    expect(getCurrentLanguage()).toBe('en-US');
    expect(dayjsLocaleMock).toHaveBeenCalledWith('en');
    expect(syncLanguageRuntimeMock.mock.calls.map(([language]) => language)).toEqual(['en-US']);
  });

  it('does not stay blank when hydration finishes in the gap before finish-hydration subscription starts listening', async () => {
    let languagePreference = 'en-US';
    let hydrated = false;
    const storeListeners = new Set<VoidFunction>();
    const hydrationListeners = new Set<VoidFunction>();
    const setLanguagePreference = vi.fn((nextPreference: string) => {
      languagePreference = nextPreference;
      storeListeners.forEach((listener) => listener());
    });
    let hydrationSubscriptionCount = 0;

    vi.doMock('./store', () => ({
      useStore: Object.assign(
        <T,>(selector: (state: { languagePreference: string; setLanguagePreference: (nextPreference: string) => void }) => T): T =>
          React.useSyncExternalStore(
            (listener) => {
              storeListeners.add(listener);
              return () => storeListeners.delete(listener);
            },
            () => selector({ languagePreference, setLanguagePreference }),
            () => selector({ languagePreference, setLanguagePreference }),
          ),
        {
          persist: {
            hasHydrated: () => hydrated,
            onFinishHydration: (listener: VoidFunction) => {
              hydrationSubscriptionCount += 1;
              hydrated = true;
              hydrationListeners.add(listener);
              return () => hydrationListeners.delete(listener);
            },
          },
        },
      ),
    }));

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    renderRootImpl = (node) => {
      renderer = TestRenderer.create(node as React.ReactElement);
    };

    await importMain();
    const { getCurrentLanguage } = await import('./i18n');

    await act(async () => {});

    expect(hydrationSubscriptionCount).toBeGreaterThan(0);
    expect(renderer).not.toBeNull();
    expect(renderer!.toJSON()).not.toBeNull();
    expect(getCurrentLanguage()).toBe('en-US');
    expect(dayjsLocaleMock).toHaveBeenCalledWith('en');
    expect(syncLanguageRuntimeMock.mock.calls.map(([language]) => language)).toEqual(['en-US']);
  });

  it('renders immediately with the resolved locale when hydration is already complete on first load', async () => {
    const setLanguagePreference = vi.fn();

    vi.doMock('./store', () => ({
      useStore: Object.assign(
        <T,>(selector: (state: { languagePreference: string; setLanguagePreference: (nextPreference: string) => void }) => T): T =>
          React.useSyncExternalStore(
            () => () => {},
            () => selector({ languagePreference: 'en-US', setLanguagePreference }),
            () => selector({ languagePreference: 'en-US', setLanguagePreference }),
          ),
        {
          persist: {
            hasHydrated: () => true,
            onFinishHydration: () => () => {},
          },
        },
      ),
    }));

    let renderer: TestRenderer.ReactTestRenderer | null = null;
    renderRootImpl = (node) => {
      act(() => {
        renderer = TestRenderer.create(node as React.ReactElement);
      });
    };

    await importMain();
    const { getCurrentLanguage } = await import('./i18n');
    await act(async () => {});

    expect(renderer).not.toBeNull();
    expect(renderer!.toJSON()).not.toBeNull();
    expect(getCurrentLanguage()).toBe('en-US');
    expect(dayjsLocaleMock).toHaveBeenCalledWith('en');
    expect(syncLanguageRuntimeMock.mock.calls.map(([language]) => language)).toEqual(['en-US']);
  });
});
