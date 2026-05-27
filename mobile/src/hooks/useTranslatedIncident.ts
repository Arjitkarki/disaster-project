import { useEffect, useState } from 'react';
import { Incident } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { translateToNepali } from '../utils/translate';

export function useTranslatedIncident(incident: Incident) {
  const { lang } = useLanguage();
  const [title, setTitle] = useState(incident.title_ne || incident.title);
  const [description, setDescription] = useState(incident.description);

  useEffect(() => {
    if (lang !== 'ne') {
      setTitle(incident.title);
      setDescription(incident.description);
      return;
    }

    // Use Bipad's own Nepali title if available, otherwise translate
    if (incident.title_ne) {
      setTitle(incident.title_ne);
    } else {
      translateToNepali(incident.title).then(setTitle);
    }

    translateToNepali(incident.description).then(setDescription);
  }, [lang, incident.id, incident.title, incident.title_ne, incident.description]);

  return { title, description };
}
