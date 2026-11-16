import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const toolbarSource = readFileSync(new URL('./DataGridToolbarFrame.tsx', import.meta.url), 'utf8');

describe('DataGridToolbarFrame i18n guards', () => {
  it('keeps icon-only edit actions with localized tooltip titles', () => {
    [
      'data_grid.toolbar.refresh',
      'data_grid.toolbar.filter',
      'data_grid.toolbar.add_row',
      'data_grid.toolbar.commit_label',
      'data_grid.toolbar.rollback',
    ].forEach((key) => {
      expect(toolbarSource).toContain(`translate('${key}'`);
    });

    expect(toolbarSource).toContain('<Tooltip title=');
    expect(toolbarSource).not.toContain('data_grid.toolbar.cell_editor');
    expect(toolbarSource).not.toContain('onToggleCellEditMode');
  });
});
