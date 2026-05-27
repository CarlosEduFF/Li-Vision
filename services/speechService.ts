/**
 * Serviço de Síntese de Voz (Text-to-Speech) para Li-Vision.
 *
 * Centraliza toda a lógica de fala dos gestos reconhecidos e das palavras
 * soletradas. Mantém preferências persistentes em AsyncStorage e usa
 * expo-speech (pt-BR) por baixo.
 *
 * Arquitetura:
 * - Singleton simples (export default `speechService`).
 * - Fila interna opcional para evitar sobreposição de falas curtas.
 * - Preferências persistentes carregadas sob demanda.
 * - Falha silenciosamente em plataformas sem suporte (ex.: web antigo).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";

// ──────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────
const STORAGE_KEY = "@livision/speech_prefs";
const DEFAULT_LANGUAGE = "pt-BR";
const DEFAULT_RATE = 1.0;
const DEFAULT_PITCH = 1.05;
const APP_LANGUAGE_KEY = "appLanguage";

export const SPEECH_LANGUAGES = [
  { appCode: "pt", speechCode: "pt-BR", label: "Português", testText: "Olá! Eu falo os gestos que você realizar." },
  { appCode: "en", speechCode: "en-US", label: "English", testText: "Hello! I speak the gestures you perform." },
  { appCode: "es", speechCode: "es-ES", label: "Español", testText: "Hola! Hablo los gestos que realizas." },
  { appCode: "fr", speechCode: "fr-FR", label: "Français", testText: "Bonjour! Je prononce les gestes que vous réalisez." },
  { appCode: "de", speechCode: "de-DE", label: "Deutsch", testText: "Hallo! Ich spreche die Gesten aus, die Sie ausführen." },
  { appCode: "ja", speechCode: "ja-JP", label: "日本語", testText: "こんにちは。実行したジェスチャを読み上げます。" },
] as const;

export type SpeechLanguageCode = (typeof SPEECH_LANGUAGES)[number]["speechCode"];

const APP_TO_SPEECH_LANGUAGE: Record<string, SpeechLanguageCode> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ja: "ja-JP",
};

export function getSpeechLanguageByAppLanguage(appLanguage?: string | null): SpeechLanguageCode {
  if (!appLanguage) return DEFAULT_LANGUAGE;
  const normalized = appLanguage.split("-")[0];
  return APP_TO_SPEECH_LANGUAGE[normalized] ?? DEFAULT_LANGUAGE;
}

export function getSpeechLanguageConfig(speechCode: string) {
  return SPEECH_LANGUAGES.find((lang) => lang.speechCode === speechCode) ?? SPEECH_LANGUAGES[0];
}

// Mapa de letras para fala "natural" em pt-BR.
// Em Libras alfabeto, letras vêm como "A", "B" etc.
// expo-speech por padrão soletra letras curtas, então forçamos a versão
// com contexto só quando útil (ex.: "a" vs "á"). Mantemos simples.
const LETTER_TTS_MAP: Record<string, string> = {
  // Caso precise ajustar pronúncia de alguma letra específica, edite aqui.
  // Ex.: "H": "agá", "Y": "ípsilon"
};

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────
export type SpeechPreferences = {
  /** Habilita TTS em geral. Se false, nada é falado. */
  enabled: boolean;
  /** Fala o nome de cada gesto individual assim que detectado. */
  speakGestures: boolean;
  /** Habilita a detecção de soletração (sequência de letras → palavra). */
  spellingEnabled: boolean;
  /** Idioma da voz. */
  language: string;
  /** Velocidade da fala (0.5–2.0 recomendado). */
  rate: number;
  /** Tom da voz. */
  pitch: number;
  /** Tempo (ms) de inatividade para considerar soletração finalizada. */
  spellingIdleMs: number;
  /** Tempo mínimo (ms) que a mesma letra deve permanecer estável para entrar no buffer. */
  letterStableMs: number;
  /** Confiança mínima (0–1) para aceitar um gesto de letra no buffer. */
  minConfidence: number;
};

export const DEFAULT_PREFERENCES: SpeechPreferences = {
  enabled: true,
  speakGestures: true,
  spellingEnabled: true,
  language: DEFAULT_LANGUAGE,
  rate: DEFAULT_RATE,
  pitch: DEFAULT_PITCH,
  spellingIdleMs: 2500,
  letterStableMs: 1200,
  minConfidence: 0.7,
};

type PrefListener = (prefs: SpeechPreferences) => void;

// ──────────────────────────────────────────────
// Classe principal
// ──────────────────────────────────────────────
class SpeechService {
  private prefs: SpeechPreferences = { ...DEFAULT_PREFERENCES };
  private prefsLoaded = false;
  private listeners: Set<PrefListener> = new Set();
  private speaking = false;
  private lastText: string | null = null;
  private lastTimestamp = 0;

