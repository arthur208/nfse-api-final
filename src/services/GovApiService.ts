// src/services/GovApiService.ts
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import zlib from 'zlib';

export class GovApiService {
  private apiClient!: AxiosInstance;

  // O método agora recebe a URL base diretamente
  public initialize(pfx: Buffer, passphrase: string, baseUrl: string): void {
    console.log(`[GOV_API_SERVICE] Inicializando com a URL Base: ${baseUrl}`);

    const httpsAgent = new https.Agent({ pfx, passphrase, rejectUnauthorized: true });
    // O Axios é criado com a URL base que foi passada como parâmetro
    this.apiClient = axios.create({ baseURL: baseUrl, httpsAgent });
  }

  public async emitirNfse(signedXml: string): Promise<any> {
    const dpsGzip = zlib.gzipSync(signedXml);
    const dpsBase64 = dpsGzip.toString('base64');
    const payload = { dpsXmlGZipB64: dpsBase64 };
    try {
      // O endpoint é relativo à URL base configurada
      return (await this.apiClient.post('/nfse', payload)).data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw { status: error.response.status, details: error.response.data, sentPayload: payload };
      }
      throw { status: 500, details: { message: 'Erro de comunicação.', originalError: error }, sentPayload: payload };
    }
  }

  // O método de consulta permanece o mesmo, ele usará a URL base configurada na inicialização
 public async consultarDanfse(chaveAcesso: string): Promise<{ data: Buffer, headers: any }> {
    console.log(`[GOV_API_SERVICE] Consultando DANFSe da chave: ${chaveAcesso}`);
    try {
      const response = await this.apiClient.get(`/danfse/${chaveAcesso}`, {
        responseType: 'arraybuffer',
      });
      return { data: response.data, headers: response.headers };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        
        // --- INÍCIO DA CORREÇÃO ---
        let errorDetails: any = 'Nenhum detalhe adicional na resposta.';

        if (error.response.data) {
          try {
            // Tenta interpretar a resposta de erro como JSON
            errorDetails = JSON.parse(error.response.data.toString());
          } catch (jsonError) {
            // Se falhar, usa o texto bruto da resposta, que é mais seguro
            console.log('[GOV_API_SERVICE] Resposta de erro não é JSON. Usando texto bruto.');
            errorDetails = error.response.data.toString();
          }
        }
        
        throw { status: error.response.status, details: errorDetails };
        // --- FIM DA CORREÇÃO ---

      }
      throw { status: 500, details: { message: 'Erro de comunicação ao consultar o DANFSe.', originalError: error } };
    }
  }
}