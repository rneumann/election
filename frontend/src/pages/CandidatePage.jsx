import { useContext, useEffect, useState } from 'react';
import { Footer } from '../layout/Footer';
import { Header } from '../layout/Header';
import { ImageUploadCandidate } from '../components/ImageUploadCandidate';
import ResponsiveButton from '../components/ResponsiveButton';
import { logger } from '../conf/logger/logger';
import { useAlert } from '../context/AlertContext';
import { candidateApi } from '../services/candidateApi';
import { AccessibilityContext, AccessibilityProvider } from '../context/AccessibilityContext';
import AccessibilityMenu from '../components/AccessibilityMenu';

export const CandidatePageContent = () => {
  const [uploadData, setUploadData] = useState(null);
  const [description, setDescription] = useState('');
  const [currentData, setCurrentData] = useState(null);
  const { showAlert } = useAlert();
  const { settings } = useContext(AccessibilityContext);
  const [isAccessibilityMenuOpen, setAccessibilityMenuOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;

    // This preserves Tailwind responsive breakpoints while scaling text
    html.setAttribute('data-text-scale', settings.textSize.toString());

    return () => {
      html.removeAttribute('data-text-scale');
    };
  }, [settings]);

  // Build accessibility classes for main content (not menu!)
  const accessibilityClasses = [
    settings.lineHeight === 1 ? 'accessibility-line-height-1' : '',
    settings.lineHeight === 1.3 ? 'accessibility-line-height-1-3' : '',
    settings.lineHeight === 1.6 ? 'accessibility-line-height-1-6' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const saveNewEntries = async () => {
    const formData = new FormData();
    formData.append('info', description);
    if (uploadData) {
      formData.append('picture', uploadData);
    }

    try {
      if (!currentData) {
        await candidateApi.createCanidateInformation(formData);
        showAlert('success', 'Deine Informationen wurden erfolgreich gespeichert.');
        await fetchCandidateInfo();
        return;
      }
      const response = await candidateApi.updateCanidateInformation(formData);
      if (!response) {
        showAlert('error', 'Beim Speichern der Informationen ist ein Fehler aufgetreten.');
        return;
      }
      showAlert('success', 'Deine Informationen wurden erfolgreich geupdated.');
      await fetchCandidateInfo();
    } catch (error) {
      logger.error(`Error saving new entries: ${error.message}`);
      showAlert('error', 'Beim Speichern der Informationen ist ein Fehler aufgetreten.');
    }
  };

  const clearAllEntries = async () => {
    logger.debug('Clearing all entries');
    try {
      const response = await candidateApi.deleteCanidateInformation();
      if (!response) {
        showAlert('error', 'Beim Löschen der Informationen ist ein Fehler aufgetreten.');
        return;
      }
      await fetchCandidateInfo();
      showAlert('success', 'Deine Informationen wurden erfolgreich gelöscht.');
    } catch (error) {
      logger.error(`Error clearing entries: ${error.message}`);
      showAlert('error', 'Beim Löschen der Informationen ist ein Fehler aufgetreten.');
    }
  };

  const fetchCandidateInfo = async () => {
    try {
      const response = await candidateApi.getCandidateInfoPersonal();
      setCurrentData(response);
      logger.debug(`Fetched candidate info: ${JSON.stringify(response)}`);
      setDescription(response?.info ?? '');
    } catch (error) {
      logger.error(`Error fetching candidate info: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchCandidateInfo();
    };
    fetchData();
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col bg-brand-light dark:bg-gray-900 transition-colors ${accessibilityClasses}`}
    >
      <Header setAccessibilityMenuOpen={setAccessibilityMenuOpen} />
      {/* Main Content - Flex-1 to push footer down */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100 dark:border-gray-700 transition-colors">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark dark:text-gray-100 mb-3 sm:mb-4 transition-colors">
            Persönliche Kandidateninformationen
          </h2>
          <p className="text-sm text-brand-gray dark:text-gray-300 mb-4 sm:mb-6 transition-colors">
            Hier können Sie Ihre persönlichen Kandidateninformationen einsehen und verwalten.
          </p>

          {/* Image Upload Component */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 transition-colors">
              Profilbild Verwaltung
            </h2>

            {/* Flex Container */}
            <div className="flex flex-col sm:flex-row sm:space-x-8">
              {/* 1. BILD UPLOAD */}
              <div className="w-full sm:w-2/3 mb-6 sm:mb-0 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 shadow-inner transition-colors">
                <ImageUploadCandidate setUploadData={setUploadData} />
              </div>

              {/* 2. Picture Preview */}
              <div className="w-full sm:w-1/3 flex flex-col items-center sm:items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 shadow-inner transition-colors">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3 w-full sm:text-left text-center transition-colors">
                  Aktuelles Profilbild
                </h3>

                <div
                  className="
                    w-40 h-40 
                    aspect-[3/4] 
                    overflow-hidden 
                    rounded-lg 
                    shadow-lg 
                    ring-4 ring-white dark:ring-gray-700 
                    bg-gray-200 dark:bg-gray-600 
                    flex items-center justify-center transition-colors
                "
                >
                  {currentData?.picture_data ? (
                    <img
                      src={`data:${currentData.picture_content_type};base64,${btoa(
                        currentData.picture_data.data.map((b) => String.fromCharCode(b)).join(''),
                      )}`}
                      alt="Aktuelles Profilbild"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center p-2 transition-colors">
                      noch kein Bild hochgeladen
                    </p>
                  )}
                </div>

                {/* Button zum Entfernen des Bildes: MUSS ebenfalls zentriert werden */}
                {currentData?.url && (
                  <div className="w-full text-center">
                    {' '}
                    {/* NEU: Wrapper für Zentrierung */}
                    <button
                      onClick={() => setUploadData(null)}
                      className="mt-4 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors"
                    >
                      Bild entfernen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Line */}
          <hr className="border-gray-200 dark:border-gray-700 my-8 border-t-2 transition-colors" />

          {/* Textarea for Personal Description */}
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 transition-colors">
            Persönliche Beschreibung
          </h2>
          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 transition-colors"
            >
              Ihre Beschreibung (max. 200 Zeichen)
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="
                w-full 
                p-3 sm:p-4 
                text-base sm:text-lg
                rounded-lg 
                border-2 border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-700 
                text-gray-900 dark:text-gray-100
                shadow-sm 
                transition-colors
                focus:border-brand-primary dark:focus:border-blue-500 
                focus:ring-brand-primary dark:focus:ring-blue-500 focus:ring-1 
                resize-vertical 
                placeholder:text-gray-400 dark:placeholder:text-gray-500
              "
              placeholder="Fügen Sie eine kurze Beschreibung Ihrer Kandidatur hinzu..."
            ></textarea>

            {/* Character Count */}
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 text-right transition-colors">
              {description.length} / 200 Zeichen
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 space-x-2">
            <ResponsiveButton
              variant="primary"
              className="w-full sm:w-auto"
              onClick={clearAllEntries}
            >
              bisherige Informationen löschen!
            </ResponsiveButton>
            <ResponsiveButton
              variant="primary"
              className="w-full sm:w-auto"
              onClick={saveNewEntries}
            >
              Beschreibung speichern
            </ResponsiveButton>
          </div>
        </div>
      </main>
      <Footer />
      {/* Accessibility Sidebar */}
      <AccessibilityMenu
        isOpen={isAccessibilityMenuOpen}
        onClose={() => setAccessibilityMenuOpen(false)}
      />
    </div>
  );
};

export const CandidatePage = () => (
  <AccessibilityProvider>
    <CandidatePageContent />
  </AccessibilityProvider>
);
