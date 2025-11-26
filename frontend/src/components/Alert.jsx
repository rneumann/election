import ResponsiveButton from './ResponsiveButton';

export const Alert = ({ setShowAlert, cleanedVotes, candidates }) => {
  const resolveName = (id) => {
    const cand = candidates?.find((c) => c.candidateId === id);
    if (!cand) {
      return id;
    }
    return `${cand.firstname} ${cand.lastname}`;
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-md text-center py-4 px-6 rounded-3xl w-96 h-96 flex flex-col shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-white text-lg">Ihre Auswahl zur Kontrolle</span>
        <button
          onClick={() => setShowAlert(false)}
          className="text-gray-400 hover:text-red-500 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {cleanedVotes === undefined ? (
          <p className="text-red-500 font-bold">Wahl wird ungültig abgegeben!</p>
        ) : Object.keys(cleanedVotes).length === 0 ? (
          <p className="text-gray-300">Keine Stimmen vergeben.</p>
        ) : (
          <ul className="space-y-3">
            {Object.entries(cleanedVotes).map(([id, value]) => (
              <li
                key={id}
                className="bg-gray-800 text-white rounded-xl p-3 flex justify-between items-center shadow hover:shadow-lg transition"
              >
                <span className="font-semibold">{resolveName(id)}</span>
                <span className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm font-medium">
                  {value} Stimme{value > 1 ? 'n' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-end">
        <ResponsiveButton size="small" className="text-white rounded-lg px-4 py-2 transition">
          Abstimmung bestätigen
        </ResponsiveButton>
      </div>
    </div>
  );
};
