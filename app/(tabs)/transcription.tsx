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
    /* Força o player VLibras a preencher toda a tela */
    .vpw-wrapper, .vpw-box, .vpw-content, .vpw-player, [vw-plugin-wrapper] {
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    /* Esconde o cabeçalho e botão fechar do player */
    .vpw-header, .vpw-settings-btn, .vpw-close-btn {
      display: none !important;
    }
    /* Canvas do avatar ocupa tudo */
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  </style>
</head>
<body>
  <p id="status">Carregando avatar VLibras...</p>

  <div vw class="enabled">
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  </div>

  <script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>
  <script>
    var widget = new window.VLibras.Widget('https://vlibras.gov.br/app');
    
    // Auto-abre o player assim que estiver carregado
    var checkReady = setInterval(function() {
      var accessBtn = document.querySelector('[vw-access-button]');
      var pluginWrapper = document.querySelector('[vw-plugin-wrapper]');
      
      if (accessBtn && pluginWrapper) {
        clearInterval(checkReady);
        document.getElementById('status').style.display = 'none';
        
        // Clica para abrir o player automaticamente (com um pequeno delay)
        setTimeout(function() {
          accessBtn.click();
          // Esconde o botão de acesso depois de clicar
          accessBtn.style.display = 'none';
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }, 1000);
      }
    }, 500);

    // Timeout de segurança
    setTimeout(function() {
      clearInterval(checkReady);
      document.getElementById('status').style.display = 'none';
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }, 8000);

    // Função chamada pelo React Native para traduzir
    function translateText(text) {
      try {
        // Tenta usar a API interna do plugin, se disponível
        if (window.plugin && window.plugin.player) {
          window.plugin.player.translate(text);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translating', text: text }));
        } else {
          // Fallback: Simula seleção de texto
          var p = document.createElement('p');
          p.innerText = text;
          p.style.position = 'absolute';
          p.style.top = '-9999px';
          document.body.appendChild(p);
          
          var range = document.createRange();
          range.selectNodeContents(p);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          
          p.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          
          setTimeout(function() {
            var btn = document.querySelector('.vw-text-widget-button') || document.querySelector('[class*="translate"]');
            if (btn) btn.click();
            
            setTimeout(function() {
              document.body.removeChild(p);
              sel.removeAllRanges();
            }, 500);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translating', text: text }));
          }, 800);
        }
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.toString() }));
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
