import { logger } from '../conf/logger/logger.js';
import api from './api';

/**
 * Service für alle template-bezogenen API-Aufrufe
 */
export const templateApi = {
  /*
   * Lädt das Wahl-Template herunter (Excel)
   */
  downloadElectionTemplate: async (preset = 'generic') => {
    try {
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
   * Lädt das Wähler-Template herunter (Excel)
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

  /*
   * Lädt eine JSON-Konfigurationsdatei für neue Wahlarten hoch
   */
  uploadConfig: async (file) => {
    try {
      const formData = new FormData();
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

  /*
   * Holt die Liste aller verfügbaren Wahl-Presets (Wahlarten)
   * Returns: { internal: [{key: string, info: string}, ...], external: [{key: string, info: string}, ...] }
   */
  getAvailablePresets: async () => {
    try {
      const response = await api.get('/admin/config/presets');
      // Ensure we always return the structured format
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        return response.data; // Already in {internal: [], external: []} format
      }
      // Fallback for old array format
      return { internal: [], external: [] };
    } catch (error) {
      logger.error('Fehler beim Laden der Presets:', error);
      return { internal: [], external: [] };
    }
  },
};

/*
 * Hilfsfunktion zum Auslösen des Browser-Downloads
 */
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
