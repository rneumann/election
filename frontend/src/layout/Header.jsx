import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ResponsiveButton from '../components/ResponsiveButton';
import { useTheme } from '../hooks/useTheme';

export const Header = () => {
  const { logout } = useAuth();
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  const navigateToCandidatePage = () => {
    navigate('/candidate'); // eslint-disable-line
  };
  const navigateToHomePage = () => {
    navigate('/home');
  };
  return (
    <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-10">
      <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-3 md:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl md:text-2xl font-bold truncate">
              {theme.institution.name} {theme.text.appTitle}
            </h1>
            <p className="text-xs sm:text-sm opacity-90 truncate">
              <span className="hidden sm:inline">Angemeldet als: </span>
              <span className="font-semibold">{user?.username}</span>
              <span className="hidden sm:inline"> ({theme.roles[user?.role] || user?.role})</span>
            </p>
          </div>
          {user.isCandidate && window.location.pathname !== '/candidate' && (
            <div className="self-start sm:self-auto">
              <ResponsiveButton
                className="group inline-flex items-center"
                toolTip={'Wechsel zur Hauptansicht'}
                toolTipPlacement="bottom"
                variant="secondary"
                size="small"
                onClick={() => {
                  navigateToCandidatePage();
                }}
              >
                Kandidaten Ansicht
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="size-5 ml-2 transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </ResponsiveButton>
            </div>
          )}
          {user.isCandidate && window.location.pathname === '/candidate' && (
            <div className="self-start sm:self-auto">
              <ResponsiveButton
                className="group inline-flex items-center"
                toolTip={'Wechsel zur Hauptansicht'}
                toolTipPlacement="bottom"
                variant="secondary"
                size="small"
                onClick={() => {
                  navigateToHomePage();
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 mr-2 transition-transform duration-300 group-hover:-translate-x-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
                Hauptansicht
              </ResponsiveButton>
            </div>
          )}
          <div className="self-start sm:self-auto">
            <ResponsiveButton
              toolTip={'logout aus der aktuellen Sitzung'}
              toolTipPlacement="bottom"
              variant="secondary"
              size="small"
              onClick={logout}
            >
              Abmelden
            </ResponsiveButton>
          </div>
        </div>
      </div>
    </header>
  );
};
