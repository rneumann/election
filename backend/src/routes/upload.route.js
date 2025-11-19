import multer from 'multer';
import { logger } from '../conf/logger/logger.js';
import { importVoterData } from '../database/voter-importer.js';
import fs from 'fs';
/**
 * Multer storage configuration for file uploads.
 * Files are stored in the local "uploads" directory.
 * The filename is prefixed with a timestamp to ensure uniqueness.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

/**
 * File filter for validating accepted MIME types.
 * Only CSV and Excel files are allowed.
 *
 * @param req - The Express request object
 * @param file - File metadata provided by multer
 * @param cb - Callback to accept or reject the file
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
 */
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
 * @param {Function} next - The Express next middleware function
 * @returns {Promise<Response>} JSON response indicating success or failure
 */
export const importWahlerRoute = async (req, res, next) => {
  logger.debug('Voter import route accessed');

  // Validate HTTP method
  if (req.method !== 'POST') {
    logger.warn(`Invalid HTTP method used: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Process file upload
  upload.single('file')(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({ message: err.message });
    }

    // Validate file presence
    if (!req.file) {
      logger.warn('No file uploaded');
      return res.status(400).json({ message: 'file is required' });
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;

    try {
      logger.debug(`Datei gespeichert unter: ${filePath}`);
      await importVoterData(filePath, fileMimeType);

      fs.unlink(filePath, (err) => {
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

      fs.unlink(filePath, (err) => {
        if (err) logger.error('Fehler beim Löschen der Datei nach Importfehler:', err);
      });

      return res.status(500).json({ message: `Import fehlgeschlagen: ${importError.message}` });
    }
  });
};
