import { useState } from 'react';
import { createPortal } from 'react-dom';

export const Alert = ({ message, onConfirm, setShowAlert }) => {
  const [inputValue, setInputValue] = useState('');
  const REQUIRED_TEXT = 'Löschen';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 text-center py-6 px-8 rounded-3xl w-[450px] min-h-[400px] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-gray-900 dark:text-gray-100 text-xl">
            Löschen bestätigen
          </span>
          <button
            onClick={() => setShowAlert(false)}
            className="text-gray-400 hover:text-red-500 transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-600 dark:text-gray-300 text-center">{message}</p>

          <div className="w-full mt-2 text-left">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
              Bitte gib zur Bestätigung
              <span className="font-bold text-red-500 italic">{` ${REQUIRED_TEXT} `}</span> ein:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={REQUIRED_TEXT}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => setShowAlert(false)}
            className="px-6 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
          >
            Abbrechen
          </button>

          <button
            onClick={() => {
              onConfirm();
              setShowAlert(false);
            }}
            disabled={inputValue !== REQUIRED_TEXT}
            className={`px-6 py-2.5 rounded-xl text-white font-medium transition-all ${
              inputValue === REQUIRED_TEXT
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30'
                : 'bg-red-300 dark:bg-red-900/50 cursor-not-allowed opacity-50'
            }`}
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
