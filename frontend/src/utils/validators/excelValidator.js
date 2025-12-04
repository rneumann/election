import {
  electionConfigSchema,
  ELECTION_TYPE_MAPPING,
  COUNTING_METHOD_MAPPING,
} from '../../schemas/election.schema.js';
import { parseElectionExcel } from '../parsers/excelParser.js';
import { logger } from '../../conf/logger/logger.js';
import { MAX_FILE_SIZE } from './constants.js';
import { EXPECTED_SHEET_NAMES } from '../../schemas/election.schema.js';

/**
 * Validiert die Excel-Datei mit der Wahlkonfiguration.
 * Kombiniert Parsing und Zod-Schema-Validierung.
 */
export const validateElectionExcel = async (file) => {
  const fileExtension = file.name.split('.').pop();
  logger.info(
    `Starting Excel validation for file type: .${fileExtension}, size: ${(file.size / 1024).toFixed(2)}KB`,
  );

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      errors: [
        {
          sheet: null,
          row: null,
          field: null,
          message: `Datei zu groß. Maximal erlaubt: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB.`,
          code: 'FILE_TOO_LARGE',
        },
      ],
    };
  }

  const parseResult = await parseElectionExcel(file, EXPECTED_SHEET_NAMES);

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

  const preparedElections = {
    Kennung: infoData['Kennung'] || infoData['Wahl Kennung'] || infoData['Wahlbezeichnung'] || '',
    Info: infoData.Info || '',
    Listen: infoData.Listen ? String(infoData.Listen) : '0',
    Plätze: infoData.Plätze,
    'Stimmen pro Zettel': infoData['Stimmen pro Zettel'] || infoData['Stimmen'],
    'max. Kum.': infoData['max. Kum.'] || infoData['Kumulieren'] || 0,
    Wahltyp: infoData['Wahltyp'],
    Zählverfahren: infoData['Zählverfahren'],
    Startzeitpunkt:
      infoData['Startzeitpunkt'] ||
      infoData['Wahlzeitraum von'] ||
      infoData['Start'] ||
      new Date().toISOString(),
    Endzeitpunkt:
      infoData['Endzeitpunkt'] || infoData['bis'] || infoData['Ende'] || new Date().toISOString(),
  };

  const preparedData = {
    elections: [preparedElections],
    candidates: data.candidates || [],
  };

  const validationResult = electionConfigSchema.safeParse(preparedData);

  if (!validationResult.success) {
    const errors = [];
    const zodErrors = validationResult.error?.errors || [];

    zodErrors.forEach((error) => {
      const path = error.path;
      let sheet = null;
      let row = null;
      let field = null;

      if (path[0] === 'elections') {
        sheet = 'Wahlen';
        field = path[2] || null;
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

  const validElections = validationResult.data.elections;
  const candidateCount = validationResult.data.candidates.length;

  const formatDateForUI = (dateVal) => {
    if (!dateVal) return '';
    try {
      return new Date(dateVal).toLocaleDateString('de-DE');
    } catch (_err) {
      return String(dateVal);
    }
  };

  return {
    success: true,
    data: validationResult.data,
    stats: {
      electionName:
        validElections.length > 1
          ? `${validElections.length} Wahlen definiert`
          : validElections[0].Kennung,
      electionInfo: validElections.length > 1 ? 'Mehrere Wahlen' : validElections[0].Info,
      totalCandidates: candidateCount,
      seats: validElections.reduce((sum, e) => sum + (e.Plätze || 0), 0),
      type: [...new Set(validElections.map((e) => e.Wahltyp))].join(', '),
      startDate: formatDateForUI(validElections[0].Startzeitpunkt),
      endDate: formatDateForUI(validElections[0].Endzeitpunkt),
    },
  };
};
