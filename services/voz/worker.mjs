/* Ponte opcional entre o site estático e Azure Speech. As chaves ficam só no servidor. */
const VOZES = new Set(["pt-BR-FranciscaNeural", "pt-BR-AntonioNeural"]);
function xml(texto) {
  return texto.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}
export default {
  async fetch(request, env) {
    const origem = request.headers.get("Origin") || "";
    const permitidas = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const autorizado = permitidas.includes(origem);
    const headers = new Headers({ "Cache-Control": "no-store", "Vary": "Origin", "X-Content-Type-Options": "nosniff" });
    if (autorizado) headers.set("Access-Control-Allow-Origin", origem);
    function erro(status, mensagem) {
      const h = new Headers(headers); h.set("Content-Type", "application/json; charset=utf-8");
      return new Response(JSON.stringify({ erro: mensagem }), { status, headers: h });
    }
    if (!autorizado) return erro(403, "Origem não permitida.");
    if (request.method === "OPTIONS") {
      headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") return erro(405, "Use POST.");
    if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return erro(415, "Envie JSON.");
    if (!env.AZURE_SPEECH_KEY || !/^[a-z0-9]{2,30}$/.test(env.AZURE_SPEECH_REGION || "") || !env.VOZ_LIMIT?.limit) {
      return erro(503, "Serviço de voz ainda não configurado.");
    }
    let dados;
    try {
      const leitor = request.body?.getReader();
      if (!leitor) return erro(400, "Texto ausente.");
      let total = 0; const pedacos = [];
      while (true) {
        const parte = await leitor.read();
        if (parte.done) break;
        total += parte.value.byteLength;
        if (total > 4096) { await leitor.cancel(); return erro(413, "Pedido muito grande."); }
        pedacos.push(parte.value);
      }
      const corpo = new Uint8Array(total); let pos = 0;
      for (const parte of pedacos) { corpo.set(parte, pos); pos += parte.length; }
      dados = JSON.parse(new TextDecoder().decode(corpo));
    } catch (e) { return erro(400, "Pedido inválido."); }
    if (!dados || typeof dados.texto !== "string" || !dados.texto.trim() || dados.texto.length > 1200 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(dados.texto) || !VOZES.has(dados.voz) ||
      ![0.8, 1, 1.15].includes(dados.velocidade)) return erro(400, "Texto, voz ou velocidade inválidos.");
    try {
      const limite = await env.VOZ_LIMIT.limit({ key: origem + ":" + (request.headers.get("CF-Connecting-IP") || "local") });
      if (!limite.success) return erro(429, "Aguarde um pouco para usar a voz online novamente.");
    } catch (e) { return erro(503, "Serviço de voz temporariamente indisponível."); }
    const controle = new AbortController(), prazo = setTimeout(() => controle.abort(), 9000);
    try {
      const taxa = Math.round((dados.velocidade - 1) * 100);
      const ssml = '<speak version="1.0" xml:lang="pt-BR"><voice name="' + dados.voz + '"><prosody rate="' +
        (taxa >= 0 ? "+" : "") + taxa + '%">' + xml(dados.texto.trim()) + '</prosody></voice></speak>';
      const resposta = await fetch("https://" + env.AZURE_SPEECH_REGION + ".tts.speech.microsoft.com/cognitiveservices/v1", {
        method: "POST", signal: controle.signal,
        headers: {
          "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY,
          "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3"
        },
        body: ssml
      });
      if (!resposta.ok || !/^audio\//i.test(resposta.headers.get("Content-Type") || "")) return erro(503, "Não foi possível gerar a voz agora.");
      headers.set("Content-Type", "audio/mpeg");
      return new Response(resposta.body, { headers });
    } catch (e) { return erro(503, "Não foi possível gerar a voz agora."); }
    finally { clearTimeout(prazo); }
  }
};
