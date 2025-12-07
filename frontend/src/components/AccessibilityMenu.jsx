import { useContext } from 'react';
import { X, RefreshCw, Type, AlignJustify, Moon, Sun } from 'lucide-react';
import { AccessibilityContext } from '../context/AccessibilityContext';

const AccessibilityMenu = ({ isOpen, onClose }) => {
  const { settings, updateSetting, resetSettings } = useContext(AccessibilityContext);

  const buttonClass = 'p-4 rounded-lg flex flex-col items-center justify-center';
  const inactiveClass = 'bg-gray-100 dark:bg-gray-700';
  const activeClass = 'bg-blue-500 text-white';

  // Helper function for size control buttons
  const getSizeButtonClasses = (isActive) =>
    `w-8 h-8 rounded-full transition-all ${isActive ? 'bg-blue-500 scale-110' : 'bg-gray-400 hover:bg-gray-500'}`;
  const getLineHeightButtonClasses = (isActive) =>
    `w-7 h-7 rounded-full transition-all ${isActive ? 'bg-blue-500 scale-110' : 'bg-gray-400 hover:bg-gray-500'}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out accessibility-menu ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full p-6 text-gray-800 dark:text-gray-200">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold">Barrierefreiheit</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={resetSettings}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Zurücksetzen"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Schließen"
              >
                <X size={24} />
              </button>
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
                    <button
                      onClick={() => updateSetting('textSize', 1)}
                      className={getSizeButtonClasses(settings.textSize === 1)}
                      aria-label="Textgröße 1x"
                      title="Normal"
                    />
                    <button
                      onClick={() => updateSetting('textSize', 1.5)}
                      className={getSizeButtonClasses(settings.textSize === 1.5)}
                      aria-label="Textgröße 1.5x"
                      title="Größer"
                    />
                    <button
                      onClick={() => updateSetting('textSize', 2.0)}
                      className={getSizeButtonClasses(settings.textSize === 2.0)}
                      aria-label="Textgröße 2x"
                      title="Am größten"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <AlignJustify size={20} className="mr-2" />
                    <span className="font-medium">Zeilenhöhe</span>
                  </div>
                  <div className="flex items-center justify-around bg-gray-200 dark:bg-gray-600 rounded-full p-2">
                    <button
                      onClick={() => updateSetting('lineHeight', 1)}
                      className={getLineHeightButtonClasses(settings.lineHeight === 1)}
                      aria-label="Zeilenhöhe 1x"
                      title="Normal"
                    />
                    <button
                      onClick={() => updateSetting('lineHeight', 1.3)}
                      className={getLineHeightButtonClasses(settings.lineHeight === 1.3)}
                      aria-label="Zeilenhöhe 1.3x"
                      title="Mittel"
                    />
                    <button
                      onClick={() => updateSetting('lineHeight', 1.6)}
                      className={getLineHeightButtonClasses(settings.lineHeight === 1.6)}
                      aria-label="Zeilenhöhe 1.6x"
                      title="Groß"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">Visuell</h3>
              <div className="space-y-3">
                <button
                  onClick={() => updateSetting('darkMode', !settings.darkMode)}
                  className={`${buttonClass} w-full transition-colors ${settings.darkMode ? activeClass : inactiveClass}`}
                >
                  {settings.darkMode ? (
                    <Sun size={24} className="mb-2" />
                  ) : (
                    <Moon size={24} className="mb-2" />
                  )}
                  <span className="font-medium">
                    {settings.darkMode ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccessibilityMenu;
