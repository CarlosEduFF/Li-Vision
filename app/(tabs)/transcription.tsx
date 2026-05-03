import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const VLIBRAS_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: #10141a;
      overflow: hidden;
    }
    #status {
      color: #8a92a3;
      font-family: -apple-system, sans-serif;
      font-size: 14px;
      text-align: center;
      padding-top: 40%;
    }
    /* Texto para tradução - fica oculto visualmente mas acessível ao DOM */
    #translate-source {
      position: absolute;
      top: -9999px;
      left: -9999px;
      font-size: 16px;
    }
    /* Esconde o botão flutuante do VLibras - não precisamos dele */
    [vw-access-button] {
      opacity: 0 !important;
      pointer-events: none !important;
      width: 1px !important;
      height: 1px !important;
      position: fixed !important;
      top: -100px !important;
    }
    /* Força o player VLibras a preencher toda a tela */
    [vw] {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }
    [vw-plugin-wrapper],
    .vw-plugin-wrapper,
    .vpw-wrapper,
    .vpw-content,
    .vpw-player-wrapper {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    /* Esconde o cabeçalho e botão fechar do player */
    .vpw-header,
    .vpw-settings-btn,
    .vpw-close-btn {
      display: none !important;
    }
    /* Canvas do avatar ocupa tudo */
    canvas, .vpw-player canvas {
      width: 100% !important;
      height: 100% !important;
    }
  </style>
</head>
<body>
  <p id="status">Carregando avatar VLibras...</p>
  <p id="translate-source"></p>

  <div vw class="enabled">
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  </div>

  <script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>
  <script>
    var widget = new window.VLibras.Widget('https://vlibras.gov.br/app');
    var playerReady = false;

    // Auto-abre o player assim que estiver carregado
    var checkReady = setInterval(function() {
      var accessBtn = document.querySelector('[vw-access-button]');
      if (accessBtn) {
        clearInterval(checkReady);
        document.getElementById('status').style.display = 'none';

        // Clica para abrir o player automaticamente
        setTimeout(function() {
          accessBtn.click();
          playerReady = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }, 1500);
      }
    }, 500);

    // Timeout de segurança
    setTimeout(function() {
      if (!playerReady) {
        clearInterval(checkReady);
        document.getElementById('status').style.display = 'none';
        // Tenta abrir mesmo assim
        var btn = document.querySelector('[vw-access-button]');
        if (btn) btn.click();
        playerReady = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }
    }, 12000);

    // Função chamada pelo React Native para traduzir
    function translateText(text) {
      try {
        // Coloca o texto num elemento da página
        var el = document.getElementById('translate-source');
        el.innerText = text;
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';

        // Seleciona o texto programaticamente
        var range = document.createRange();
        range.selectNodeContents(el);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Dispara evento de mouseup para que o VLibras detecte a seleção
        var mouseupEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        el.dispatchEvent(mouseupEvent);

        // Busca o botão de traduzir que o VLibras cria ao selecionar texto
        setTimeout(function() {
          var translateBtn = document.querySelector('.vw-text-widget-button') ||
                             document.querySelector('[class*="translate"]') ||
                             document.querySelector('.vw-btn-translate');
          if (translateBtn) {
            translateBtn.click();
          }

          // Esconde o texto novamente após seleção
          setTimeout(function() {
            el.style.position = 'absolute';
            el.style.top = '-9999px';
            el.style.left = '-9999px';
            window.getSelection().removeAllRanges();
          }, 500);

          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translating', text: text }));
        }, 800);
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
      }
    }
  </script>
</body>
</html>
`;

export default function TranscriptionTabScreen() {
  const webViewRef = useRef<WebView>(null);
  const [text, setText] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastTranslated, setLastTranslated] = useState("");

  const handleTranslate = () => {
    if (!text.trim() || !webViewRef.current) return;

    const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
    webViewRef.current.injectJavaScript(`translateText('${escaped}'); true;`);
    setIsTranslating(true);
    setLastTranslated(text.trim());
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        setIsReady(true);
      } else if (data.type === "translating") {
        setIsTranslating(false);
      } else if (data.type === "error") {
        console.log("VLibras error:", data.message);
        setIsTranslating(false);
      }
    } catch (e) {
      console.log("WebView message parse error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="translate" size={24} color="#00e5ff" />
        <Text style={styles.title}>Transcrição para Libras</Text>
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inputArea}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Digite o texto em Português..."
            placeholderTextColor="#697688"
            multiline
            maxLength={500}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{text.length}/500</Text>
            <TouchableOpacity
              style={[
                styles.translateBtn,
                (!text.trim() || !isReady) && styles.translateBtnDisabled,
              ]}
              onPress={handleTranslate}
              disabled={!text.trim() || !isReady}
              activeOpacity={0.7}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color="#081018" />
              ) : (
                <>
                  <MaterialIcons name="sign-language" size={18} color="#081018" />
                  <Text style={styles.translateBtnText}>Traduzir</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* VLibras Avatar (WebView) */}
      <View style={styles.webviewContainer}>
        {!isReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00e5ff" />
            <Text style={styles.loadingText}>Carregando avatar...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ html: VLIBRAS_HTML }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setBuiltInZoomControls={false}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
        />

        {lastTranslated && isReady && (
          <View style={styles.subtitleBar}>
            <MaterialIcons name="closed-caption" size={16} color="#00e5ff" />
            <Text style={styles.subtitleText} numberOfLines={2}>
              {lastTranslated}
            </Text>
          </View>
        )}
      </View>

      {/* Info Footer */}
      <View style={styles.footer}>
        <MaterialIcons name="info-outline" size={14} color="#697688" />
        <Text style={styles.footerText}>
          Tradução automática via VLibras (Governo Federal / UFPB)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  inputArea: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    backgroundColor: "#1a2230",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a3548",
    overflow: "hidden",
  },
  input: {
    color: "#fff",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: "top",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  charCount: {
    color: "#697688",
    fontSize: 12,
  },
  translateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#00e5ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  translateBtnDisabled: {
    backgroundColor: "#2a3548",
    opacity: 0.5,
  },
  translateBtnText: {
    color: "#081018",
    fontWeight: "700",
    fontSize: 14,
  },
  webviewContainer: {
    flex: 1,
    margin: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#10141a",
    borderWidth: 1,
    borderColor: "#2a3548",
  },
  webview: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: "#10141a",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#8a92a3",
    fontSize: 14,
  },
  subtitleBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 20, 26, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 229, 255, 0.15)",
  },
  subtitleText: {
    color: "#dfe2eb",
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  footerText: {
    color: "#697688",
    fontSize: 11,
  },
});
