// src/index.ts
import express, { Application } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import nfseRoutes from './routes/NfseRoutes';
import { DpsService } from './services/DpsService';
import { NfseController } from './controllers/NfseController';
import { XmlSigningService } from './services/XmlSigningService';

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    console.log("Inicializando serviços...");

    const dpsService = new DpsService();
    const signingService = new XmlSigningService();

    // Construtor do Controller está mais simples
    const nfseController = new NfseController(dpsService, signingService);

    const app: Application = express();
    // Aumenta o limite do corpo da requisição para aceitar a string base64 do certificado
    app.use(express.json({ limit: '10mb' })); 
    
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
  console.error("Causa:", (error as Error).message);
  process.exit(1);
});