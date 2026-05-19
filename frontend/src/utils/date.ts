export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB');
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB');
}
