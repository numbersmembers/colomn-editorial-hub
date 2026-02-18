'use client';

import { useEffect, useState } from 'react';

import { listGeneratorsAction } from '../actions';
import { useWorkspace } from './WorkspaceContext';
import styles from './editor.module.css';

import type { GeneratorConfig } from '@/types';

export default function GeneratorSelector() {
  const { selectedGeneratorId, setSelectedGeneratorId } = useWorkspace();
  const [generators, setGenerators] = useState<GeneratorConfig[]>([]);

  useEffect(() => {
    listGeneratorsAction().then(result => {
      if ('data' in result) setGenerators(result.data);
    });
  }, []);

  return (
    <select
      className={styles.generatorSelect}
      value={selectedGeneratorId}
      onChange={e => setSelectedGeneratorId(e.target.value)}
    >
      {generators.map(g => (
        <option key={g.id} value={g.id}>
          {g.name} — {g.description}
        </option>
      ))}
    </select>
  );
}
