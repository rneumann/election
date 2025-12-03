import fs from 'fs';
import multer from 'multer';
import { logger } from '../conf/logger/logger.js';
import { importVoterData } from '../service/voter-importer.service.js';
import { importElectionData } from '../service/election-importer.service.js';
import { importCandidateData } from '../service/candidate-importer.js';

/**
 * Multer storage configuration for file uploads.
 * Files are stored in the local "uploads" directory.
 * The filename is prefixed with a timestamp to ensure uniqueness.
 *
 * @returns {multer.StorageEngine} Configured multer storage engine
 */
const storage = multer.diskStorage({
  /**
   * Specifies the destination directory for uploaded files.
   * @param {Object} req - Express request object
   * @param {Object} file - Uploaded file metadata
   * @param {Function} cb - Callback for multer
   */
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },

  /**
   * Determines the filename for the stored file.
   * @param {Object} req - Express request object
   * @param {Object} file - Uploaded file metadata
   * @param {Function} cb - Callback for multer
   */
  filename: (req, file, cb) => {
    const uniqueName = file.originalname;
    cb(null, uniqueName);
  },
});

/**
 * File filter for validating accepted MIME types.
 * Only CSV and Excel files are allowed.
 *
 * @param {Object} req - The Express request object
 * @param {Object} file - File metadata provided by multer
 * @param {Function} cb - Callback to accept or reject the file
 * @returns {void}
 */
const fileFilter = (req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowed.includes(file.mimetype)) {
    logger.warn(`Invalid file type attempted: ${file.mimetype}`);
    return cb(new Error('Only CSV or Excel files are allowed!'), false);
  }

  cb(null, true);
};

/**
 * Multer instance used for handling file uploads.
 * Limits file size to 5 MB and applies custom file filtering.
 *
 * @returns {multer.Multer} Configured multer instance
 */
const mB = 5;
const kB = 1024;

const upload = multer({
  storage,
  limits: { fileSize: mB * kB * kB },
  fileFilter,
});

/**
 * Route handler for importing voter data.
 * This route expects a POST request with multipart/form-data containing a file with the key "file".
 *
 * Behavior:
 * - Rejects invalid HTTP methods.
 * - Validates the file type and size.
 * - Stores the file on disk.
 * - Responds with metadata of the uploaded file.
 *
 * @async
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @returns {Promise<Object>} JSON response indicating success or failure
 */
export const importWahlerRoute = async (req, res) => {
  logger.debug('Voter import route accessed');

  if (req.method !== 'POST') {
    logger.warn(`Invalid HTTP method used: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  upload.single('file')(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      logger.warn('No file uploaded');
      return res.status(400).json({ message: 'file is required' });
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;

    try {
      logger.debug(`Datei gespeichert unter: ${filePath}`);
      await importVoterData(filePath, fileMimeType);

      fs.promises.unlink(filePath, (err) => {
        if (err) {
          logger.error('Fehler beim Löschen der Datei nach erfolgreichem Import:', err);
        } else {
          logger.debug(`Hochgeladene Datei erfolgreich gelöscht: ${filePath}`);
        }
      });

      return res.status(200).json({
        message: 'Wählerdaten erfolgreich hochgeladen und in die Datenbank importiert.',
      });
    } catch (importError) {
      logger.error('Importfehler. Datei wird gelöscht.', importError);

      fs.promises.unlink(filePath, (err) => {
        if (err) {
          logger.error('Fehler beim Löschen der Datei nach Importfehler:', err);
        }
      });

      return res.status(500).json({ message: `Import fehlgeschlagen: ${importError.message}` });
    }
  });
};

/**
 * Express route handler for importing election definitions from an uploaded file.
 *
 * This route expects a POST request with multipart/form-data containing a file with the key "file".
 * It uses Multer to handle file uploads and calls `importElectionData` to parse and insert
 * the election data into the database.
 *
 * @async
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<import('express').Response>} JSON response with success or error message
 */
export const importElectionRoute = async (req, res) => {
  logger.debug('Election import route accessed');

  if (req.method !== 'POST') {
    logger.warn(`Invalid HTTP method used: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  upload.single('file')(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      logger.warn('No file uploaded');
      return res.status(400).json({ message: 'file is required' });
    }

    const filePath = req.file.path;

    try {
      logger.debug(`Wahldefinitionsdatei gespeichert unter: ${filePath}`);

      await importElectionData(filePath);

      fs.promises.unlink(filePath, (err) => {
        if (err) {
          logger.error('Fehler beim Löschen der Datei nach Import:', err);
        }
      });

      return res.status(200).json({
        message: 'Wahldefinitionen erfolgreich importiert.',
      });
    } catch (importError) {
      logger.error('Importfehler bei Wahldefinitionen. Datei wird gelöscht.', importError);

      fs.promises.unlink(filePath, (err) => {
        if (err) {
          logger.error('Fehler beim Löschen der Datei nach Fehler:', err);
        }
      });

      return res.status(500).json({ message: `Import fehlgeschlagen: ${importError.message}` });
    }
  });
};

/**
 * Import route handler for candidate data.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<import('express').Response>} JSON response with success or error message
 */
export const importCandidateRoute = async (req, res) => {
  logger.debug('Candidate import route accessed');

  if (req.method !== 'POST') {
    logger.warn(`Invalid HTTP method used: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  upload.single('file')(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      logger.warn('No file uploaded');
      return res.status(400).json({ message: 'file is required' });
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;
    try {
      logger.debug(`Datei gespeichert unter: ${filePath}`);
      await importCandidateData(filePath, fileMimeType);
      fs.promises.unlink(filePath, (err) => {
        if (err) {
          logger.error('Fehler beim Löschen der Datei nach erfolgreichem Import:', err);
        } else {
          logger.debug(`Hochgeladene Datei erfolgreich gelöscht: ${filePath}`);
        }
      });
      return res.status(200).json({
        message: 'Kandidaten erfolgreich hochgeladen und in die Datenbank importiert.',
      });
    } catch (importError) {
      logger.error('Importfehler. Datei wird gelöscht.', importError);
      fs.promises.unlink(filePath, (err) => {
        if (err) {
          logger.error('Fehler beim Löschen der Datei nach Importfehler:', err);
        }
      });
      return res.status(500).json({ message: `Import fehlgeschlagen: ${importError.message}` });
    }
  });
};
