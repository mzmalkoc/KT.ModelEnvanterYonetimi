import type {
  InventoryResponse,
  QualityResponse,
  SimilarityRequest,
  SimilarityResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiClientError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown network error";
    throw new ApiClientError(
      `Backend bağlantısı kurulamadı (${API_BASE_URL}). ${reason}`,
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: string; message?: string };
      detail = body.detail ?? body.message ?? "";
    } catch {
      try {
        detail = await response.text();
      } catch {
        detail = "";
      }
    }
    throw new ApiClientError(
      `API isteği başarısız (HTTP ${response.status})${detail ? `: ${detail}` : ""}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export async function getInventory(): Promise<InventoryResponse> {
  return request<InventoryResponse>("/api/inventory");
}

export async function checkSimilarity(
  payload: SimilarityRequest,
): Promise<SimilarityResponse> {
  return request<SimilarityResponse>("/api/check-similarity", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getQualityCheck(): Promise<QualityResponse> {
  return request<QualityResponse>("/api/quality-check");
}
