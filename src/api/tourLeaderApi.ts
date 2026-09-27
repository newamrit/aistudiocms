/**
 * API Client for Tour Leader Operations
 * Handles all communication with the backend API
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token') || localStorage.getItem('paila_auth_token');
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!response.ok) {
        let errorMsg = `API request failed with status ${response.status}`;
        try {
          if (isJson) {
            const error = await response.json();
            errorMsg = error.error || error.message || errorMsg;
          } else {
            const text = await response.text();
            if (text && !text.includes('<!doctype') && !text.includes('<html')) {
              errorMsg = text;
            }
          }
        } catch {
          // Ignore parsing error for error body
        }
        throw new Error(errorMsg);
      }

      // Handle 204 No Content or empty responses
      if (response.status === 204) {
        return {} as T;
      }

      if (isJson) {
        const text = await response.text();
        if (!text || !text.trim()) {
          return {} as T;
        }
        try {
          return JSON.parse(text) as T;
        } catch (e) {
          console.warn('Malformed JSON response received from API:', text);
          return {} as T;
        }
      }

      // If response is not JSON (e.g. plain text or SPA fallback)
      const text = await response.text();
      if (!text || text.includes('<!doctype') || text.includes('<html')) {
        // SPA HTML fallback was returned (API endpoint not handled by server)
        return {} as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    } catch (error) {
      console.warn('API Request Warning / Handled Error:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

/**
 * Tour Leader API endpoints
 */
export const tourLeaderApi = {
  /**
   * Get active tour details
   */
  getActiveTour: () => apiClient.get<any>('/tour-leader/active-tour'),

  /**
   * Swap vendor for a service
   */
  swapVendor: (data: {
    booking_id: number;
    day_number: number;
    original_vendor_id: number;
    new_vendor_id: number;
    reason: string;
    cost_difference: number;
    payment_method: string;
  }) => apiClient.post<any>('/tour-leader/swap-vendor', data),

  /**
   * Log field expense
   */
  logExpense: (data: {
    booking_id: number;
    day_number: number;
    title: string;
    category: string;
    amount: number;
    payment_method: string;
    notes?: string;
    receipt_image_url?: string;
  }) => apiClient.post<any>('/tour-leader/log-expense', data),

  /**
   * Update daily status
   */
  updateDailyStatus: (data: {
    booking_id: number;
    status: string;
    notes?: string;
  }) => apiClient.post<any>('/tour-leader/update-status', data),
};

/**
 * Auth API endpoints
 */
export const authApi = {
  /**
   * Login
   */
  login: (email: string, password: string) =>
    apiClient.post<any>('/auth/login', { email, password }),

  /**
   * Logout
   */
  logout: () => apiClient.post<any>('/auth/logout', {}),
};
