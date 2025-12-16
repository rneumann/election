import { createContext, useContext, useState, useCallback } from "react";
import { GlobalAlert } from "../components/GlobalAlert";

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(undefined);

  const showAlert = useCallback((status, message) => {
    setAlert({ status, message });

    // auto close after 4 sec
    setTimeout(() => {
      setAlert(undefined);
    }, 5000);
  }, []);

  const closeAlert = () => setAlert(undefined);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <GlobalAlert
          status={alert.status}
          message={alert.message}
          onClose={closeAlert}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
