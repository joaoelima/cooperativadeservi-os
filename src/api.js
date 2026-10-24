export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true';
export async function authRequest(action, body) {
  const response = await fetch('/api/auth/' + action, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(data?.error || 'Não foi possível acessar sua conta.');
    error.status = response.status;
    throw error;
  }
  return data;
}
