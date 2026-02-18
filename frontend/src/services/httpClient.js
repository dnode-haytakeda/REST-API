const API_BASE = "http://localhost:3000/api";

class HttpClient {
  async request(method, endpoint, data = null, params = null) {
    let url = `${API_BASE}${endpoint}`;

    // クエリパラメータを追加
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (data && ["POST", "PUT", "PATCH"].includes(method)) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error(`[${method} ${endpoint}] Error:`, err);
      throw err;
    }
  }

  get(endpoint, params = null) {
    return this.request("GET", endpoint, params);
  }

  post(endpoint, data) {
    return this.request("POST", endpoint, data);
  }

  put(endpoint, data) {
    return this.request("PUT", endpoint, data);
  }

  patch(endpoint, data) {
    return this.request("PATCH", endpoint, data);
  }

  delete(endpoint) {
    return this.request("DELETE", endpoint);
  }
}

export default new HttpClient();
