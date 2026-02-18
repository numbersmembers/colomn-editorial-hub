import { WorkspaceProvider } from './WorkspaceContext';
import TutorPanel from './TutorPanel';
import EditorArea from './EditorArea';
import ResearchDashboard from './ResearchDashboard';
import ExportButton from './ExportButton';
import ResetButton from './ResetButton';
import styles from './editor.module.css';

export default function EditorPage() {
  return (
    <WorkspaceProvider>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <span className={styles.headerTitle}>Column Editorial Hub</span>
          <ResetButton />
          <div className={styles.headerActions}>
            <ExportButton />
          </div>
        </header>
        <TutorPanel />
        <EditorArea />
        <ResearchDashboard />
      </div>
    </WorkspaceProvider>
  );
}
