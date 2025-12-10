import { z } from 'zod';

/**
 * Zod schema for validating voter data from CSV files.
 * Maps to the voters table in the database.
 *
 * Expected CSV format:
 * RZ-Kennung,Fakultät,Vorname,Nachname,Matk.Nr,Studienganskürzel,Studiengang
 */

export const VOTER_CSV_MAPPING = {
  'RZ-Kennung': 'uid',
  Fakultät: 'faculty',
  Vorname: 'firstname',
  Nachname: 'lastname',
  'Matk.Nr': 'mtknr',
  Notizen: 'notes',
};

export const voterSchema = z.object({
  'RZ-Kennung': z
    .string()
    .trim()
    .min(1, 'RZ-Kennung darf nicht leer sein')
    .max(50, 'RZ-Kennung darf maximal 50 Zeichen lang sein')
    .regex(
      /^[a-z]{4}\d{4}$/,
      'RZ-Kennung muss dem Format abcd1234 entsprechen (4 Buchstaben + 4 Ziffern)',
    ),
  Fakultät: z
    .string()
    .trim()
    .min(1, 'Fakultät darf nicht leer sein')
    .max(10, 'Fakultät darf maximal 10 Zeichen lang sein')
    .regex(/^[A-Z]{2,3}$/, 'Fakultät muss aus 2-3 Großbuchstaben bestehen (z.B. AB, IW, MMT)'),
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
  'Matk.Nr': z
    .string()
    .trim()
    .max(20, 'Matrikelnummer darf maximal 20 Zeichen lang sein')
    .regex(/^\d*$/, 'Matrikelnummer darf nur Ziffern enthalten')
    .optional()
    .default(''),
});

/**
 * Schema for validating an array of voter records.
 */
export const voterListSchema = z
  .array(voterSchema)
  .min(1, 'Die CSV-Datei muss mindestens einen Wähler enthalten');

/**
 * Expected CSV headers in correct order.
 */
export const EXPECTED_CSV_HEADERS = ['RZ-Kennung', 'Fakultät', 'Vorname', 'Nachname', 'Matk.Nr'];

export const ballotCandidateInputSchema = z.object({
  listnum: z.number().int().min(1, 'The list number must be greater than 0'),
  votes: z.number().int().min(0, 'The number of votes must be greater than or equal to 0'),
});

export const ballotInputSchema = z
  .object({
    electionId: z.uuid({ message: 'The election ID must be a valid UUID' }),
    valid: z.boolean({ message: 'The valid field must be a boolean' }),
    voteDecision: z.array(ballotCandidateInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.valid === true && (!data.voteDecision || data.voteDecision.length === 0)) {
      ctx.addIssue({
        message: 'voteDecision is required when valid = true and must contain at least one entry',
        path: ['voteDecision'],
      });
    }
  });
