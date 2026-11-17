import React, { useSyncExternalStore } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// import './index.css' // Optional global styles

import { setCurrentLanguage, t } from './i18n'
import { I18nProvider } from './i18n/provider'
import { applyDayjsLocale } from './i18n/runtime'
import { useStore } from './store'
import { cloneBrowserMockValue, duplicateBrowserMockConnection, resolveBrowserMockSecretFlag } from './utils/browserMockConnections'

const resolveDevHarnessMode = (): string => {
    if (typeof window === 'undefined') {
        return '';
    }
    try {
        return new URLSearchParams(window.location.search).get('devHarness') || '';
    } catch {
        return '';
    }
};

if (typeof window !== 'undefined' && (!(window as any).go?.app?.App)) {
    const mockConnections: any[] = [];
    const mockSavedQueries: any[] = [];
    const mockConnectionSecrets = new Map<string, any>();
    let mockGlobalProxy: any = { enabled: false, type: 'socks5', host: '', port: 1080, user: '', password: '', hasPassword: false };
    let mockDataRootInfo: any = {
        path: 'C:/mock/.gonavi',
        defaultPath: 'C:/mock/.gonavi',
        driverPath: 'C:/mock/.gonavi/drivers',
        isDefaultPath: true,
        bootstrapPath: 'C:/mock/.gonavi/storage_root.json',
    };

    const upsertMockConnection = (view: any) => {
        const index = mockConnections.findIndex((item) => item.id === view.id);
        if (index >= 0) {
            mockConnections[index] = view;
            return;
        }
        mockConnections.push(view);
    };

    const saveMockConnection = (input: any) => {
        const existing = mockConnections.find((item) => item.id === input?.id);
        const existingSecrets = mockConnectionSecrets.get(existing?.id || input?.id || '') || {};
        const config = (input?.config && typeof input.config === 'object') ? input.config : {};
        const ssh = (config.ssh && typeof config.ssh === 'object') ? config.ssh : {};
        const proxy = (config.proxy && typeof config.proxy === 'object') ? config.proxy : {};
        const httpTunnel = (config.httpTunnel && typeof config.httpTunnel === 'object') ? config.httpTunnel : {};
        const nextId = String(input?.id || existing?.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const nextSecrets = {
            password: String(config.password ?? existingSecrets.password ?? ''),
            sshPassword: String(ssh.password ?? existingSecrets.sshPassword ?? ''),
            proxyPassword: String(proxy.password ?? existingSecrets.proxyPassword ?? ''),
            httpTunnelPassword: String(httpTunnel.password ?? existingSecrets.httpTunnelPassword ?? ''),
            mysqlReplicaPassword: String(config.mysqlReplicaPassword ?? existingSecrets.mysqlReplicaPassword ?? ''),
            mongoReplicaPassword: String(config.mongoReplicaPassword ?? existingSecrets.mongoReplicaPassword ?? ''),
            redisSentinelPassword: String(config.redisSentinelPassword ?? existingSecrets.redisSentinelPassword ?? ''),
            uri: String(config.uri ?? existingSecrets.uri ?? ''),
            dsn: String(config.dsn ?? existingSecrets.dsn ?? ''),
        };
        if (input?.clearPrimaryPassword) nextSecrets.password = '';
        if (input?.clearSSHPassword) nextSecrets.sshPassword = '';
        if (input?.clearProxyPassword) nextSecrets.proxyPassword = '';
        if (input?.clearHttpTunnelPassword) nextSecrets.httpTunnelPassword = '';
        if (input?.clearMySQLReplicaPassword) nextSecrets.mysqlReplicaPassword = '';
        if (input?.clearMongoReplicaPassword) nextSecrets.mongoReplicaPassword = '';
        if (input?.clearRedisSentinelPassword) nextSecrets.redisSentinelPassword = '';
        if (input?.clearOpaqueURI) nextSecrets.uri = '';
        if (input?.clearOpaqueDSN) nextSecrets.dsn = '';
        mockConnectionSecrets.set(nextId, nextSecrets);
        const view = {
            id: nextId,
            name: String(input?.name || existing?.name || t('connection.unnamed')),
            config: {
                ...config,
                id: nextId,
                password: '',
                ssh: { ...ssh, password: '' },
                proxy: { ...proxy, password: '' },
                httpTunnel: { ...httpTunnel, password: '' },
                uri: '',
                dsn: '',
                mysqlReplicaPassword: '',
                mongoReplicaPassword: '',
                redisSentinelPassword: '',
            },
            includeDatabases: Array.isArray(input?.includeDatabases) ? [...input.includeDatabases] : existing?.includeDatabases,
            includeRedisDatabases: Array.isArray(input?.includeRedisDatabases) ? [...input.includeRedisDatabases] : existing?.includeRedisDatabases,
            iconType: typeof input?.iconType === 'string' ? input.iconType : (existing?.iconType || ''),
            iconColor: typeof input?.iconColor === 'string' ? input.iconColor : (existing?.iconColor || ''),
            hasPrimaryPassword: resolveBrowserMockSecretFlag(config.password, !!input?.clearPrimaryPassword, existing?.hasPrimaryPassword),
            hasSSHPassword: resolveBrowserMockSecretFlag(ssh.password, !!input?.clearSSHPassword, existing?.hasSSHPassword),
            hasProxyPassword: resolveBrowserMockSecretFlag(proxy.password, !!input?.clearProxyPassword, existing?.hasProxyPassword),
            hasHttpTunnelPassword: resolveBrowserMockSecretFlag(httpTunnel.password, !!input?.clearHttpTunnelPassword, existing?.hasHttpTunnelPassword),
            hasMySQLReplicaPassword: resolveBrowserMockSecretFlag(config.mysqlReplicaPassword, !!input?.clearMySQLReplicaPassword, existing?.hasMySQLReplicaPassword),
            hasMongoReplicaPassword: resolveBrowserMockSecretFlag(config.mongoReplicaPassword, !!input?.clearMongoReplicaPassword, existing?.hasMongoReplicaPassword),
            hasRedisSentinelPassword: resolveBrowserMockSecretFlag(config.redisSentinelPassword, !!input?.clearRedisSentinelPassword, existing?.hasRedisSentinelPassword),
            hasOpaqueURI: resolveBrowserMockSecretFlag(config.uri, !!input?.clearOpaqueURI, existing?.hasOpaqueURI),
            hasOpaqueDSN: resolveBrowserMockSecretFlag(config.dsn, !!input?.clearOpaqueDSN, existing?.hasOpaqueDSN),
        };
        upsertMockConnection(view);
        return cloneBrowserMockValue(view);
    };

    const saveMockQuery = (input: any) => {
        const nextId = String(input?.id || `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const index = mockSavedQueries.findIndex((item) => item.id === nextId);
        const generatedNameIndex = index >= 0 ? index : mockSavedQueries.length;
        const view = {
            id: nextId,
            name: String(input?.name || t('saved_query.default_name', { index: generatedNameIndex + 1 })),
            sql: String(input?.sql || ''),
            connectionId: String(input?.connectionId || ''),
            dbName: String(input?.dbName || ''),
            createdAt: Number.isFinite(Number(input?.createdAt)) ? Number(input.createdAt) : Date.now(),
            connectionFingerprint: typeof input?.connectionFingerprint === 'string' ? input.connectionFingerprint : undefined,
            fingerprintVersion: typeof input?.fingerprintVersion === 'string' ? input.fingerprintVersion : undefined,
            bindingStatus: typeof input?.bindingStatus === 'string' ? input.bindingStatus : undefined,
            originalConnectionId: typeof input?.originalConnectionId === 'string' ? input.originalConnectionId : undefined,
        };
        if (index >= 0) {
            mockSavedQueries[index] = view;
        } else {
            mockSavedQueries.push(view);
        }
        return cloneBrowserMockValue(view);
    };

    const saveMockGlobalProxy = (input: any) => {
        const nextPassword = String(input?.password ?? '');
        mockGlobalProxy = {
            ...mockGlobalProxy,
            ...input,
            password: '',
            hasPassword: nextPassword !== '' ? true : !!mockGlobalProxy.hasPassword,
        };
        return cloneBrowserMockValue(mockGlobalProxy);
    };

    const mockGo = {
        app: {
            App: {
                CheckUpdate: async () => ({ success: false }),
                DownloadUpdate: async () => ({ success: false }),
                PauseUpdateDownload: async () => ({ success: false }),
                ResumeUpdateDownload: async () => ({ success: false }),
                CancelUpdateDownload: async () => ({ success: false }),
                SetLanguage: async () => null,
                GetSavedConnections: async () => cloneBrowserMockValue(mockConnections),
                GetEditableSavedConnection: async (id: string) => {
                    const existing = mockConnections.find((item) => item.id === id);
                    if (!existing) {
                        throw new Error(`saved connection not found: ${id}`);
                    }
                    const secrets = mockConnectionSecrets.get(id) || {};
                    return cloneBrowserMockValue({
                        ...existing,
                        config: {
                            ...existing.config,
                            password: secrets.password || '',
                            ssh: { ...(existing.config?.ssh || {}), password: secrets.sshPassword || '' },
                            proxy: { ...(existing.config?.proxy || {}), password: secrets.proxyPassword || '' },
                            httpTunnel: { ...(existing.config?.httpTunnel || {}), password: secrets.httpTunnelPassword || '' },
                            mysqlReplicaPassword: secrets.mysqlReplicaPassword || '',
                            mongoReplicaPassword: secrets.mongoReplicaPassword || '',
                            redisSentinelPassword: secrets.redisSentinelPassword || '',
                            uri: secrets.uri || '',
                            dsn: secrets.dsn || '',
                        },
                    });
                },
                ListInstalledFontFamilies: async () => ({ success: true, data: [] }),
                SaveConnection: async (input: any) => saveMockConnection(input),
                DeleteConnection: async (id: string) => {
                    const index = mockConnections.findIndex((item) => item.id === id);
                    if (index >= 0) {
                        mockConnections.splice(index, 1);
                    }
                    return null;
                },
                DuplicateConnection: async (id: string) => {
                    const existing = mockConnections.find((item) => item.id === id);
                    if (!existing) return null;
                    const duplicated = duplicateBrowserMockConnection({
                        existing,
                        items: mockConnections,
                        nextId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    });
                    mockConnections.push(duplicated);
                    return cloneBrowserMockValue(duplicated);
                },
                ImportLegacyConnections: async (items: any[]) => items.map((item) => saveMockConnection(item)),
                OpenConnection: async () => null,
                CloseConnection: async () => null,
                GetDatabases: async () => [],
                GetTables: async () => [],
                GetTableData: async () => ({ columns: [], rows: [], total: 0 }),
                GetTableColumns: async () => [],
                ExecuteQuery: async () => ({ columns: [], rows: [], time: 0 }),
                GetSavedQueries: async () => cloneBrowserMockValue(mockSavedQueries),
                SaveQuery: async (input: any) => saveMockQuery(input),
                ImportSavedQueries: async (payload: any) => {
                    const items = Array.isArray(payload) ? payload : payload?.queries;
                    (Array.isArray(items) ? items : []).forEach((item) => saveMockQuery(item));
                    return cloneBrowserMockValue(mockSavedQueries);
                },
                DeleteQuery: async (id: string) => {
                    const index = mockSavedQueries.findIndex((item) => item.id === id);
                    if (index >= 0) {
                        mockSavedQueries.splice(index, 1);
                    }
                    return null;
                },
                RebindSavedQuery: async (id: string, connectionId: string) => {
                    const existing = mockSavedQueries.find((item) => item.id === id);
                    if (!existing) throw new Error('saved query not found');
                    return saveMockQuery({
                        ...existing,
                        connectionId,
                        originalConnectionId: existing.originalConnectionId || existing.connectionId,
                        bindingStatus: 'active',
                    });
                },
                GetAppInfo: async () => ({}),
                GetDataRootDirectoryInfo: async () => ({ success: true, data: cloneBrowserMockValue(mockDataRootInfo) }),
                CheckForUpdates: async () => ({ success: false }),
                CheckForUpdatesSilently: async () => ({ success: false }),
                OpenDownloadedUpdateDirectory: async () => ({ success: false }),
                OpenDownloadedUpdatePackage: async () => ({ success: false }),
                OpenDriverDownloadDirectory: async (path: string) => ({ success: true, data: { path } }),
                OpenDataRootDirectory: async () => ({ success: true }),
                SelectSQLDirectory: async (currentPath: string) => ({ success: false, message: currentPath ? '已取消' : '已取消' }),
                ListSQLDirectory: async () => ({ success: true, data: [] }),
                ReadSQLFile: async () => ({ success: false, message: '已取消' }),
                ReadAppLogTail: async (lineLimit: number, keyword: string) => {
                    const allLines = [
                        '2026/06/09 10:10:00.000000 [INFO] 应用启动完成',
                        '2026/06/09 10:10:05.000000 [WARN] proxy mock service slow start',
                        '2026/06/09 10:10:09.000000 [ERROR] MySQL mock dial failed: connect timeout',
                    ];
                    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
                    const filtered = normalizedKeyword
                        ? allLines.filter((line) => line.toLowerCase().includes(normalizedKeyword))
                        : allLines;
                    const safeLimit = Math.max(1, Math.min(Number(lineLimit) || 80, 200));
                    const visibleLines = filtered.slice(-safeLimit);
                    return {
                        success: true,
                        data: {
                            logPath: 'C:/Users/mock/.GoNavi/Logs/gonavi.log',
                            keyword: String(keyword || ''),
                            requestedLineLimit: safeLimit,
                            returnedLineCount: visibleLines.length,
                            fileWindowTruncated: false,
                            matchedLinesTruncated: filtered.length > visibleLines.length,
                            levelBreakdown: {
                                INFO: visibleLines.filter((line) => line.includes('[INFO]')).length,
                                WARN: visibleLines.filter((line) => line.includes('[WARN]')).length,
                                ERROR: visibleLines.filter((line) => line.includes('[ERROR]')).length,
                                OTHER: visibleLines.filter((line) => !/\[(INFO|WARN|ERROR)\]/.test(line)).length,
                            },
                            lines: visibleLines,
                        },
                    };
                },
                CreateSQLFile: async (_directoryPath: string, _name: string) => ({ success: true, data: { filePath: '', name: _name } }),
                CreateSQLDirectory: async (directoryPath: string, name: string) => ({ success: true, data: { directoryPath: `${directoryPath}/${name}`, name } }),
                DeleteSQLFile: async (_filePath: string) => ({ success: true }),
                DeleteSQLDirectory: async (_directoryPath: string) => ({ success: true }),
                RenameSQLFile: async (_filePath: string, name: string) => ({ success: true, data: { filePath: _filePath, name } }),
                RenameSQLDirectory: async (directoryPath: string, name: string) => ({ success: true, data: { directoryPath: `${directoryPath.replace(/[\\/][^\\/]*$/, '')}/${name}`, name } }),
                WriteSQLFile: async (_filePath: string, _content: string) => ({ success: true }),
                ExportSQLFile: async (_defaultName: string, _content: string) => ({ success: false, message: t('app.browser_mock.export_sql_unsupported') }),
                InstallUpdateAndRestart: async () => ({ success: false }),
                ImportConfigFile: async () => ({ success: false, message: '已取消' }),
                ImportConnectionsPayload: async (raw: string, _password?: string) => {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) {
                            return parsed.map((item) => saveMockConnection(item));
                        }
                    } catch {
                        throw new Error(t('app.browser_mock.import_connection_package_unsupported'));
                    }
                    throw new Error(t('app.browser_mock.import_connection_package_unsupported'));
                },
                ExportConnectionsPackage: async (_options?: { includeSecrets?: boolean; filePassword?: string }) => ({ success: false, message: t('app.browser_mock.export_connection_package_unsupported') }),
                ExportData: async () => ({ success: false }),
                GetGlobalProxyConfig: async () => ({ success: true, data: cloneBrowserMockValue(mockGlobalProxy) }),
                SaveGlobalProxy: async (input: any) => saveMockGlobalProxy(input),
                ImportLegacyGlobalProxy: async (input: any) => saveMockGlobalProxy(input),
                SelectDataRootDirectory: async (currentPath: string) => ({ success: true, data: { ...mockDataRootInfo, path: currentPath || mockDataRootInfo.path } }),
                ApplyDataRootDirectory: async (path: string) => {
                    const nextPath = String(path || mockDataRootInfo.defaultPath);
                    mockDataRootInfo = {
                        ...mockDataRootInfo,
                        path: nextPath,
                        driverPath: `${nextPath}/drivers`,
                        isDefaultPath: nextPath === mockDataRootInfo.defaultPath,
                    };
                    return { success: true, message: t('app.data_root.message.updated'), data: cloneBrowserMockValue(mockDataRootInfo) };
                },
            }
        }
    };
}
const rootNode = document.getElementById('root')!;

const devHarnessMode = import.meta.env.DEV ? resolveDevHarnessMode() : '';

const readBrowserLanguages = (): string[] => {
    if (typeof navigator === 'undefined') return [];
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
        return [...navigator.languages];
    }
    return navigator.language ? [navigator.language] : [];
};

const subscribeStoreHydration = (listener: () => void) => {
    if (useStore.persist.hasHydrated()) {
        listener();
        return () => {};
    }
    return useStore.persist.onFinishHydration(() => {
        listener();
    });
};

const getStoreHydrationSnapshot = () => useStore.persist.hasHydrated();

const Root = ({ rootComponent }: { rootComponent: React.ReactNode }) => {
    const isStoreHydrated = useSyncExternalStore(
        subscribeStoreHydration,
        getStoreHydrationSnapshot,
        getStoreHydrationSnapshot,
    );
    const languagePreference = useStore((state) => state.languagePreference);
    const setLanguagePreference = useStore((state) => state.setLanguagePreference);

    if (!isStoreHydrated) {
        return null;
    }

    const systemLanguages = readBrowserLanguages();
    const resolvedLanguage = setCurrentLanguage(languagePreference, systemLanguages);
    applyDayjsLocale(resolvedLanguage);

    return (
        <I18nProvider
            preference={languagePreference}
            onPreferenceChange={setLanguagePreference}
            systemLanguages={systemLanguages}
        >
            {rootComponent}
        </I18nProvider>
    );
};

const renderRoot = async () => {
    let rootComponent: React.ReactNode = <App />;
    if (devHarnessMode === 'datagrid-perf') {
        const { default: PerfDataGridHarness } = await import('./dev/PerfDataGridHarness');
        rootComponent = <PerfDataGridHarness />;
    }

    ReactDOM.createRoot(rootNode).render(
      <React.StrictMode>
        <Root rootComponent={rootComponent} />
      </React.StrictMode>,
    );
};

void renderRoot();
