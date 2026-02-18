'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

import { tutorChatAction } from '../actions';
import { useWorkspace } from './WorkspaceContext';
import styles from './editor.module.css';

import type { Message } from '@/types';

export default function TutorChat() {
  const { selectedGeneratorId, draft } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const result = await tutorChatAction(newMessages, selectedGeneratorId, draft);
    setLoading(false);

    if ('error' in result) {
      setMessages([...newMessages, { role: 'assistant', content: `[Error] ${result.error}` }]);
    } else {
      setMessages([...newMessages, { role: 'assistant', content: result.data }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.chatMessages}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>AI 튜터에게 칼럼 아이디어를 상의하세요</div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${styles.chatMessage} ${msg.role === 'user' ? styles.chatUser : styles.chatAssistant}`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className={`${styles.chatMessage} ${styles.chatAssistant}`}>
            <span className={styles.spinner} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.chatInputRow}>
        <textarea
          ref={textareaRef}
          className={styles.chatInput}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력... (Shift+Enter로 줄바꿈)"
          rows={2}
        />
        <button className={styles.chatSendBtn} onClick={send} disabled={loading}>
          전송
        </button>
      </div>
    </div>
  );
}
