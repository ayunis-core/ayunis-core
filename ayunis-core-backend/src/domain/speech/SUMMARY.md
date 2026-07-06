# Speech Module

Text-to-speech synthesis. Converts text into spoken audio via Mistral's
Voxtral TTS models, used by the frontend's "read out loud" button on
assistant messages.

## Structure

```text
speech/
├── application/
│   ├── ports/text-to-speech.port.ts      # TextToSpeechPort (abstract)
│   ├── speech.errors.ts                  # SpeechError + subclasses
│   └── use-cases/synthesize-speech/      # SynthesizeSpeechUseCase + command
├── infrastructure/
│   └── mistral-text-to-speech.service.ts # Mistral audio.speech adapter
├── presenters/http/
│   ├── speech.controller.ts              # POST /speech → audio/mpeg
│   └── dtos/synthesize-speech.dto.ts
└── speech.module.ts
```

## Behavior

- `POST /speech` with `{ input: string }` returns the synthesized speech as
  a binary `audio/mpeg` (mp3) response (`StreamableFile`).
- Input is capped at 5,000 characters (`MAX_TTS_INPUT_CHARS`); empty and
  whitespace-only input is rejected with 400.
- Auth comes from the global guard chain; the route is rate-limited
  (10/min per client, enforced in production only).
- Model and voice are configured via `MISTRAL_TTS_MODEL` (default
  `voxtral-mini-tts-latest`) and `MISTRAL_TTS_VOICE` (default
  `en_paul_neutral`; Mistral requires a voice on every request) in
  `src/config/models.config.ts`.
- The Mistral adapter retries transient (5xx) errors with backoff and maps
  failures to `SpeechServiceUnavailableError` / `SpeechSynthesisFailedError`.

## Dependencies

- `ContextModule` for the authenticated user check in the use case.
- `@mistralai/mistralai` v2 (`client.audio.speech.complete`, base64 →
  Buffer).
