# Direct-upload byte limits

Source upload PUT URLs sign the exact `Content-Length`: the declared file size for
a single PUT, 8 MiB for a full multipart part, and the remaining bytes for its last
part. The API rejects part numbers beyond that file. Empty basenames and the `.` / `..` segments become `upload`, and signing refuses legacy keys that URL normalization
would change. The stored key and signed path therefore stay identical. Browsers supply the header
from the raw File/Blob body; the frontend does not set a forbidden request header.

The MinIO SDK presigner cannot bind extra headers, so upload signing uses
`aws4fetch`'s SigV4 signer. Bucket region discovery stays on the internal endpoint;
the signed URL uses the public endpoint. Other storage operations keep the MinIO SDK.

High-Risk validation covers the browser → API → signed URL → MinIO boundary:

| Case                          | Expected result                 | Evidence                   |
| ----------------------------- | ------------------------------- | -------------------------- |
| Exact single PUT              | Accepted and processed          | Chromium upload journey    |
| Larger single PUT             | Rejected before storage         | MinIO 403 and browser E2E  |
| Full multipart part           | Exact configured bytes accepted | Live MinIO transfer        |
| Larger last part              | Rejected before storage         | MinIO 403                  |
| Exact last part               | Accepted                        | Live MinIO transfer        |
| Excess or invalid part number | No signed URL                   | API 400 and unit tests     |
| Different session owner       | No signing or completion access | Existing E2E distinct user |

Completion still verifies stored size; processor reads still check and cap it.
Signed URLs remain reusable until expiry. This caps each PUT, not aggregate storage
across replayed multipart initiations or repeated sessions. The existing sweep aborts
unclaimed multipart uploads; storage quotas and rate limits remain rollout concerns
before larger public limits.

Scale notes: signing uses one existing upload-session lookup and a cached bucket
region. Cryptographic signing is local and no database connection spans storage I/O.
Current public upload limits stay unchanged.
