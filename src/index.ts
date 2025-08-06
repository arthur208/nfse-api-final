// src/index.ts
import express, { Application } from 'express';
import path from 'path';
import fs from 'fs';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import nfseRoutes from './routes/NfseRoutes';
import { GovApiService } from './services/GovApiService';
import { DpsService } from './services/DpsService';
import { NfseController } from './controllers/NfseController';
import { XmlSigningService } from './services/XmlSigningService';

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    const keyPath = path.join(__dirname, '..', 'certs', 'chave_privada.pem');
    const certPath = path.join(__dirname, '..', 'certs', 'certificado.pem');
    
    console.log("Carregando chave privada e certificado PEM...");
    // Lê os arquivos de texto simples
    const privateKeyPem = fs.readFileSync(keyPath, 'utf-8');
    const certificatePem = fs.readFileSync(certPath, 'utf-8');
    console.log("Chave e certificado carregados com sucesso.");

    const govApiService = new GovApiService();
    // Inicializa o serviço com os arquivos de texto
    govApiService.initialize(privateKeyPem, certificatePem);

    const dpsService = new DpsService();
    const signingService = new XmlSigningService();
    // Injeta a chave e o certificado no controller
    const nfseController = new NfseController(dpsService, govApiService, signingService, privateKeyPem, certificatePem);

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
  } catch (error: any) {
    console.error("\n[ERRO FATAL NA INICIALIZAÇÃO DA APLICAÇÃO]", error);
    process.exit(1);
  }
}

startServer();