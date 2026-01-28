import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';

export interface DeleteDialogState {
  open: boolean;
  type: 'session' | 'window';
  name: string;
  sessionName: string;
  windowIndex?: string;
}

export const initialDeleteDialog: DeleteDialogState = {
  open: false,
  type: 'session',
  name: '',
  sessionName: '',
  windowIndex: undefined
};

interface DeleteConfirmationDialogProps {
  dialog: DeleteDialogState;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  dialog,
  loading,
  onConfirm,
  onClose
}) => {
  return (
    <Dialog open={dialog.open} onClose={onClose}>
      <DialogTitle>
        {dialog.type === 'session' ? 'セッション削除の確認' : 'ウィンドウ削除の確認'}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {dialog.type === 'session'
            ? `セッション "${dialog.name}" を削除しますか？`
            : `ウィンドウ "${dialog.name}" を削除しますか？`
          }
          <br />
          この操作は取り消せません。
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          キャンセル
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={loading}
        >
          削除
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
