export const GlobalAlert = ({ status, message }) => {
  const classForStatus = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-500",
    info: "bg-blue-600",
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] w-[90%] max-w-lg animate-slideDown">
      <div
        className={`text-white shadow-lg rounded-lg px-4 py-3 flex items-center ${classForStatus[status]}`} // eslint-disable-line
      >
        <span className="flex-1">{message}</span>
      </div>
    </div>
  );
};
