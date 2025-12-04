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
 * Combines parsing and Zod schema validation for MULTIPLE elections.
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

  const electionsRaw = data.elections || [];

  // Step 2: Prepare data for validation
  // Wir müssen jedes Wahl-Objekt im Array einzeln aufbereiten
  const preparedElections = electionsRaw.map((infoData) => ({
    Kennung: infoData['Kennung'] || infoData['Wahl Kennung'] || '',
    Info: infoData.Info || '',

    // Listen (String oder Zahl behandeln)
    Listen: infoData.Listen ? String(infoData.Listen) : '0',
    Plätze: infoData.Plätze,
    'Stimmen pro Zettel': infoData['Stimmen pro Zettel'],
    'max. Kum.': infoData['max. Kum.'],
    Wahltyp: infoData['Wahltyp'],
    Zählverfahren: infoData['Zählverfahren'],

    // Fallback auf "Heute", falls Datum fehlt
    Startzeitpunkt:
      infoData['Wahlzeitraum von'] || infoData['Startzeitpunkt'] || new Date().toISOString(),
    Endzeitpunkt: infoData['bis'] || infoData['Endzeitpunkt'] || new Date().toISOString(),
  }));

  const preparedData = {
    elections: preparedElections, // Jetzt ein Array!
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

      // Pfad-Analyse für korrekte Fehlermeldung
      if (path[0] === 'elections') {
        sheet = 'Wahlen';
        // path[1] ist der Index im Array. Im Excel beginnt Header bei Zeile 8 (als Beispiel).
        // Da wir den Header dynamisch suchen, ist die exakte Zeile schwer zu raten,
        // aber meistens: Header-Zeile + 1 + Index.
        // Wir nehmen hier Index + 1 für relative Angabe zur Liste.
        if (typeof path[1] === 'number') {
          row = `Liste ${path[1] + 1}`;
          field = path[2] || null;
        }
      } else if (path[0] === 'candidates') {
        sheet = 'Listenvorlage';
        if (path.length > 1 && typeof path[1] === 'number') {
          row = path[1] + 2; // +2 wegen Header
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

  // Step 4: Cross-field validations (Doppelte Kandidaten)
  // ... (Ihr bestehender Code hier war gut, ggf. anpassen auf neues Format) ...

  // Step 5: Calculate statistics
  const validElections = validationResult.data.elections;
  const candidateCount = validationResult.data.candidates.length;

  // Datum Helper
  const formatDateForUI = (dateVal) => {
    if (!dateVal) return '';
    try {
      return new Date(dateVal).toLocaleDateString('de-DE');
    } catch (e) {
      return String(dateVal);
    }
  };

  return {
    success: true,
    data: validationResult.data, // Enthält jetzt { elections: [...], candidates: [...] }
    stats: {
      // Wir zeigen Infos der ersten Wahl an oder eine Zusammenfassung
      electionName:
        validElections.length > 1
          ? `${validElections.length} Wahlen definiert`
          : validElections[0].Kennung,
      electionInfo: validElections.length > 1 ? 'Mehrere Wahlen' : validElections[0].Info,

      totalCandidates: candidateCount,
      seats: validElections.reduce((sum, e) => sum + (e.Plätze || 0), 0), // Summe aller Sitze

      // Liste aller Wahl-Typen
      type: [...new Set(validElections.map((e) => e.Wahltyp))].join(', '),

      startDate: formatDateForUI(validElections[0].Startzeitpunkt),
      endDate: formatDateForUI(validElections[0].Endzeitpunkt),
    },
  };
};
