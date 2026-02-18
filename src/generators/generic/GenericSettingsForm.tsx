'use client';

import styles from '@/app/editor/editor.module.css';

import type { GeneratorSettings } from '@/types';

type Props = {
  settings: GeneratorSettings;
  onUpdate: (key: string, value: unknown) => void;
}

export default function GenericSettingsForm({ settings, onUpdate }: Props) {
  return (
    <div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Persona</label>
        <textarea
          className={styles.formTextarea}
          value={(settings.persona as string) || ''}
          onChange={e => onUpdate('persona', e.target.value)}
          placeholder="비판적 현실주의자"
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Audience</label>
        <textarea
          className={styles.formTextarea}
          value={(settings.audience as string) || ''}
          onChange={e => onUpdate('audience', e.target.value)}
          placeholder="기업 임직원, 기관 투자가"
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Structure</label>
        <select
          className={styles.formSelect}
          value={(settings.structure as string) || 'PREP'}
          onChange={e => onUpdate('structure', e.target.value)}
        >
          <option value="PREP">PREP (핵심-이유-사례-재확인)</option>
          <option value="NARRATIVE">Narrative (서사적 구조)</option>
          <option value="HEGELIAN">Hegelian (정-반-합)</option>
        </select>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Style</label>
        <textarea
          className={styles.formTextarea}
          value={(settings.style as string) || ''}
          onChange={e => onUpdate('style', e.target.value)}
          placeholder="문장은 짧고 간결하게"
        />
      </div>
    </div>
  );
}
