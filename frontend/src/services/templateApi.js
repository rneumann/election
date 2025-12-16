import api from './api';

export const templateApi = {
  /**
   * Lädt das Wahl-Template herunter
   */
  downloadElectionTemplate: async () => {
    try {
      // WICHTIG: responseType: 'blob' ist nötig, damit Axios die Datei als Binärdaten liest
      const response = await api.get('/templates-download/template/elections', {
        responseType: 'blob',
      });

      // Erstelle einen unsichtbaren Download-Link und klicke ihn
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'HKA_Wahl_Vorlage.xlsx'); // Dateiname
      document.body.appendChild(link);
      link.click();

      // Aufräumen
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download fehlgeschlagen:', error);
      throw error;
    }
  },
};
