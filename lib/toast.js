"use client";
import { toast as notification } from "sonner";

let currentErrornotificationId = null;

// This is useful for displaying critical errors that require user attention.

/** Show an error notification with infinite duration */


export function showError(message, options = {}) {
  if (currentErrornotificationId) {
    notification.dismiss(currentErrornotificationId);
    currentErrornotificationId = null;
  }
  currentErrornotificationId = notification.error(message, {
    duration: Infinity,
    ...options,
  });
}

/** Clear the current error notification if any */
export function clearError() {
  if (currentErrornotificationId) {
    notification.dismiss(currentErrornotificationId);
    currentErrornotificationId = null;
  }
}

/** Show a success notification */
export function showSuccess(message, options = {}) {
  clearError();
  notification.success(message, {
    duration: 4000,
    ...options,
  });
}
