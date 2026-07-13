export function toLoomEmbedUrl(loomUrl: string): string {
  const withoutQuery = loomUrl.split('?')[0];
  return withoutQuery.replace('/share/', '/embed/');
}
