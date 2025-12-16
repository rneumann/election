import api from './api';

export const templateApi = {
  /*
   * Lädt das Wahl-Template herunter
   */
  downloadElectionTemplate: async (preset = 'generic') => {
    try {
      // Preset als Query-Parameter anhängen
      const response = await api.get(`/templates-download/template/elections?preset=${preset}`, {
        responseType: 'blob',
      });

      downloadBlob(response.data, `HKA_Vorlage_${preset}.xlsx`);
    } catch (error) {
      console.error('Download fehlgeschlagen:', error);
      throw error;
    }
  },

  downloadVoterTemplate: async () => {
    try {
      const response = await api.get('/templates-download/template/voters', {
        responseType: 'blob',
      });

      // Hilfsfunktion zum Download (Code sparen)
      downloadBlob(response.data, 'HKA_Waehler_Vorlage.xlsx');
    } catch (error) {
      console.error('Download fehlgeschlagen:', error);
      throw error;
    }
  },
};

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
