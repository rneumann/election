import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { voterApi } from '../services/voterApi';
import ResponsiveButton from './ResponsiveButton';

export const Modal = ({ open, setOpen, electionId }) => {
  const [election, setElection] = useState([]);
  useEffect(() => {
    if (!electionId) {
      return;
    }
    const fetchCandidates = async () => {
      const response = await voterApi.getElectionById(electionId);
      setElection(response);
    };
    fetchCandidates();
  }, [electionId]);
  return (
    <Dialog open={open} onClose={setOpen} className="relative z-50">
      {/* Hintergrund */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity
        data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      {/* Zentrierung */}
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel
          transition
          className="
            w-full 
            max-w-4xl
            h-[90vh]
            bg-gray-800 
            rounded-xl 
            shadow-2xl 
            outline outline-white/10 
            overflow-hidden 
            flex flex-col
            transition-all 
            data-closed:opacity-0 data-closed:scale-95
            data-enter:duration-300 data-enter:ease-out 
            data-leave:duration-200 data-leave:ease-in
          "
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
              {election.info} - Wahlprozess
            </DialogTitle>
          </div>

          {/* Content Scroll Bereich */}
          <div className="flex-1 overflow-y-auto px-6 py-6 text-gray-300">
            <p className="text-sm sm:text-base leading-relaxed">
              Are you sure you want to deactivate your account? All of your data will be permanently
              removed. This action cannot be undone.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            <ResponsiveButton onClick={() => setOpen(false)}>Cancel</ResponsiveButton>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
