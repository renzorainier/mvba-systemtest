export function parseAuthToken(token) {
  if (!token) {
    return null;
  }

  try {
    return JSON.parse(token);
  } catch {
    return null;
  }
}

export function getAuthenticatedUser(request) {
  const token = request.cookies.get('auth_token')?.value;
  const user = parseAuthToken(token);

  if (!user || !user.role) {
    return null;
  }

  return user;
}
