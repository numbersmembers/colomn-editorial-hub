'use client';

import { useWorkspace } from './WorkspaceContext';
import CharCounter from './CharCounter';
import styles from './editor.module.css';

import type { StepLog, GeneratorOutput } from '@/types';

export default function EditorArea() {
  const {
    draft,
    setDraft,
    selectedGeneratorId,
    generatorSettings,
    savedResearch,
    articleSources,
    sourceColumnBody,
    columnIdea,
    genericInputMode,
    isGenerating,
    setIsGenerating,
    setPipelineSteps,
  } = useWorkspace();

  const charCount = draft.body.length;
  const isRoad = selectedGeneratorId === 'road';

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setPipelineSteps([]);

    let requestInput: Record<string, unknown>;

    if (isRoad) {
      requestInput = {
        title: draft.title || 'Road 스타일 변환',
        idea: 'Road 스타일 변환',
        sourceColumnBody,
        settings: generatorSettings[selectedGeneratorId],
      };
    } else {
      const allSources = [
        ...articleSources,
        ...savedResearch.map(r => r.link).filter(Boolean),
      ];
      const researchContext = savedResearch.length > 0
        ? savedResearch.map((r, i) => `${i + 1}. ${r.title}: ${r.description}`).join('\n')
        : undefined;

      if (genericInputMode === 'idea') {
        requestInput = {
          title: draft.title,
          idea: columnIdea,
          researchContext,
          settings: generatorSettings[selectedGeneratorId],
        };
      } else {
        requestInput = {
          title: draft.title,
          idea: draft.title || draft.body.slice(0, 200),
          sources: allSources.length > 0 ? allSources : undefined,
          researchContext,
          settings: generatorSettings[selectedGeneratorId],
        };
      }
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generatorId: selectedGeneratorId,
          input: requestInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as
              | { type: 'progress'; steps: StepLog[] }
              | { type: 'done'; output: GeneratorOutput }
              | { type: 'error'; error: string }
              | { type: 'status'; message: string };

            if (data.type === 'progress') {
              setPipelineSteps(data.steps);
            } else if (data.type === 'done') {
              setDraft({ title: data.output.title, body: data.output.body });
              if (data.output.metadata.steps) {
                setPipelineSteps(data.output.metadata.steps);
              }
            } else if (data.type === 'error') {
              alert(data.error);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (e) {
      alert(`생성 실패: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    setIsGenerating(false);
  };

  let isDisabled: boolean;
  if (isRoad) {
    isDisabled = isGenerating || !sourceColumnBody.trim();
  } else if (genericInputMode === 'idea') {
    isDisabled = isGenerating || !columnIdea.trim();
  } else {
    isDisabled = isGenerating || (!draft.title.trim() && articleSources.length === 0);
  }

  return (
    <div className={styles.editorPanel}>
      <input
        className={styles.titleInput}
        value={draft.title}
        onChange={e => setDraft({ ...draft, title: e.target.value })}
        placeholder="제목을 입력하세요"
      />
      <textarea
        className={styles.bodyTextarea}
        value={draft.body}
        onChange={e => setDraft({ ...draft, body: e.target.value })}
        placeholder="칼럼 본문..."
      />
      <div className={styles.editorFooter}>
        <CharCounter count={charCount} />
        <button
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={isDisabled}
        >
          {isGenerating ? (
            <><span className={styles.spinner} /> {isRoad ? '변환 중...' : '생성 중...'}</>
          ) : isRoad ? (
            'Road Style 변환'
          ) : (
            'Generate Draft'
          )}
        </button>
      </div>
    </div>
  );
}
