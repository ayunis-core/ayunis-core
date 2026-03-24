import { useRef, useState } from 'react';
import {
  useKnowledgeBaseDocuments,
  useUploadDocument,
  useAddUrl,
  useRemoveDocument,
} from '../api';
import { isValidUrl } from '../lib/isValidUrl';

export function useDocumentManager(knowledgeBaseId: string) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const { documents, isLoading } = useKnowledgeBaseDocuments(knowledgeBaseId);
  const { uploadDocument, isUploading } = useUploadDocument(knowledgeBaseId);
  const { addUrlAsync, isAddingUrl } = useAddUrl(knowledgeBaseId);
  const { removeDocument, isRemoving } = useRemoveDocument(knowledgeBaseId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(file);
      e.target.value = '';
    }
  };

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed || !isValidUrl(trimmed) || isAddingUrl) return;
    try {
      await addUrlAsync(trimmed);
      setUrlInput('');
      setUrlDialogOpen(false);
    } catch {
      // error toast is handled by the mutation's onError callback
    }
  };

  const handleUrlDialogOpenChange = (open: boolean) => {
    if (!open && isAddingUrl) return;
    setUrlDialogOpen(open);
    if (!open) setUrlInput('');
  };

  return {
    fileInputRef,
    documents,
    isLoading,
    isUploading,
    isAddingUrl,
    removeDocument,
    isRemoving,
    urlDialogOpen,
    urlInput,
    setUrlInput,
    handleFileChange,
    handleAddUrl,
    handleUrlDialogOpenChange,
    openUrlDialog: () => setUrlDialogOpen(true),
  };
}
