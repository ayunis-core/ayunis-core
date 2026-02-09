Audio Transcription
Speech-to-text transcription via external provider APIs

Transcriptions convert uploaded audio files into text using external transcription services. The module exposes an HTTP endpoint for file upload and returns transcribed text content.

The transcriptions module provides speech-to-text functionality through a clean port/adapter architecture. It has no persisted domain entity—audio is processed transiently. The `TranscriptionPort` defines the interface for transcription services, with `MistralTranscriptionService` as the current implementation using Mistral's API. The single use case `TranscribeUseCase` accepts an audio file upload command and returns the transcribed text. The HTTP controller handles multipart audio file uploads and returns structured transcription responses. Error handling covers unsupported formats, provider failures, and file size limits. The module is self-contained with minimal dependencies, integrating primarily with the frontend's voice input feature. It could potentially feed into **messages** for voice-to-text conversation input or **runs** for audio-initiated AI interactions.
