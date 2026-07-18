import { waitForEvenAppBridge, type EvenAppBridge } from "@evenrealities/even_hub_sdk";

export function isSimulatorMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("simulator") === "true";
}

export async function getBridge(): Promise<EvenAppBridge> {
  // 这个参数不是必须，但示例仓库建议用 ?simulator=true 来跑 simulator 模式
  console.log("[Bridge] Waiting for Even App Bridge...");
  const bridge = await waitForEvenAppBridge();
  console.log("[Bridge] Connected successfully");
  return bridge;
}
