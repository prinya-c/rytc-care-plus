import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { toWebp } from './imageCompress';

async function uploadCompressedImage(file: File, folderPath: string) {
  const { blob, extension } = await toWebp(file);
  const baseName = file.name.replace(/\.[^./]+$/, '') || 'photo';
  const path = `${folderPath}/${Date.now()}-${baseName}.${extension}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || file.type });
  return getDownloadURL(storageRef);
}

export async function uploadHomeVisitImage(file: File, studentId: string) {
  return uploadCompressedImage(file, `home-visits/${studentId}`);
}

export async function uploadHomeroomLogImage(file: File, classId: string) {
  return uploadCompressedImage(file, `homeroom-logs/${classId}`);
}

/** Deletes an uploaded image given its Storage download URL. Safe to call on an already-deleted file. */
export async function deleteImageByUrl(url: string) {
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // Already deleted, or the URL wasn't a Storage ref — nothing more we can do.
  }
}
