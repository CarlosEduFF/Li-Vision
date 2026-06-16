# Li-Vision — instruções do projeto

App Expo / React Native (Vision Camera + MediaPipe) para reconhecimento de Libras.

## Commits
Segue a convenção global de Conventional Commits (`tipo(escopo): descrição`). Especificidades deste repositório:

- **Idioma das descrições:** sempre em inglês.
- **Escopos típicos observados no histórico:** `camera`, `landmarks`, `deps`, `navbar`, `ranking`, `languages`, `voice-settings`, `spelling-panel`, `dark/light`, `speech`, `rules`, `plugin`, `architecture`, `tests`, `path`.
- Mudanças no plugin nativo costumam vir como `fix(camera)`, `fix(landmarks)` ou `chore(deps)` (quando é só bump de versão do `expo-vision-camera-v4-mediapipe`).
- Exemplos:
  - `fix(camera): use rgb pixelFormat for MediaPipe detection`
  - `refactor(voice-settings): extract styles and apply dark/light theme`
  - `chore(deps): bump expo-vision-camera-v4-mediapipe to 1.2.2`

## Estilos e tema
- Estilos das telas ficam em `styles/*.styles.ts` no padrão `makeXStyles(colors: AppColorTokens)`.
- Componentes/telas com cor devem consumir o tema via `useAppTheme()` e instanciar com `useMemo(() => makeXStyles(colors), [colors])` — não usar cores hardcoded (suportar dark/light).
- Tokens de cor vêm de `@/constants/theme` (`AppColorTokens`); evite literais como `#fff`, prefira `colors.text.primary`, `colors.primary`, `colors.accent.*`, `colors.border.*`.
