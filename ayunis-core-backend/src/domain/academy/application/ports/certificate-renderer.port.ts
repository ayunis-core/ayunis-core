export interface CertificateRenderInput {
  userName: string;
  dateLine: string;
}

export abstract class CertificateRendererPort {
  abstract render(input: CertificateRenderInput): Promise<Buffer>;
}
