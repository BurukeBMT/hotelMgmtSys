/**
 * API Service Module
 *
 * This module now uses Firebase SDK for all data operations.
 * It exports all services from firebaseService.js for backward compatibility.
 */

// Re-export all services from Firebase service
export * from './firebaseService';

// Default export for backward compatibility (no longer needed with Firebase)
export default null;
