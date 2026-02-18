'use client';

import { useState } from 'react';

import { searchNewsAction, verifyFactAction } from '../actions';
import { useWorkspace } from './WorkspaceContext';
import { stripHtml } from '@/lib/sanitize';
import styles from './editor.module.css';

import type { SearchResultCategory, DisplayNewsItem } from '@/types';
import type { FactCheckResult } from '@/agents/research/FactCheckEngine';

export default function ResearchDashboard() {
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'fact'>('search');
  const {
    savedResearch,
    addResearchItem,
    removeResearchItem,
    factSheet,
    updateFactSheet,
  } = useWorkspace();

  return (
    <div className={styles.panel} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className={styles.panelHeader}>Research</div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'search' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'saved' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved ({savedResearch.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'fact' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('fact')}
        >
          FactSheet
        </button>
      </div>
      {/* All tabs stay mounted to preserve state across tab switches */}
      <div className={styles.tabContent} style={{ display: activeTab === 'search' ? undefined : 'none' }}>
        <SearchTab onSave={addResearchItem} />
      </div>
      <div className={styles.tabContent} style={{ display: activeTab === 'saved' ? undefined : 'none' }}>
        <SavedTab items={savedResearch} onRemove={removeResearchItem} />
      </div>
      <div className={styles.tabContent} style={{ display: activeTab === 'fact' ? undefined : 'none' }}>
        <FactTab factSheet={factSheet} onUpdate={updateFactSheet} />
      </div>
    </div>
  );
}

function SearchTab({ onSave }: { onSave: (item: DisplayNewsItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    const result = await searchNewsAction(query);
    setLoading(false);
    if ('data' in result) {
      setResults(result.data);
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="검색어 입력..."
        />
        <button className={styles.searchBtn} onClick={search} disabled={loading}>
          {loading ? <span className={styles.spinner} /> : '검색'}
        </button>
      </div>
      {results.map((category, ci) => (
        <div key={ci}>
          <div className={styles.categoryLabel}>{category.label}</div>
          {category.items.map((item, ii) => (
            <div key={ii} className={styles.newsItem}>
              <div
                className={styles.newsTitle}
                onClick={() => window.open(item.link, '_blank')}
              >
                {stripHtml(item.title)}
              </div>
              <div className={styles.newsDesc}>
                {stripHtml(item.description)}
              </div>
              <div className={styles.newsActions}>
                <button className={styles.smallBtn} onClick={() => onSave(item)}>
                  저장
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
      {results.length === 0 && !loading && (
        <div className={styles.emptyState}>뉴스를 검색하세요</div>
      )}
    </div>
  );
}

function SavedTab({ items, onRemove }: { items: DisplayNewsItem[]; onRemove: (i: number) => void }) {
  if (items.length === 0) {
    return <div className={styles.emptyState}>저장된 기사가 없습니다</div>;
  }
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className={styles.savedItem}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className={styles.savedTitle}
              onClick={() => window.open(item.link, '_blank')}
            >
              {stripHtml(item.title)}
            </div>
            <div className={styles.savedLink}>{item.link}</div>
          </div>
          <button className={styles.removeBtn} onClick={() => onRemove(i)}>x</button>
        </div>
      ))}
    </div>
  );
}

function FactTab({
  factSheet,
  onUpdate,
}: {
  factSheet: { keyFacts: string[]; timeline: { date: string; event: string }[]; quotes: { text: string; source: string }[] };
  onUpdate: (u: Partial<typeof factSheet>) => void;
}) {
  const [newFact, setNewFact] = useState('');
  const [factCheckInput, setFactCheckInput] = useState('');
  const [factCheckResult, setFactCheckResult] = useState<FactCheckResult | null>(null);
  const [factCheckError, setFactCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const addFact = () => {
    if (!newFact.trim()) return;
    onUpdate({ keyFacts: [...factSheet.keyFacts, newFact.trim()] });
    setNewFact('');
  };

  const checkFact = async () => {
    if (!factCheckInput.trim() || checking) return;
    setChecking(true);
    setFactCheckResult(null);
    setFactCheckError(null);
    const result = await verifyFactAction(factCheckInput);
    setChecking(false);
    if ('data' in result) {
      setFactCheckResult(result.data);
    } else {
      setFactCheckError(result.error);
    }
  };

  const verdictLabel: Record<string, { text: string; color: string }> = {
    supported: { text: 'SUPPORTED', color: '#16a34a' },
    contradicted: { text: 'CONTRADICTED', color: '#dc2626' },
    uncertain: { text: 'UNCERTAIN', color: '#d97706' },
  };

  return (
    <div>
      <div className={styles.factSection}>
        <div className={styles.factLabel}>Key Facts (칼럼 작성에 필요한 팩트를 수동으로 입력)</div>
        {factSheet.keyFacts.map((f, i) => (
          <div key={i} className={styles.factItem}>{f}</div>
        ))}
        <div className={styles.factInputRow}>
          <input
            className={styles.factInput}
            value={newFact}
            onChange={e => setNewFact(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFact()}
            placeholder="팩트 추가..."
          />
          <button className={styles.smallBtn} onClick={addFact}>+</button>
        </div>
      </div>

      <div className={styles.factSection}>
        <div className={styles.factLabel}>Fact Check (문장을 입력하면 뉴스 기반 AI 검증)</div>
        <div className={styles.factInputRow}>
          <input
            className={styles.factInput}
            value={factCheckInput}
            onChange={e => setFactCheckInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkFact()}
            placeholder="검증할 문장..."
          />
          <button className={styles.smallBtn} onClick={checkFact} disabled={checking}>
            {checking ? '...' : '검증'}
          </button>
        </div>
        {factCheckError && (
          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{factCheckError}</div>
        )}
        {factCheckResult && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                fontWeight: 700,
                color: verdictLabel[factCheckResult.verdict]?.color || '#666',
                fontSize: 13,
              }}>
                {verdictLabel[factCheckResult.verdict]?.text || factCheckResult.verdict}
              </span>
              <span style={{ color: '#888', fontSize: 11 }}>
                신뢰도: {factCheckResult.confidence}
              </span>
            </div>
            <div style={{ color: '#333', lineHeight: 1.5, marginBottom: 8 }}>
              {factCheckResult.analysis}
            </div>
            {factCheckResult.sources.length > 0 && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: 6 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>참고 기사</div>
                {factCheckResult.sources.map((src, i) => (
                  <div key={i} style={{ fontSize: 11, marginBottom: 3 }}>
                    <span
                      style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => window.open(src.link, '_blank')}
                    >
                      {src.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
