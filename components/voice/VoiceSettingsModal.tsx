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
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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
            <MaterialIcons name="record-voice-over" size={26} color="#b388ff" />
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
                trackColor={{ true: "#00e5ff", false: "#444" }}
                thumbColor={prefs.enabled ? "#fff" : "#888"}
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
                trackColor={{ true: "#00e5ff", false: "#444" }}
                thumbColor={prefs.speakGestures ? "#fff" : "#888"}
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
                trackColor={{ true: "#ffb74d", false: "#444" }}
                thumbColor={prefs.spellingEnabled ? "#fff" : "#888"}
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
                        <MaterialIcons name="file-download" size={14} color="#ffb74d" />
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
                <MaterialIcons name="play-arrow" size={18} color="#00e5ff" />
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
          <MaterialIcons name="remove" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          onPress={onInc}
          disabled={disabled}
          style={styles.stepBtn}
        >
          <MaterialIcons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#14171d",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(179,136,255,0.4)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    marginBottom: 16,
    lineHeight: 17,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c2026",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  rowDesc: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  languageBlock: {
    backgroundColor: "#1c2026",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  languageTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  languageDesc: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#272c34",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  languageChipActive: {
    backgroundColor: "rgba(0,229,255,0.14)",
    borderColor: "rgba(0,229,255,0.5)",
  },
  languageChipMissing: {
    borderColor: "rgba(255,183,77,0.5)",
  },
  languageMissingHint: {
    color: "#ffb74d",
    fontSize: 10,
    marginTop: 10,
    lineHeight: 14,
  },
  languageChipText: {
    color: "#a0aab5",
    fontSize: 12,
    fontWeight: "700",
  },
  languageChipTextActive: {
    color: "#00e5ff",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c2026",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  stepperLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepperHint: {
    color: "#777",
    fontSize: 10,
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#272c34",
  },
  stepperValue: {
    color: "#00e5ff",
    fontSize: 13,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "center",
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,229,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.3)",
    marginTop: 4,
    marginBottom: 10,
  },
  testBtnText: {
    color: "#00e5ff",
    fontWeight: "700",
    fontSize: 13,
  },
  closeBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1c2026",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  closeBtnText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
});
