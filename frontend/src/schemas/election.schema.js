import { z } from 'zod';

/**
 * Zod schema for validating election configuration from Excel files.
 * Maps to multiple database tables: elections, candidates, electioncandidates.
 *
 * Expected Excel structure:
 * - Sheet "Wahlen": Election metadata (horizontal table)
 * - Sheet "Listenvorlage": Candidate list with numbers
 */

/**
 * Schema for election metadata (Wahlen sheet).
 * Template structure: Horizontal table with columns
 */
export const electionInfoSchema = z.object({
  'Wahl Kennung': z
    .string()
    .trim()
    .min(1, 'Wahl Kennung darf nicht leer sein')
    .max(50, 'Wahl Kennung darf maximal 50 Zeichen lang sein'),
  Info: z
    .string()
    .trim()
    .max(1000, 'Info darf maximal 1000 Zeichen lang sein')
    .optional()
    .default(''),
  Listen: z.string().trim().optional().default(''),
  Plätze: z
    .number()
    .int('Plätze muss eine ganze Zahl sein')
    .positive('Plätze muss größer als 0 sein')
    .max(100, 'Plätze darf maximal 100 sein'),
  'max. Kum.': z
    .number()
    .int('max. Kum. muss eine ganze Zahl sein')
    .nonnegative('max. Kum. muss 0 oder größer sein')
    .max(100, 'max. Kum. darf maximal 100 sein')
    .optional()
    .default(0),
  'Berechtigt (leer = alle)': z
    .string()
    .trim()
    .max(500, 'Berechtigt darf maximal 500 Zeichen lang sein')
    .optional()
    .default(''),
  'Fakultät(en)': z
    .string()
    .trim()
    .max(200, 'Fakultät(en) darf maximal 200 Zeichen lang sein')
    .optional()
    .default(''),
  'Studiengänge (Komma-getrennt)': z
    .string()
    .trim()
    .max(500, 'Studiengänge darf maximal 500 Zeichen lang sein')
    .optional()
    .default(''),
});

/**
 * Schema for a single candidate (Listenvorlage sheet).
 */
export const candidateSchema = z.object({
  Nr: z.number().int('Nr muss eine ganze Zahl sein').positive('Nr muss größer als 0 sein'),
  'Liste / Schlüsselwort': z
    .string()
    .trim()
    .max(100, 'Liste / Schlüsselwort darf maximal 100 Zeichen lang sein')
    .optional()
    .default(''),
  Vorname: z
    .string()
    .trim()
    .min(1, 'Vorname darf nicht leer sein')
    .max(100, 'Vorname darf maximal 100 Zeichen lang sein')
    .regex(
      /^[a-zA-ZäöüßÄÖÜ\s\-'.]+$/,
      'Vorname enthält ungültige Zeichen. Nur Buchstaben, Leerzeichen, Bindestriche, Punkte und Apostrophe sind erlaubt.',
    ),
  Nachname: z
    .string()
    .trim()
    .min(1, 'Nachname darf nicht leer sein')
    .max(100, 'Nachname darf maximal 100 Zeichen lang sein')
    .regex(
      /^[a-zA-ZäöüßÄÖÜ\s\-'.]+$/,
      'Nachname enthält ungültige Zeichen. Nur Buchstaben, Leerzeichen, Bindestriche, Punkte und Apostrophe sind erlaubt.',
    ),
  'Mtr-Nr.': z
    .string()
    .trim()
    .max(20, 'Matrikelnummer darf maximal 20 Zeichen lang sein')
    .regex(/^\d*$/, 'Matrikelnummer darf nur Ziffern enthalten')
    .optional()
    .default(''),
  Fakultät: z
    .string()
    .trim()
    .max(10, 'Fakultät darf maximal 10 Zeichen lang sein')
    .regex(/^[A-Z]{2,3}$|^$/, 'Fakultät muss aus 2-3 Großbuchstaben bestehen oder leer sein')
    .optional()
    .default(''),
  Studiengang: z
    .string()
    .trim()
    .max(100, 'Studiengang darf maximal 100 Zeichen lang sein')
    .optional()
    .default(''),
});

/**
 * Schema for candidate list validation.
 * For elections: Ensures at least one candidate and unique numbers.
 * For referendums (Urabstimmungen): Allows empty candidate list.
 */
export const candidateListSchema = z
  .array(candidateSchema)
  .refine(
    (candidates) => {
      // Skip validation if no candidates (referendum)
      if (candidates.length === 0) {
        return true;
      }
      const numbers = candidates.map((c) => c.Nr);
      return new Set(numbers).size === numbers.length;
    },
    {
      message: 'Nummern müssen eindeutig sein',
    },
  )
  .refine(
    (candidates) => {
      // Skip validation if no candidates (referendum)
      if (candidates.length === 0) {
        return true;
      }
      const numbers = candidates.map((c) => c.Nr).sort((a, b) => a - b);
      for (let i = 0; i < numbers.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        if (numbers[i] !== i + 1) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Nummern müssen lückenlos bei 1 beginnen (1, 2, 3, ...)',
    },
  );

/**
 * Complete election configuration schema.
 * Combines all sheets into a single validated object.
 */
export const electionConfigSchema = z.object({
  info: electionInfoSchema,
  candidates: candidateListSchema,
});

/**
 * Expected Excel sheet names.
 */
export const EXPECTED_SHEET_NAMES = {
  INFO: 'Wahlen',
  CANDIDATES: 'Listenvorlage',
};
