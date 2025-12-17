import { createPortal } from 'react-dom'; // Wichtig: Import hinzufügen

export const Alert = ({ message, onConfirm, setShowAlert }) => {
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 text-center py-4 px-6 rounded-3xl w-96 h-96 flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
            Löschen bestätigen
          </span>
          <button
            onClick={() => setShowAlert(false)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-300">{message}</p>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => setShowAlert(false)}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
          >
            Abbrechen
          </button>

          <button
            onClick={() => {
              onConfirm();
              setShowAlert(false);
            }}
            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(modalContent, document.body);
};
