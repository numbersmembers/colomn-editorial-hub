'use client';

import { useState } from 'react';

import GeneratorSelector from './GeneratorSelector';
import TutorSetup from './TutorSetup';
import TutorChat from './TutorChat';
import PipelineProgress from './PipelineProgress';
import styles from './editor.module.css';

export default function TutorPanel() {
  const [activeTab, setActiveTab] = useState<'setup' | 'chat'>('setup');

  return (
    <div className={styles.panel} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className={styles.panelHeader}>Tutor</div>
      <div style={{ padding: '12px 16px' }}>
        <GeneratorSelector />
      </div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'setup' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('setup')}
        >
          Setup
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
      </div>
      <div className={styles.tabContent}>
        {activeTab === 'setup' ? <TutorSetup /> : <TutorChat />}
      </div>
      <PipelineProgress />
    </div>
  );
}
