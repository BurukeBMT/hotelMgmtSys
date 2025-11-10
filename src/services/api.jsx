/**
 * API Service Module
 *
 * Re-exports all named services from `firebaseService.js` and provides
 * a default export object for any legacy consumers that import the
 * default export from `src/services/api`.
 */

// Re-export all named exports from the Firebase service module
// Import the firebase service module first (ESLint import/first)
import * as firebaseService from './firebaseService';

// Re-export all named exports from the Firebase service module
export * from './firebaseService';

// Also provide a default export object (non-anonymous) to satisfy
// import/no-anonymous-default-export ESLint rule and keep backward
// compatibility for modules doing `import api from './services/api'`.
export default firebaseService;
