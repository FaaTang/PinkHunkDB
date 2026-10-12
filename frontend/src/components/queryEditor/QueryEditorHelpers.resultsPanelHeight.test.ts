import { describe, expect, it } from 'vitest';

import { resolveSeededEditorHeightForResultsPanel } from './QueryEditorHelpers';

describe('resolveSeededEditorHeightForResultsPanel', () => {
  const clamp = (height: number) => Math.max(100, Math.min(800, height));

  it('reserves a modest results band when restoring a locked editor height', () => {
    expect(resolveSeededEditorHeightForResultsPanel(800, clamp)).toBe(576);
  });

  it('returns null for tiny shells so the default height stays', () => {
    expect(resolveSeededEditorHeightForResultsPanel(80, clamp)).toBeNull();
  });
});
