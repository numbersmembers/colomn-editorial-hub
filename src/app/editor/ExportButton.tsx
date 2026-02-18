'use client';

import { useWorkspace } from './WorkspaceContext';
import styles from './editor.module.css';

export default function ExportButton() {
  const { draft } = useWorkspace();

  const exportHTML = () => {
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(draft.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f5f0eb; color: #1a1a1a; font-family: 'Noto Serif KR', Georgia, serif; line-height: 2; }
  .wrapper { max-width: 680px; margin: 0 auto; padding: 80px 24px 120px; }
  .meta { border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 48px; }
  .label { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: #888; margin-bottom: 16px; }
  h1 { font-size: 32px; font-weight: 900; line-height: 1.4; }
  .body p { font-size: 17px; margin-bottom: 28px; word-break: keep-all; text-align: justify; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="meta">
    <div class="label">Column Editorial Hub</div>
    <h1>${escapeHtml(draft.title)}</h1>
  </div>
  <div class="body">
    ${draft.body.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('\n    ')}
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.title || 'column'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMD = () => {
    const md = `# ${draft.title}\n\n${draft.body}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.title || 'column'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>다운로드</span>
      <button className={styles.exportBtn} onClick={exportHTML} disabled={!draft.body}>
        HTML
      </button>
      <button className={styles.exportBtn} onClick={exportMD} disabled={!draft.body}>
        MD
      </button>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
