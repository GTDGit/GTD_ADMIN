/**
 * Returns Tailwind CSS class string for a given status string.
 * Case-insensitive. Unknown statuses fall back to gray.
 */
export function getStatusStyle(status: string): string {
  const map: Record<string, string> = {
    // Active / Connected / Success
    active:     'bg-emerald-50 text-emerald-700',
    success:    'bg-emerald-50 text-emerald-700',
    connected:  'bg-emerald-50 text-emerald-700',
    paid:       'bg-emerald-50 text-emerald-700',
    // Failed / Inactive
    inactive:   'bg-red-50 text-red-700',
    failed:     'bg-red-50 text-red-700',
    // Pending
    pending:    'bg-amber-50 text-amber-700',
    // Processing
    processing: 'bg-blue-50 text-blue-700',
    // Expired / Cancelled / Disabled
    expired:    'bg-gray-100 text-gray-600',
    cancelled:  'bg-gray-100 text-gray-600',
    disabled:   'bg-gray-100 text-gray-600',
    // Refunded
    refunded:   'bg-purple-50 text-purple-700',
  };
  return map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}
