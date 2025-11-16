import { electionConfigSchema } from '../../schemas/election.schema.js';
import { parseElectionExcel } from '../parsers/excelParser.js';
import { logger } from '../../conf/logger/logger.js';
import { MAX_FILE_SIZE } from './constants.js';

/**
 * Validate Excel file containing election configuration.
 * Combines parsing and Zod schema validation.
 *
 * @param {File} file - Excel file to validate
 * @returns {Promise<{success: boolean, data?: Object, errors?: Array, stats?: Object}>}
 */
export const validateElectionExcel = async (file) => {
  const fileExtension = file.name.split('.').pop();
  logger.info(
    `Starting Excel validation for file type: .${fileExtension}, size: ${(file.size / 1024).toFixed(2)}KB`,
  );

  // Step 0: Check file size
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    logger.warn(`File size exceeds limit: ${fileSizeMB}MB > ${maxSizeMB}MB`);
    return {
      success: false,
      errors: [
        {
          sheet: null,
          row: null,
          field: null,
          message: `Datei zu groß (${fileSizeMB}MB). Maximal ${maxSizeMB}MB erlaubt.`,
          code: 'FILE_TOO_LARGE',
        },
      ],
    };
  }

  // Step 1: Parse Excel file
  const parseResult = await parseElectionExcel(file);

  if (!parseResult.success) {
    return {
      success: false,
      errors: parseResult.errors,
    };
  }

  const { data } = parseResult;

  // Step 2: Prepare data for validation
  // Template uses horizontal table format for "Wahlen" sheet
  // Parser returns first row as object

  const preparedInfo = {
    'Wahl Kennung': data.info['Wahl Kennung'] || '',
    Info: data.info.Info || '',
    Listen: data.info.Listen || '',
    Plätze: data.info.Plätze ? parseInt(data.info.Plätze, 10) : 0,
    'max. Kum.': data.info['max. Kum.'] ? parseInt(data.info['max. Kum.'], 10) : 0,
    'Berechtigt (leer = alle)': data.info['Berechtigt (leer = alle)'] || '',
    'Fakultät(en)': data.info['Fakultät(en)'] || '',
    'Studiengänge (Komma-getrennt)': data.info['Studiengänge (Komma-getrennt)'] || '',
  };

  const preparedData = {
    info: preparedInfo,
    candidates: data.candidates,
  };

  // Step 3: Validate with Zod schema
  const validationResult = electionConfigSchema.safeParse(preparedData);

  if (!validationResult.success) {
    const errors = [];

    validationResult.error.errors.forEach((error) => {
      const path = error.path;
      let sheet = null;
      let row = null;
      let field = null;

      // Determine which sheet the error belongs to
      if (path[0] === 'info') {
        sheet = 'Wahlen';
        field = path[1] || null;
      } else if (path[0] === 'candidates') {
        sheet = 'Listenvorlage';
        if (path.length > 1 && typeof path[1] === 'number') {
          row = path[1] + 2; // +2 for header and 0-index
          field = path[2] || null;
        } else {
          field = null;
        }
      }

      errors.push({
        sheet,
        row,
        field,
        message: error.message,
        code: 'VALIDATION_ERROR',
      });
    });

    return {
      success: false,
      errors,
    };
  }

  // Step 4: Additional cross-field validations

  // Check for duplicate candidate names (only if candidates exist)
  if (validationResult.data.candidates.length > 0) {
    const candidateNames = new Map();
    const duplicateCandidateErrors = [];

    validationResult.data.candidates.forEach((candidate, index) => {
      const fullName = `${candidate.Vorname} ${candidate.Nachname}`.toLowerCase();
      if (candidateNames.has(fullName)) {
        duplicateCandidateErrors.push({
          sheet: 'Listenvorlage',
          row: index + 2,
          field: 'Vorname/Nachname',
          message: `Doppelter Kandidat: ${candidate.Vorname} ${candidate.Nachname} wurde bereits in Zeile ${candidateNames.get(fullName)} verwendet`,
          code: 'DUPLICATE_CANDIDATE',
        });
      } else {
        candidateNames.set(fullName, index + 2);
      }
    });

    if (duplicateCandidateErrors.length > 0) {
      return {
        success: false,
        errors: duplicateCandidateErrors,
      };
    }
  }

  // Step 5: Calculate statistics
  const candidateCount = validationResult.data.candidates.length;
  const seats = validationResult.data.info.Plätze;
  const isReferendum = candidateCount === 0;

  return {
    success: true,
    data: validationResult.data,
    stats: {
      electionName: validationResult.data.info['Wahl Kennung'],
      electionInfo: validationResult.data.info.Info,
      totalCandidates: candidateCount,
      seats,
      maxCumulative: validationResult.data.info['max. Kum.'],
      candidateList: isReferendum
        ? 'Urabstimmung (Ja/Nein)'
        : validationResult.data.candidates
            .map((c) => `${c.Nr}. ${c.Vorname} ${c.Nachname}`)
            .join(', '),
      faculties: validationResult.data.info['Fakultät(en)'] || 'Alle',
      programs: validationResult.data.info['Studiengänge (Komma-getrennt)'] || 'Alle',
      eligibility: validationResult.data.info['Berechtigt (leer = alle)'] || 'Alle',
      type: isReferendum ? 'Urabstimmung' : 'Personenwahl',
    },
  };
};
