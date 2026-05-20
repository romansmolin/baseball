import axios, { AxiosError, AxiosInstance } from 'axios'

import { IHttpClient, RequestConfig } from './http-client.interface'
import { ApiError } from './api-error'

export class HttpClient implements IHttpClient {
    private client: AxiosInstance

    private async request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
        try {
            const response = await fn()

            return response.data
        } catch (error) {
            throw error instanceof AxiosError ? ApiError.fromAxios(error) : error
        }
    }

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    async get<T>(url: string, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.get<T>(url, config))
    }

    async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.post<T>(url, data, config))
    }

    async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.put<T>(url, data, config))
    }

    async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.patch<T>(url, data, config))
    }

    async delete<T>(url: string, config?: RequestConfig): Promise<T> {
        return this.request(() => this.client.delete<T>(url, config))
    }
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const httpClient = new HttpClient(baseUrl)
