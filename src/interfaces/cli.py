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



from src.vision.pipeline import HandPipeline
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
        Config → Modo de execução → Pipeline adequado
    """

    # ------------------------------------------------------
    # 1. Carrega configuração
    # ------------------------------------------------------
    config = Config(config_path)

    run_mode = config["app"]["run_mode"]

    # ------------------------------------------------------
    # 2. MODO COLETA DE DADOS (dataset para ML dinâmico)
    # ------------------------------------------------------
    if run_mode == "collect":
        from src.data.sequence_collector import main as run_collector
        run_collector(config)
        return

    # ------------------------------------------------------
    # 3. MODO TREINAMENTO
    # ------------------------------------------------------
    if run_mode == "train":
        from src.training.sequence_trainer import main as run_trainer
        run_trainer()
        return

    # ------------------------------------------------------
    # 4. MODO INFERÊNCIA (RECONHECIMENTO EM TEMPO REAL)
    # ------------------------------------------------------
    detectors = create_detectors(config)
    manager = DetectorManager(detectors)

    cap = cv2.VideoCapture(config["app"]["camera_index"])

    with HandPipeline(
        model_path=config["pipeline"]["model_path"],
        num_hands=config["pipeline"]["num_hands"],
    ) as pipeline:

        ts = 0

        while True:

            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)
            h, w, _ = frame.shape

            # --------------------------
            # Processa MediaPipe
            # --------------------------
            hands = pipeline.process_frame(frame, ts)
            ts += 1

            # --------------------------
            # Desenha landmarks
            # --------------------------
            for hand in hands:
                for lm in hand:
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)

            # --------------------------
            # Reconhecimento
            # --------------------------
            label, score = manager.detect(hands)

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

            cv2.imshow(config["app"]["window_name"], frame)

            if cv2.waitKey(1) & 0xFF == 27:
                break

    # ------------------------------------------------------
    # FINALIZAÇÃO
    # ------------------------------------------------------
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