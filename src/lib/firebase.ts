import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);

// Initialize Firestore with long-polling and local persistent cache to prevent WebSocket/backend-unreachable failures
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export class FirestoreAppError extends Error {
  public code: string;
  public userMessage: string;
  public operationType: OperationType;
  public path: string | null;
  public originalError: unknown;

  constructor(originalError: unknown, operationType: OperationType, path: string | null) {
    const ERROR_MESSAGES: Record<string, string> = {
      'permission-denied': 'Access Denied: You do not have permission to view or modify this content.',
      'unauthenticated': 'Authentication Needed: Please sign in to perform this activity.',
      'unavailable': 'Network Unreachable: The database is currently offline or unreachable. Please check your internet connection.',
      'not-found': 'Document Not Found: The requested document could not be located.',
      'already-exists': 'Conflict: The document you are trying to create already exists.',
      'resource-exhausted': 'Rate Limit Exceeded: Too many requests. Please wait a moment and try again.',
      'deadline-exceeded': 'Timeout: The connection timed out. Please check your network and try again.',
      'cancelled': 'Cancelled: The operation was cancelled.',
      'invalid-argument': 'Invalid Details: The parameters for this operation were incorrect or malformed.',
      'failed-precondition': 'Precondition Failed: The operation was rejected because the system is not in a state required for its execution.',
      'aborted': 'Aborted: The transaction was aborted. Please retry the operation.',
      'out-of-range': 'Out of Range: The operation was attempted past the valid range.',
      'unimplemented': 'Not Supported: This feature is not implemented or supported yet.',
      'internal': 'Internal Error: An unexpected database internal error occurred.',
      'data-loss': 'Data Loss: Unrecoverable data corruption or loss was encountered.'
    };

    let code = 'unknown';
    let message = 'An unexpected database error occurred. Please try again.';

    if (originalError && typeof originalError === 'object') {
      const errObj = originalError as any;
      if ('code' in errObj && typeof errObj.code === 'string') {
        let rawCode = errObj.code;
        if (rawCode.startsWith('firestore/')) {
          rawCode = rawCode.replace('firestore/', '');
        }
        code = rawCode;
        message = ERROR_MESSAGES[code] || errObj.message || message;
      } else if ('message' in errObj && typeof errObj.message === 'string') {
        const rawMsg = errObj.message.toLowerCase();
        if (rawMsg.includes('offline') || rawMsg.includes('network') || rawMsg.includes('unreachable') || rawMsg.includes('failed to fetch')) {
          code = 'unavailable';
          message = ERROR_MESSAGES['unavailable'];
        } else if (rawMsg.includes('permission') || rawMsg.includes('denied') || rawMsg.includes('insufficient')) {
          code = 'permission-denied';
          message = ERROR_MESSAGES['permission-denied'];
        } else {
          message = errObj.message;
        }
      }
    } else if (originalError) {
      const rawMsg = String(originalError).toLowerCase();
      if (rawMsg.includes('offline') || rawMsg.includes('network') || rawMsg.includes('unreachable')) {
        code = 'unavailable';
        message = ERROR_MESSAGES['unavailable'];
      }
    }

    super(message);
    this.name = 'FirestoreAppError';
    this.code = code;
    this.userMessage = message;
    this.operationType = operationType;
    this.path = path;
    this.originalError = originalError;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const appError = new FirestoreAppError(error, operationType, path);

  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    code: appError.code,
    userMessage: appError.userMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error Detailed Log: ', JSON.stringify(errInfo));
  throw appError;
}

