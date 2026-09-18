import { describe, expect, it } from 'vitest';
import { matchSidebarTreeMenuShortcut } from './sidebarTreeMenuShortcuts';

const keyEvent = (
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>> = {},
) => ({
  key,
  ctrlKey: !!modifiers.ctrlKey,
  metaKey: !!modifiers.metaKey,
  altKey: !!modifiers.altKey,
  shiftKey: !!modifiers.shiftKey,
});

describe('matchSidebarTreeMenuShortcut', () => {
  it('matches Enter / Ctrl+Enter / F2 / Delete / Ctrl+N / Ctrl+R', () => {
    expect(matchSidebarTreeMenuShortcut(keyEvent('Enter'))).toBe('open-data');
    expect(matchSidebarTreeMenuShortcut(keyEvent('Enter', { ctrlKey: true }))).toBe('open-new-tab');
    expect(matchSidebarTreeMenuShortcut(keyEvent('Enter', { metaKey: true }))).toBe('open-new-tab');
    expect(matchSidebarTreeMenuShortcut(keyEvent('F2'))).toBe('rename');
    expect(matchSidebarTreeMenuShortcut(keyEvent('Backspace'))).toBe('delete');
    expect(matchSidebarTreeMenuShortcut(keyEvent('Delete'))).toBe('delete');
    expect(matchSidebarTreeMenuShortcut(keyEvent('n', { ctrlKey: true }))).toBe('create');
    expect(matchSidebarTreeMenuShortcut(keyEvent('r', { metaKey: true }))).toBe('refresh');
  });

  it('ignores chorded or unrelated keys', () => {
    expect(matchSidebarTreeMenuShortcut(keyEvent('Enter', { shiftKey: true }))).toBeNull();
    expect(matchSidebarTreeMenuShortcut(keyEvent('F2', { ctrlKey: true }))).toBeNull();
    expect(matchSidebarTreeMenuShortcut(keyEvent('d', { ctrlKey: true }))).toBeNull();
    expect(matchSidebarTreeMenuShortcut(keyEvent('Escape'))).toBeNull();
  });
});
