import fs, { constants } from 'fs/promises';

/**
 * Reads a secret from a file at /run/secrets/${name}.
 * If the file does not exist, it falls back to the environment variable
 * with the same name. If this variable is also not set, it returns the
 * optional fallback value. If no fallback is provided, it throws an
 * error.
 *
 * @param {string} name Name of the secret to read.
 * @returns {Promise<string>} The secret value.
 * @throws {Error} If the secret is not found and no fallback is provided.
 */
export const readSecret = async (name) => {
  const path = `/run/secrets/${name}`;
  try {
    // Prüft, ob Datei existiert
    await fs.access(path, constants.F_OK);
    const data = await fs.readFile(path, 'utf8');
    return data.trim();
  } catch {
    // eslint-disable-next-line
    const envValue = process.env[name];
    if (envValue) {
      return envValue;
    }
    throw new Error(`Secret for ${name} not found`);
  }
};
