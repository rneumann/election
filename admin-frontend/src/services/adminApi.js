import { logger } from '../conf/logger/logger.js';
import { handleHttpStatus } from '../utils/exception-handler/exception-handler.js';
import api from './api.js';
export const adminService = {
  getElectionsForAdmin: async (status) => {
    try {
      const response = await api.get(`/admin/elections${status ? `?status=${status}` : ''}`);
      logger.debug('[adminService] GET /admin/elections response', {
        status: response.status,
        url: response.config?.url,
        data: response.data,
      });
      if (response.status !== 200) {
        handleHttpStatus(response);
        return []; // lieber leeres Array statt undefined
      }
      return response.data || [];
    } catch (err) {
      logger.error('[adminService] getElectionsForAdmin failed', err);
      return []; // safe fallback
    }
  },

  handleToggleElection: async (electionId) => {
    try {
      const response = await api.put(`/admin/controlTestElection/${electionId}`);
      logger.debug('[adminService] PUT controlTestElection', {
        status: response.status,
        url: response.config?.url,
        data: response.data,
      });
      // server sendet 204 -> treat 204 as success
      if (response.status !== 204 && response.status !== 200) {
        handleHttpStatus(response);
        return undefined;
      }
      return response.data;
    } catch (err) {
      logger.error('[adminService] handleToggleElection failed', err);
      throw err;
    }
  },

  deleteTestElectionData: async (electionId) => {
    try {
      const response = await api.delete(`/admin/resetElectionData/${electionId}`);
      if (response.status !== 204 && response.status !== 200) {
        handleHttpStatus(response);
        return undefined;
      }
      return response.data;
    } catch (err) {
      logger.error('[adminService] deleteTestElectionData failed', err);
      throw err;
    }
  },

  deleteAllData: async (selctedElection) => {
    const queryString = selctedElection !== 'all' ? `?electionId=${selctedElection}` : '';
    try {
      const response = await api.delete(`/admin/deleteAllData${queryString}`);
      if (response.status !== 204 && response.status !== 200) {
        handleHttpStatus(response);
        return undefined;
      }
      return response.data;
    } catch (err) {
      logger.error('[adminService] deleteAllData failed', err);
      throw err;
    }
  },

  /**
   * Finalize election results - marks a specific version as final
   * After finalization, no further counting is allowed
   *
   * @param {string} electionId - UUID of the election
   * @param {number} version - Version number to finalize
   * @returns {Promise<Object>} Response with success status
   */
  toggleSimulateMode: async () => {
    try {
      const response = await api.post('/simulate/toggle');
      if (response.status !== 200) {
        handleHttpStatus(response);
        return null;
      }
      return response.data;
    } catch (err) {
      logger.error('[adminService] toggleSimulateMode failed', err);
      throw err;
    }
  },

  getElectionById: async (electionId) => {
    try {
      const response = await api.get(`/voter/elections/${electionId}`);
      if (response.status !== 200) return null;
      return response.data;
    } catch (err) {
      logger.error('[adminService] getElectionById failed', err);
      return null;
    }
  },

  downloadBackup: async () => {
    const response = await api.get('/admin/db/backup', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data]));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${timestamp}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  },

  restoreBackup: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('backup', file);
    const response = await api.post('/admin/db/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  finalizeElectionResults: async (electionId, version) => {
    try {
      const response = await api.post(`/counting/${electionId}/finalize`, { version });
      logger.debug('[adminService] POST finalize response', {
        status: response.status,
        url: response.config?.url,
        data: response.data,
      });
      if (response.status !== 200) {
        handleHttpStatus(response);
        return { success: false, message: 'Finalisierung fehlgeschlagen' };
      }
      return response.data;
    } catch (err) {
      logger.error('[adminService] finalizeElectionResults failed', err);
      throw err;
    }
  },
};
