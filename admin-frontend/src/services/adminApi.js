// services/adminService.js
import { logger } from '../../../frontend/src/conf/logger/logger';
import { hnadleHttpStatus } from '../../../frontend/src/utils/exception-handler/exception-handler';
import api from '../../../frontend/src/services/api';

export const adminService = {
  getElectionsForAdmin: async () => {
    try {
      const response = await api.get('/admin/elections/future');
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
