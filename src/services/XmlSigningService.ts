// src/services/XmlSigningService.ts
const SignedXml = require('xml-crypto').SignedXml;

export class XmlSigningService {
  public signXml(xml: string, privateKeyPem: string, certificatePem: string): string {
    
    // *** A CORREÇÃO ESTÁ AQUI ***
    // Passamos a chave e o certificado diretamente no construtor,
    // que é a forma recomendada pela biblioteca.
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certificatePem,
    });

    // Adicionamos o conteúdo do KeyInfo usando a implementação padrão da biblioteca
    sig.keyInfoProvider = {
        getKeyInfo: (key, prefix) => {
            return `<${prefix}:X509Data><${prefix}:X509Certificate>${key}</${prefix}:X509Certificate></${prefix}:X509Data>`;
        }
    };
    
    sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
    
    const id = this.extractId(xml);
    sig.addReference({
      xpath: `//*[@Id='${id}']`,
      transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],
      digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    });
    
    sig.computeSignature(xml);
    return sig.getSignedXml();
  }

  // Função auxiliar para extrair o Id dinamicamente
  private extractId(xml: string): string {
    const match = xml.match(/<infDPS Id="([^"]+)">/);
    if (!match || !match[1]) {
      throw new Error("Não foi possível encontrar o Id na tag <infDPS>");
    }
    return match[1];
  }
}