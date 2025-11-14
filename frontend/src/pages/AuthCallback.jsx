import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme';

/**

 *
 
 *
 * @returns Callback page with validation states and user feedback
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const [status, setStatus] = useState('validating'); // 'validating' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    /**
     * Validates the authentication session and handles redirect.
     * Checks for error parameters from backend or validates session state.
     */
    const validateSession = async () => {
      const provider = searchParams.get('provider');
      const error = searchParams.get('error');

      // Handle authentication failure from backend
      if (error) {
        const errorMessages = {
          saml_failed: 'SAML-Authentifizierung fehlgeschlagen.',
          keycloak_failed: 'Keycloak-Authentifizierung fehlgeschlagen.',
        };

        setStatus('error');

        let message = 'Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
        if (error === 'saml_failed') {
          message = errorMessages.saml_failed;
        } else if (error === 'keycloak_failed') {
          message = errorMessages.keycloak_failed;
        }

        setErrorMessage(message);

        // Redirect to login after showing error
        setTimeout(() => {
          navigate(`/login?error=${error}&provider=${provider || 'unknown'}`, { replace: true });
        }, 2500);
        return;
      }

      // Validate session with backend
      try {
        const { data } = await api.get('/auth/me', { withCredentials: true });

        if (data.authenticated && data.user) {
          setStatus('success');

          // Short delay for better UX - let user see success message
          setTimeout(() => {
            navigate('/home', { replace: true });
          }, 1500);
        } else {
          // Session not established despite successful OAuth flow
          setStatus('error');
          setErrorMessage('Sitzung konnte nicht erstellt werden. Bitte melden Sie sich erneut an.');

          setTimeout(() => {
            navigate('/login?error=session_invalid', { replace: true });
          }, 2500);
        }
      } catch {
        // API error during validation
        setStatus('error');
        setErrorMessage('Fehler bei der Authentifizierung. Bitte überprüfen Sie Ihre Verbindung.');

        setTimeout(() => {
          navigate('/login?error=validation_failed', { replace: true });
        }, 2500);
      }
    };

    validateSession();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light via-gray-50 to-white px-4">
      <div className="bg-white p-8 sm:p-12 rounded-xl shadow-2xl text-center max-w-md w-full border border-gray-100">
        {/* Validating State */}
        {status === 'validating' && (
          <>
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-brand-primary mx-auto mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-brand-light opacity-50"></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-brand-dark mb-3">Authentifizierung läuft...</h2>
            <p className="text-brand-gray text-sm">
              Ihre Sitzung wird validiert. Bitte haben Sie einen Moment Geduld.
            </p>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <>
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-scale-in">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-3">Anmeldung erfolgreich!</h2>
            <p className="text-brand-gray text-sm mb-2">Sie wurden erfolgreich authentifiziert.</p>
            <p className="text-brand-gray text-xs">Sie werden weitergeleitet...</p>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-3">Anmeldung fehlgeschlagen</h2>
            <p className="text-brand-gray text-sm mb-4">{errorMessage}</p>
            <p className="text-brand-gray text-xs">Sie werden zur Anmeldeseite zurückgeleitet...</p>
          </>
        )}

        {/* Footer - Institution branding */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-brand-gray">{theme.text.copyright}</p>
        </div>
      </div>

      {/* CSS Animation for success checkmark */}
      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
