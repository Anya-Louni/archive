/**
 * Utility functions for consistent error handling across the app
 */

/**
 * Formats error message for user display
 * @param {Error|Object} error - Error object or Supabase error
 * @returns {string} User-friendly error message
 */
export function formatError(error) {
  if (!error) return 'An unknown error occurred'
  if (typeof error === 'string') return error
  
  // Supabase error
  if (error.message) {
    // Hide technical details from users
    if (error.message.includes('row-level security')) {
      return 'You do not have permission to perform this action.'
    }
    if (error.message.includes('duplicate')) {
      return 'This item already exists. Please try a different name.'
    }
    if (error.message.includes('violates check constraint')) {
      return 'Invalid input. Please check your submission.'
    }
    return error.message
  }
  
  return 'An unexpected error occurred'
}

/**
 * Logs error to console with context
 * @param {string} context - Where the error occurred
 * @param {Error} error - Error object
 */
export function logError(context, error) {
  console.error(`[${context}]`, error)
}

/**
 * Safe wrapper for Supabase queries with error handling
 * @param {Promise} promise - Supabase query promise
 * @param {string} context - Context for logging
 * @returns {Promise<{data: any, error: Error|null}>}
 */
export async function tryCatch(promise, context = 'Query') {
  try {
    const result = await promise
    if (result.error) {
      logError(context, result.error)
      return { data: null, error: result.error }
    }
    return { data: result.data, error: null }
  } catch (e) {
    logError(context, e)
    return { data: null, error: e }
  }
}
