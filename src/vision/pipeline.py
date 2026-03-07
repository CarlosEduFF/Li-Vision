# Importa a biblioteca principal do MediaPipe
import mediapipe as mp

# Importa o sistema de Tasks do MediaPipe (API moderna)
from mediapipe.tasks import python

# Importa os módulos de visão computacional (HandLandmarker)
from mediapipe.tasks.python import vision


class HandPipeline:
    """
    Pipeline responsável por:
    - carregar o modelo de detecção de mãos
    - receber frames da webcam
    - executar o modelo MediaPipe
    - retornar os landmarks detectados

    NÃO faz reconhecimento de letras.
    Apenas fornece dados para os detectores.
    """

    def __init__(self, model_path="hand_landmarker.task", num_hands=1):
        """
        Inicializa as configurações do modelo.

        model_path: caminho do modelo MediaPipe (.task)
        num_hands: número máximo de mãos detectadas simultaneamente
        """

        # Alias locais (evita escrever caminhos grandes depois)
        BaseOptions = python.BaseOptions
        HandLandmarker = vision.HandLandmarker
        HandLandmarkerOptions = vision.HandLandmarkerOptions
        VisionRunningMode = vision.RunningMode

        # Configuração do detector de mãos
        self.options = HandLandmarkerOptions(
            # caminho do modelo treinado
            base_options=BaseOptions(model_asset_path=model_path),

            # modo VIDEO = otimizado para frames contínuos
            running_mode=VisionRunningMode.VIDEO,

            # quantidade máxima de mãos detectadas
            num_hands=num_hands
        )

        # Guarda referência da classe do landmarker
        self.HandLandmarker = HandLandmarker

        # Guarda referência do mediapipe principal
        self.mp = mp

    # ===============================
    # CONTEXT MANAGER (with ...)
    # ===============================

    def __enter__(self):
        """
        Executado automaticamente ao entrar no bloco:

            with HandPipeline(...) as pipeline:

        Cria a instância do detector carregando o modelo na memória.
        """

        # Cria o detector usando as opções definidas
        self.landmarker = self.HandLandmarker.create_from_options(self.options)

        return self

    def __exit__(self, exc_type, exc, tb):
        """
        Executado automaticamente ao sair do bloco 'with'.

        Libera recursos do MediaPipe.
        Evita vazamento de memória e travamento da câmera.
        """

        self.landmarker.close()

    # ===============================
    # PROCESSAMENTO DE FRAME
    # ===============================

    def process_frame(self, bgr_frame, timestamp=0):
        """
        Processa um frame da webcam.

        Parameters:
            bgr_frame -> imagem capturada pelo OpenCV (formato BGR)
            timestamp -> contador incremental obrigatório no modo VIDEO

        Returns:
            Lista de mãos detectadas.
            Cada mão contém 21 landmarks (x, y, z).
        """

        # OpenCV usa BGR, MediaPipe usa RGB
        # [:,:,::-1] inverte os canais de cor
        rgb = bgr_frame[:, :, ::-1]  # BGR -> RGB

        # Converte numpy array em objeto de imagem do MediaPipe
        mp_image = self.mp.Image(
            image_format=self.mp.ImageFormat.SRGB,
            data=rgb
        )

        # Executa inferência do modelo para vídeo contínuo
        result = self.landmarker.detect_for_video(
            mp_image,
            timestamp
        )

        # Retorna lista de landmarks das mãos detectadas
        # Se nenhuma mão for encontrada, retorna lista vazia
        return result.hand_landmarks or []