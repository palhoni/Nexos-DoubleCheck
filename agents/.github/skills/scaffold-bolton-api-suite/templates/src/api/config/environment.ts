export const environment = {
  apiBaseUrl: process.env.API_BASE_URL ?? '__API_BASE_URL__',
  // If the API requires authentication, add credentials here, e.g.:
  // credentials: {
  //   email: process.env.API_USER_EMAIL ?? '',
  //   password: process.env.API_USER_PASSWORD ?? '',
  // },
} as const;
