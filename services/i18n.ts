import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  de: { translation: de },
  fr: { translation: fr },
  ja: { translation: ja },
  es: { translation: es },
};

const LANGUAGE_KEY = 'appLanguage';

// Inicialização síncrona básica
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt', // fallback inicial seguro
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Carregar idioma salvo ou do sistema de forma segura
const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    } else {
      try {
        // Tenta carregar o módulo nativo apenas aqui dentro
        const Localization = require('expo-localization');
        const deviceLocale = Localization.getLocales()[0]?.languageCode;
        const supported = ['en', 'pt', 'de', 'fr', 'ja', 'es'];
        if (supported.includes(deviceLocale)) {
          i18n.changeLanguage(deviceLocale);
        }
      } catch (e) {
        console.log('Módulo ExpoLocalization não disponível. Usando padrão (pt).');
      }
    }
  } catch (e) {
    console.log('Erro ao carregar idioma:', e);
  }
};

loadSavedLanguage();

export const changeLanguage = async (lang: string) => {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export default i18n;
