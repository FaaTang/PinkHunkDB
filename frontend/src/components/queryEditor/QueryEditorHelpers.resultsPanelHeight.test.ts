import { describe, expect, it } from 'vitest';

import { resolveSeededEditorHeightForResultsPanel } from './QueryEditorHelpers';

describe('resolveSeededEditorHeightForResultsPanel', () => {
  const clamp = (height: number) => Math.max(100, Math.min(800, height));

  it('seeds roughly half of the current editor shell height', () => {
    expect(resolveSeededEditorHeightForResultsPanel(800, clamp)).toBe(440);
  });

  it('returns null for tiny shells so the default height stays', () => {
    expect(resolveSeededEditorHeightForResultsPanel(80, clamp)).toBeNull();
  });
});
