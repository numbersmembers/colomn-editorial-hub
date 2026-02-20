'use client';

import { useEffect, useState } from 'react';

import { getRoadDisplayDataAction } from '../actions';
import GenericSettingsForm from '@/generators/generic/GenericSettingsForm';
import { useWorkspace } from './WorkspaceContext';
import styles from './editor.module.css';

type RoadDisplayData = {
  charRange: { min: number; max: number };
  maxRevisionRounds: number;
  passThreshold: number;
  vocabulary: string[];
}

export default function TutorSetup() {
  const { selectedGeneratorId, generatorSettings, updateGeneratorSettings, articleSources, setArticleSources, sourceColumnBody, setSourceColumnBody, columnIdea, setColumnIdea, genericInputMode, setGenericInputMode } = useWorkspace();
  const [roadData, setRoadData] = useState<RoadDisplayData | null>(null);
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    if (selectedGeneratorId === 'road' && !roadData) {
      getRoadDisplayDataAction().then(result => {
        if ('data' in result) setRoadData(result.data);
      });
    }
  }, [selectedGeneratorId, roadData]);

  const addLink = () => {
    const url = linkInput.trim();
    if (url) {
      setArticleSources([...articleSources, url]);
      setLinkInput('');
    }
  };

  const articleLinkSection = (
    <div className={styles.ruleBlock}>
      <div className={styles.ruleTitle}>기사 링크</div>
      <div className={styles.factInputRow}>
        <input
          className={styles.factInput}
          value={linkInput}
          onChange={e => setLinkInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') addLink();
          }}
          placeholder="기사 URL 입력 후 Enter"
        />
        <button className={styles.smallBtn} onClick={addLink}>+</button>
      </div>
      {articleSources.map((url, i) => (
        <div key={i} className={styles.savedItem}>
          <span
            className={styles.savedTitle}
            style={{ fontSize: 11, wordBreak: 'break-all' }}
            onClick={() => window.open(url, '_blank')}
          >
            {url}
          </span>
          <button
            className={styles.removeBtn}
            onClick={() => setArticleSources(articleSources.filter((_, idx) => idx !== i))}
          >x</button>
        </div>
      ))}
    </div>
  );

  if (selectedGeneratorId === 'road') {
    if (!roadData) {
      return <div className={styles.emptyState}>Loading...</div>;
    }

    return (
      <div>
        <div className={styles.ruleBlock}>
          <div className={styles.ruleTitle}>원본 칼럼 텍스트</div>
          <textarea
            className={styles.formTextarea}
            style={{ minHeight: 120 }}
            value={sourceColumnBody}
            onChange={e => setSourceColumnBody(e.target.value)}
            placeholder="범용 칼럼으로 생성한 텍스트를 붙여넣으세요"
          />
        </div>
        <div className={styles.ruleBlock}>
          <div className={styles.ruleTitle}>분량</div>
          <div className={styles.ruleText}>{roadData.charRange.min}~{roadData.charRange.max}자</div>
        </div>
        <div className={styles.ruleBlock}>
          <div className={styles.ruleTitle}>문체</div>
          <div className={styles.ruleText}>평어체(~다, ~했다) / 경어체 절대 금지</div>
        </div>
        <div className={styles.ruleBlock}>
          <div className={styles.ruleTitle}>압축 기법</div>
          <div className={styles.ruleText}>동격 / 함의(~인 셈이다) / 시간(그로부터 N년) / 인과 / 생략</div>
        </div>
        <div className={styles.ruleBlock}>
          <div className={styles.ruleTitle}>Road 어휘</div>
          <div className={styles.vocabList}>
            {roadData.vocabulary.map((v, i) => (
              <span key={i} className={styles.vocabTag}>{v}</span>
            ))}
          </div>
        </div>
        <div className={styles.ruleBlock}>
          <div className={styles.ruleTitle}>자기교정</div>
          <div className={styles.ruleText}>8항목 체크리스트, {roadData.passThreshold}/8 이상 PASS, 최대 {roadData.maxRevisionRounds}라운드</div>
        </div>
      </div>
    );
  }

  // Generic Generator
  const settings = generatorSettings['generic'] || {};

  const handleUpdate = (key: string, value: unknown) => {
    updateGeneratorSettings('generic', { ...settings, [key]: value });
  };

  return (
    <div>
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${genericInputMode === 'idea' ? styles.modeBtnActive : ''}`}
          onClick={() => setGenericInputMode('idea')}
        >
          아이디어로 작성
        </button>
        <button
          className={`${styles.modeBtn} ${genericInputMode === 'article' ? styles.modeBtnActive : ''}`}
          onClick={() => setGenericInputMode('article')}
        >
          기사 링크 입력
        </button>
      </div>
      {genericInputMode === 'idea' ? (
        <div className={styles.ruleBlock}>
          <div className={styles.ruleTitle}>칼럼 아이디어</div>
          <textarea
            className={styles.formTextarea}
            style={{ minHeight: 120 }}
            value={columnIdea}
            onChange={e => setColumnIdea(e.target.value)}
            placeholder="칼럼 주제나 아이디어를 입력하세요 (예: 삼성전자의 파운드리 전략 변화)"
          />
        </div>
      ) : (
        articleLinkSection
      )}
      <GenericSettingsForm settings={settings} onUpdate={handleUpdate} />
    </div>
  );
}
