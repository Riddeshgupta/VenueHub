// LocalStorage key definitions
const TOKEN_KEY = 'venuehub_token';
const USER_KEY = 'venuehub_user';

/**
 * Saves the JWT token and user details to localStorage.
 * @param {string} token - The JWT authentication token.
 * @param {object} user - The user info object returned from backend.
 */
export const saveAuthData = (token, user) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    // Exclude sensitive fields if any, store clean user metadata
    const userToSave = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || ''
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userToSave));
  }
};

/**
 * Retrieves the stored JWT token.
 * @returns {string|null} The token string or null if not logged in.
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || null;
};

/**
 * Retrieves the stored logged-in user object.
 * @returns {object|null} The user object or null if not logged in.
 */
export const getUser = () => {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error('Error parsing stored user data:', e);
    return null;
  }
};

/**
 * Checks if the user is currently logged in.
 * @returns {boolean} True if a token and valid user object exist.
 */
export const isLoggedIn = () => {
  return Boolean(getToken() && getUser());
};

/**
 * Clears authentication data from localStorage (Logout).
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
