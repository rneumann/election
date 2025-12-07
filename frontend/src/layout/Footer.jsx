import { useTheme } from '../hooks/useTheme';

export const Footer = () => {
  const theme = useTheme();

  return (
    <footer className="bg-brand-dark text-white py-3 sm:py-4 mt-auto border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs sm:text-sm opacity-90">{theme.text.copyright}</p>
      </div>
    </footer>
  );
};
