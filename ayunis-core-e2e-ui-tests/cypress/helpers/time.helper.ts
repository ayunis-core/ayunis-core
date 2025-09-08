export function getTimestring() {
	return new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0] ?? '';
}
