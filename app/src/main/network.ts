import type { BenchLocalNetworkConfig } from "@core";
import { Agent, ProxyAgent, setGlobalDispatcher, type Dispatcher } from "undici";

let activeDispatcher: Dispatcher | null = null;
let lastSignature = "";

function buildDispatcher(network: BenchLocalNetworkConfig): Dispatcher | null {
  const proxyUrl = network.proxy_url?.trim();
  const skipTls = Boolean(network.insecure_skip_tls_verify);

  if (!proxyUrl && !skipTls) {
    return null;
  }

  const connectOptions = skipTls ? { rejectUnauthorized: false } : undefined;

  if (proxyUrl) {
    return new ProxyAgent({
      uri: proxyUrl,
      requestTls: connectOptions,
      proxyTls: connectOptions
    });
  }

  return new Agent({ connect: connectOptions });
}

export function applyNetworkConfig(network: BenchLocalNetworkConfig): void {
  const signature = JSON.stringify({
    proxy_url: network.proxy_url ?? "",
    insecure_skip_tls_verify: Boolean(network.insecure_skip_tls_verify)
  });

  if (signature === lastSignature) {
    return;
  }

  const previous = activeDispatcher;
  const next = buildDispatcher(network);

  setGlobalDispatcher(next ?? new Agent());
  activeDispatcher = next;
  lastSignature = signature;

  if (previous) {
    void previous.close().catch(() => undefined);
  }

  if (network.insecure_skip_tls_verify) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  } else {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  }
}
