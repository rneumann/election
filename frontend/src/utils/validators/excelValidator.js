import {
  electionConfigSchema,
  ELECTION_TYPE_MAPPING,
  COUNTING_METHOD_MAPPING,
} from '../../schemas/election.schema.js';
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
      errors: parseResult.errors || [
        { message: 'Unbekannter Parsing-Fehler', code: 'PARSE_ERROR' },
      ],
    };
  }

  const { data } = parseResult;
  const infoData = data.info || {};

  // Step 2: Prepare data for validation
  const preparedInfo = {
    // Neue Excel: "Kennung", Alte Excel: "Wahl Kennung"
    Kennung: infoData['Kennung'] || infoData['Wahl Kennung'] || '',

    Info: infoData.Info || '',

    // Listen (String oder Zahl behandeln)
    Listen: infoData.Listen ? String(infoData.Listen) : '0',

    Plätze: infoData.Plätze,

    'Stimmen pro Zettel': infoData['Stimmen pro Zettel'],

    'max. Kum.': infoData['max. Kum.'],

    Wahltyp: infoData['Wahltyp'],

    Zählverfahren: infoData['Zählverfahren'],

    // Fallback auf "Heute", falls Datum fehlt (wird vom Schema validiert/gecoerced)
    Startzeitpunkt:
      infoData['Wahlzeitraum von'] || infoData['Startzeitpunkt'] || new Date().toISOString(),
    Endzeitpunkt: infoData['bis'] || infoData['Endzeitpunkt'] || new Date().toISOString(),
  };

  const preparedData = {
    info: preparedInfo,
    candidates: data.candidates || [],
  };

  // Step 3: Validate with Zod schema
  const validationResult = electionConfigSchema.safeParse(preparedData);

  if (!validationResult.success) {
    const errors = [];
    const zodErrors = validationResult.error?.errors || [];

    zodErrors.forEach((error) => {
      const path = error.path;
      let sheet = null;
      let row = null;
      let field = null;

      if (path[0] === 'info') {
        sheet = 'Wahlen';
        field = path[1] || null;
      } else if (path[0] === 'candidates') {
        sheet = 'Listenvorlage';
        if (path.length > 1 && typeof path[1] === 'number') {
          row = path[1] + 2;
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

  // Step 4: Cross-field validations (Duplicates)
  if (validationResult.data.candidates && validationResult.data.candidates.length > 0) {
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
  const validatedInfo = validationResult.data.info;
  const candidateCount = validationResult.data.candidates.length;

  const dbElectionType = ELECTION_TYPE_MAPPING[validatedInfo['Wahltyp']] || 'unknown';
  const dbCountingMethod = COUNTING_METHOD_MAPPING[validatedInfo['Zählverfahren']] || 'unknown';

  // HELPER: Datum für die UI in String umwandeln (behebt den React Fehler)
  const formatDateForUI = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      // Gibt z.B. "04.12.2025" zurück
      return d.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return String(dateVal);
    }
  };

  /*eslint-disable*/
  return {
    success: true,
    data: {
      ...validationResult.data,
      info: {
        ...validatedInfo,
        election_type_db: dbElectionType,
        counting_method_db: dbCountingMethod,
      },
    },
    stats: {
      electionName: validatedInfo['Kennung'],
      electionInfo: validatedInfo.Info,
      totalCandidates: candidateCount,
      seats: validatedInfo.Plätze,
      maxCumulative: validatedInfo['max. Kum.'],
      candidateList:
        candidateCount === 0
          ? 'Urabstimmung (Ja/Nein)'
          : validationResult.data.candidates
              .map((c) => `${c.Nr}. ${c.Vorname} ${c.Nachname}`)
              .join(', '),
      type: validatedInfo['Wahltyp'],
      countingMethod: validatedInfo['Zählverfahren'],

      // FIX: Hier rufen wir die Formatierungsfunktion auf -> liefert Strings
      startDate: formatDateForUI(validatedInfo['Startzeitpunkt']),
      endDate: formatDateForUI(validatedInfo['Endzeitpunkt']),
    },
  };
};
