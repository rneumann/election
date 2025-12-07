import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { logger } from '../conf/logger/logger';
import { useAlert } from '../context/AlertContext';
import ResponsiveButton from './ResponsiveButton';

/**
 * Creates a promise that resolves with an image object once the image
 * at the given URL has finished loading, or rejects with an error if
 * the image fails to load.
 * @param {string} url - The URL of the image to load.
 * @returns {Promise<Image>} - A promise that resolves with the loaded image object.
 */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Takes an image URL and a pixel crop object and returns a promise
 * that resolves with the cropped image as a blob.
 * The pixel crop object should have the following properties:
 * - x: The x-coordinate of the top-left corner of the cropped region.
 * - y: The y-coordinate of the top-left corner of the cropped region.
 * - width: The width of the cropped region.
 * - height: The height of the cropped region.
 * @param {string} imageSrc - The URL of the image to crop.
 * @param {{x:number, y:number, width:number, height:number}} pixelCrop - The pixel crop object.
 * @returns {Promise<Blob>} - A promise that resolves with the cropped image as a blob.
 */
const getCroppedImage = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { width, height, x, y } = pixelCrop;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      'image/jpeg',
      0.95,
    );
  });
};

export const ImageUploadCandidate = ({ setUploadData }) => {
  const [image, setImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [isDragging, setIsDragging] = useState(false);

  const { showAlert } = useAlert();

  const handleSave = async () => {
    if (!croppedAreaPixels || !image || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const croppedBlob = await getCroppedImage(image, croppedAreaPixels);

      if (!croppedBlob) {
        showAlert('error', 'Fehler beim Generieren des Bildes.');
        setIsLoading(false);
        return;
      }
      const fileName = `${selectedFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
      const croppedFile = new File([croppedBlob], fileName, {
        type: 'image/jpeg',
      });

      const formData = new FormData();

      formData.append('picture', croppedFile);
      logger.debug('Zugeschnittenes Bild:', croppedFile);
      logger.debug('FormData:', formData);
      showAlert('success', 'Bild erfolgreich gespeichert und hochgeladen!');

      setUploadData(formData);
    } catch (error) {
      logger.error('Fehler beim Bild-Upload:', error);
      showAlert('error', `Upload fehlgeschlagen: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showAlert('error', 'Bitte laden Sie eine Bild-Datei hoch');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = null;
  };

  // --- Cropper Handler ---
  // Safe the cropped area
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
    logger.debug(croppedAreaPixels);
  }, []);

  // --- Actions ---
  const handleReset = () => {
    setImage(null);
    setSelectedFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  if (image) {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-800">Bild zuschneiden</h2>

        {/* CROPPING AREA */}
        <div className="relative w-full aspect-[3/4] max-w-sm mx-auto bg-gray-100 rounded-lg shadow-lg">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={true}
            style={{
              containerStyle: { borderRadius: '8px', height: '50%', width: '50%' },
              cropAreaStyle: { border: '2px dashed white', borderRadius: '4px' },
            }}
          />
        </div>

        {/* ZOOM SLIDER AND INFO */}
        <div className="max-w-sm mx-auto space-y-4">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 font-medium whitespace-nowrap">
              Zoom ({Math.round(zoom * 100)}%)
            </span>
            <div className="flex-1">
              <Slider min={1} max={3} step={0.1} value={zoom} onChange={setZoom} />
            </div>
          </div>

          <p className="text-sm text-gray-500 truncate text-center">
            Ausgewählte Datei: **{selectedFile.name}**
          </p>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-center space-x-4 pt-2">
          <ResponsiveButton onClick={handleReset} variant="secondary" className="flex items-center">
            Abbrechen / Neu wählen
          </ResponsiveButton>

          <ResponsiveButton onClick={handleSave} variant="primary" className="flex items-center">
            Bild speichern
          </ResponsiveButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Bild hochladen</h2>

      {/* UPLOAD AREA */}
      <div
        /* eslint-disable */
        className={`flex flex-col items-center justify-center p-12 text-center rounded-xl transition-all duration-300 ease-in-out border-2 cursor-pointer 
          ${
            isDragging
              ? 'border-brand-primary bg-brand-primary-light/20 border-solid shadow-lg'
              : 'border-gray-300 border-dashed hover:border-brand-primary/50'
          }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all duration-300 ${
            isDragging ? 'bg-brand-primary scale-110' : 'bg-gray-100 text-brand-primary'
          }`}
        >
          {/* Cloud Upload Icon */}
          <svg
            className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <p className="text-lg font-semibold text-gray-900 mb-1">
          {isDragging ? 'Datei jetzt loslassen' : 'Bild hierher ziehen'}
        </p>

        <p className="text-sm text-gray-500 mb-3">oder</p>

        {/* UPLOAD BUTTON */}
        <div className="px-4 py-2 bg-brand-primary text-white rounded-md font-medium text-sm shadow hover:bg-brand-primary/90 transition">
          Datei auswählen
        </div>

        <p className="text-xs text-gray-400 mt-3">PNG, JPG, max. 5MB. Empfohlenes Format: 3:4</p>
      </div>

      {/* HIDDEN INPUT */}
      <input
        id="fileInput"
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        onChange={onFileSelect}
      />
    </>
  );
};
