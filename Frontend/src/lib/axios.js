import axios from "axios";

const baseURL = import.meta.env.MODE === "production" 
  ? "/api" 
  : (import.meta.env.VITE_API_URL || "http://localhost:3001/api");

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// Diagnostic Interceptor for better development/production debugging
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorInfo = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
    };
    
    console.group("Axios Error Diagnostics");
    console.error("Path:", errorInfo.url);
    console.error("Message:", errorInfo.message);
    if (errorInfo.status) {
      console.error("Status:", errorInfo.status, errorInfo.statusText);
      console.error("Response Data:", errorInfo.data);
    } else {
      console.error("No response received - likely a CORS issue or Network Error.");
    }
    console.groupEnd();
    
    return Promise.reject(error);
  }
);

export default axiosInstance;