import { useContext, useEffect, useRef } from 'react';
import { X, RefreshCw, Type, AlignJustify, Moon, Sun } from 'lucide-react';
import { AccessibilityContext } from '../context/AccessibilityContext';

const AccessibilityMenu = ({ isOpen, onClose }) => {
  const { settings, updateSetting, resetSettings } = useContext(AccessibilityContext);
  const menuRef = useRef(null);

  // Close menu on ESC key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Focus first button when menu opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      setTimeout(() => {
        const firstButton = menuRef.current.querySelector('button');
        if (firstButton) {
          firstButton.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Text size options for mapping
  const textSizeOptions = [
    { value: 1, label: 'Normal', ariaLabel: 'Textgröße Normal' },
    { value: 1.5, label: 'Größer', ariaLabel: 'Textgröße Größer' },
    { value: 2.0, label: 'Am größten', ariaLabel: 'Textgröße Am größten' },
  ];

  // Line height options for mapping
  const lineHeightOptions = [
    { value: 1, label: 'Normal', ariaLabel: 'Zeilenhöhe Normal' },
    { value: 1.3, label: 'Mittel', ariaLabel: 'Zeilenhöhe Mittel' },
    { value: 1.6, label: 'Groß', ariaLabel: 'Zeilenhöhe Groß' },
  ];

  // Helper function for size control buttons
  const getSizeButtonClasses = (isActive) =>
    `w-8 h-8 rounded-full transition-all ${isActive ? 'bg-blue-500 scale-110 ring-2 ring-blue-300 dark:ring-blue-700' : 'bg-gray-400 hover:bg-gray-500'}`;
  const getLineHeightButtonClasses = (isActive) =>
    `w-7 h-7 rounded-full transition-all ${isActive ? 'bg-blue-500 scale-110 ring-2 ring-blue-300 dark:ring-blue-700' : 'bg-gray-400 hover:bg-gray-500'}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Einstellungen für Barrierefreiheit"
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out accessibility-menu ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full p-6 text-gray-800 dark:text-gray-200">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold">Barrierefreiheit</h2>
            <div className="flex items-center gap-2">
              <div className="tooltip-wrapper" data-tooltip="Zurücksetzen">
                <button
                  onClick={resetSettings}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Einstellungen zurücksetzen"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
              <div className="tooltip-wrapper" data-tooltip="Menü schließen">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Menü schließen"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6">
            <div>
              <h3 className="font-semibold mb-3 text-lg">Text</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <Type size={20} className="mr-2" />
                    <span className="font-medium">Größerer Text</span>
                  </div>
                  <div className="flex items-center justify-around bg-gray-200 dark:bg-gray-600 rounded-full p-2">
                    {textSizeOptions.map((option) => (
                      <div key={option.value} className="tooltip-wrapper" data-tooltip={option.label}>
                        <button
                          onClick={() => updateSetting('textSize', option.value)}
                          className={getSizeButtonClasses(settings.textSize === option.value)}
                          aria-label={option.ariaLabel}
                          aria-pressed={settings.textSize === option.value}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <AlignJustify size={20} className="mr-2" />
                    <span className="font-medium">Zeilenhöhe</span>
                  </div>
                  <div className="flex items-center justify-around bg-gray-200 dark:bg-gray-600 rounded-full p-2">
                    {lineHeightOptions.map((option) => (
                      <div key={option.value} className="tooltip-wrapper" data-tooltip={option.label}>
                        <button
                          onClick={() => updateSetting('lineHeight', option.value)}
                          className={getLineHeightButtonClasses(settings.lineHeight === option.value)}
                          aria-label={option.ariaLabel}
                          aria-pressed={settings.lineHeight === option.value}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">Visuell</h3>
              <div className="space-y-3">
                <button
                  onClick={() => updateSetting('darkMode', !settings.darkMode)}
                  className={`p-4 rounded-lg flex items-center justify-between w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${settings.darkMode ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                  aria-pressed={settings.darkMode}
                  aria-label={settings.darkMode ? 'Dark Mode deaktivieren' : 'Dark Mode aktivieren'}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {settings.darkMode ? <Moon size={24} /> : <Sun size={24} />}
                    {settings.darkMode ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  {/* Toggle Switch Visual */}
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.darkMode ? 'bg-blue-300' : 'bg-gray-300'}`}>
                    <div 
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${settings.darkMode ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AccessibilityMenu;
