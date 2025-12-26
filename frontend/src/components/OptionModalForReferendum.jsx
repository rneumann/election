import { useEffect, useState } from 'react';
import { candidateApi } from '../services/candidateApi';
import { logger } from '../conf/logger/logger';

export const OptionModalForReferendum = ({ open, onClose, election }) => {
  const [options, setOptions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    if (!open || !election?.id) {
      return;
    }

    setSelectedOption(null);
    setLoadingList(true);

    const loadList = async () => {
      try {
        const data = await candidateApi.getOptionsForElection(election.id);
        setOptions(data);
      } catch (err) {
        logger.error('Error occurred while loading option list:', err);
      } finally {
        setLoadingList(false);
      }
    };
    loadList();
  }, [open, election?.id]);

  const handleCandidateClick = async (listOption) => {
    setSelectedOption(listOption);
  };

  const handleBack = () => setSelectedOption(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {selectedOption ? 'Optionen details' : 'Wahloptionen'}
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
          {selectedOption && (
            <div className="animate-fadeIn space-y-5 relative">
              <div className="flex flex-col items-center">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-5">
                  {selectedOption.name}
                </h3>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Info
                </h4>
                <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line min-h-[40px]">
                  {selectedOption.description}
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
          {!loadingList && !selectedOption && (
            <ul className="space-y-3">
              {options.map((c, i) => (
                <li
                  key={c.uid || i}
                  onClick={() => handleCandidateClick(c)}
                  className="flex items-center gap-4 p-3 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md cursor-pointer bg-white dark:bg-gray-800 group hover:border-blue-300 dark:hover:border-blue-500 transition-all"
                >
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                      {c.name}
                    </h3>
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
