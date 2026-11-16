import React from 'react';
import { Select, Tooltip } from 'antd';

import { t as defaultTranslate } from '../i18n';
import { useOptionalI18n } from '../i18n/provider';

export type SqlEditorCommitMode = 'manual' | 'auto';

/** 兼容旧引用：auto 已固定立即提交，仅保留 0 */
export const SQL_EDITOR_AUTO_COMMIT_DELAY_OPTIONS: Array<{ value: number }> = [
  { value: 0 },
];

type QueryEditorTransactionSettingsProps = {
  commitMode: SqlEditorCommitMode;
  autoCommitDelayMs: number;
  onCommitModeChange: (mode: SqlEditorCommitMode) => void;
  onAutoCommitDelayMsChange: (delayMs: number) => void;
};

const QueryEditorTransactionSettings: React.FC<QueryEditorTransactionSettingsProps> = ({
  commitMode,
  onCommitModeChange,
}) => {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? defaultTranslate;
  const [isModeSelectOpen, setIsModeSelectOpen] = React.useState(false);
  const [isModeTooltipOpen, setIsModeTooltipOpen] = React.useState(false);
  const handleModeSelectOpenChange = (open: boolean) => {
    setIsModeSelectOpen(open);
    if (open) {
      setIsModeTooltipOpen(false);
    }
  };
  const handleModeTooltipOpenChange = (open: boolean) => {
    setIsModeTooltipOpen(open);
  };

  return (
    <Tooltip
      title={t('query_editor.transaction.mode.tooltip')}
      open={isModeTooltipOpen && !isModeSelectOpen}
      onOpenChange={handleModeTooltipOpenChange}
    >
      <Select
        className={'gn-v2-query-toolbar-select gn-v2-query-toolbar-transaction-mode-select'}
        style={undefined}
        value={commitMode}
        onOpenChange={handleModeSelectOpenChange}
        onChange={(mode) => onCommitModeChange(mode === 'auto' ? 'auto' : 'manual')}
        options={[
          { label: t('query_editor.transaction.mode.manual'), value: 'manual' },
          { label: t('query_editor.transaction.mode.auto'), value: 'auto' },
        ]}
      />
    </Tooltip>
  );
};

export default QueryEditorTransactionSettings;
