import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import ResponsiveButton from './ResponsiveButton';
import { Spinner } from './Spinner';

export const CommitteeCandidateModal = ({ open, onClose, election, candidates, loading }) => {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Hintergrund abdunkeln (Gleicher Style wie im Original) */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel
          transition
          className="
            w-full max-w-full sm:max-w-2xl md:max-w-3xl
            h-[85vh]
            bg-gray-900/90 backdrop-blur-xl
            border border-white/10 rounded-2xl shadow-xl
            flex flex-col overflow-hidden
            transition-all
            data-closed:opacity-0 data-closed:scale-95
            data-enter:duration-300 data-enter:ease-out
            data-leave:duration-200 data-leave:ease-in
          "
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-700 bg-gray-800/40 backdrop-blur-sm flex justify-between items-center">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-white truncate">
                {election?.info || 'Wahldetails'}
              </DialogTitle>
              <p className="text-sm text-gray-400 mt-1">Kandidatenliste (Ansicht für Wahlausschuss)</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content: Kandidatenliste */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-800/40">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Spinner />
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center text-gray-500 py-10">Keine Kandidaten für diese Wahl gefunden.</div>
            ) : (
              <div className="grid gap-4">
                {candidates.map((candidate) => (
                  <div 
                    key={candidate.id} 
                    className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-800/60 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors"
                  >
                    {/* Bild / Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-300 border-2 border-gray-600 overflow-hidden">
                        {candidate.image ? (
                           <img src={candidate.image} alt="Kandidat" className="w-full h-full object-cover" />
                        ) : (
                           <span>{candidate.firstname?.[0]}{candidate.lastname?.[0]}</span>
                        )}
                      </div>
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-900/50 text-blue-200 text-xs px-2 py-0.5 rounded border border-blue-800">
                          Liste {candidate.listnum}
                        </span>
                        <h4 className="text-lg font-bold text-white truncate">
                          {candidate.firstname} {candidate.lastname}
                        </h4>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-2">
                        {candidate.faculty ? `Fakultät: ${candidate.faculty}` : 'Keine Fakultät angegeben'}
                      </p>

                      {/* Beschreibung (falls vorhanden) */}
                      {candidate.description ? (
                        <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 italic">
                          "{candidate.description}"
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Keine weitere Beschreibung.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer (Nur Schließen Button) */}
          <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/80 backdrop-blur-md flex justify-end">
            <ResponsiveButton
              size="medium"
              variant="primary"
              onClick={onClose}
            >
              Schließen
            </ResponsiveButton>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};