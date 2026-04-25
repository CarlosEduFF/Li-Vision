# TODO – Voice Synthesis & Spelling Detection

## Steps
- [x] Plan approved
- [ ] 1. Install `expo-speech` dependency
- [ ] 2. Create `services/speechService.ts` (TTS wrapper + queue + preferences)
- [ ] 3. Create `hooks/useSpellingDetector.ts` (buffer + debounce + idle finalize)
- [ ] 4. Update `app/screens/cam.tsx`
  - [ ] Integrate `speechService` on gesture detection
  - [ ] Integrate `useSpellingDetector` hook
  - [ ] Add settings modal (toggles + sliders)
  - [ ] Add visual spelling feedback (buffer, status, buttons)
- [ ] 5. Verify no regressions on existing features
- [ ] 6. Document usage in code comments
