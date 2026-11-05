#!/bin/sh
# Provisions the MinIO identity the app signs browser uploads with. MinIO
# honours a signed PUT as CopyObject when the caller adds x-amz-copy-source,
# authorised as the signer, so the signer may only write under the upload
# prefix and must not be able to read anything. Runs with mc inside the MinIO
# image; safe to re-run (policy and user are replaced in place).
set -eu

: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
: "${MINIO_UPLOAD_ACCESS_KEY:?MINIO_UPLOAD_ACCESS_KEY is required}"
: "${MINIO_UPLOAD_SECRET_KEY:?MINIO_UPLOAD_SECRET_KEY is required}"
BUCKET="${MINIO_BUCKET:-ayunis}"
ENDPOINT="${MINIO_INIT_ENDPOINT:-http://minio:9000}"
POLICY=ayunis-source-uploads

if [ "$MINIO_UPLOAD_ACCESS_KEY" = "$MINIO_ROOT_USER" ]; then
  echo "MINIO_UPLOAD_ACCESS_KEY must not be the root user" >&2
  exit 1
fi

mc alias set --quiet local "$ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

POLICY_FILE="$(mktemp)"
cat > "$POLICY_FILE" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": ["arn:aws:s3:::${BUCKET}/*/uploads/*"]
    }
  ]
}
JSON

mc admin policy create local "$POLICY" "$POLICY_FILE" >/dev/null
mc admin user add local "$MINIO_UPLOAD_ACCESS_KEY" "$MINIO_UPLOAD_SECRET_KEY" >/dev/null
# Attaching an already attached policy is an error; the image has no grep.
case "$(mc admin user info --json local "$MINIO_UPLOAD_ACCESS_KEY")" in
  *"$POLICY"*) ;;
  *) mc admin policy attach local "$POLICY" --user "$MINIO_UPLOAD_ACCESS_KEY" >/dev/null ;;
esac
rm -f "$POLICY_FILE"
echo "MinIO upload user '$MINIO_UPLOAD_ACCESS_KEY' limited to $BUCKET/*/uploads/*"
