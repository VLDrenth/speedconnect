const config = {
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://speedconnect.onrender.com'
    : 'http://localhost:8000'
};

export default config;