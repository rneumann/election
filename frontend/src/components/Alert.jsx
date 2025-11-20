import ResponsiveButton from './ResponsiveButton';

export const Alert = ({ setShowAlert }) => {
  return (
    <div className="bg-gray-200 text-center py-4 lg:px-4 rounded-md h-96 w-96 flex flex-col">
      {/* Header */}
      <div className="flex items-start px-4">
        <span className="font-semibold mr-2 text-left flex-auto mt-8">
          Abstimmen mit folgenden Parameter:
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-6 cursor-pointer"
          onClick={() => setShowAlert(false)}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>

      {/* Footer → fixed bottom */}
      <div className="mt-auto px-4 sm:px-6 py-4 border-t border-gray-700 flex justify-end">
        <ResponsiveButton size="small" className="btn btn-primary">
          Abstimmen
        </ResponsiveButton>
      </div>
    </div>
  );
};
