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