  /** Carrega preferências persistidas. Chamar uma vez no boot da tela. */
  async init(): Promise<SpeechPreferences> {
    if (this.prefsLoaded) return this.prefs;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.prefs = { ...DEFAULT_PREFERENCES, ...parsed };
      } else {
        const appLanguage = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
        this.prefs = {
          ...DEFAULT_PREFERENCES,
          language: getSpeechLanguageByAppLanguage(appLanguage),
        };
      }
    } catch (e) {
      console.log("[SpeechService] Falha ao carregar preferências:", e);
    } finally {
      this.prefsLoaded = true;
    }
    return this.prefs;
  }

  /** Retorna snapshot atual das preferências. */
  getPreferences(): SpeechPreferences {
    return { ...this.prefs };
  }

  /** Atualiza preferências (parcial) e persiste. */
  async setPreferences(patch: Partial<SpeechPreferences>): Promise<SpeechPreferences> {
    this.prefs = { ...this.prefs, ...patch };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch (e) {
      console.log("[SpeechService] Falha ao salvar preferências:", e);
    }
    this.emitChange();
    return { ...this.prefs };
  }

  /** Alterna TTS global. */
  async toggleEnabled(): Promise<boolean> {
    const next = !this.prefs.enabled;
    await this.setPreferences({ enabled: next });
    if (!next) this.stop();
    return next;
  }

  /** Alterna fala individual de gestos. */
  async toggleSpeakGestures(): Promise<boolean> {
    const next = !this.prefs.speakGestures;
    await this.setPreferences({ speakGestures: next });
    return next;
  }

  /** Alterna detecção de soletração. */
  async toggleSpellingEnabled(): Promise<boolean> {
    const next = !this.prefs.spellingEnabled;
    await this.setPreferences({ spellingEnabled: next });
    return next;
  }

  /** Define o idioma usado pelo expo-speech. */
  async setLanguage(language: string): Promise<SpeechPreferences> {
    const next = getSpeechLanguageConfig(language).speechCode;
    return this.setPreferences({ language: next });
  }

  /** Registra callback de mudança de preferências (para UI reativa). */
  subscribe(listener: PrefListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitChange(): void {
    const snapshot = this.getPreferences();
    this.listeners.forEach((l) => {
      try {
        l(snapshot);
      } catch {}
    });
  }

  // ──────────────────────────────────────────────
  // Fala
  // ──────────────────────────────────────────────

  /**
   * Fala o nome de um gesto individual (letra ou palavra curta).
   * Ignora duplicatas dentro de 500ms para evitar eco quando o mesmo
   * gesto é detectado repetidamente em frames consecutivos.
   */
  speakGesture(label: string | null | undefined): void {
    if (!label) return;
    if (!this.prefs.enabled || !this.prefs.speakGestures) return;

    const now = Date.now();
    if (this.lastText === label && now - this.lastTimestamp < 2000) {
      return; // debounce: mesmo gesto recentemente falado (2s intervalo)
    }
    this.lastText = label;
    this.lastTimestamp = now;

    const text = LETTER_TTS_MAP[label.toUpperCase()] ?? label;
    this.speak(text, { interrupt: true });
  }

  /**
   * Fala a palavra completa soletrada.
   * Interrompe qualquer fala em andamento para garantir que a palavra
   * completa seja ouvida sem sobreposição com a última letra.
   */
  speakWord(word: string): void {
    if (!word) return;
    if (!this.prefs.enabled) return;
    // Palavras sempre falam, mesmo que speakGestures esteja off.
    this.speak(word, { interrupt: true });
  }

  /** Fala texto arbitrário (ex.: "Soletrando…", mensagens). */
  speak(text: string, opts?: { interrupt?: boolean }): void {
    if (!text) return;
    if (!this.prefs.enabled) return;

    try {
      if (opts?.interrupt) {
        Speech.stop();
      }
      this.speaking = true;
      Speech.speak(text, {
        language: this.prefs.language,
        rate: this.prefs.rate,
        pitch: this.prefs.pitch,
        onDone: () => {
          this.speaking = false;
        },
        onStopped: () => {
          this.speaking = false;
        },
        onError: (err) => {
          this.speaking = false;
          console.log("[SpeechService] Erro ao falar:", err);
        },
      });
    } catch (e) {
      this.speaking = false;
      console.log("[SpeechService] Exceção ao falar:", e);
    }
  }

  /** Interrompe qualquer fala em andamento. */
  stop(): void {
    try {
      Speech.stop();
    } catch {}
    this.speaking = false;
  }

  /** Verifica se está falando no momento. */
  isSpeaking(): boolean {
    return this.speaking;
  }
}

// Singleton
export const speechService = new SpeechService();
export default speechService;
