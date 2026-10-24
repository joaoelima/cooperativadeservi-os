export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true';
export async function apiRequest(route, body) {
  let response;
  try { response = await fetch('/api' + route, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(20000),
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
  catch { throw new Error('Não foi possível conectar. Confira sua conexão e tente novamente.'); }
  let data;
  try { data = response.status === 204 ? null : await response.json(); }
  catch { throw new Error('O serviço está iniciando ou indisponível. Aguarde e tente novamente.'); }
  if (!response.ok) { const error = new Error(data?.error || 'Não foi possível concluir a operação.'); error.status = response.status; throw error; }
  return data;
}
export const authRequest = (action, body) => apiRequest('/auth/' + action, body);
