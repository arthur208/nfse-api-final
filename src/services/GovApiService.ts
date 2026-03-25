// src/services/GovApiService.ts
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import zlib from 'zlib';

export class GovApiService {
  private apiClient!: AxiosInstance;
  private danfseBaseUrl?: string;

  public initialize(pfx: Buffer, passphrase: string, baseUrl: string, danfseUrl?: string): void {
    console.log(`[GOV_API_SERVICE] Inicializando com a URL Base: ${baseUrl}`);
    this.danfseBaseUrl = danfseUrl;
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
    const url = this.danfseBaseUrl ? `${this.danfseBaseUrl}/${chaveAcesso}` : `/danfse/${chaveAcesso}`;
    console.log(`[GOV_API_SERVICE] Consultando DANFSe: GET ${url}`);
    try {
      // Se URL for absoluta, sobrepõe o baseURL nativamente. Se falhar, podemos forçar passando no config.
      const response = await this.apiClient.get(url, {
        responseType: 'arraybuffer',
        baseURL: this.danfseBaseUrl ? '' : this.apiClient.defaults.baseURL // previne colisao
      });
      return { data: response.data, headers: response.headers };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        let errorDetails: any = 'Nenhum detalhe adicional na resposta.';
        if (error.response.data) {
          try {
            let bufferData = Buffer.from(error.response.data);
            
            // Verifica se a resposta está em GZIP (magic number 1f 8b)
            if (bufferData.length > 2 && bufferData[0] === 0x1f && bufferData[1] === 0x8b) {
              bufferData = zlib.gunzipSync(bufferData);
            }

            const errorString = bufferData.toString('utf-8');
            
            try {
               errorDetails = JSON.parse(errorString);
            } catch (jsonErr) {
               console.error(`[GOV_API_SERVICE] Erro ao parsear JSON: ${errorString.substring(0, 200)}...`);
               errorDetails = errorString;
            }
            
          } catch (err) {
            console.log('[GOV_API_SERVICE] Falha ao processar o buffer de erro brutamente.', err);
            errorDetails = 'Erro ao ler buffer codificado: ' + String(err);
          }
        }
        
        console.error(`[GOV_API_SERVICE] ERRO ${error.response.status} na consulta DANFSe:`, errorDetails);
        throw { status: error.response.status, details: errorDetails };
      }
      console.error('[GOV_API_SERVICE] Erro catastrófico de comunicação:', error);
      throw { status: 500, details: { message: 'Erro de comunicação ao consultar o DANFSe.', originalError: error } };
    }
  }

  /**
   * Registra um Evento de NFS-e na Sefin Nacional (cancelamento, confirmação, etc.)
   * Endpoint correto: POST /nfse/{chaveAcesso}/eventos
   * @param eventoXml XML do evento JÁ ASSINADO
   * @param chaveAcesso Chave de acesso da NFS-e (50 chars)
   */
  public async registrarEvento(eventoXml: string, chaveAcesso: string): Promise<any> {
    const eventoGzip = zlib.gzipSync(eventoXml);
    const eventoBase64 = eventoGzip.toString('base64');
    // Campo correto conforme Swagger oficial da Sefin
    const payload = { pedidoRegistroEventoXmlGZipB64: eventoBase64 };

    console.log(`[GOV_API_SERVICE] Registrando evento NFS-e via POST /nfse/${chaveAcesso}/eventos...`);
    try {
      const response = await this.apiClient.post(`/nfse/${chaveAcesso}/eventos`, payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        let errorDetails: any = error.response.data;
        if (Buffer.isBuffer(errorDetails)) {
          try {
            let buf = errorDetails;
            if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
            errorDetails = JSON.parse(buf.toString('utf-8'));
          } catch { errorDetails = errorDetails.toString(); }
        }
        console.error(`[GOV_API_SERVICE] ERRO ${error.response.status} ao registrar evento:`, errorDetails);
        throw { status: error.response.status, details: errorDetails };
      }
      throw { status: 500, details: { message: 'Erro de comunicação ao registrar o evento.', originalError: error } };
    }
  }

  /**
   * Consulta um evento específico de uma NFS-e
   * Endpoint correto: GET /nfse/{chaveAcesso}/eventos/{tipoEvento}/{numSeqEvento}
   * @param chaveAcesso Chave de acesso da NFS-e (50 chars)
   * @param tipoEvento Código numérico do tipo de evento (ex: 101101 para Cancelamento)
   * @param numSeqEvento Número seqüencial do evento (geralmente 1)
   */
  public async consultarEventos(chaveAcesso: string, tipoEvento: number = 101101, numSeqEvento: number = 1): Promise<any> {
    const url = `/nfse/${chaveAcesso}/eventos/${tipoEvento}/${numSeqEvento}`;
    console.log(`[GOV_API_SERVICE] Consultando evento via GET ${url}`);
    try {
      const response = await this.apiClient.get(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Axios já parseia JSON automaticamente, então response.data pode ser
        // um objeto (não string). Usar toString() gera "[object Object]".
        const errorDetails = error.response.data ?? 'Nenhum detalhe da Sefin.';
        console.error(`[GOV_API_SERVICE] ERRO ${error.response.status} ao consultar eventos:`, errorDetails);
        throw { status: error.response.status, details: errorDetails };
      }
      throw { status: 500, details: { message: 'Erro de comunicação ao consultar eventos.', originalError: String(error) } };
    }
  }
}