// src/services/XmlSigningService.ts
const SignedXml = require('xml-crypto').SignedXml;

export class XmlSigningService {
  public signXml(xml: string, privateKeyPem: string, certificatePem: string): string {
    
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certificatePem,
    });

    // KeyInfo: X509Data com o certificado
    sig.keyInfoProvider = {
        getKeyInfo: (key: string, prefix: string) => {
            return `<${prefix}:X509Data><${prefix}:X509Certificate>${key}</${prefix}:X509Certificate></${prefix}:X509Data>`;
        }
    };

    // Algoritmos confirmados pelo XML real de evento da Sefin Nacional (SefinNacional_1.6.0):
    // - Canonicalização: Exclusive C14N WITH COMMENTS
    // - Assinatura:      RSA-SHA256
    // - Digest:          SHA-256
    sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#WithComments';
    sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    
    const id = this.extractId(xml);
    sig.addReference({
      xpath: `//*[@Id='${id}']`,
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#WithComments',
      ],
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    });
    
    sig.computeSignature(xml);
    return sig.getSignedXml();
  }

  // Função auxiliar para extrair o Id dinamicamente
  // Funciona tanto para DPS (infDPS Id="...") quanto para Eventos (infPedReg Id="...")
  private extractId(xml: string): string {
    // Tenta infDPS primeiro (emissão de NFS-e)
    let match = xml.match(/<infDPS Id="([^"]+)"/);
    if (match && match[1]) return match[1];

    // Tenta infPedReg (eventos: cancelamento, confirmação, rejeição)
    match = xml.match(/<infPedReg Id="([^"]+)"/);
    if (match && match[1]) return match[1];

    // Fallback genérico: qualquer elemento com Id="..."
    match = xml.match(/Id="([^"]+)"/);
    if (match && match[1]) return match[1];

    throw new Error("Não foi possível encontrar o atributo Id no XML para assinar. Verifique a estrutura do XML gerado.");
  }
}