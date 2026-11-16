import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dataGridSource = readFileSync(new URL('./DataGrid.tsx', import.meta.url), 'utf8');
const toolbarSource = readFileSync(new URL('./DataGridToolbarFrame.tsx', import.meta.url), 'utf8');

describe('DataGrid auto commit delay i18n guards', () => {
  it('shares SQL editor auto/manual mode and commits immediately without grid-local controls', () => {
    expect(dataGridSource).toContain('sqlEditorTransactionOptions');
    expect(dataGridSource).toContain('// 与查询编辑器共用一套 Auto/Manual：只读 sqlEditorTransactionOptions');
    expect(dataGridSource).toContain('// auto 模式立即提交，不再倒计时等待');
    expect(toolbarSource).not.toContain('data_grid.toolbar.commit_mode.auto_countdown');
    expect(toolbarSource).not.toContain('data_grid.toolbar.commit_mode.manual');
    expect(toolbarSource).not.toContain('data_grid.toolbar.commit_delay.seconds');
    expect(toolbarSource).not.toContain('onDataEditCommitModeChange');
    expect(toolbarSource).not.toContain('onDataEditAutoCommitDelayChange');
  });
});
