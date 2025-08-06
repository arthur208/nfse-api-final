// src/services/GovApiService.ts
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import zlib from 'zlib';

export class GovApiService {
  private apiClient!: AxiosInstance;
  
  // As URLs agora são definidas aqui
  private urls = {
    producao: 'https://sefin.nfse.gov.br/sefinnacional',
    homologacao: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional'
  };

  // A inicialização agora recebe o ambiente para construir a URL base
  public initialize(pfx: Buffer, passphrase: string, ambiente: '1' | '2'): void {
    const baseUrl = ambiente === '1' ? this.urls.producao : this.urls.homologacao;
    console.log(`[GOV_API_SERVICE] Inicializando para o ambiente: ${ambiente === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}`);
    console.log(`[GOV_API_SERVICE] URL Base: ${baseUrl}`);

    const httpsAgent = new https.Agent({ pfx, passphrase, rejectUnauthorized: true });
    this.apiClient = axios.create({ baseURL: baseUrl, httpsAgent });
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