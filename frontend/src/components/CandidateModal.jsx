import { useEffect, useState } from 'react';
import { candidateApi } from '../services/candidateApi';
import { logger } from '../conf/logger/logger';

export const CandidateInfoModal = ({ open, onClose, election }) => {
  const [candidates, setCandidates] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    if (!open || !election?.id) {
      return;
    }

    setSelectedCandidate(null);
    setLoadingList(true);

    const loadList = async () => {
      try {
        const data = await candidateApi.getCandidateInfo(election.id);
        const list = Array.isArray(data) ? data : data.candidates || [];
        setCandidates(list);
      } catch (err) {
        logger.error('Fehler beim Laden der Liste:', err);
      } finally {
        setLoadingList(false);
      }
    };
    loadList();
  }, [open, election?.id]);

  const handleCandidateClick = async (listCandidate) => {
    setLoadingDetail(true);

    const tempCandidate = {
      ...listCandidate,
      description: 'Lade Informationen...',
      image: null,
    };
    setSelectedCandidate(tempCandidate);

    try {
      const uid = listCandidate.uid || listCandidate.candidateUid;

      if (uid) {
        const infoData = await candidateApi.getCandidateInfoByUid(uid);
        logger.debug('Nachgeladene Info:', infoData);

        if (infoData && (infoData.info || infoData.picture)) {
          setSelectedCandidate((prev) => ({
            ...prev,
            description: infoData.info || 'Keine Beschreibung verfügbar.',
            image: infoData.picture,
          }));
        } else {
          setSelectedCandidate((prev) => ({
            ...prev,
            description: 'Keine weiteren Infos gefunden.',
          }));
        }
      }
    } catch (err) {
      logger.error('Fehler beim Nachladen:', err);
      setSelectedCandidate((prev) => ({ ...prev, description: 'Fehler beim Laden.' }));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBack = () => setSelectedCandidate(null);

  const getAvatarUrl = (c) =>
    `https://ui-avatars.com/api/?name=${c?.firstname || '?'}+${c?.lastname || '?'}&background=random&color=fff&size=256`;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {selectedCandidate ? 'Kandidatendetails' : 'Kandidatenliste'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loadingList && (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* === DETAIL ANSICHT === */}
          {selectedCandidate && (
            <div className="animate-fadeIn space-y-5 relative">
              <div className="flex flex-col items-center">
                {/* BILD BEREICH */}
                <div className="relative">
                  {/* Das Bild */}
                  <img
                    src={selectedCandidate.image || getAvatarUrl(selectedCandidate)}
                    alt="Kandidat"
                    className={`w-40 h-40 rounded-xl object-cover shadow-lg border-4 border-white bg-gray-100 transition-opacity duration-300 ${
                      loadingDetail && !selectedCandidate.image ? 'opacity-50' : 'opacity-100'
                    }`}
                  />

                  {/* Der Spinner über dem Bild */}
                  {loadingDetail && !selectedCandidate.image && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {/* Das Label unten am Bild */}
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                    {selectedCandidate.party || selectedCandidate.faculty || 'Parteilos'}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-5">
                  {selectedCandidate.firstname} {selectedCandidate.lastname}
                </h3>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Info
                </h4>
                <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line min-h-[40px]">
                  {selectedCandidate.description}
                </div>
              </div>

              <button
                onClick={handleBack}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                ← Zurück zur Liste
              </button>
            </div>
          )}

          {/* === LIST VIEW === */}
          {!loadingList && !selectedCandidate && (
            <ul className="space-y-3">
              {candidates.map((c, i) => (
                <li
                  key={c.uid || i}
                  onClick={() => handleCandidateClick(c)}
                  className="flex items-center gap-4 p-3 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md cursor-pointer bg-white dark:bg-gray-800 group hover:border-blue-300 dark:hover:border-blue-500 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                    <img
                      src={c.picture || getAvatarUrl(c)}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                      alt="Avatar"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                      {c.firstname} {c.lastname}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {c.faculty || c.party}
                    </p>
                  </div>
                  <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500">
                    →
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
