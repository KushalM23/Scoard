import type { SearchBootstrapPayload } from "@/app/types/search";
import { buildSearchIndex, type SearchIndex } from "./index";

let bootstrapPromise: Promise<SearchBootstrapPayload> | null = null;
let indexPromise: Promise<SearchIndex> | null = null;

export function loadSearchBootstrap(): Promise<SearchBootstrapPayload> {
  if (!bootstrapPromise) {
    bootstrapPromise = fetch("/api/search/bootstrap", {
      method: "GET",
      cache: "force-cache",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch search bootstrap (${response.status})`,
          );
        }

        return (await response.json()) as SearchBootstrapPayload;
      })
      .catch((error) => {
        bootstrapPromise = null;
        throw error;
      });
  }

  return bootstrapPromise;
}

export function getOrBuildSearchIndex(): Promise<SearchIndex> {
  if (!indexPromise) {
    indexPromise = loadSearchBootstrap()
      .then((payload) => buildSearchIndex(payload))
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }

  return indexPromise;
}
