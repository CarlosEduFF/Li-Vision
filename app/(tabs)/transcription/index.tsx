import { MaterialIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { transcriptionStyles as styles } from "./transcription.styles";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// VLibras renderiza internamente em tamanho fixo.
// NÃ£o tentamos redimensionar â€” o WebView preenche o espaÃ§o e o VLibras renderiza dentro.

const VLIBRAS_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { 
  width: 100%; height: 100%; 
  background: #10141a; 
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}
    #status { 
      color: #8a92a3; font-family: sans-serif; text-align: center; 
      position: absolute; width: 100%; top: 40%; z-index: 9999; 
    }
    #translate-source { position: absolute; left: -9999px; top: -9999px; }

    /* Esconde UI desnecessÃ¡ria do VLibras */
    .vpw-header, .vpw-close-btn, .vpw-settings-btn,
    .vw-plugin-top-wrapper { display: none !important; }
    /* Centraliza o widget do VLibras no centro da tela */
    [vw] {
      left: 50% !important;
      top: 50% !important;
      bottom: auto !important;
      right: auto !important;
      transform: translate(-50%, -50%) !important;
    }
    [vw-plugin-wrapper] {
      position: relative !important;
    }
  </style>
</head>
<body>
  <p id="status">Carregando avatar VLibras...</p>
  <div id="translate-source"></div>

  <div vw class="enabled">
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  </div>

  <script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>
  <script>
    // Suprime popups de erro do Unity/WebGL que sÃ£o irrelevantes
    (function() {
      window.alert = function() {};
      window.onerror = function() { return true; };
      console.error = function() {};
      console.warn = function() {};
    })();

    var widget = new window.VLibras.Widget('https://vlibras.gov.br/app');

    // Abre o player manipulando as classes internas do VLibras
    function openPlayer() {
      var accessBtn = document.querySelector('[vw-access-button]');
      var wrapper = document.querySelector('[vw-plugin-wrapper]');
      var vwEl = document.querySelector('[vw]');
      
      if (!accessBtn || !wrapper) return;

      accessBtn.classList.add('active');
      wrapper.classList.add('active');
      if (vwEl) vwEl.classList.add('active');
      accessBtn.style.setProperty('display', 'none', 'important');
      
      // Aguarda o Plugin carregar (lazy loaded)
      var waitPlugin = setInterval(function() {
        if (window.VLibras && window.VLibras.Plugin) {
          clearInterval(waitPlugin);
          
          if (!window.plugin) {
            window.plugin = new window.VLibras.Plugin({
              enableMoveWindow: false,
              enableWelcome: false,
              wrapper: wrapper,
              position: 'L',
              rootPath: 'https://vlibras.gov.br/app/',
              opacity: 1,
              avatar: 'icaro'
            });
          }
          
          // Espera o canvas 3D aparecer
          var waitCanvas = setInterval(function() {
            var canvas = document.querySelector('canvas');
            if (canvas) {
              clearInterval(waitCanvas);
              setTimeout(function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
              }, 3000);
            }
          }, 500);
        }
      }, 500);
    }

    var checkReady = setInterval(function() {
      var accessBtn = document.querySelector('[vw-access-button]');
      if (accessBtn) {
        clearInterval(checkReady);
        document.getElementById('status').style.display = 'none';
        accessBtn.click();
        setTimeout(openPlayer, 1000);
      }
    }, 500);

    function translateText(text) {
      try {
        if (window.plugin && window.plugin.player) {
          window.plugin.player.translate(text);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translating', text: text }));
        } else {
          var el = document.getElementById('translate-source');
          el.innerText = text;
          var range = document.createRange();
          range.selectNodeContents(el);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          setTimeout(function() {
            var btn = document.querySelector('.vw-text-widget-button') || document.querySelector('[class*="translate"]');
            if (btn) btn.click();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translating', text: text }));
          }, 500);
        }
      } catch (e) {
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
    const { t } = useTranslation();

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
                <Text style={styles.title}>{t('transcription.title')}</Text>
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
                        placeholder={t('transcription.placeholder')}
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
                                    <Text style={styles.translateBtnText}>{t('transcription.translate')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* VLibras Avatar â€” sem borda, preenche o espaÃ§o disponÃ­vel */}
            <View style={styles.webviewContainer}>
                {!isReady && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#00e5ff" />
                        <Text style={styles.loadingText}>{t('transcription.loading')}</Text>
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
                    {t('transcription.footer')}
                </Text>
            </View>
        </SafeAreaView>
    );
}



