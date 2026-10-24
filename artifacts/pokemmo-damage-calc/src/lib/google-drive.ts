import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

// Configure Google Auth Provider with Google Drive Scopes
const driveProvider = new GoogleAuthProvider();
driveProvider.addScope('https://www.googleapis.com/auth/drive.file');
driveProvider.addScope('https://www.googleapis.com/auth/drive');

// In-memory access token cache (CRITICAL: never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveTeamFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  description?: string;
}

/**
 * Initializes the auth state listener.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with Google using popup to obtain the OAuth access token.
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns currently cached in-memory access token.
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sign out from Google Auth and clear in-memory token.
 */
export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Lists all .poketeam.json or team backup files in Google Drive.
 */
export const listDriveTeamFiles = async (accessToken: string): Promise<DriveTeamFile[]> => {
  const query = encodeURIComponent("name contains '.poketeam.json' and trashed = false");
  const fields = encodeURIComponent('files(id, name, modifiedTime, size, description)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=30`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sesión de Google Drive expirada. Por favor vuelve a iniciar sesión.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al consultar Google Drive (${response.status})`);
  }

  const data = await response.json();
  return (data.files || []) as DriveTeamFile[];
};

/**
 * Downloads a team JSON file from Google Drive by fileId.
 */
export const downloadDriveTeamFile = async (accessToken: string, fileId: string): Promise<any> => {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sesión de Google Drive expirada.');
    }
    throw new Error(`Error al descargar archivo de Google Drive (${response.status})`);
  }

  const content = await response.text();
  return JSON.parse(content);
};

/**
 * Uploads a team JSON file directly to the user's Google Drive.
 */
export const saveTeamToDrive = async (
  accessToken: string,
  team: { id: string; name: string; [key: string]: any }
): Promise<{ id: string; name: string }> => {
  const safeName = team.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const fileName = `${safeName || 'equipo'}.poketeam.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Equipo PokéMMO: ${team.name} (Generaciones 1-5)`,
  };

  const fileContent = JSON.stringify(team, null, 2);
  const boundary = '-------PokeMMOTeamBuilderBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sesión de Google Drive expirada.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al subir a Google Drive (${response.status})`);
  }

  const createdFile = await response.json();
  return { id: createdFile.id, name: createdFile.name };
};

/**
 * Deletes a team file from Google Drive (Requires explicit confirmation before calling).
 */
export const deleteDriveTeamFile = async (accessToken: string, fileId: string): Promise<void> => {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204 && response.status !== 404) {
    throw new Error(`Error al eliminar archivo de Google Drive (${response.status})`);
  }
};
