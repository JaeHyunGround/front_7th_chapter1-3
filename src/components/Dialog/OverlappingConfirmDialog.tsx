import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import { SetStateAction } from 'react';

import { Event } from '../../types';

interface OverlappingConfirmDialogProps {
  isOverlapDialogOpen: boolean;
  setIsOverlapDialogOpen: (value: SetStateAction<boolean>) => void;
  setPendingOverlapDropEvent: (value: SetStateAction<Event | null>) => void;
  overlappingEvents: Event[];
  handleConfirmClick: () => void;
}

const OverlappingConfirmDialog = ({
  isOverlapDialogOpen,
  setIsOverlapDialogOpen,
  setPendingOverlapDropEvent,
  overlappingEvents,
  handleConfirmClick,
}: OverlappingConfirmDialogProps) => {
  return (
    <Dialog
      open={isOverlapDialogOpen}
      onClose={() => {
        setIsOverlapDialogOpen(false);
        setPendingOverlapDropEvent(null);
      }}
    >
      <DialogTitle>일정 겹침 경고</DialogTitle>
      <DialogContent>
        <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
        {overlappingEvents.map((event) => (
          <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
            {event.title} ({event.date} {event.startTime}-{event.endTime})
          </Typography>
        ))}
        <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setIsOverlapDialogOpen(false);
            setPendingOverlapDropEvent(null);
          }}
        >
          취소
        </Button>
        <Button color="error" onClick={handleConfirmClick}>
          계속 진행
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OverlappingConfirmDialog;
