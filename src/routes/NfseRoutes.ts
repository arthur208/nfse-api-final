// src/routes/NfseRoutes.ts
import { Router } from 'express';
import { NfseController } from '../controllers/NfseController';
import { TributacaoController } from '../controllers/TributacaoController';

export default (nfseController: NfseController, tributacaoController: TributacaoController) => {
  const router = Router();
  
  // Rota para emitir a NFS-e (modo completo, full control)
  router.post('/emitir-nfse', nfseController.emitir);

  // ─── EMISSÃO SIMPLIFICADA (novo) ──────────────────────────────────────────
  // Tudo automático: passa o mínimo, o sistema calcula e emite
  router.post('/nfse/emitir-simples', tributacaoController.emitirSimples);

  // ─── CÁLCULO TRIBUTÁRIO AUTOMÁTICO (novo) ─────────────────────────────────
  // Só calcula e retorna o bloco trib — não emite
  router.post('/tributacao/calcular', tributacaoController.calcular);

  // Rota para consultar os dados (XML/JSON) da NFS-e
  router.get('/nfse/:chaveAcesso', nfseController.consultar);

  // Rota para consultar o DANFSe (PDF) da NFS-e
  router.get('/danfse/:chaveAcesso', nfseController.consultarDanfse);

  // --- EVENTOS ---
  router.post('/nfse/:chaveAcesso/eventos', nfseController.registrarEvento);
  router.get('/nfse/:chaveAcesso/eventos/:tipoEvento/:numSeqEvento', nfseController.consultarEventos);
  router.get('/nfse/:chaveAcesso/eventos', nfseController.consultarEventos);

  // Debug
  router.post('/debug/gerar-xml', nfseController.gerarXmlDebug);

  return router;
};