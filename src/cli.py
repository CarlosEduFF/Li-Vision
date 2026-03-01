"""


Este arquivo é o ponto de entrada da aplicação.

Responsabilidades do CLI:
-------------------------
1. Ler argumentos da linha de comando
2. Carregar o arquivo de configuração (config.yaml)
3. Construir os componentes principais do sistema:
      - Pipeline de visão computacional
      - Detectores de gestos
      - Gerenciador de detecção
4. Inicializar o loop principal da aplicação

O CLI NÃO contém regras de negócio.
Ele apenas orquestra a inicialização do sistema.
"""

import argparse
import cv2



from src.pipeline import HandPipeline
from src.core.config_loader import Config
from src.recognition.detector_factory import create_detectors
from src.recognition.detector_manager import DetectorManager


# ==========================================================
# EXECUÇÃO PRINCIPAL DA APLICAÇÃO
# ==========================================================
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


# ==========================================================
# CLI ENTRYPOINT
# ==========================================================
def main():
    """
    Define argumentos de linha de comando.

    Exemplo de uso:
        python src/cli.py
        python src/cli.py --config custom.yaml
    """

    parser = argparse.ArgumentParser(
        description="Li-Vision CLI"
    )

    # Permite trocar configuração sem alterar código
    parser.add_argument(
        "--config",
        default="config.yaml",
        help="Arquivo de configuração",
    )

    # Parse dos argumentos fornecidos pelo usuário
    args = parser.parse_args()

    # Executa aplicação usando config informado
    run_app(args.config)


# Executa somente se o arquivo for chamado diretamente
if __name__ == "__main__":
    main()