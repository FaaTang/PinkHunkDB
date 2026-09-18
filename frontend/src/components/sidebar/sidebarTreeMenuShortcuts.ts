/**
 * 侧栏对象树「右键菜单上展示」的硬编码快捷键匹配。
 * 与 V2TableContextMenu 中的 kbd / primaryShortcut 展示保持一致。
 */

export type SidebarTreeMenuShortcut =
  | 'open-data'
  | 'open-new-tab'
  | 'rename'
  | 'delete'
  | 'create'
  | 'refresh';

const hasPrimaryModifier = (
  event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>,
): boolean => event.ctrlKey || event.metaKey;

const hasNoExtraModifiers = (
  event: Pick<KeyboardEvent, 'altKey' | 'shiftKey'>,
): boolean => !event.altKey && !event.shiftKey;

/**
 * 匹配侧栏树节点菜单快捷键；未命中返回 null。
 */
export const matchSidebarTreeMenuShortcut = (
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
): SidebarTreeMenuShortcut | null => {
  const key = String(event.key || '');
  const lower = key.toLowerCase();

  if (lower === 'enter' && hasPrimaryModifier(event) && hasNoExtraModifiers(event)) {
    return 'open-new-tab';
  }
  if (lower === 'enter' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    return 'open-data';
  }
  if (key === 'F2' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    return 'rename';
  }
  if (
    (key === 'Backspace' || key === 'Delete')
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
    && !event.shiftKey
  ) {
    return 'delete';
  }
  if (lower === 'n' && hasPrimaryModifier(event) && hasNoExtraModifiers(event)) {
    return 'create';
  }
  if (lower === 'r' && hasPrimaryModifier(event) && hasNoExtraModifiers(event)) {
    return 'refresh';
  }
  return null;
};
