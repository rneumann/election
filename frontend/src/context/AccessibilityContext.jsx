import { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import { logger } from '../conf/logger/logger';

export const AccessibilityContext = createContext(null);

export const AccessibilityProvider = ({ children }) => {
  // Load initial settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('accessibilitySettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        logger.debug('Loaded accessibility settings from localStorage:', parsed);

        // Migration: Remove old grayscale property if it exists
        if ('grayscale' in parsed) {
          delete parsed.grayscale;
          logger.debug('Removed old grayscale property from settings');
        }

        // Ensure darkMode exists and is boolean
        if (typeof parsed.darkMode !== 'boolean') {
          parsed.darkMode = false;
          logger.debug('Set darkMode to default false');
        }

        return {
          textSize: parsed.textSize ?? 1,
          lineHeight: parsed.lineHeight ?? 1,
          darkMode: parsed.darkMode ?? false,
        };
      } catch (e) {
        logger.error('Failed to parse accessibility settings:', e);
      }
    }
    logger.debug('Using default accessibility settings');
    return {
      textSize: 1,
      lineHeight: 1,
      darkMode: false,
    };
  });

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    logger.debug('Saving accessibility settings to localStorage:', settings);
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
  }, [settings]);

  // Apply dark mode class to html element
  useEffect(() => {
    const html = document.documentElement;
    logger.debug('Applying dark mode:', settings.darkMode);
    if (settings.darkMode === true) {
      html.classList.add('dark');
      logger.debug('Dark mode ENABLED - added dark class to html');
    } else {
      html.classList.remove('dark');
      logger.debug('Dark mode DISABLED - removed dark class from html');
    }
  }, [settings.darkMode]);

  const updateSetting = useCallback((setting, value) => {
    setSettings((prevSettings) => {
      const newSettings = { ...prevSettings };
      switch (setting) {
      case 'textSize':
        // Wenn value angegeben ist, setze direkt, sonst zyklisch
        if (value !== undefined) {
          newSettings.textSize = value;
        } else if (newSettings.textSize === 1) {
          newSettings.textSize = 1.5;
        } else if (newSettings.textSize === 1.5) {
          newSettings.textSize = 2.0;
        } else {
          newSettings.textSize = 1;
        }
        break;
      case 'lineHeight':
        // Wenn value angegeben ist, setze direkt, sonst zyklisch
        if (value !== undefined) {
          newSettings.lineHeight = value;
        } else if (newSettings.lineHeight === 1) {
          newSettings.lineHeight = 1.3;
        } else if (newSettings.lineHeight === 1.3) {
          newSettings.lineHeight = 1.6;
        } else {
          newSettings.lineHeight = 1;
        }
        break;
      case 'darkMode':
        newSettings.darkMode = value;
        break;
      default:
        break;
      }
      return newSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({
      textSize: 1,
      lineHeight: 1,
      darkMode: false,
    });
  }, []);

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings }),
    [settings, updateSetting, resetSettings],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};
