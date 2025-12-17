import { logger } from '../conf/logger/logger.js';
import { hnadleHttpStatus } from '../utils/exception-handler/exception-handler.js';
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
        hnadleHttpStatus(response);
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
        hnadleHttpStatus(response);
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
        hnadleHttpStatus(response);
        return undefined;
      }
      return response.data;
    } catch (err) {
      logger.error('[adminService] deleteTestElectionData failed', err);
      throw err;
    }
  },
};
