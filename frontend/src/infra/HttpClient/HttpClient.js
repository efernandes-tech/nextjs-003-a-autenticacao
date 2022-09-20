// Arquitetura Hexagonal
import nookies from 'nookies';
import { tokenService } from "../../services/auth/tokenService";

// Ports & Adapters
export async function HttpClient(fetchUrl, fetchOptions) {
  const options = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : null,
  };
  return fetch(fetchUrl, options)
    .then(async (response) => {
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: await response.json(),
      }
    })
    .then(async (response) => {
      if (!fetchOptions.refresh) return response;
      if (response.status !== 401) return response;

      const isServer = Boolean(fetchOptions?.ctx);
      const currentRefreshToken = fetchOptions?.ctx?.req?.cookies['REFRESH_TOKEN'];
      try {
        console.log('currentRefreshToken', currentRefreshToken)

        console.log('Middleware para atualizar o token')
        // Tentar atualizar os tokens
        const refreshResponse = await HttpClient('http://localhost:3000/api/refresh', {
          method: isServer ? 'PUT' : 'GET',
          body: isServer ? { refresh_token: currentRefreshToken } : undefined
        });

        const newAccessToken = refreshResponse.body.data.access_token;
        const newRefreshToken = refreshResponse.body.data.refresh_token;

        // Gardar os tokens
        if (isServer) {
          nookies.set(fetchOptions.ctx, 'REFRESH_TOKEN', newRefreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/'
          });
        }

        tokenService.save(newAccessToken);

        // Tentar rodar o request anterior
        const retryResponse = await HttpClient(fetchUrl, {
          ...options,
          refresh: false,
          headers: {
            'Authorization': `Baerer ${newAccessToken}`
          }
        })

        return retryResponse;
      } catch (err) {
        console.error(err)
        return response;
      }
    })
}
