/**
 * Painel de soletração que aparece no overlay da câmera.
 * Mostra o buffer atual, status (ouvindo/finalizado), última palavra
 * falada e botões para confirmar/limpar manualmente.
 */
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  isSpelling: boolean;
  buffer: string[];
  candidate: string | null;
  lastSpokenWord: string | null;
  onFinalize: () => void;
  onClear: () => void;
};

export default function SpellingPanel({
  isSpelling,
  buffer,
  candidate,
  lastSpokenWord,
  onFinalize,
  onClear,
}: Props) {
  const hasBuffer = buffer.length > 0;
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name={isSpelling ? "mic" : "mic-none"}
            size={16}
            color={isSpelling ? "#ffb74d" : "#888"}
          />
          <Text
            style={[
              styles.title,
              { color: isSpelling ? "#ffb74d" : "#888" },
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
            <MaterialIcons name="check" size={14} color="#00e5ff" />
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClear}
            disabled={!hasBuffer}
            style={[styles.btn, !hasBuffer && styles.btnDisabled]}
            accessibilityLabel="Limpar soletração"
          >
            <MaterialIcons name="backspace" size={14} color="#ff6b6b" />
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

      {lastSpokenWord && (
        <View style={styles.spokenRow}>
          <MaterialIcons name="volume-up" size={14} color="#4caf50" />
          <Text style={styles.spokenText} numberOfLines={1}>
            {lastSpokenWord}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(16, 20, 26, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,183,77,0.35)",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1c2026",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    color: "#00e5ff",
    fontSize: 11,
    fontWeight: "700",
  },
  bufferRow: {
    minHeight: 22,
    justifyContent: "center",
  },
  bufferText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  candidate: {
    color: "#ffb74d",
    fontSize: 14,
    fontWeight: "600",
  },
  placeholder: {
    color: "#777",
    fontSize: 12,
    fontStyle: "italic",
  },
  spokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(76, 175, 80, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  spokenText: {
    color: "#4caf50",
    fontSize: 12,
    fontWeight: "600",
  },
});
