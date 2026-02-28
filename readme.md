Padrões e decisões de design (aplicáveis nesse contexto)

Strategy / Plugin pattern — cada letra é um detector (classe) que implementa detect(landmarks) e retorna (label,score). Assim você registra/ativa detectores conforme precisar.

Pipeline única — componente HandPipeline encapsula a câmera, a criação do mp.Image e o HandLandmarker. O app consome landmarks normalizados.

Separação de responsabilidades — collector coleta dados; trainer treina; ml_detector carrega o modelo.

Formato de dados — salve vetores de landmarks como arrays 63-d (21 pontos × x,y,z) normalizados e rotulados (CSV/NPZ). Usar proporções relativas à palma para robustez.

Extensibilidade — adicionar nova letra = 1) criar detector heurístico ou 2) coletar exemplos e treinar; apenas registrar no detector_registry.




