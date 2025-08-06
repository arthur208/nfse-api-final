// src/services/GovApiService.ts
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import zlib from 'zlib';

export class GovApiService {
  private apiClient!: AxiosInstance;

  public initialize(pfx: Buffer, passphrase: string, baseUrl: string): void {
    console.log(`[GOV_API_SERVICE] Inicializando com a URL Base: ${baseUrl}`);
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

  public async consultarNfse(chaveAcesso: string): Promise<any> {
    console.log(`[GOV_API_SERVICE] Consultando NFS-e com a chave: ${chaveAcesso}`);
    try {
      const response = await this.apiClient.get(`/nfse/${chaveAcesso}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        let errorDetails: any = 'Nenhum detalhe adicional na resposta.';
        if (error.response.data) {
          try {
            errorDetails = JSON.parse(error.response.data.toString());
          } catch (jsonError) {
            errorDetails = error.response.data.toString();
          }
        }
        throw { status: error.response.status, details: errorDetails };
      }
      throw { status: 500, details: { message: 'Erro de comunicação ao consultar a NFS-e.', originalError: error } };
    }
  }

  public async consultarDanfse(chaveAcesso: string): Promise<{ data: Buffer, headers: any }> {
    console.log(`[GOV_API_SERVICE] Consultando DANFSe da chave: ${chaveAcesso}`);
    try {
      const response = await this.apiClient.get(`/danfse/${chaveAcesso}`, {
        responseType: 'arraybuffer',
      });
      return { data: response.data, headers: response.headers };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        let errorDetails: any = 'Nenhum detalhe adicional na resposta.';
        if (error.response.data) {
          try {
            errorDetails = JSON.parse(error.response.data.toString());
          } catch (jsonError) {
            console.log('[GOV_API_SERVICE] Resposta de erro não é JSON. Usando texto bruto.');
            errorDetails = error.response.data.toString();
          }
        }
        throw { status: error.response.status, details: errorDetails };
      }
      throw { status: 500, details: { message: 'Erro de comunicação ao consultar o DANFSe.', originalError: error } };
    }
  }
}