/**
 * Painel de soletração que aparece no overlay da câmera.
 * Mostra o buffer atual, status (ouvindo/finalizado), última palavra
 * falada e botões para confirmar/limpar manualmente.
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { makeSpellingPanelStyles } from "./styles";

type Props = {
  isSpelling: boolean;
  buffer: string[];
  candidate: string | null;
  lastSpokenWord: string | null;
  letterStableMs: number;
  onFinalize: () => void;
  onClear: () => void;
  onAdjustStable: (delta: number) => void;
};

export default function SpellingPanel({
  isSpelling,
  buffer,
  candidate,
  lastSpokenWord,
  letterStableMs,
  onFinalize,
  onClear,
  onAdjustStable,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeSpellingPanelStyles(colors), [colors]);

  const hasBuffer = buffer.length > 0;

  const speedLabel =
    letterStableMs <= 400 ? "Rápido" :
    letterStableMs <= 800 ? "Médio" :
    letterStableMs <= 1200 ? "Lento" : "Muito lento";

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name={isSpelling ? "mic" : "mic-none"}
            size={16}
            color={isSpelling ? colors.accent.warning : colors.text.secondary}
          />
          <Text
            style={[
              styles.title,
              { color: isSpelling ? colors.accent.warning : colors.text.secondary },
            ]}
          >
            {isSpelling ? "Soletrando…" : "Aguardando letras"}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onFinalize}
            disabled={!hasBuffer}
            style={[styles.btn, !hasBuffer && styles.btnDisabled]}
            accessibilityLabel="Finalizar palavra"
          >
            <MaterialIcons name="check" size={14} color={colors.primary} />
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClear}
            disabled={!hasBuffer}
            style={[styles.btn, !hasBuffer && styles.btnDisabled]}
            accessibilityLabel="Limpar soletração"
          >
            <MaterialIcons name="backspace" size={14} color={colors.accent.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bufferRow}>
        {hasBuffer ? (
          <Text style={styles.bufferText} numberOfLines={1}>
            {buffer.join(" · ")}
            {candidate ? (
              <Text style={styles.candidate}>{` · ${candidate}?`}</Text>
            ) : null}
          </Text>
        ) : candidate ? (
          <Text style={styles.candidate}>{`Candidata: ${candidate}`}</Text>
        ) : (
          <Text style={styles.placeholder}>
            Mostre letras em sequência. A palavra é falada ao terminar.
          </Text>
        )}
      </View>

      {/* Controle de velocidade inline */}
      <View style={styles.speedRow}>
        <MaterialIcons name="speed" size={13} color={colors.text.muted} />
        <Text style={styles.speedLabel}>Velocidade:</Text>
        <TouchableOpacity
          style={styles.speedBtn}
          onPress={() => onAdjustStable(100)}
          accessibilityLabel="Diminuir velocidade"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        >
          <MaterialIcons name="remove" size={14} color={colors.accent.warning} />
        </TouchableOpacity>
        <Text style={styles.speedValue}>{speedLabel}</Text>
        <TouchableOpacity
          style={styles.speedBtn}
          onPress={() => onAdjustStable(-100)}
          accessibilityLabel="Aumentar velocidade"
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <MaterialIcons name="add" size={14} color={colors.accent.warning} />
        </TouchableOpacity>
        <Text style={styles.speedMs}>{letterStableMs}ms</Text>
      </View>

      {lastSpokenWord && (
        <View style={styles.spokenRow}>
          <MaterialIcons name="volume-up" size={14} color={colors.accent.green} />
          <Text style={styles.spokenText} numberOfLines={1}>
            {lastSpokenWord}
          </Text>
        </View>
      )}
    </View>
  );
}


