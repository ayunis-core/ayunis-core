export function saveBlobAs(data: Blob, fileName: string): void {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Some browsers resolve the object URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
