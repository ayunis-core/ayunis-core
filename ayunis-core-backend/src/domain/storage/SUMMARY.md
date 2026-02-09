File Storage
Object storage abstraction for file uploads and downloads

Storage provides a MinIO-backed object storage layer for uploading, downloading, and managing files with presigned URLs. It abstracts bucket operations and metadata handling behind a clean port interface.

The storage module abstracts file persistence behind an `ObjectStoragePort` interface, currently implemented by MinIO. Key domain entities include `StorageObject` (stored file reference), `StorageObjectUpload` (upload payload with metadata), `StorageBucket` (container), `PresignedUrl` (temporary access URL), `StorageUrl` (object location), and `ObjectMetadata` (file attributes). Use cases cover uploading objects, downloading objects, deleting objects, retrieving object info, and generating presigned URLs for direct client access. The HTTP controller handles multipart file uploads and returns structured responses. The module integrates with **sources** for persisting uploaded data source files, **messages** for storing image attachments in conversations, and **rag** indirectly through sources for document content that feeds the ingestion pipeline.
