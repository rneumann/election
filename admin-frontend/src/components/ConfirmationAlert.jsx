import { createPortal } from 'react-dom';

/**
 * ConfirmationAlert Component - Flexible confirmation dialog
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.confirmText - Text for confirm button
 * @param {string} props.confirmColor - Color scheme for confirm button ('red', 'blue', 'green')
 * @param {Function} props.onConfirm - Callback when confirmed
 * @param {Function} props.setShowAlert - Function to close the dialog
 * @returns {JSX.Element} Confirmation dialog portal
 */
export const ConfirmationAlert = ({
  title = 'Bestätigung',
  message,
  confirmText = 'Bestätigen',
  confirmColor = 'blue',
  onConfirm,
  setShowAlert,
}) => {
  // Safe color lookup using switch-case to avoid object injection
  const getButtonColorClass = (color) => {
    switch (color) {
    case 'red':
      return 'bg-red-600 hover:bg-red-700';
    case 'green':
      return 'bg-green-600 hover:bg-green-700';
    case 'blue':
    default:
      return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 py-6 px-6 rounded-lg w-[32rem] shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</span>
          <button
            onClick={() => setShowAlert(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowAlert(false)}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
          >
            Abbrechen
          </button>

          <button
            onClick={() => {
              onConfirm();
              setShowAlert(false);
            }}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${getButtonColorClass(confirmColor)}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmationAlert;
