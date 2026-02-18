'use client';

import styles from './editor.module.css';

export default function CharCounter({ count }: { count: number }) {
  return (
    <span className={styles.charCount}>
      {count.toLocaleString()}자 | 자동저장
    </span>
  );
}
