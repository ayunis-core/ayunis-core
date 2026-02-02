import { useState } from 'react';
import { axiosInstance } from '@/shared/api/client';

interface TranscribeResult {
  text: string;
}

export function useTranscribe() {
  const [isTranscribing, setIsTranscribing] = useState(false);

  async function transcribe(
    audioBlob: Blob,
    fileName: string,
    language?: string,
  ): Promise<string | null> {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, fileName);
      if (language) {
        formData.append('language', language);
      }

      const response = await axiosInstance.post<TranscribeResult>(
        '/transcriptions',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response.data.text;
    } catch {
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }

  return { transcribe, isTranscribing };
}
