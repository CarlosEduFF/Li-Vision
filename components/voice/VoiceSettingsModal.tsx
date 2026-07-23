/**
 * Modal de configuração da síntese de voz e detecção de soletração.
 * Alterna globais (enabled / speakGestures / spelling) e ajusta:
 *   - Tempo de ociosidade para finalizar palavra (spellingIdleMs)
 *   - Tempo de estabilidade da letra (letterStableMs)
 *   - Confiança mínima (minConfidence)
 */
import {
    SPEECH_LANGUAGES,
    SpeechPreferences,
    openVoiceDownloadSettings,
    speechService,
} from "@/services/speechService";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { makeVoiceSettingsStyles } from "@/styles/voiceSettingsModal.styles";

type Props = {
  visible: boolean;
  prefs: SpeechPreferences;
  onClose: () => void;
  onToggleEnabled: () => void;
  onToggleSpeakGestures: () => void;
  onToggleSpelling: () => void;
  onAdjustIdle: (delta: number) => void;
  onAdjustStable: (delta: number) => void;
  onAdjustConfidence: (delta: number) => void;
  onSetLanguage: (language: string) => void;
  onTestVoice?: () => void;
};

export default function VoiceSettingsModal({
  visible,
  prefs,
  onClose,
  onToggleEnabled,
  onToggleSpeakGestures,
  onToggleSpelling,
  onAdjustIdle,
  onAdjustStable,
  onAdjustConfidence,
  onSetLanguage,
  onTestVoice,
}: Props) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => makeVoiceSettingsStyles(colors), [colors]);
  // Mapa idioma → voz instalada no dispositivo. Recalculado ao abrir o modal.
  const [voiceAvailability, setVoiceAvailability] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!visible) return;
    let active = true;
    speechService.ensureVoicesLoaded().then(() => {
      if (!active) return;
      const map: Record<string, boolean> = {};
      SPEECH_LANGUAGES.forEach((lang) => {
        map[lang.speechCode] = speechService.isVoiceAvailable(lang.speechCode);
      });
      setVoiceAvailability(map);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.card}>
          <View style={styles.header}>
            <MaterialIcons name="record-voice-over" size={26} color={colors.accent.purple} />
            <Text style={styles.title}>Voz & Soletração</Text>
          </View>
          <Text style={styles.subtitle}>
            Configure como o app fala os gestos e reconhece palavras soletradas.
          </Text>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/* ── Toggles ── */}
            <View style={styles.row}>
              <View style={styles.rowTextBlock}>
                <Text style={styles.rowTitle}>Síntese de voz</Text>
                <Text style={styles.rowDesc}>Mestre: liga/desliga todas as falas.</Text>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={onToggleEnabled}
                trackColor={{ true: colors.primary, false: colors.border.subtle }}
                thumbColor={prefs.enabled ? colors.surface : colors.text.secondary}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowTextBlock}>
                <Text style={styles.rowTitle}>Falar gesto detectado</Text>
                <Text style={styles.rowDesc}>
                  Pronuncia cada gesto assim que é reconhecido.
                </Text>
              </View>
              <Switch
                value={prefs.speakGestures}
                onValueChange={onToggleSpeakGestures}
                disabled={!prefs.enabled}
                trackColor={{ true: colors.primary, false: colors.border.subtle }}
                thumbColor={prefs.speakGestures ? colors.surface : colors.text.secondary}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowTextBlock}>
                <Text style={styles.rowTitle}>Detectar soletração</Text>
                <Text style={styles.rowDesc}>
                  Combina letras em palavras e fala ao terminar.
                </Text>
              </View>
              <Switch
                value={prefs.spellingEnabled}
                onValueChange={onToggleSpelling}
                disabled={!prefs.enabled}
                trackColor={{ true: colors.accent.warning, false: colors.border.subtle }}
                thumbColor={prefs.spellingEnabled ? colors.surface : colors.text.secondary}
              />
            </View>

            {/* ── Sliders simples (+/-) ── */}
            <View style={[styles.languageBlock, !prefs.enabled && { opacity: 0.4 }]}>
              <Text style={styles.languageTitle}>Idioma da voz</Text>
              <Text style={styles.languageDesc}>
                Escolha a voz usada para falar gestos e palavras soletradas.
              </Text>
              <View style={styles.languageGrid}>
                {SPEECH_LANGUAGES.map((language) => {
                  const isActive = prefs.language === language.speechCode;
                  // undefined enquanto carrega → tratamos como disponível.
                  const installed = voiceAvailability[language.speechCode] !== false;

                  return (
                    <TouchableOpacity
                      key={language.speechCode}
                      style={[
                        styles.languageChip,
                        isActive && styles.languageChipActive,
                        !installed && styles.languageChipMissing,
                      ]}
                      onPress={() =>
                        installed ? onSetLanguage(language.speechCode) : openVoiceDownloadSettings()
                      }
                      disabled={!prefs.enabled}
                    >
                      <Text style={[styles.languageChipText, isActive && styles.languageChipTextActive]}>
                        {language.label}
                      </Text>
                      {!installed && (
                        <MaterialIcons name="file-download" size={14} color={colors.accent.warning} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {Object.values(voiceAvailability).some((v) => v === false) && (
                <Text style={styles.languageMissingHint}>
                  Idiomas com ⬇ não têm voz instalada. Toque para abrir as configurações de
                  voz do sistema e baixar o pacote.
                </Text>
              )}
            </View>

            <Stepper
              label="Finalizar palavra após"
              value={`${(prefs.spellingIdleMs / 1000).toFixed(1)} s`}
              onDec={() => onAdjustIdle(-250)}
              onInc={() => onAdjustIdle(250)}
              disabled={!prefs.spellingEnabled}
              hint="Tempo sem novas letras para considerar a palavra completa."
            />

            <Stepper
              label="Estabilidade da letra"
              value={`${prefs.letterStableMs} ms`}
              onDec={() => onAdjustStable(-100)}
              onInc={() => onAdjustStable(100)}
              disabled={!prefs.spellingEnabled}
              hint="Tempo que a mesma letra deve ser mantida para ser aceita."
            />

            <Stepper
              label="Confiança mínima"
              value={`${(prefs.minConfidence * 100).toFixed(0)}%`}
              onDec={() => onAdjustConfidence(-0.05)}
              onInc={() => onAdjustConfidence(0.05)}
              disabled={!prefs.spellingEnabled}
              hint="Só aceita letras acima deste limiar de confiança."
            />

            {onTestVoice && (
              <TouchableOpacity
                style={styles.testBtn}
                onPress={onTestVoice}
                disabled={!prefs.enabled}
              >
                <MaterialIcons name="play-arrow" size={18} color={colors.primary} />
                <Text style={styles.testBtnText}>Testar voz</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  hint?: string;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => makeVoiceSettingsStyles(colors), [colors]);
  return (
    <View style={[styles.stepperRow, disabled && { opacity: 0.4 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepperLabel}>{label}</Text>
        {hint && <Text style={styles.stepperHint}>{hint}</Text>}
      </View>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          onPress={onDec}
          disabled={disabled}
          style={styles.stepBtn}
        >
          <MaterialIcons name="remove" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          onPress={onInc}
          disabled={disabled}
          style={styles.stepBtn}
        >
          <MaterialIcons name="add" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
