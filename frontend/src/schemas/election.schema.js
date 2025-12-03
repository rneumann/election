import { z } from 'zod';

/**
 * Mappings für die Übersetzung von Excel (Deutsch) zu Datenbank (Englisch)
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

// --- Helper Funktionen für Refinements (verhindert "def.fn is not a function") ---

const isValidElectionType = (val) => {
  return Object.keys(ELECTION_TYPE_MAPPING).includes(val);
};

const isValidCountingMethod = (val) => {
  return Object.keys(COUNTING_METHOD_MAPPING).includes(val);
};

const areCandidateNumbersUnique = (candidates) => {
  if (!candidates || candidates.length === 0) return true;
  const numbers = candidates.map((c) => c.Nr);
  return new Set(numbers).size === numbers.length;
};

/**
 * Schema für Wahl-Metadaten (Blatt "Wahlen").
 */
export const electionInfoSchema = z.object({
  Kennung: z.string().trim().min(1, 'Kennung fehlt').max(50),

  Info: z.string().trim().max(1000).optional().default(''),

  Listen: z.coerce.number().int().nonnegative().optional().default(0),

  Plätze: z.coerce.number().int().positive().max(100),

  'Stimmen pro Zettel': z.coerce.number().int().positive(),

  'max. Kum.': z.coerce.number().int().nonnegative().max(100).optional().default(0),

  // Hier nutzen wir die benannten Funktionen:
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

  Startzeitpunkt: z.coerce.date().optional(),
  Endzeitpunkt: z.coerce.date().optional(),
});

/**
 * Schema für einen einzelnen Kandidaten (Blatt "Listenvorlage").
 * (Unverändert, sofern sich die Spalten in "Listenvorlage" nicht geändert haben)
 */
export const candidateSchema = z.object({
  Nr: z.coerce.number().int().positive(),
  'Liste / Schlüsselwort': z.string().trim().max(100).optional().default(''),
  Vorname: z.string().trim().min(1).max(100),
  Nachname: z.string().trim().min(1).max(100),
  'Mtr-Nr.': z.string().trim().optional().default(''), // Datentyp String lassen für führende Nullen etc.
  Fakultät: z.string().trim().max(10).optional().default(''),
  Studiengang: z.string().trim().max(100).optional().default(''),
});

// ... candidateListSchema bleibt gleich ...
export const candidateListSchema = z.array(candidateSchema).refine(areCandidateNumbersUnique, {
  message: 'Kandidaten-Nummern müssen eindeutig sein',
});

export const electionConfigSchema = z.object({
  info: electionInfoSchema,
  candidates: candidateListSchema,
});
