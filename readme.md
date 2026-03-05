Padrões e decisões de design (aplicáveis nesse contexto)

Strategy / Plugin pattern — cada letra é um detector (classe) que implementa detect(landmarks) e retorna (label,score). Assim você registra/ativa detectores conforme precisar.

Pipeline única — componente HandPipeline encapsula a câmera, a criação do mp.Image e o HandLandmarker. O app consome landmarks normalizados.

Separação de responsabilidades — collector coleta dados; trainer treina; ml_detector carrega o modelo.

Formato de dados — salve vetores de landmarks como arrays 63-d (21 pontos × x,y,z) normalizados e rotulados (CSV/NPZ). Usar proporções relativas à palma para robustez.

Extensibilidade — adicionar nova letra = 1) criar detector heurístico ou 2) coletar exemplos e treinar; apenas registrar no detector_registry.


def run_app(config_path):
    """
    Inicializa e executa o sistema Li-Vision.

    Fluxo geral:
        Config → Detectores → Pipeline → Loop de vídeo → Reconhecimento

    Parameters
    ----------
    config_path : str
        Caminho do arquivo YAML de configuração.
    """

    # ------------------------------------------------------
    # 1. Carrega configuração da aplicação
    # ------------------------------------------------------
    # A classe Config encapsula leitura YAML e acesso por chave.
    config = Config(config_path)
    
    if config["app"]["run_mode"] == "training":
        from src.training.sequence_trainer import run_training
        run_training(config)
        return

    # ------------------------------------------------------
    # 2. Cria detectores dinamicamente
    # ------------------------------------------------------
    # DetectorFactory decide quais detectores serão usados
    # (rule-based ou ML) baseado no config.yaml.
    detectors = create_detectors(config)

    # DetectorManager coordena múltiplos detectores
    # e decide qual resultado final retornar.
    manager = DetectorManager(detectors)

    # ------------------------------------------------------
    # 3. Inicializa webcam
    # ------------------------------------------------------
    cap = cv2.VideoCapture(config["app"]["camera_index"])

    # ------------------------------------------------------
    # 4. Inicializa pipeline de visão computacional
    # ------------------------------------------------------
    # Context manager garante liberação correta dos recursos.
    with HandPipeline(
        model_path=config["pipeline"]["model_path"],
        num_hands=config["pipeline"]["num_hands"],
    ) as pipeline:

        # Timestamp necessário pelo MediaPipe VIDEO mode
        ts = 0

        # ==================================================
        # LOOP PRINCIPAL (REAL-TIME)
        # ==================================================
        while True:

            # Captura frame da webcam
            ret, frame = cap.read()
            if not ret:
                break

            # Espelha imagem para experiência natural do usuário
            frame = cv2.flip(frame, 1)
            h, w, _ = frame.shape

            # --------------------------------------------------
            # PROCESSAMENTO DA PIPELINE
            # --------------------------------------------------
            # Retorna lista de mãos detectadas (landmarks)
            hands = pipeline.process_frame(frame, ts)
            ts += 1

            # --------------------------
            # Desenho dos landmarks verdes
            # --------------------------
            for hand in hands:  # hand = lista de 21 landmarks
                for lm in hand:
                    # lm.x e lm.y geralmente estão normalizados [0,1], converte para pixels
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)  # verde
            
            # --------------------------------------------------
            # RECONHECIMENTO DE GESTO
            # --------------------------------------------------
            # DetectorManager executa todos detectores
            # e retorna o melhor resultado encontrado.
            label, score = manager.detect(hands)

            # --------------------------------------------------
            # DESENHO DO RESULTADO NA TELA
            # --------------------------------------------------
            if label:
                cv2.putText(
                    frame,
                    f"{label} ({score:.2f})",
                    (10, 80),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.2,
                    (255, 0, 0),
                    3,
                )

            # Mostra janela da aplicação
            cv2.imshow(config["app"]["window_name"], frame)

            # ESC encerra aplicação
            if cv2.waitKey(1) & 0xFF == 27:
                break

    # ------------------------------------------------------
    # FINALIZAÇÃO
    # ------------------------------------------------------
    # Libera câmera e fecha janelas OpenCV
    cap.release()
    cv2.destroyAllWindows()



# python -m src.cli

# B não funciona da mão esquerda
# Modularizar machine learning