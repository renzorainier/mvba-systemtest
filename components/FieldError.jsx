'use client';

// Small inline error shown directly below a form field.
// Renders nothing when there is no message, so it can be dropped under any input
// without shifting the input itself (keeps multi-column grids aligned).
export function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

// Returns the border/focus classes for an input based on whether it has an error.
// Pass the base classes you want and it appends the error-aware border styling.
export function fieldBorder(hasError) {
  return hasError
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500';
}

export default FieldError;
