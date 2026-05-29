export function createMockRequest({
  url = 'http://localhost.test/api/test',
  method = 'GET',
  body,
  formData,
  headers = {},
  cookies = {},
} = {}) {
  const headerMap = new Headers(headers);

  return {
    url,
    method,
    headers: headerMap,
    cookies: {
      get(name) {
        return Object.prototype.hasOwnProperty.call(cookies, name)
          ? { name, value: cookies[name] }
          : undefined;
      },
    },
    async json() {
      return body;
    },
    async formData() {
      return formData;
    },
  };
}

export function authCookie(role = 'Admin', name = 'Test Admin') {
  return JSON.stringify({ role, name });
}

export async function readJsonResponse(response) {
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
    cookies: response.cookies,
  };
}

export function params(values = {}) {
  return { params: Promise.resolve(values) };
}
