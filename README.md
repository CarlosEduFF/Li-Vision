# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Testes Automatizados 🚀

### Configuração
- **Jest + React Testing Library** para testes unitários em componentes e serviços.
- **GitHub Actions** para CI/CD (roda testes em push/PR).

### Como rodar testes localmente
```bash
npm test
```
Ou com coverage:
```bash
npm test -- --coverage
```

### Testes criados
- `services/__tests__/api.test.ts`: Testa funções API (detectGesture, setRunMode, getState).
- `app/__tests__/_layout.test.tsx`: Testa layout principal (auth redirect).

### GitHub Actions
- Workflow `.github/workflows/ci.yml` roda automaticamente:
  - Instala deps
  - Executa testes
  - Gera coverage (Codecov)

**Push para `main` ou `develop` para testar!**

### Adicionar novos testes
1. Crie arquivo em `__tests__/` ou `nome.test.tsx`.
2. Use `render`, `fireEvent` do `@testing-library/react-native`.
3. Mock módulos como `fetch`, `AsyncStorage`.

### Expandir
- Testes para screens (cam.tsx, collect-static.tsx).
- Testes E2E com Detox.
- Integração com Python API tests (req/test_video_api.py).

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
