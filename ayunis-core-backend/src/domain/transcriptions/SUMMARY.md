Audio Transcription
Speech-to-text transcription via external provider APIs

Transcriptions convert uploaded audio files into text using external transcription services. The module exposes an HTTP endpoint for file upload and returns transcribed text content.

The module provides two application workflows through `TranscriptionPort`, implemented by `MistralTranscriptionService`. `TranscribeUseCase` serves browser microphone uploads and returns plain text. `TranscribeRecordingUseCase` prepares uploaded source recordings, transcribes their parts and returns text with original timestamps for the retrieval pipeline. The module exports both use cases and the provider port. Its controller serves the microphone workflow; source recordings enter through the retrievers module.

Audio remains transient within this module; the sources module owns original files and saved processing results. Error handling covers unsupported formats, provider failures and file size limits.

Uploaded source recordings use the separate `TranscribeRecordingUseCase`, leaving browser microphone behavior unchanged. `FfmpegAudioSegmenterAdapter` inspects duration (bounded decoding when WebM metadata omits it), emits valid time/byte-bounded segments and removes temporary files after each part and attempt. Supported demuxers and file/pipe protocols are explicit; MOV external references are disabled. `MistralTranscriptionService.transcribeSegment` requests segment timestamps with a configurable timeout. Saved per-part results are reused on retry; timestamps are offset into the original recording and retained in the searchable text. Concurrency and segment budgets come from `transcription.config.ts`; current public upload size remains 25 MiB. FFmpeg and ffprobe are required in the runtime image.
