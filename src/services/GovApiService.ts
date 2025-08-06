// src/services/GovApiService.ts
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import zlib from 'zlib';

export class GovApiService {
  private apiClient!: AxiosInstance;
  private baseUrl = 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional';

  // Agora a inicialização recebe os textos dos arquivos PEM
  public initialize(privateKeyPem: string, certificatePem: string): void {
    const httpsAgent = new https.Agent({
      key: privateKeyPem,
      cert: certificatePem,
      rejectUnauthorized: true,
    });
    this.apiClient = axios.create({ baseURL: this.baseUrl, httpsAgent });
  }

  public async emitirNfse(signedXml: string): Promise<any> {
    const dpsGzip = zlib.gzipSync(signedXml);
    const dpsBase64 = dpsGzip.toString('base64');
    const payload = { dpsXmlGZipB64: dpsBase64 };
    try {
      return (await this.apiClient.post('/nfse', payload)).data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw { status: error.response.status, details: error.response.data, sentPayload: payload };
      }
      throw { status: 500, details: { message: 'Erro de comunicação.', originalError: error }, sentPayload: payload };
    }
  }
}