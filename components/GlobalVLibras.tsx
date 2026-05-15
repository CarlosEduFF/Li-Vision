import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  DeviceEventEmitter,
  Dimensions,
  Animated,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import { usePathname } from "expo-router";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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
    
    /* Centraliza e escala o avatar para o tamanho da pequena janela */
    [vw] {
      left: 30% !important;
      top: 40% !important;
      transform: translate(-50%, -50%) !important;
    }
    
    .vpw-header, .vpw-close-btn, .vpw-settings-btn,
    .vw-plugin-top-wrapper { display: none !important; }
  </style>
</head>
<body>
  <p id="status">...</p>
  <div vw class="enabled">
    <div vw-access-button class="active"></div>
    <div vw-plugin-wrapper>
      <div class="vw-plugin-top-wrapper"></div>
    </div>
  </div>

  <script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>
  <script>
    // Suprime TOTALMENTE alertas e erros de console que poluem a tela
    (function() {
      window.alert = function() {};
      window.onerror = function() { return true; };
      console.error = function() {};
      console.warn = function() {};
    })();

    var widget = new window.VLibras.Widget('https://vlibras.gov.br/app');

    function openPlayer() {
      var accessBtn = document.querySelector('[vw-access-button]');
      var wrapper = document.querySelector('[vw-plugin-wrapper]');
      var vwEl = document.querySelector('[vw]');
      
      if (!accessBtn || !wrapper) return;

      accessBtn.classList.add('active');
      wrapper.classList.add('active');
      if (vwEl) vwEl.classList.add('active');
      accessBtn.style.setProperty('display', 'none', 'important');
      
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
          
          var waitCanvas = setInterval(function() {
            var canvas = document.querySelector('canvas');
            if (canvas) {
              clearInterval(waitCanvas);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
            }
          }, 300);
        }
      }, 300);
    }

    var checkReady = setInterval(function() {
      var accessBtn = document.querySelector('[vw-access-button]');
      if (accessBtn) {
        clearInterval(checkReady);
        document.getElementById('status').style.display = 'none';
        accessBtn.click();
        setTimeout(openPlayer, 300);
      }
    }, 300);

    function translateText(text) {
      try {
        if (window.plugin && window.plugin.player) {
          window.plugin.player.translate(text);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translating' }));
        } else {
          // Fallback: se o plugin não estiver 100%, tenta usar o disparador padrão do widget
          var el = document.getElementById('translate-source');
          if (el) {
             el.innerText = text;
             // Força um clique ou evento de tradução se possível
             var btn = document.querySelector('.vw-text-widget-button');
             if (btn) btn.click();
          }
        }
      } catch (e) {}
    }
  </script>
</body>
</html>
`;

export const VLibrasController = {
  translate: (text: string) => {
    if (!text) return;
    DeviceEventEmitter.emit("VLIBRAS_TRANSLATE", text);
  },
  show: () => {
    DeviceEventEmitter.emit("VLIBRAS_SHOW");
  },
};

export default function GlobalVLibras() {
  const [visible, setVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const pathname = usePathname();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Hides button on transcription to avoid redundancy
  const isTranscriptionScreen = pathname === "/transcription" || pathname === "/(tabs)/transcription";

  const handleTranslate = useCallback((text: string) => {
    if (!visible) {
      // Se não estiver visível, ignoramos a solicitação de tradução dos textos clicados
      return;
    }
    
    if (isReady && webViewRef.current) {
      const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
      webViewRef.current.injectJavaScript(`translateText('${escaped}'); true;`);
    } else {
      setPendingText(text);
    }
  }, [visible, isReady]);

  const showWidget = () => {
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideWidget = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  useEffect(() => {
    const subTranslate = DeviceEventEmitter.addListener("VLIBRAS_TRANSLATE", handleTranslate);
    const subShow = DeviceEventEmitter.addListener("VLIBRAS_SHOW", showWidget);
    return () => {
      subTranslate.remove();
      subShow.remove();
    };
  }, [handleTranslate]);

  useEffect(() => {
    if (visible && isReady && pendingText && webViewRef.current) {
      const escaped = pendingText.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
      webViewRef.current.injectJavaScript(`translateText('${escaped}'); true;`);
      setPendingText(null);
    }
  }, [visible, isReady, pendingText]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") setIsReady(true);
    } catch (e) {}
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {!visible && !isTranscriptionScreen && (
        <TouchableOpacity style={styles.floatingBtn} onPress={showWidget} activeOpacity={0.8}>
          <MaterialIcons name="sign-language" size={28} color="#081018" />
        </TouchableOpacity>
      )}

      {visible && (
        <Animated.View style={[styles.window, { opacity: fadeAnim }]}>
          <View style={styles.windowHeader}>
            <MaterialIcons name="accessibility" size={14} color="#00e5ff" />
            <Text style={styles.windowTitle}>Acessibilidade</Text>
            <TouchableOpacity onPress={hideWidget} style={styles.closeBtn}>
              <MaterialIcons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.webviewContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: VLIBRAS_HTML }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleMessage}
              scrollEnabled={false}
              transparent={true}
              backgroundColor="#10141a"
            />
            {!isReady && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#00e5ff" />
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  floatingBtn: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00e5ff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  window: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 220,
    height: 300,
    backgroundColor: "#10141a",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#00e5ff",
    elevation: 10,
  },
  windowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#1c2026",
    gap: 6,
  },
  windowTitle: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    flex: 1,
  },
  closeBtn: {
    padding: 2,
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#10141a",
    justifyContent: "center",
    alignItems: "center",
  },
});
