/**
 * Lädt Organisations- und Dokumentstruktur-Konfiguration.
 *
 * Profil-Auswahl über Env-Variable CONFIG_PROFILE (Standard: "hka"):
 *   CONFIG_PROFILE=myorg  → lädt config/organisation.myorg.json
 *                           (Dokumentstruktur bleibt immer document-structure.default.json,
 *                            kann durch document-structure.myorg.json überschrieben werden)
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, '../../config');

const profile = process.env.CONFIG_PROFILE || 'hka';

let _org     = null;
let _docs    = null;
let _presets = null;

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

/**
 * Lädt die Organisationskonfiguration (Branding, Farben, Layout-Parameter).
 * Ergebnis wird gecacht.
 */
export const loadOrganisation = async () => {
  if (_org) return _org;
  const profilePath  = path.join(CONFIG_DIR, `organisation.${profile}.json`);
  const fallbackPath = path.join(CONFIG_DIR, 'organisation.hka.json');
  try {
    _org = await readJson(profilePath);
    logger.debug(`Organisation-Config geladen: ${profilePath}`);
  } catch {
    logger.warn(`organisation.${profile}.json nicht gefunden — verwende HKA-Standard`);
    _org = await readJson(fallbackPath);
  }
  return _org;
};

/**
 * Lädt die Dokumentstruktur-Konfiguration (Blätter, Spalten, Meta-Zeilen).
 * Profil-spezifische Datei überschreibt den Default.
 * Ergebnis wird gecacht.
 */
export const loadDocumentStructure = async () => {
  if (_docs) return _docs;
  const profilePath  = path.join(CONFIG_DIR, `document-structure.${profile}.json`);
  const defaultPath  = path.join(CONFIG_DIR, 'document-structure.default.json');
  try {
    _docs = await readJson(profilePath);
    logger.debug(`Dokumentstruktur-Config geladen: ${profilePath}`);
  } catch {
    _docs = await readJson(defaultPath);
    logger.debug('Dokumentstruktur-Config: default');
  }
  return _docs;
};

/**
 * Lädt die internen Wahlvorlagen (Presets) aus der Profil-Config.
 * Fallback: election-presets.hka.json.
 * Ergebnis wird gecacht.
 *
 * @returns {Promise<Record<string, object>>} Preset-Objekt (key → Preset)
 */
export const loadInternalPresets = async () => {
  if (_presets) return _presets;
  const profilePath  = path.join(CONFIG_DIR, `election-presets.${profile}.json`);
  const fallbackPath = path.join(CONFIG_DIR, 'election-presets.hka.json');
  try {
    _presets = await readJson(profilePath);
    logger.debug(`Presets-Config geladen: ${profilePath}`);
  } catch {
    if (profile !== 'hka') {
      logger.warn(`election-presets.${profile}.json nicht gefunden — verwende HKA-Standard`);
    }
    _presets = await readJson(fallbackPath);
  }
  return _presets;
};

/**
 * Gibt die Header-Namen eines Blatts als Array zurück.
 * @param {object} sheetDef - Sheet-Definition aus document-structure.json
 */
export const headerNames = (sheetDef) => sheetDef.columns.map((c) => c.name);

/**
 * Gibt den Spaltennamen für ein DB-Feld zurück.
 * @param {object} sheetDef - Sheet-Definition
 * @param {string} field    - DB-Feldname (z.B. "seats_to_fill")
 */
export const colName = (sheetDef, field) =>
  sheetDef.columns.find((c) => c.field === field)?.name;

/**
 * Liest einen Wert aus einer dataRow anhand des DB-Feldnamens.
 * @param {object} sheetDef - Sheet-Definition
 * @param {object} row      - Datenzeile (key = Spaltenname)
 * @param {string} field    - DB-Feldname
 */
export const rowValue = (sheetDef, row, field) => {
  const name = colName(sheetDef, field);
  return name ? row[name] : undefined;
};
