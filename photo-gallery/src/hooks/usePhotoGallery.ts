import { useState, useEffect } from 'react'; // React hooks: local state and lifecycle effects
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; // Capacitor Camera APIs for taking photos
import type { Photo } from '@capacitor/camera'; // Type for a captured Photo
import { Filesystem, Directory } from '@capacitor/filesystem'; // Filesystem APIs to read/write stored files
import { Preferences } from '@capacitor/preferences'; // Key/value storage for persisting the photo list
import { isPlatform } from '@ionic/react'; // Platform detection (web vs hybrid mobile)
import { Capacitor } from '@capacitor/core'; // Core Capacitor utilities (e.g., file path conversion)

// Custom hook to manage the photo gallery
export function usePhotoGallery() {
    const [photos, setPhotos] = useState<UserPhoto[]>([]);

    const PHOTO_STORAGE = 'photos';
    // Load saved photos from Preferences when the hook is first used 
    useEffect(() => {
        const loadSaved = async () => {
            const { value: photoList } = await Preferences.get({ key: PHOTO_STORAGE });
            const photosInPreferences = (photoList ? JSON.parse(photoList) : []) as UserPhoto[];

            // If running on the web...
            if (!isPlatform('hybrid')) {
                for (const photo of photosInPreferences) {
                    const readFile = await Filesystem.readFile({
                        path: photo.filepath,
                        directory: Directory.Data,
                    });
                    photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
                }
            }
            setPhotos(photosInPreferences);
        };
        loadSaved();
    }, []);
    // Add a new photo to the gallery
    const addNewToGallery = async () => {
        // Take a photo
        const capturedPhoto = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100,
        });

        const fileName = Date.now() + '.jpeg';
        // Save the picture and add it to photo collection
        const savedImageFile = await savePicture(capturedPhoto, fileName);

        const newPhotos = [savedImageFile, ...photos];
        setPhotos(newPhotos);

        Preferences.set({ key: PHOTO_STORAGE, value: JSON.stringify(newPhotos) });
    };
    // Save picture to file on device
    const savePicture = async (photo: Photo, fileName: string): Promise<UserPhoto> => {
        let base64Data: string | Blob;
        // "hybrid" will detect mobile - iOS or Android
        if (isPlatform('hybrid')) {
            const readFile = await Filesystem.readFile({
                path: photo.path!,
            });
            base64Data = readFile.data;
        } else {
            // Fetch the photo, read as a blob, then convert to base64 format
            const response = await fetch(photo.webPath!);
            const blob = await response.blob();
            base64Data = (await convertBlobToBase64(blob)) as string;
        }
        // Write the file to the data directory
        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Data,
        });

        if (isPlatform('hybrid')) {
            // Display the new image by rewriting the 'file://' path to HTTP
            return {
                filepath: savedFile.uri,
                webviewPath: Capacitor.convertFileSrc(savedFile.uri),
            };
        } else {
            // Use webPath to display the new image instead of base64 since it's
            // already loaded into memory
            return {
                filepath: fileName,
                webviewPath: photo.webPath,
            };
        }
    };
    // Convert a blob to base64 format and return as a promise
    const convertBlobToBase64 = (blob: Blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.readAsDataURL(blob);
        });
    };
    // Return the photo gallery object
    return {
        addNewToGallery,
        photos,
    };
}
// Photo interface to store filepath and webviewPath
export interface UserPhoto {
    filepath: string;
    webviewPath?: string;
}