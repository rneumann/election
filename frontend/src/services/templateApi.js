import { logger } from '../conf/logger/logger.js';
import api from './api';

export const templateApi = {
  /**
   * Lädt das Wahl-Template herunter.
   * @param {string} preset - Welches Preset? (optional)
   */
  downloadElectionTemplate: async (preset = 'generic') => {
    try {
      // Preset als Query-Parameter anhängen
      const response = await api.get(`/templates-download/template/elections?preset=${preset}`, {
        responseType: 'blob',
      });

      downloadBlob(response.data, `HKA_Vorlage_${preset}.xlsx`);
    } catch (error) {
      logger.error('Download election template failed:', error);
      throw error;
    }
  },

  /**
   * Lädt das Wähler-Template herunter
   */
  downloadVoterTemplate: async () => {
    try {
      const response = await api.get('/templates-download/template/voters', {
        responseType: 'blob',
      });

      downloadBlob(response.data, 'HKA_Waehler_Vorlage.xlsx');
    } catch (error) {
      logger.error('Download voter template failed:', error);
      throw error;
    }
  },

  /**
   * Lädt eine neue JSON-Konfigurationsdatei für Wahlen hoch.
   * @param {File} file - Die ausgewählte JSON-Datei
   * @returns {Promise<Object>} Response mit Bestätigung und Preset-Liste
   */
  uploadConfig: async (file) => {
    try {
      // WICHTIG: Bei Datei-Uploads müssen wir FormData nutzen!
      const formData = new FormData();
      // 'configFile' muss exakt so heißen wie im Backend: upload.single('configFile')
      formData.append('configFile', file);

      const response = await api.post('/admin/config/presets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Fehler beim Upload der Konfiguration:', error);
      throw error;
    }
  },
  getAvailablePresets: async () => {
    try {
      const response = await api.get('/admin/config/presets');
      return response.data; // Erwartet ein Array: ["generic", "stupa", ...]
    } catch (error) {
      logger.error('Fehler beim Laden der Presets:', error);
      return ['generic']; // Fallback
    }
  },
};

// Hilfsfunktion intern
const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
