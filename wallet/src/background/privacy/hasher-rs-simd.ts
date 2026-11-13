/**
 * Re-exports Light's slim hasher, always loading the SIMD wasm.
 * The extension package ships only hasher_wasm_simd_bg.wasm.
 */
import {
  WasmFactory as SlimWasmFactory,
  hasWasmSimd,
} from "@lightprotocol/hasher.rs/slim";

type LoadOptions = Parameters<typeof SlimWasmFactory.loadHasher>[0];

export { hasWasmSimd };

export class WasmFactory {
  static loadModule(options?: LoadOptions) {
    return SlimWasmFactory.loadModule({ ...options, simd: true });
  }

  static loadHasher(options?: LoadOptions) {
    return SlimWasmFactory.loadHasher({ ...options, simd: true });
  }

  static resetModule() {
    SlimWasmFactory.resetModule();
  }

  static async getInstance() {
    return (await WasmFactory.loadModule()).create();
  }
}
