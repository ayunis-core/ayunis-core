// Placeholder pane: Outlook opens it from every add-in button until the real
// pane replaces it (AYC-1591). Keep the file name, the manifest points here.
const TEXT = {
  de: {
    title: 'Ayunis für Outlook',
    badge: 'Demnächst verfügbar',
    body: 'Bald können Sie Ayunis hier direkt in Outlook nutzen.',
  },
  en: {
    title: 'Ayunis for Outlook',
    badge: 'Coming soon',
    body: "Soon you'll be able to use Ayunis right here in Outlook.",
  },
};

function render(language) {
  const locale = (language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll('[data-text]')) {
    element.textContent = TEXT[locale][element.dataset.text];
  }
}

if (typeof Office === 'undefined') {
  render(navigator.language);
} else {
  Office.onReady(() => {
    render(Office.context?.displayLanguage || navigator.language);
  });
}
