// src/index.ts
import express, { Application } from 'express';
import path from 'path';
import fs from 'fs';
import pem from 'pem';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import nfseRoutes from './routes/NfseRoutes';
import { GovApiService } from './services/GovApiService';
import { DpsService } from './services/DpsService';
import { NfseController } from './controllers/NfseController';
import { XmlSigningService } from './services/XmlSigningService';

const PORT = process.env.PORT || 3000;

// Função que usa 'pem' para extrair a chave e o certificado, encapsulada em uma Promise
function readCertificate(pfxPath: string, pfxPassword: string): Promise<{ key: string, cert: string }> {
  return new Promise((resolve, reject) => {
    fs.readFile(pfxPath, (err, pfxBuffer) => {
      if (err) {
        return reject(new Error(`Falha ao ler o arquivo PFX em '${pfxPath}': ${err.message}`));
      }
      pem.readPkcs12(pfxBuffer, { p12Password: pfxPassword }, (err, cert) => {
        if (err || !cert || !cert.key) {
          return reject(new Error(`Falha ao extrair a chave privada do PFX. Verifique se a senha está correta. Erro original: ${err}`));
        }
        resolve({ key: cert.key, cert: cert.cert });
      });
    });
  });
}

async function startServer(): Promise<void> {
  try {
    const certPassword = '884157';
    const certPath = path.join(__dirname, '..', 'certs', 'seu_certificado.pfx');
    
    console.log("Extraindo chave e certificado do arquivo PFX...");
    const { key: privateKeyPem, cert: certificatePem } = await readCertificate(certPath, certPassword);
    console.log("Chave privada e certificado extraídos com sucesso.");

    const dpsService = new DpsService();
    const signingService = new XmlSigningService();
    // Injeta a chave e o certificado extraídos no controller
    const nfseController = new NfseController(dpsService, signingService, privateKeyPem, certificatePem, certPath, certPassword);

    const app: Application = express();
    app.use(express.json());
    
    const swaggerOptions = {
      definition: { openapi: '3.0.0', info: { title: 'API NFS-e Nacional', version: 'Final' } },
      apis: ['./src/docs/*.yaml'],
    };
    const swaggerDocs = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
    app.use('/', nfseRoutes(nfseController));

    app.listen(PORT, () => console.log(`\nServidor rodando em http://localhost:${PORT}`));

  } catch (error) {
    console.error("\n[ERRO FATAL NA INICIALIZAÇÃO DA APLICAÇÃO]");
    throw error;
  }
}

startServer().catch(error => {
  console.error("Causa:", error.message);
  process.exit(1);
});