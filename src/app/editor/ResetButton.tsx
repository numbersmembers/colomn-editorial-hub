'use client';

import { useWorkspace } from './WorkspaceContext';
import styles from './editor.module.css';

export default function ResetButton() {
  const { resetAll, isGenerating } = useWorkspace();

  const handleReset = () => {
    if (isGenerating) return;
    if (!confirm('모든 작업을 초기화하시겠습니까?')) return;
    resetAll();
  };

  return (
    <button
      className={styles.resetBtn}
      onClick={handleReset}
      disabled={isGenerating}
    >
      초기화
    </button>
  );
}
