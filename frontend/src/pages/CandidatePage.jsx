import { useEffect, useState } from 'react';
import { Footer } from '../layout/Footer';
import { Header } from '../layout/Header';
import { ImageUploadCandidate } from '../components/ImageUploadCandidate';
import ResponsiveButton from '../components/ResponsiveButton';
import { logger } from '../conf/logger/logger';
import { useAlert } from '../context/AlertContext';
import { candidateApi } from '../services/candidateApi';

export const CandidatePage = () => {
  const [uploadData, setUploadData] = useState(null);
  const [description, setDescription] = useState('');
  const [currentData, setCurrentData] = useState(null);
  const { showAlert } = useAlert();

  const saveNewEntries = async () => {
    logger.info(`description: ${description}, picture: ${uploadData?.name || uploadData?.type}`);

    const formData = new FormData();
    formData.append('info', description);
    if (uploadData) {
      formData.append('picture', uploadData);
    }

    logger.info(`New entries saved: ${formData.get('description')}, ${formData.get('picture')}`);

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
      const response = await candidateApi.getCandidateInfoByUid();
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
    <div className="min-h-screen flex flex-col bg-brand-light">
      <Header />
      {/* Main Content - Flex-1 to push footer down */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 border border-gray-100">
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark mb-3 sm:mb-4">
            Persönliche Kandidateninformationen
          </h2>
          <p className="text-sm text-brand-gray mb-4 sm:mb-6">
            Hier können Sie Ihre persönlichen Kandidateninformationen einsehen und verwalten.
          </p>

          {/* Image Upload Component */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Profilbild Verwaltung</h2>

            {/* Flex Container */}
            <div className="flex flex-col sm:flex-row sm:space-x-8">
              {/* 1. BILD UPLOAD */}
              <div className="w-full sm:w-2/3 mb-6 sm:mb-0 p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-inner">
                <ImageUploadCandidate setUploadData={setUploadData} />
              </div>

              {/* 2. Picture Preview */}
              <div className="w-full sm:w-1/3 flex flex-col items-center sm:items-start p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-inner">
                <h3 className="text-base font-semibold text-gray-700 mb-3 w-full sm:text-left text-center">
                  Aktuelles Profilbild
                </h3>

                <div
                  className="
                    w-40 h-40 
                    aspect-[3/4] 
                    overflow-hidden 
                    rounded-lg 
                    shadow-lg 
                    ring-4 ring-white 
                    bg-gray-200 
                    flex items-center justify-center
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
                    <p className="text-sm text-gray-500 text-center p-2">
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
                      className="mt-4 text-sm text-red-600 hover:text-red-800 font-medium transition"
                    >
                      Bild entfernen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Line */}
          <hr className="border-gray-200 my-8 border-t-2" />

          {/* Textarea for Personal Description */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">Persönliche Beschreibung</h2>
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
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
                border-2 border-gray-300 
                shadow-sm 
                transition-all
                focus:border-brand-primary 
                focus:ring-brand-primary 
                focus:ring-1 
                resize-vertical 
                placeholder:text-gray-400
              "
              placeholder="Fügen Sie eine kurze Beschreibung Ihrer Kandidatur hinzu..."
            ></textarea>

            {/* Character Count */}
            <p className="text-xs sm:text-sm text-gray-500 mt-1 text-right">
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
    </div>
  );
};
