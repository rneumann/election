/* eslint-disable security/detect-object-injection */
import { z } from 'zod';

/**
 * Mappings
 */
export const EXPECTED_SHEET_NAMES = {
  INFO: 'Wahlen',
  CANDIDATES: 'Listenvorlage',
};

export const ELECTION_TYPE_MAPPING = {
  Verhältniswahl: 'proportional_representation',
  Mehrheitswahl: 'majority_vote',
  Urabstimmung: 'referendum',
};

export const COUNTING_METHOD_MAPPING = {
  'Sainte-Laguë': 'sainte_lague',
  'Hare-Niemeyer': 'hare_niemeyer',
  'Einfache Mehrheit': 'highest_votes_simple',
  'Absolute Mehrheit': 'highest_votes_absolute',
  'Ja/Nein/Enthaltung': 'yes_no_referendum',
};

// --- Helper ---
const isValidElectionType = (val) => Object.keys(ELECTION_TYPE_MAPPING).includes(val);
const isValidCountingMethod = (val) => Object.keys(COUNTING_METHOD_MAPPING).includes(val);

/**
 * Schema für EINE Wahl (eine Zeile im Blatt "Wahlen")
 */
export const electionInfoSchema = z.object({
  // Das ist der Schlüssel! (Spalte A im Excel)
  Kennung: z.string().trim().min(1, 'Kennung fehlt').max(50),

  Info: z.string().trim().max(1000).optional().default(''),
  Listen: z.coerce.number().int().nonnegative().optional().default(0),
  Plätze: z.coerce.number().int().positive().max(100),
  'Stimmen pro Zettel': z.coerce.number().int().positive(),
  'max. Kum.': z.coerce.number().int().nonnegative().max(100).optional().default(0),

  Wahltyp: z
    .string()
    .trim()
    .refine(isValidElectionType, {
      message: `Ungültiger Wahltyp. Erlaubt: ${Object.keys(ELECTION_TYPE_MAPPING).join(', ')}`,
    }),

  Zählverfahren: z
    .string()
    .trim()
    .refine(isValidCountingMethod, {
      message: `Ungültiges Zählverfahren. Erlaubt: ${Object.keys(COUNTING_METHOD_MAPPING).join(', ')}`,
    }),
});

/**
 * Schema für EINEN Kandidaten (eine Zeile im Blatt "Listenvorlage")
 */
export const candidateSchema = z.object({
  'Wahl Kennung': z.string().trim().min(1, 'Wahl-Zuordnung fehlt (Spalte A)'),

  Nr: z.coerce.number().int().positive(),
  'Liste / Schlüsselwort': z.string().trim().max(150).optional().default(''),
  Vorname: z.string().trim().min(1).max(100),
  Nachname: z.string().trim().max(100).optional().default(''),
  'Mtr-Nr.': z.string().trim().optional().default(''),
  Fakultät: z.string().trim().max(10).optional().default(''),
  Studiengang: z.string().trim().max(100).optional().default(''),
  'Info (Urabstimmung)': z.string().trim().max(800).optional().default(''),
});

/**
 * Das Gesamtschema für die ganze Excel-Datei
 */
export const electionConfigSchema = z
  .object({
    elections: z.array(electionInfoSchema).min(1, 'Mindestens eine Wahl muss definiert sein'),

    candidates: z.array(candidateSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    const electionIds = new Set(data.elections.map((e) => e.Kennung));

    data.candidates.forEach((candidate, index) => {
      if (!electionIds.has(candidate['Wahl Kennung'])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Kandidat verweist auf unbekannte Wahl "${candidate['Wahl Kennung']}"`,
          path: ['candidates', index, 'Wahl Kennung'],
        });
      }
    });

    const numbersPerElection = {};

    data.candidates.forEach((candidate, index) => {
      const electionId = candidate['Wahl Kennung'];
      if (!numbersPerElection[electionId]) {
        numbersPerElection[electionId] = new Set();
      }

      if (numbersPerElection[electionId].has(candidate.Nr)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Doppelte Kandidaten-Nummer ${candidate.Nr} innerhalb der Wahl "${electionId}"`,
          path: ['candidates', index, 'Nr'],
        });
      } else {
        numbersPerElection[electionId].add(candidate.Nr);
      }
    });
  });
