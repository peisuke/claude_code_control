import { useState } from 'react';
import { TmuxHierarchy } from '../types';
import { tmuxAPI } from '../services/api';
import { DeleteDialogState, initialDeleteDialog } from '../components/tmux/DeleteConfirmationDialog';

interface UseSessionManagementProps {
  hierarchy: TmuxHierarchy | null;
  onRefresh?: () => void;
}

export function useSessionManagement({ hierarchy, onRefresh }: UseSessionManagementProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(initialDeleteDialog);

  const sessions = hierarchy?.sessions || {};

  const handleCreateSession = async () => {
    const newSessionName = prompt('新しいセッション名を入力してください（空の場合は自動命名）:', '');

    if (newSessionName !== null) {
      try {
        setLoading(true);

        let sessionName = newSessionName.trim();

        if (!sessionName) {
          const existingSessions = Object.keys(sessions);
          const numericSessions = existingSessions
            .filter(name => /^\d+$/.test(name))
            .map(name => parseInt(name, 10))
            .sort((a, b) => a - b);

          let nextNumber = 0;
          for (const num of numericSessions) {
            if (num === nextNumber) {
              nextNumber++;
            } else {
              break;
            }
          }
          sessionName = nextNumber.toString();
        }

        await tmuxAPI.createSession(sessionName);
        onRefresh?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'セッションの作成に失敗しました');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteSession = (sessionName: string) => {
    const sessionCount = Object.keys(sessions).length;
    if (sessionCount <= 1) {
      alert('最後のセッションは削除できません');
      return;
    }

    setDeleteDialog({
      open: true,
      type: 'session',
      name: sessionName,
      sessionName: sessionName,
      windowIndex: undefined
    });
  };

  const handleCreateWindow = async (sessionName: string) => {
    const windowName = prompt('新しいウィンドウ名を入力してください（空の場合は自動命名）:', '');
    if (windowName !== null) {
      try {
        setLoading(true);
        await tmuxAPI.createWindow(sessionName, windowName.trim() || undefined);
        onRefresh?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'ウィンドウの作成に失敗しました');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteWindow = (sessionName: string, windowIndex: string, windowName: string) => {
    const session = sessions[sessionName];
    const windowCount = Object.keys(session?.windows || {}).length;
    if (windowCount <= 1) {
      alert('最後のウィンドウは削除できません');
      return;
    }

    setDeleteDialog({
      open: true,
      type: 'window',
      name: `${windowIndex}: ${windowName}`,
      sessionName: sessionName,
      windowIndex: windowIndex
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      if (deleteDialog.type === 'session') {
        await tmuxAPI.deleteSession(deleteDialog.sessionName);
      } else if (deleteDialog.windowIndex) {
        await tmuxAPI.deleteWindow(deleteDialog.sessionName, deleteDialog.windowIndex);
      }
      onRefresh?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setLoading(false);
      setDeleteDialog(initialDeleteDialog);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog(initialDeleteDialog);
  };

  return {
    loading,
    deleteDialog,
    handleCreateSession,
    handleDeleteSession,
    handleCreateWindow,
    handleDeleteWindow,
    handleConfirmDelete,
    handleCloseDeleteDialog
  };
}
