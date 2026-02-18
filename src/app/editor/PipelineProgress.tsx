'use client';

import { useWorkspace } from './WorkspaceContext';
import styles from './editor.module.css';

const STEP_LABELS: Record<string, string> = {
  convertStyle: '1단계: 스타일 변환',
  reviseColumn: '2단계: 자기교정',
};

const STATUS_TEXT: Record<string, string> = {
  pending: '대기',
  running: '진행 중...',
  done: '완료',
  error: '오류',
};

export default function PipelineProgress() {
  const { pipelineSteps, isGenerating } = useWorkspace();

  if (!isGenerating && pipelineSteps.length === 0) return null;

  return (
    <div className={styles.progressBar}>
      <div className={styles.progressTitle}>
        {isGenerating ? '처리 진행 상황' : '처리 완료'}
      </div>
      {pipelineSteps.map((step, i) => {
        let icon = '\u25CB';
        let className = styles.progressStep;
        if (step.status === 'done') {
          icon = '\u2713';
          className = `${styles.progressStep} ${styles.progressStepDone}`;
        } else if (step.status === 'running') {
          icon = '\u25CF';
          className = `${styles.progressStep} ${styles.progressStepRunning}`;
        } else if (step.status === 'error') {
          icon = '\u2717';
          className = `${styles.progressStep} ${styles.progressStepError}`;
        }

        return (
          <div key={i} className={className}>
            <span className={styles.progressStepIcon}>{icon}</span>
            <span>{STEP_LABELS[step.name] || step.name}</span>
            <span style={{ color: '#aaa', marginLeft: 'auto', fontSize: 11 }}>
              {step.summary || STATUS_TEXT[step.status] || ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
