export function createMockContext(data: any = {}) {
  return {
    body: data,
    set: {
      status: 200,
      headers: new Map()
    },
    request: new Request("http://localhost"),
    store: {},
    ...data
  };
}

export function createMockRequest(method: string, path: string, body?: any) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
}
