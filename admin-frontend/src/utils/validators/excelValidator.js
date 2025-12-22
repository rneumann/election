import { electionConfigSchema } from '../../schemas/election.schema.js';
import { parseElectionExcel } from '../parsers/excelParser.js';
import { logger } from '../../conf/logger/logger.js';
import { EXPECTED_SHEET_NAMES } from '../../schemas/election.schema.js';
import { MAX_FILE_SIZE } from './constants.js';

/**
 * Validates the Excel file containing the election configuration.
 * Combines parsing and Zod schema validation.
 *
 * @param {File} file - The uploaded file object.
 * @returns {Promise<Object>} Returns an object containing success status, validation errors, or validated data with stats.
 */
export const validateElectionExcel = async (file) => {
  const fileExtension = file.name.split('.').pop();
  logger.info(
    `Starting Excel validation for file type: .${fileExtension}, size: ${(file.size / 1024).toFixed(2)}KB`,
  );

  // Check if file exceeds the maximum allowed size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      errors: [
        {
          sheet: null,
          row: null,
          field: null,
          message: `File too large. Maximum allowed: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB.`,
          code: 'FILE_TOO_LARGE',
        },
      ],
    };
  }

  // Parse the Excel file content
  const parseResult = await parseElectionExcel(file, EXPECTED_SHEET_NAMES);

  if (!parseResult.success) {
    logger.error('Parse failed:', parseResult);
    const errors = parseResult.errors || [
      {
        sheet: null,
        row: null,
        field: null,
        message: 'Unknown parsing error',
        code: 'PARSE_ERROR',
      },
    ];
    return {
      success: false,
      errors,
    };
  }

  const { data } = parseResult;
  const electionsData = data.elections || [];

  logger.info(`Parsed ${electionsData.length} elections:`, electionsData);

  // Map the raw data from the "Info" sheet to the expected schema structure
  const preparedElections = electionsData.map((electionData) => ({
    Kennung:
      electionData['Kennung'] ||
      electionData['Wahl Kennung'] ||
      electionData['Wahlbezeichnung'] ||
      '',
    Info: electionData.Info || '',
    Listen: electionData.Listen ? String(electionData.Listen) : '0',
    Plätze: electionData.Plätze,
    'Stimmen pro Zettel': electionData['Stimmen pro Zettel'] || electionData['Stimmen'],
    'max. Kum.': electionData['max. Kum.'] || electionData['Kumulieren'] || 0,
    Wahltyp: electionData['Wahltyp'],
    Zählverfahren: electionData['Zählverfahren'],
    Startzeitpunkt:
      electionData['Startzeitpunkt'] ||
      electionData['Wahlzeitraum von'] ||
      electionData['Start'] ||
      new Date().toISOString(),
    Endzeitpunkt:
      electionData['Endzeitpunkt'] ||
      electionData['bis'] ||
      electionData['Ende'] ||
      new Date().toISOString(),
  }));

  // Prepare data for validation
  const preparedData = {
    elections: preparedElections,
    candidates: data.candidates || [],
  };

  // Run Zod validation
  const validationResult = electionConfigSchema.safeParse(preparedData);

  // Handle validation errors by mapping them to specific sheets and rows
  if (!validationResult.success) {
    logger.error('Zod validation failed:', validationResult.error);
    const errors = [];
    const zodErrors = validationResult.error?.issues || []; // FIXED: issues not errors!

    logger.info(`zodErrors.length = ${zodErrors.length}`);
    logger.info('zodErrors array:', zodErrors);

    zodErrors.forEach((error, index) => {
      logger.info(`Processing error ${index}:`, error);
      const path = error.path;
      let sheet = null;
      let row = null;
      let field = null;
      let message = error.message;

      // Generate better error messages based on Zod error codes
      if (error.code === 'too_big' && error.type === 'string') {
        message = `Text zu lang (max. ${error.maximum} Zeichen)`;
      } else if (error.code === 'invalid_type') {
        message = `Ungültiger Datentyp: Erwartet ${error.expected}, erhalten ${error.received}`;
      } else if (error.code === 'too_small') {
        message = `Wert zu klein (min. ${error.minimum})`;
      }

      // Map errors in 'elections' array to the 'Wahlen' sheet
      if (path[0] === 'elections') {
        sheet = 'Wahlen';
        field = path[2] || null;
      }
      // Map errors in 'candidates' array to the 'Listenvorlage' sheet
      else if (path[0] === 'candidates') {
        sheet = 'Listenvorlage';
        // Calculate the actual Excel row number (Index + Header offset)
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
        message,
        code: 'VALIDATION_ERROR',
      });

      logger.info(`Pushed error ${index}, errors.length now = ${errors.length}`);
    });

    logger.error('Mapped validation errors:', errors);

    return {
      success: false,
      errors,
    };
  }

  const validElections = validationResult.data.elections;
  const candidateCount = validationResult.data.candidates.length;

  // Helper to format dates for the UI summary
  const formatDateForUI = (dateVal) => {
    if (!dateVal) {
      return '';
    }
    try {
      return new Date(dateVal).toLocaleDateString('de-DE');
    } catch (_err) {
      return String(_err + dateVal);
    }
  };

  // Return success result with statistical summary
  return {
    success: true,
    data: validationResult.data,
    stats: {
      electionName:
        validElections.length > 1
          ? `${validElections.length} elections defined`
          : validElections[0].Kennung,
      electionInfo: validElections.length > 1 ? 'Multiple elections' : validElections[0].Info,
      totalCandidates: candidateCount,
      seats: validElections.reduce((sum, e) => sum + (e.Plätze || 0), 0),
      type: [...new Set(validElections.map((e) => e.Wahltyp))].join(', '),
      startDate: formatDateForUI(validElections[0].Startzeitpunkt),
      endDate: formatDateForUI(validElections[0].Endzeitpunkt),
    },
  };
};
